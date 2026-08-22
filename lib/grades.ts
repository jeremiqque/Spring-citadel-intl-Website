import type { Prisma, PrismaClient } from "@prisma/client";
import { scoreToLetter, type GradingConfig } from "@/lib/grading";
import { getGradingConfig } from "@/lib/grading-settings";
import { prisma } from "@/lib/prisma";
import { createNotification, notifyAdmins } from "@/lib/notify";

type Db = PrismaClient | Prisma.TransactionClient;
type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * The one place a Grade row is ever written. Both the teacher's grade-entry
 * action (app/portal/(app)/teacher/grades/actions.ts) and the admin's "edit
 * any grade" action (app/portal/(app)/admin/grades/actions.ts) call this.
 * The only difference between those two callers is that the teacher-side one
 * additionally checks it holds a TeacherAssignment for (classId, subjectId),
 * and that the student is in that class, before calling this — those checks
 * do not live here, they live in the caller, which is what makes "same
 * action, without the ownership check" literally true rather than two copies
 * that can drift apart.
 *
 * Corollary worth stating: NOTHING may write prisma.grade directly. Every
 * write goes through here, because this is where total and the letter are
 * computed, where the at-risk recompute fires, and where FR-36/FR-38
 * notifications are raised. A bulk updateMany elsewhere would skip all
 * three silently.
 *
 * total/grade are always computed here, never accepted from the caller —
 * matches the Grade model's own comment: "Both computed server-side... never
 * accepted from the client."
 */
