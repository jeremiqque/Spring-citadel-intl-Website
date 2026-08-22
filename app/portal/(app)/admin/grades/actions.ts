"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gradeInputSchema } from "@/lib/validation/grade";
import { idSchema, termSchema, sessionSchema } from "@/lib/validation/id";
import { upsertGrade } from "@/lib/grades";

// Defense in depth, not the real gate: middleware already keeps a non-ADMIN
// session from reaching any /portal/admin/* page.
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export type SaveGradeResult = { ok: true } | { ok: false; error: string };

// Step 79: "same validated action as the teacher's, without the ownership
// check." The shared logic — bounds validation, total/letter computation,
// at-risk recompute — lives once in lib/grades.ts's upsertGrade(), which
// this action and the teacher's both call.
//
// The teacher's action now exists: app/portal/(app)/teacher/grades/actions.ts.
// What it adds on top, and this one deliberately does not, is
// requireAssignment() — a check that the caller holds a TeacherAssignment
// for (classId, subjectId) — plus a check that the student is actually in
// that class. An admin is trusted with every class by definition, so those
// omissions ARE "without the ownership check," not a divergent second copy
// of the validation.
export async function adminSaveGradeAction(
  classId: string,
  term: "TERM_1" | "TERM_2" | "TERM_3",
  session: string,
  values: { studentId: string; subjectId: string; assignment: number; midterm: number; exam: number },
  // Package 7 addition: this is the only place a grade can move to SUBMITTED
  // at all right now (no teacher-side grade entry exists yet — see the
  // Package 5 gap note). "Save" alone still just saves as draft; "submit" is
  // an explicit, separate action from the same row, same as it would be for
  // a teacher once Package 3 exists.
  submit = false
): Promise<SaveGradeResult> {
  await requireAdmin();

  // The client disables the row when no session is set, but this is the real
  // gate: `session` is part of the Grade unique key, so a write with "" files
  // the result under a session no screen ever queries. It looks saved, and it
  // is unreachable the moment a real session is set.
  if (session.trim() === "") {
    return {
      ok: false,
      error: "No academic session is set. An administrator must set the current session before grades can be recorded.",
    };
  }

  // classId, term and session arrive raw from the client. `session` is the
  // dangerous one: it is part of Grade's unique key, so an arbitrary value
  // doesn't error — it silently files results under a label no screen queries.
  const parsedClassId = idSchema.safeParse(classId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (!parsedClassId.success || !parsedTerm.success || !parsedSession.success) {
    return { ok: false, error: "Invalid class, term or session." };
  }

  const parsed = gradeInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [assignment, existing] = await Promise.all([
    prisma.teacherAssignment.findFirst({
      where: { classId, subjectId: parsed.data.subjectId },
    }),
    prisma.grade.findUnique({
      where: {
        studentId_subjectId_term_session: {
          studentId: parsed.data.studentId,
          subjectId: parsed.data.subjectId,
          term,
          session,
        },
      },
    }),
  ]);

  // A Grade row always needs a teacherId (it's how "who taught/graded this"
  // stays attributable even when an admin made the correction) — attribute
  // it to whichever teacher actually holds this (class, subject) assignment,
  // falling back to whatever teacherId the row already had if none does.
  const teacherId = assignment?.teacherId ?? existing?.teacherId;
  if (!teacherId) {
    return { ok: false, error: "No teacher is assigned to this class and subject yet." };
  }

  try {
    await upsertGrade(prisma, {
      studentId: parsed.data.studentId,
      subjectId: parsed.data.subjectId,
      teacherId,
      classId,
      term,
      session,
      assignment: parsed.data.assignment,
      midterm: parsed.data.midterm,
      exam: parsed.data.exam,
      // An admin correcting an already-submitted grade doesn't reset it to
      // draft — it stays submitted. A brand-new row starts as draft unless
      // this save is an explicit submit, same as it would be for a teacher.
      status: submit || existing?.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT",
    });
  } catch (err) {
    console.error("adminSaveGradeAction failed:", err);
    return { ok: false, error: "Could not save this grade. Please try again." };
  }

  // Revalidation has to cover everything this write touched, not just the
  // page the admin is looking at. Previously it refreshed only these two, so:
  // the student's own dashboard and results page kept serving the old grade,
  // the admin dashboard's KPIs and distribution stayed stale, and — worst —
  // the notification bell in the shell did not update after the single most
  // notification-worthy event in the product. The layout revalidation is what
  // refreshes that badge; see notifications/actions.ts, which had it right.
  revalidatePath("/portal/admin/grades");
  revalidatePath("/portal/admin");
  revalidatePath(`/portal/admin/students/${parsed.data.studentId}`);
  revalidatePath("/portal/student");
  revalidatePath("/portal/student/grades");
  revalidatePath("/portal/notifications");
  revalidatePath("/portal", "layout");

  return { ok: true };
}
