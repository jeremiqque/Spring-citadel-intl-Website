import { signOut } from "@/auth";
import { NextResponse } from "next/server";

// Exists to fix a real redirect loop: app/portal/(app)/layout.tsx detects a
// revoked session (tokenVersion mismatch, or a student/teacher whose status
// flipped away from active) but is a Server Component render, not a Server
// Action or Route Handler — it cannot delete the session cookie itself.
// A bare redirect("/portal/login?reason=session-ended") from there left the
// still-valid JWT cookie in place, so auth.config.ts's authorized() (rule 5:
// "a logged-in user landing on /portal/login is sent onward") immediately
// bounced the request straight back into the portal, which re-ran the same
// revocation check and redirected here again — ERR_TOO_MANY_REDIRECTS.
//
// Route Handlers run on Node and are allowed to mutate cookies, so this is
// the one place in the request path that can actually end the session
// before handing the browser back to /portal/login.
export async function GET(req: Request) {
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL("/portal/login?reason=session-ended", req.url));
}
