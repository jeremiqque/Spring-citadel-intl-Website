"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BCRYPT_COST } from "@/lib/password";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(10, "Must be at least 10 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    // Without this a user could re-enter the temporary password from their
    // slip and be waved through, which defeats the entire point of
    // mustChangePassword: the paper copy would stay valid.
    message: "Choose a password different from your current one",
    path: ["newPassword"],
  });

export type FirstLoginResult = { error?: string; redirectTo?: string };

/**
 * Change the signed-in user's password.
 *
 * SECURITY — this used to be a general "change my password" endpoint that
 * never asked for the old one. Its only check was that a session existed, so
 * anyone holding a live cookie (a borrowed phone, an unattended machine in a
 * school lab) could set a new password and permanently take over the account,
 * while the legitimate owner had no self-service recovery. It is also
 * reachable at a path middleware deliberately leaves public, which made it
 * the easiest action in the app to aim a crafted POST at.
 *
 * Three things gate it now: a live session, the CURRENT password, and a
 * fresh read of the user row rather than trust in the token.
 */
export async function firstLoginAction(values: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<FirstLoginResult> {
  // This route is public at the middleware layer (see auth.config.ts's note
  // on why), so the real access check happens here, independently. An
  // anonymous submission must be rejected, not just left to the UI.
  const session = await auth();
  if (!session?.user) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  // Read the user fresh rather than trusting the JWT: the token is issued for
  // up to 30 days and its claims are a snapshot of sign-in time.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true, role: true, tokenVersion: true },
  });
  if (!user) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const currentValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!currentValid) {
    return { error: "That current password isn't right." };
  }

  const hash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
  const nextVersion = user.tokenVersion + 1;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      mustChangePassword: false,
      // Invalidates every OTHER session for this account. Sessions are JWTs
      // with no server-side store, so without a version to compare against a
      // stolen cookie survived a password change — the one thing a password
      // change is supposed to stop. auth.config.ts checks this per request.
      tokenVersion: nextVersion,
    },
  });

  // Refresh this session's cookie in place, otherwise the token still says
  // mustChangePassword: true (it is only set from `user` at sign-in) and
  // middleware bounces the redirect below straight back here, in a loop that
  // looks like "Save and continue" silently did nothing. The new tokenVersion
  // has to be carried across too, or we would immediately invalidate the
  // session we just refreshed.
  await unstable_update({
    user: { mustChangePassword: false, tokenVersion: nextVersion },
  });

  return { redirectTo: `/portal/${user.role.toLowerCase()}` };
}
