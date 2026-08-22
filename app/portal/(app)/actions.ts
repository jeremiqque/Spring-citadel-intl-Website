"use server";

import { signOut } from "@/auth";

export async function signOutAction() {
  // redirectTo takes it straight back to the login screen rather than "/",
  // which for this app is the marketing homepage — a signed-out school
  // account has no reason to land there.
  await signOut({ redirectTo: "/portal/login" });
}
