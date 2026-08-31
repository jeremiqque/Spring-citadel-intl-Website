import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateReportCardPdf } from "@/lib/report-card";

/**
 * Serve one student's report card PDF, generated on demand — never stored,
 * see lib/report-card.tsx for why.
 *
 * ── WHY THIS LIVES UNDER /api/portal AND NOT /portal ───────────────────────
 * Same reasoning as /api/portal/avatar/[userId]: middleware.ts only matches
 * /portal/:path*, so a route handler here does its own authentication (which
 * it needs to regardless, since a route handler is a public endpoint), and
 * sits outside the blanket `private, no-store` header next.config.ts applies
 * to /portal/:path* — this route sets that header itself below, for the
 * same "a child's academic record must never be cached by a shared proxy"
 * reason, not because it wants a different policy.
 *
 * ── WHO MAY FETCH WHOSE REPORT CARD ─────────────────────────────────────────
 * A student may fetch their own. An admin may fetch anyone's. Nobody else —
 * teachers aren't in scope here; the plan only asked for the student's own
 * portal page and the admin's results/student screens.
 *
 * Only ever serves a PUBLISHED TermResult, same rule as everywhere else in
 * this feature: a compiled-but-not-published result stays invisible to
 * everyone but the admin compiling it, and the admin reviews that through
 * the results table, not a downloadable PDF.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ termResultId: string }> }
) {
  const { termResultId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const termResult = await prisma.termResult.findUnique({
    where: { id: termResultId },
    select: {
      status: true,
      studentId: true,
      term: true,
      session: true,
      student: { select: { userId: true, user: { select: { name: true } } } },
    },
  });

  // 404 rather than 403 for a mismatched owner: a student has no legitimate
  // reason to learn that a termResultId belongs to someone else's record.
  if (!termResult || termResult.status !== "PUBLISHED") {
    return new NextResponse("Not found", { status: 404 });
  }

  const isOwner = termResult.student.userId === session.user.id;
  if (!isOwner && session.user.role !== "ADMIN") {
    return new NextResponse("Not found", { status: 404 });
  }

  const pdf = await generateReportCardPdf(termResultId);
  if (!pdf) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileName = `${termResult.student.user.name.replace(/[^a-z0-9]+/gi, "-")}-${termResult.term}-${termResult.session.replace("/", "-")}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
