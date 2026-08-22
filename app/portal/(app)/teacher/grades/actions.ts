"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { upsertGrade } from "@/lib/grades";
import { getGradingConfig } from "@/lib/grading-settings";
import { notifyAdmins } from "@/lib/notify";
import { gradeInputSchema } from "@/lib/validation/grade";
import { idSchema, termSchema, sessionSchema } from "@/lib/validation/id";
import { requireTeacher, requireAssignment, TeacherAuthError } from "@/lib/teacher";

export type SaveGradeResult = { ok: true } | { ok: false; error: string };

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * Teacher grade entry — Package 3.
 *
 * This is the action the admin's adminSaveGradeAction has always described
 * itself against ("the same validated action as the teacher's, without the
 * ownership check"). The shared half — bounds validation, total/letter
 * computation, at-risk recompute, FR-36/FR-38 notifications — is not
 * duplicated here; it lives once in lib/grades.ts's upsertGrade(), which
 * both actions call. What this file adds, and the admin's does not, is the
 * four checks below.
 *
 * ORDER MATTERS. Each check assumes the previous one passed:
 *   1. requireTeacher()     — an ACTIVE, unrevoked teacher is calling
 *   2. shape validation     — the ids/term/session are well-formed
 *   3. requireAssignment()  — this teacher holds THIS (class, subject)
 *   4. student-in-class     — the student is actually in that class
 *   5. not-already-published — the row is not already SUBMITTED
 *
 * Check 4 has no counterpart in the admin action and is not optional here.
 * Without it, a teacher assigned to JSS 3 / Mathematics could post any
 * studentId in the school and file a Mathematics result for a child in a
 * class they have never taught — the assignment check alone constrains the
 * class COLUMN, not the student. `classId` is denormalised onto Grade, so
 * the mismatched row would look entirely well-formed in the database.
 */
export async function teacherSaveGradeAction(
  classId: string,
  subjectId: string,
  term: TermValue,
  session: string,
  values: { studentId: string; assignment: number; midterm: number; exam: number },
  submit = false
): Promise<SaveGradeResult> {
  let teacherId: string;
  try {
    ({ teacherId } = await requireTeacher());
  } catch {
    return { ok: false, error: "You are not signed in as an active teacher." };
  }

  // `session` is the dangerous free-text field: it is part of Grade's unique
  // key, so an arbitrary value does not error — it silently files a result
  // under a label no screen ever queries. Same reasoning as the admin action.
  if (session.trim() === "") {
    return {
      ok: false,
      error:
        "No academic session is set. An administrator must set the current session before grades can be recorded.",
    };
  }

  const parsedClassId = idSchema.safeParse(classId);
  const parsedSubjectId = idSchema.safeParse(subjectId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (
    !parsedClassId.success ||
    !parsedSubjectId.success ||
    !parsedTerm.success ||
    !parsedSession.success
  ) {
    return { ok: false, error: "Invalid class, subject, term or session." };
  }

  // gradeInputSchema also wants subjectId, which arrives as its own argument
  // here (the whole sheet is one subject) — merged in so the one schema
  // stays the one set of bounds for both callers.
  const parsed = gradeInputSchema.safeParse({ ...values, subjectId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await requireAssignment(teacherId, classId, subjectId);
  } catch (err) {
    if (err instanceof TeacherAuthError) return { ok: false, error: err.message };
    throw err;
  }

  // Checks 4 and 5, read together so a database blip costs one round trip
  // rather than two.
  //
  // Everything from here down is inside one try/catch that returns an inline
  // error rather than throwing. A rejected promise inside the row's
  // startTransition() propagates to (app)/error.tsx and replaces the whole
  // sheet — which on row 30 of 40 throws away every score the teacher has
  // typed but not yet saved. A dropped connection must cost one row's Save
  // click, not the whole sitting.
  try {
    const [student, existing] = await Promise.all([
      prisma.student.findUnique({
        where: { id: parsed.data.studentId },
        select: { classId: true, status: true },
      }),
      prisma.grade.findUnique({
        where: {
          studentId_subjectId_term_session: {
            studentId: parsed.data.studentId,
            subjectId,
            term,
            session,
          },
        },
        select: { status: true },
      }),
    ]);

    // Check 4. INACTIVE students are excluded as well as out-of-class ones: a
    // withdrawn child should not be picking up new results, and the entry
    // sheet never lists them, so anything arriving here for one is either a
    // stale open tab or a crafted request. Both should fail.
    if (!student || student.classId !== classId) {
      return { ok: false, error: "That student is not in this class." };
    }
    if (student.status === "INACTIVE") {
      return { ok: false, error: "That student is no longer enrolled." };
    }

    // Check 5. THE UI'S PROMISE, ENFORCED SERVER-SIDE. The row locks its
    // inputs once a result is submitted and the confirm dialog tells the
    // teacher outright that "submitted results can't be edited or
    // un-submitted here — an administrator would have to correct them."
    // That was a CLIENT-SIDE lock only: this action never looked at the
    // existing row's status, so a direct POST (devtools, curl, a stale tab)
    // silently rewrote a published result — and, because upsertGrade only
    // notifies on a DRAFT -> SUBMITTED transition, rewrote it with nobody
    // told: not the student whose grade changed, not an admin. The at-risk
    // recompute would quietly follow it.
    //
    // Admins deliberately keep the ability to correct a submitted result
    // (adminSaveGradeAction preserves SUBMITTED rather than refusing) — that
    // is the documented escalation path, and it is attributable to an admin
    // account. Teachers do not get it.
    if (existing?.status === "SUBMITTED") {
      return {
        ok: false,
        error:
          "This result has already been submitted and can't be changed here. Ask an administrator to correct it.",
      };
    }

    await upsertGrade(prisma, {
      studentId: parsed.data.studentId,
      subjectId,
      teacherId,
      classId,
      term,
      session,
      assignment: parsed.data.assignment,
      midterm: parsed.data.midterm,
      exam: parsed.data.exam,
      // Check 5 above guarantees the existing row is not SUBMITTED, so this
      // is simply "draft unless the teacher explicitly submitted."
      status: submit ? "SUBMITTED" : "DRAFT",
    });
  } catch (err) {
    console.error("teacherSaveGradeAction failed:", err);
    return { ok: false, error: "Could not save this grade. Please try again." };
  }

  revalidateAfterGradeWrite(parsed.data.studentId);
  return { ok: true };
}

export type SubmitAllResult =
  | { ok: true; submitted: number; failed: number; deferred: number }
  | { ok: false; error: string };

/**
 * Submit every complete draft on this sheet in one go.
 *
 * A teacher marking a class of forty does not want to click Submit forty
 * times, and the per-row path is where a partially-submitted class comes
 * from. This is deliberately narrow to stay safe:
 *
 *   - it NEVER creates a row. Only rows that already exist as DRAFT are
 *     touched, so a student the teacher has not marked cannot be published
 *     as a silent 0/0/0 — which is exactly the failure mode the per-row UI
 *     already guards against by refusing to save an incomplete row.
 *   - it re-runs the same authorisation checks as the single-row action,
 *     because it is its own endpoint.
 *   - it loops rather than batching, because each write has to go through
 *     upsertGrade() to get the at-risk recompute and the per-student
 *     notification. A bulk updateMany would be faster and would skip both.
 *
 * NOTIFICATIONS ARE NOT PER ROW. Each student still gets exactly one
 * notification about their own result — that is the point of submitting.
 * But the admin/teacher side is raised ONCE for the whole batch. Fanning it
 * out per row meant one click published forty identical "Grades submitted"
 * rows into every admin's inbox and forty more into the inbox of the teacher
 * who clicked the button, burying the bell badge behind a single action and
 * making the notifications page useless for the thing it exists for.
 */
export async function teacherSubmitAllAction(
  classId: string,
  subjectId: string,
  term: TermValue,
  session: string
): Promise<SubmitAllResult> {
  let teacherId: string;
  try {
    ({ teacherId } = await requireTeacher());
  } catch {
    return { ok: false, error: "You are not signed in as an active teacher." };
  }

  const parsedClassId = idSchema.safeParse(classId);
  const parsedSubjectId = idSchema.safeParse(subjectId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (
    !parsedClassId.success ||
    !parsedSubjectId.success ||
    !parsedTerm.success ||
    !parsedSession.success
  ) {
    return { ok: false, error: "Invalid class, subject, term or session." };
  }

  try {
    await requireAssignment(teacherId, classId, subjectId);
  } catch (err) {
    if (err instanceof TeacherAuthError) return { ok: false, error: err.message };
    throw err;
  }

  // Deliberately NOT filtered on Grade.classId. That column is denormalised
  // and reflects the class the row was WRITTEN under, so a student who moved
  // between classes mid-term still carries their old classId on an existing
  // draft. Filtering on it excluded exactly the rows the sheet had listed and
  // counted (the sheet selects by roster, i.e. Student.classId), so the
  // button read "Submit 12 drafts", eleven were submitted, and the twelfth
  // was silently skipped with `skipped: 0` reported. The roster filter below
  // is the same one the sheet uses, so the count and the action now agree.
  //
  // upsertGrade re-files the row under the class it is being submitted from,
  // which is correct: the teacher marking it is this class's teacher.
  const draftRows = await prisma.grade.findMany({
    where: {
      subjectId,
      term,
      session,
      status: "DRAFT",
      // Only rows for students still enrolled in this class. A student who
      // transferred out after a draft was saved keeps the draft; publishing
      // it to them here would be a surprise from a class they left.
      student: { classId, status: { in: ["ACTIVE", "AT_RISK"] } },
    },
    select: {
      studentId: true,
      assignment: true,
      midterm: true,
      exam: true,
      // Needed to spot rows written under a DIFFERENT class — see below.
      classId: true,
    },
  });

  // A draft belonging to another class is not submitted in bulk.
  //
  // Dropping the classId filter above (so the count and the action agree)
  // admits one row shape that needs care: a student who transferred INTO this
  // class carrying a draft written by their previous teacher, under the
  // previous class. upsertGrade rewrites teacherId and classId, so submitting
  // it in bulk would publish marks this teacher never entered, credit them to
  // this teacher, and move the row out of the other class's history — all
  // from a single click on a button that said nothing about it.
  //
  // Those rows are deferred, not dropped: the sheet still shows them, and the
  // per-row Submit path publishes them deliberately, one at a time, behind a
  // confirm dialog naming the student. Bulk is for the routine case.
  const ownDrafts = draftRows.filter((d) => d.classId === classId);
  const deferred = draftRows.length - ownDrafts.length;

  if (ownDrafts.length === 0) {
    return { ok: true, submitted: 0, failed: 0, deferred };
  }

  // Hoisted out of the loop: without this, forty rows meant forty identical
  // settings reads on top of everything else this loop already does.
  const config = await getGradingConfig();

  let submitted = 0;
  const failures: string[] = [];

  for (const draft of ownDrafts) {
    try {
      await upsertGrade(
        prisma,
        {
          studentId: draft.studentId,
          subjectId,
          teacherId,
          classId,
          term,
          session,
          assignment: draft.assignment,
          midterm: draft.midterm,
          exam: draft.exam,
          status: "SUBMITTED",
        },
        { notify: "student-only", config }
      );
      submitted += 1;
    } catch (err) {
      // One bad row must not abandon the other thirty-nine. Partial success
      // is reported honestly rather than rolled back — a submitted result is
      // a real, visible event (the student was notified), so rolling back
      // would not un-happen it anyway.
      console.error("teacherSubmitAllAction row failed:", draft.studentId, err);
      failures.push(draft.studentId);
    }
  }

  // One notification for the batch, replacing the per-row fan-out. Wrapped
  // and only logged on failure, for the same reason every other call site is:
  // publishing forty results matters more than the row telling an admin
  // about it, and that has already happened by the time we get here.
  if (submitted > 0) {
    try {
      const [subject, cls, teacher] = await Promise.all([
        prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } }),
        prisma.class.findUnique({ where: { id: classId }, select: { name: true } }),
        prisma.teacher.findUnique({ where: { id: teacherId }, select: { user: { select: { name: true } } } }),
      ]);
      await notifyAdmins({
        type: "GRADES_SUBMITTED",
        title: "Grades submitted",
        body: `${teacher?.user.name ?? "A teacher"} submitted ${submitted} ${
          subject?.name ?? "subject"
        } result${submitted === 1 ? "" : "s"} for ${cls?.name ?? "a class"}, ${term.replace("_", " ")}.`,
        link: `/portal/admin/grades?class=${classId}&subject=${subjectId}&term=${term}`,
      });
    } catch (err) {
      console.error("notifyAdmins(bulk GRADES_SUBMITTED) failed:", err);
    }
  }

  revalidateAfterGradeWrite();

  if (submitted === 0 && failures.length > 0) {
    return { ok: false, error: "Could not submit these grades. Please try again." };
  }

  return { ok: true, submitted, failed: failures.length, deferred };
}

/**
 * A grade write is seen by three roles on six screens. Revalidating only the
 * page the teacher is looking at leaves the student's own results stale and —
 * worse — leaves the notification bell in the shell showing a stale count
 * after the single most notification-worthy event in the product. The
 * "layout" revalidation is what refreshes that badge.
 */
function revalidateAfterGradeWrite(studentId?: string) {
  revalidatePath("/portal/teacher");
  revalidatePath("/portal/teacher/grades");
  revalidatePath("/portal/teacher/classes");
  revalidatePath("/portal/admin");
  revalidatePath("/portal/admin/grades");
  if (studentId) revalidatePath(`/portal/admin/students/${studentId}`);
  revalidatePath("/portal/student");
  revalidatePath("/portal/student/grades");
  revalidatePath("/portal/notifications");
  revalidatePath("/portal", "layout");
}
