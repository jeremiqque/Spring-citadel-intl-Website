import type { PrismaClient } from "@prisma/client";
import { createNotification } from "@/lib/notify";

// Unlike lib/grades.ts's upsertGrade or lib/psychomotor.ts's
// upsertPsychomotorRating, this function runs its own $transaction
// internally (see below) rather than leaving transaction scope to the
// caller — so, unlike those, it takes the full PrismaClient, not the
// PrismaClient | Prisma.TransactionClient union: a TransactionClient has no
// $transaction of its own to nest inside.
type Db = PrismaClient;

export type ClassChangeReason = "PROMOTED" | "REPEATED" | "CORRECTED" | "GRADUATED" | "WITHDRAWN";

const REASON_LABEL: Record<ClassChangeReason, string> = {
  PROMOTED: "promoted",
  REPEATED: "held back",
  CORRECTED: "moved",
  GRADUATED: "graduated",
  WITHDRAWN: "withdrawn",
};

export type ChangeClassResult = { ok: true } | { ok: false; error: string };

/**
 * The one place Student.classId is ever changed after enrolment. Both the
 * single-student "Change class" action on a student's profile (a one-off
 * correction or an individual promotion/demotion) and the bulk Promotions
 * screen (looped, once per student in a class) call this — same
 * one-primitive-two-callers shape lib/grades.ts's upsertGrade already uses
 * for teacher vs admin grade entry, and for the same reason: the thing that
 * must never happen twice with two different behaviours is "what actually
 * happens when a student's class changes."
 *
 * Three things happen together, in one transaction, or none of them do:
 *   1. A StudentClassChange row is written — the audit trail Student.classId
 *      alone can't provide (see that model's own schema comment).
 *   2. Student.classId is updated — UNLESS the student is leaving the school
 *      (toClassId is null, reason GRADUATED/WITHDRAWN), in which case classId
 *      is left exactly as it was. Student.classId is NOT NULLable — a
 *      graduated SS3 student's classId stays "SS3", correctly describing the
 *      last class they were actually in, and INACTIVE status (below) is what
 *      already excludes them from every active roster in the app.
 *   3. Student.status flips to INACTIVE for the same two reasons. Every other
 *      reason leaves status untouched — a promotion or a correction is not a
 *      comment on whether the student is currently at risk.
 *
 * Nothing here checks WHO is allowed to call it — same division of labour as
 * upsertGrade: the caller (a Server Action) holds requireAdmin() and any
 * other authorisation, this function holds the one true set of side effects.
 */
export async function changeStudentClass(
  db: Db,
  params: {
    studentId: string;
    /** The class the student is moving to, or null for GRADUATED/WITHDRAWN. */
    toClassId: string | null;
    reason: ClassChangeReason;
    /** The academic session this change happens in — Setting.currentSession
     *  at the time, so the history reads "promoted at the end of 2026/2027." */
    session: string;
    note?: string;
    /** The admin's User.id. Bare string, not a relation — see
     *  StudentClassChange's own schema comment on why. */
    changedById?: string;
  }
): Promise<ChangeClassResult> {
  const isLeaving = params.reason === "GRADUATED" || params.reason === "WITHDRAWN";
  if (isLeaving !== (params.toClassId === null)) {
    // Defensive, not decorative: this is the one invariant a caller could
    // violate that would otherwise corrupt data silently — a "PROMOTED" row
    // with no destination class, or a "GRADUATED" row that also moves the
    // student into some other class.
    return {
      ok: false,
      error: isLeaving
        ? "A student leaving the school cannot also have a destination class."
        : "Choose a destination class.",
    };
  }

  const student = await db.student.findUnique({
    where: { id: params.studentId },
    select: { classId: true, userId: true, user: { select: { name: true } } },
  });
  if (!student) return { ok: false, error: "Student not found." };

  let toClassName: string | null = null;
  if (params.toClassId) {
    const toClass = await db.class.findUnique({
      where: { id: params.toClassId },
      select: { name: true },
    });
    if (!toClass) return { ok: false, error: "That class no longer exists." };
    toClassName = toClass.name;
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.studentClassChange.create({
        data: {
          studentId: params.studentId,
          fromClassId: student.classId,
          toClassId: params.toClassId,
          session: params.session,
          reason: params.reason,
          note: params.note,
          changedById: params.changedById,
        },
      });

      await tx.student.update({
        where: { id: params.studentId },
        data: {
          ...(params.toClassId ? { classId: params.toClassId } : {}),
          ...(isLeaving ? { status: "INACTIVE" } : {}),
        },
      });
    });
  } catch (err) {
    console.error("changeStudentClass failed:", err);
    return { ok: false, error: "Could not save this change. Please try again." };
  }

  try {
    const body = isLeaving
      ? `You've ${REASON_LABEL[params.reason]} as of ${params.session}. Speak with the school office if you have questions.`
      : `You've been ${REASON_LABEL[params.reason]} to ${toClassName} for ${params.session}.`;
    await createNotification({
      userId: student.userId,
      type: "STUDENT_CLASS_CHANGED",
      title: isLeaving ? "You've left the school" : "Your class has changed",
      body,
      link: "/portal/student",
    });
  } catch (err) {
    // Same rule as every other notification call site: the class change
    // already succeeded and must not be undone by a notification failure.
    console.error("createNotification(STUDENT_CLASS_CHANGED) failed:", err);
  }

  return { ok: true };
}
