import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "./portal-shell";

// A route group, not literally app/portal/layout.tsx: the shell (sidebar +
// top bar) must NOT wrap /portal/login or /portal/first-login — those pages
// render before there's a session to build a role-based sidebar from, and
// apply their own `.portal` class directly. Grouping under (app) is
// invisible to the URL (still /portal/admin etc.) and is what lets the
// login pages opt out of this layout entirely.
export default async function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Defense in depth, not the real gate: middleware's authorized() callback
  // already refuses to let an unauthenticated or mid-password-change request
  // reach this far. This just keeps the shell from ever trying to render a
  // sidebar from a null session if that ever changes.
  if (!session?.user) {
    redirect("/portal/login");
  }
  if (session.user.mustChangePassword) {
    redirect("/portal/first-login");
  }

  // ── Session revocation and status gate ──────────────────────────────────
  // Middleware is deliberately Prisma-free so it can run on the edge, which
  // means it can only read the JWT. A JWT here lives up to 30 days and its
  // claims are a snapshot of sign-in time, so without this check:
  //   - a password reset did not invalidate a stolen cookie
  //   - an expelled student or a teacher marked ON_LEAVE kept full access
  //     until their token expired, because the status gate in auth.ts only
  //     runs at login
  // This is the first Node-runtime code every authenticated request passes
  // through, so it is the right place for both. One indexed lookup by
  // primary key, on a connection the layout is about to use anyway.
  //
  // It fails OPEN on a database error, deliberately: the notification count
  // below already degrades rather than blacking out the portal, and a Neon
  // blip should not sign the whole school out.
  try {
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        tokenVersion: true,
        student: { select: { status: true } },
        teacher: { select: { status: true } },
      },
    });

    const revoked =
      !current ||
      current.tokenVersion !== (session.user.tokenVersion ?? 0) ||
      current.student?.status === "INACTIVE" ||
      (current.teacher != null && current.teacher.status !== "ACTIVE");

    if (revoked) {
      // Not a plain redirect: the cookie is still a technically-valid JWT
      // (only the DB-side tokenVersion/status has changed), and this layout
      // can't delete cookies from a render. Routing through the Route
      // Handler below actually calls signOut() to clear it — otherwise
      // middleware's "already logged in" rule bounces the request straight
      // back into the portal and this check fires again: an infinite
      // redirect loop between here and /portal/login. See the comment in
      // app/api/portal/force-signout/route.ts.
      redirect("/api/portal/force-signout");
    }
  } catch (err) {
    // redirect() throws a control-flow signal — it must not be swallowed by
    // this catch, or a revoked session would silently continue.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[portal] session revocation check failed, allowing request:", err);
  }

  // Cheap on every request (indexed on [userId, readAt]) — this is what
  // makes the top bar's badge current on every navigation without a client
  // poll: mark-read actions revalidate, the layout re-runs, this recounts.
  // Wrapped because this runs on EVERY authenticated render. An unhandled
  // throw here takes down the shell itself, not just the page inside it —
  // and (app)/error.tsx cannot catch it, because that boundary is a CHILD of
  // this layout. A dropped Neon connection would black out the whole portal
  // to render a badge. Degrading to 0 loses nothing that matters.
  let unreadCount = 0;
  try {
    unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    });
  } catch (err) {
    console.error("[portal] unread count failed, falling back to 0:", err);
  }

  return (
    <PortalShell
      role={session.user.role}
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      unreadCount={unreadCount}
    >
      {children}
    </PortalShell>
  );
}
