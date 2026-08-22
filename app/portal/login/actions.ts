"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { clientIp, peekLoginAttempts } from "@/lib/rate-limit";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export type SignInResult = { error?: string };

export async function signInAction(values: {
  identifier: string;
  password: string;
}): Promise<SignInResult> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: "Invalid login ID or password." };
  }

  // A PEEK, not the rate limit itself.
  //
  // The counter is incremented inside authorize() in auth.ts, which is the
  // only place both this form and Auth.js's public credentials callback route
  // funnel through — see the comment there. Doing a consuming check here as
  // well would count every form attempt twice and halve the allowance.
  //
  // This exists solely so the form can say something true. Auth.js collapses
  // every provider failure into one opaque AuthError, so without it a
  // locked-out student is told their password is wrong, which is both false
  // and unactionable.
  //
  // Known lag of exactly one attempt: the peek runs before authorize()
  // increments, so the attempt that CROSSES the limit still reports "Invalid
  // login ID or password" — it is the following one that gets the real
  // message. Closing that gap would mean either counting here as well
  // (halving the allowance) or plumbing a reason back through Auth.js's error
  // collapsing (which is deliberate on their side). One misleading message
  // followed by a correct one is the cheapest honest option.
  const ip = clientIp(await headers());
  const limit = await peekLoginAttempts(ip, parsed.data.identifier);
  if (!limit.allowed) {
    if (limit.reason === "unavailable") {
      return {
        error: "Sign-in is temporarily unavailable. Please contact the school office.",
      };
    }
    const minutes = Math.max(1, Math.ceil(limit.retryAfterMs / 60_000));
    // Tell them what to do, not just that they've been stopped — a locked-out
    // student has no other route back in.
    return {
      error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or contact the school office.`,
    };
  }

  try {
    // redirectTo lands on /portal; middleware's authorized() callback takes
    // it from there — forcing /portal/first-login if mustChangePassword is
    // still true, or the role dashboard once one exists (Package 1.3/1.4).
    await signIn("credentials", {
      identifier: parsed.data.identifier,
      password: parsed.data.password,
      redirectTo: "/portal",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      // Auth.js collapses every provider failure (unknown identifier, wrong
      // password, inactive account) into this one instance. Never reveal
      // which one it was — that alone tells an attacker whether an ID
      // exists in the system.
      return { error: "Invalid login ID or password." };
    }
    // Anything else — including Next's internal redirect signal, which is how
    // a SUCCESSFUL signIn() reports itself — must keep propagating rather than
    // be swallowed here. Nothing is cleared on this path any more:
    // authorize() clears the counter at the moment it actually verifies the
    // password, which is both earlier and true of the callback route too.
    throw err;
  }

  return {};
}
