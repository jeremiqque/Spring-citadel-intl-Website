import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Serve one user's profile picture.
 *
 * ── WHY THIS LIVES UNDER /api/portal AND NOT /portal ───────────────────────
 * Two reasons, and the second is the important one.
 *
 * 1. It follows the convention already set by /api/portal/force-signout:
 *    route handlers that need to sit outside the middleware matcher live
 *    here. middleware.ts only matches /portal/:path*, so this handler does
 *    its own authentication — which it would have to do regardless, since a
 *    route handler is a public GET endpoint.
 *
 * 2. next.config.ts sends `Cache-Control: private, no-store, max-age=0` for
 *    every /portal/:path* response, and rightly so — one student's dashboard
 *    reaching another student is the worst caching bug this product could
 *    have. But an avatar is the one portal response that SHOULD be cached
 *    hard: it is immutable at a given URL, because the URL carries a `?v=`
 *    stamped from avatarUpdatedAt. Putting the route here means it is not
 *    swept up by that blanket rule and can set its own policy, instead of
 *    re-downloading every face on every navigation.
 *
 * ── WHO MAY FETCH WHOSE PICTURE ────────────────────────────────────────────
 * A user may always fetch their own. Beyond that, only staff: an ADMIN or
 * TEACHER may fetch anyone's, and a STUDENT may fetch nobody else's.
 *
 * User ids are UUIDs and are never rendered into any student-facing page, so
 * a student has no way to name another child's id in the first place. This
 * check means that even if one leaked, it would not resolve — the same
 * "by construction, not by vigilance" posture as the deliberate absence of a
 * /portal/student/[id] route.
 *
 * The requester's role is re-read from the database rather than taken from
 * the JWT, which is a snapshot of sign-in time and stays valid for up to 30
 * days after a demotion.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (session.user.id !== userId) {
    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!requester || (requester.role !== "ADMIN" && requester.role !== "TEACHER")) {
      // 404 rather than 403: a "forbidden" tells the caller the id was real,
      // which is information they were not entitled to either.
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    // The ONLY query in the app that selects these bytes. Every other read
    // of User deliberately leaves them out — a list page that pulled a
    // hundred photos to render a hundred names would be a quiet disaster.
    select: { avatar: true, avatarType: true },
  });

  if (!user?.avatar) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(user.avatar), {
    headers: {
      "Content-Type": user.avatarType ?? "image/jpeg",
      // Immutable is only truthful because the URL is versioned — see
      // avatarUrl() in lib/avatar.ts. `private` keeps it out of any shared
      // proxy, since this is one identifiable person's photograph.
      "Cache-Control": "private, max-age=31536000, immutable",
      // The bytes were re-encoded from a canvas so they cannot be an HTML or
      // SVG payload, but nosniff costs nothing and removes the question.
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
