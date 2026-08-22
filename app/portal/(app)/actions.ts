"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { auth, signOut, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BCRYPT_COST } from "@/lib/password";

export async function signOutAction() {
  // redirectTo takes it straight back to the login screen rather than "/",
  // which for this app is the marketing homepage — a signed-out school
  // account has no reason to land there.
  await signOut({ redirectTo: "/portal/login" });
}

const changePasswordSchema = z
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
    message: "Choose a password different from your current one",
    path: ["newPassword"],
  });

export type ChangePasswordResult = { ok: false; error: string };

/**
 * Voluntary "change my password" — for any signed-in role, at any time.
 *
 * This is the sibling of firstLoginAction (app/portal/first-login/actions.ts)
 * and deliberately mirrors its checks (live session, CURRENT password
 * required, fresh read of the user row, tokenVersion bump, unstable_update
 * so this session's own cookie doesn't self-invalidate). The only real
 * difference is this one does NOT touch mustChangePassword — it's for
 * someone who already completed that flow and simply wants a new password,
 * not someone being forced through it. Before this existed, the only way to
 * do this was to hand-edit the database and flip mustChangePassword back to
 * true just to reuse that other screen.
 *
 * On success this REDIRECTS rather than returning — do not change that.
 * This action lives under app/portal/(app), which is wrapped by a layout
 * that compares session.user.tokenVersion against the DB on every render
 * (see the "session revocation" comment in (app)/layout.tsx). Bumping
 * tokenVersion here and then letting Next.js do its normal implicit
 * re-render of that layout to build the action's response is what produced
 * "An unexpected response was received from the server": the layout's
 * redirect() got thrown mid-render of the action's own response, which the
 * Server Actions protocol does not handle cleanly. Calling redirect() here
 * instead makes this action's own top-level response a redirect, so the
 * client does a normal fresh navigation to redirectTo — by the time that
 * page loads, the DB write and the cookie update have both already landed,
 * so the layout's check passes cleanly instead of racing it.
 */
export async function changePasswordAction(
  values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  },
  redirectTo: string
): Promise<ChangePasswordResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Your session has expired. Please sign in again." };
  }

  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  // Read fresh rather than trusting the JWT — same reasoning as
  // firstLoginAction: the token can be up to 30 days stale.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true, tokenVersion: true },
  });
  if (!user) {
    return { ok: false, error: "Your session has expired. Please sign in again." };
  }

  const currentValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!currentValid) {
    return { ok: false, error: "That current password isn't right." };
  }

  const hash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
  const nextVersion = user.tokenVersion + 1;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      // Invalidates every OTHER session for this account — the same reason
      // firstLoginAction does it: a password change is supposed to kick out
      // anyone holding a stolen cookie, not just the browser that changed it.
      tokenVersion: nextVersion,
    },
  });

  // Patch this session's own cookie in place so it isn't immediately
  // invalidated by the tokenVersion bump above, and stays signed in.
  await unstable_update({ user: { tokenVersion: nextVersion } });

  redirect(`${redirectTo}?passwordChanged=1`);
}
