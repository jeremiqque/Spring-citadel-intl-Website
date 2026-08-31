import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;
type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * The one place a PsychomotorRating row is ever written — same shape as
 * lib/grades.ts's upsertGrade(), one level up (whole term, not per-subject).
 * Both the form teacher's action and the admin's override action call this,
 * so the two can never drift.
 *
 * Deliberately no notifications here yet, unlike upsertGrade. A submitted
 * psychomotor rating isn't independently visible to a student — Phase 2's
 * TermResult.publish is the actual "this reaches a parent" event, and that's
 * where the one notification for the whole compiled result belongs, not
 * scattered across every input that feeds it. Revisit if the school wants
 * an admin-facing "form teacher submitted" heads-up before that.
 */
export async function upsertPsychomotorRating(
  db: Db,
  params: {
    studentId: string;
    classId: string;
    term: TermValue;
    session: string;
    ratedById: string;
    punctuality: number;
    neatness: number;
    honesty: number;
    leadership: number;
    cooperation: number;
    handwriting: number;
    sports: number;
    remark?: string;
    status?: "DRAFT" | "SUBMITTED";
  }
) {
  const status = params.status ?? "DRAFT";

  const previous = await db.psychomotorRating.findUnique({
    where: { studentId_term_session: { studentId: params.studentId, term: params.term, session: params.session } },
    select: { status: true },
  });
  const justSubmitted = status === "SUBMITTED" && previous?.status !== "SUBMITTED";

  return db.psychomotorRating.upsert({
    where: { studentId_term_session: { studentId: params.studentId, term: params.term, session: params.session } },
    update: {
      classId: params.classId,
      ratedById: params.ratedById,
      punctuality: params.punctuality,
      neatness: params.neatness,
      honesty: params.honesty,
      leadership: params.leadership,
      cooperation: params.cooperation,
      handwriting: params.handwriting,
      sports: params.sports,
      remark: params.remark,
      status,
      submittedAt: justSubmitted ? new Date() : undefined,
    },
    create: {
      studentId: params.studentId,
      classId: params.classId,
      term: params.term,
      session: params.session,
      ratedById: params.ratedById,
      punctuality: params.punctuality,
      neatness: params.neatness,
      honesty: params.honesty,
      leadership: params.leadership,
      cooperation: params.cooperation,
      handwriting: params.handwriting,
      sports: params.sports,
      remark: params.remark,
      status,
      submittedAt: justSubmitted ? new Date() : null,
    },
  });
}