export async function upsertGrade(
  db: Db,
  params: {
    studentId: string;
    subjectId: string;
    teacherId: string;
    classId: string;
    term: TermValue;
    session: string;
    assignment: number;
    midterm: number;
    exam: number;
    status?: "DRAFT" | "SUBMITTED";
  },
  options: {
    /**
     * Who hears about a DRAFT -> SUBMITTED transition.
     *
     *   "all"          — admins, the teacher, and the student (the default,
     *                    and what a single-row save/submit wants)
     *   "student-only" — the student only. For BULK submits: forty rows
     *                    published in one click otherwise wrote forty
     *                    identical "Grades submitted" rows into every admin's
     *                    inbox and forty more into the inbox of the teacher
     *                    who just clicked the button, burying the bell badge
     *                    behind a single action. The caller raises one
     *                    aggregate notification for the batch instead. The
     *                    student's own notification is NOT suppressed —
     *                    each child gets exactly one, about their own result.
     */
    notify?: "all" | "student-only";
    /**
     * Pre-loaded grading config. A bulk caller hoists this out of its loop;
     * omitted, it is read here. Passing it is purely a query-count
     * optimisation and cannot change the outcome.
     */
    config?: GradingConfig;
  } = {}
) {
  const total = params.assignment + params.midterm + params.exam;
  // The letter is stamped onto the row at write time, so it must come from
  // the school's LIVE bands, not the compiled-in defaults. (Consequence worth
  // knowing: changing the bands later does not retro-fit rows already
  // written. That is deliberate — a result the school has already published
  // to a child should not silently change letter because a policy was edited
  // afterwards. `total` is stored too, so a re-grade is always possible.)
  const config = options.config ?? (await getGradingConfig(db));
  const grade = scoreToLetter(total, config);
  const status = params.status ?? "DRAFT";

  // Read before the write so a submit can be told apart from a routine save —
  // FR-36/FR-38 fire only on the DRAFT/nothing -> SUBMITTED transition, never
  // on every keystroke-triggered save or on an admin re-saving an
  // already-submitted row.
  const previous = await db.grade.findUnique({
    where: {
      studentId_subjectId_term_session: {
        studentId: params.studentId,
        subjectId: params.subjectId,
        term: params.term,
        session: params.session,
      },
    },
    select: { status: true },
  });

  // Computed BEFORE the write, because `submittedAt` depends on it. Setting
  // it whenever the resulting status is SUBMITTED — rather than only when the
  // row BECOMES submitted — silently re-stamped the publication time every
  // time anyone re-saved an already-submitted row. An admin fixing a typo in
  // October on a result published in July moved its submittedAt to October,
  // which destroyed the real publication time and pulled the row into the
  // admin dashboard's "submitted today" count.
  const justSubmitted = status === "SUBMITTED" && previous?.status !== "SUBMITTED";

  const row = await db.grade.upsert({
    where: {
      studentId_subjectId_term_session: {
        studentId: params.studentId,
        subjectId: params.subjectId,
        term: params.term,
        session: params.session,
      },
    },
    update: {
      assignment: params.assignment,
      midterm: params.midterm,
      exam: params.exam,
      total,
      grade,
      status,
      // undefined, not null, when this is not a fresh submit: leave whatever
      // timestamp is already there untouched.
      submittedAt: justSubmitted ? new Date() : undefined,
      teacherId: params.teacherId,
      classId: params.classId,
    },
    create: {
      studentId: params.studentId,
      subjectId: params.subjectId,
      teacherId: params.teacherId,
      classId: params.classId,
      term: params.term,
      session: params.session,
      assignment: params.assignment,
      midterm: params.midterm,
      exam: params.exam,
      total,
      grade,
      status,
      submittedAt: justSubmitted ? new Date() : null,
    },
  });

  // Wrapped and only logged, exactly like the notification block below, and
  // for the same reason: by this point the Grade row is COMMITTED. Letting a
  // failure here propagate meant the caller's catch reported "Could not save
  // this grade. Please try again." about a write that had in fact succeeded
  // and already notified the student — and the retry then hit the
  // already-submitted guard and said the opposite. Two contradictory messages
  // about one successful write. The at-risk flag is a derived convenience;
  // the result is the record.
  try {
    await recomputeAtRiskStatus(db, params.studentId, params.term, params.session, config);
  } catch (err) {
    console.error("recomputeAtRiskStatus failed after a committed grade write:", err);
  }

  if (justSubmitted) {
    // FR-36 (admin + teacher) and FR-38 (the student) are the same event
    // seen from three inboxes — fired together, once, right here, so they
    // can never drift out of sync with each other.
    try {
      const [student, subject, teacher] = await Promise.all([
        db.student.findUnique({ where: { id: params.studentId }, select: { userId: true } }),
        db.subject.findUnique({ where: { id: params.subjectId }, select: { name: true } }),
        db.teacher.findUnique({ where: { id: params.teacherId }, select: { userId: true } }),
      ]);
      const termLabel = params.term.replace("_", " ");
      const link = `/portal/admin/grades?class=${params.classId}&subject=${params.subjectId}&term=${params.term}`;

      const announceWidely = (options.notify ?? "all") === "all";

      await Promise.all([
        announceWidely
          ? notifyAdmins({
              type: "GRADES_SUBMITTED",
              title: "Grades submitted",
              body: `${subject?.name ?? "A subject"} grade submitted for ${termLabel}.`,
              link,
            })
          : Promise.resolve(),
        announceWidely && teacher
          ? createNotification({
              userId: teacher.userId,
              type: "GRADES_SUBMITTED",
              title: "Grades submitted",
              body: `${subject?.name ?? "A subject"} grade submitted for ${termLabel}.`,
              link,
            })
          : Promise.resolve(),
        student
          ? createNotification({
              userId: student.userId,
              type: "GRADES_PUBLISHED",
              title: "New grade available",
              body: `Your ${subject?.name ?? ""} result for ${termLabel} is ready.`,
              link: "/portal/student/grades",
            })
          : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("notify(GRADES_SUBMITTED/GRADES_PUBLISHED) failed:", err);
    }
  }

  return row;
}

/**
 * At-risk recompute.
 *
 * The rule — how far below par, and over how many subjects — now comes from
 * the school's grading config (Setting rows, see lib/grading.ts) rather than
 * from two magic numbers in this file. The defaults are unchanged: a term
 * average strictly below the threshold, once at least `atRiskMinSubjects`
 * subjects have been SUBMITTED, marks a student AT_RISK; at or above it,
 * ACTIVE. An already-INACTIVE student is left alone — a grade write must
 * never silently reactivate someone the school removed.
 */
async function recomputeAtRiskStatus(
  db: Db,
  studentId: string,
  term: TermValue,
  session: string,
  config: GradingConfig
) {
  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student || student.status === "INACTIVE") return;

  // status: "SUBMITTED" is not optional here. Every student-facing query
  // filters on it — draft scores are explicitly invisible to the student —
  // so computing a status FROM drafts flagged children at-risk on the basis
  // of marks they are not allowed to see, and which a teacher may still be
  // mid-way through entering.
  // Aggregate in SQL. This loaded every column of every submitted grade row
  // to compute one mean and a count.
  const stats = await db.grade.aggregate({
    where: { studentId, term, session, status: "SUBMITTED" },
    _avg: { total: true },
    _count: { _all: true },
  });

  // One subject is not a term average. Flagging on the first submitted grade
  // meant a single 40 in the first subject marked back set the flag before
  // any second data point existed. The minimum is configurable (default 3)
  // because it is a judgement call the school owns; below it, leave the
  // status alone.
  if (stats._count._all < config.atRiskMinSubjects) return;

  const avg = stats._avg.total ?? 0;
  const nextStatus: "ACTIVE" | "AT_RISK" =
    avg < config.atRiskThreshold ? "AT_RISK" : "ACTIVE";

  if (nextStatus !== student.status) {
    await db.student.update({ where: { id: studentId }, data: { status: nextStatus } });

    // FR-37: only the ACTIVE -> AT_RISK transition is news. Flipping back to
    // ACTIVE, or staying AT_RISK on a later grade write, doesn't re-notify —
    // that would just be noise on top of a status the admin already knows.
    if (nextStatus === "AT_RISK") {
      try {
        const withUser = await db.student.findUnique({ where: { id: studentId }, select: { user: { select: { name: true } } } });
        await notifyAdmins({
          type: "STUDENT_AT_RISK",
          title: "Student flagged at-risk",
          body: `${withUser?.user.name ?? "A student"}'s term average fell below the at-risk threshold.`,
          link: `/portal/admin/students/${studentId}`,
        });
      } catch (err) {
        console.error("notifyAdmins(STUDENT_AT_RISK) failed:", err);
      }
    }
  }
}

export type SubmissionStatus = "Not started" | "In progress" | "Submitted";

// Shared by the teacher profile's per-assignment status and the admin
// dashboard's pending-submissions list — one definition of what "pending"
// means, so the two screens can't quietly disagree with each other.
export function submissionStatusFromCounts(studentCount: number, submittedCount: number): SubmissionStatus {
  if (studentCount > 0 && submittedCount >= studentCount) return "Submitted";
  if (submittedCount > 0) return "In progress";
  return "Not started";
}
