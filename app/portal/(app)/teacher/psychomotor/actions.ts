"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { upsertPsychomotorRating } from "@/lib/psychomotor";
import { psychomotorInputSchema } from "@/lib/validation/psychomotor";
import { idSchema, termSchema, sessionSchema } from "@/lib/validation/id";
import { requireTeacher, requireFormTeacher, TeacherAuthError } from "@/lib/teacher";

export type SavePsychomotorResult = { ok: true } | { ok: false; error: string };

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * Form-teacher psychomotor entry — the psychomotor twin of
 * teacher/grades/actions.ts's teacherSaveGradeAction. Same order-matters
 * check sequence, minus the two that don't apply here: there's no subject to
 * hold a TeacherAssignment for (requireFormTeacher replaces
 * requireAssignment), and a student-in-class check is still needed for the
 * same reason it's needed there — classId is denormalised onto the row.
 */
export async function teacherSavePsychomotorAction(
  classId: string,
  term: TermValue,
  session: string,
  values: { studentId: string; punctuality: number; neatness: number; honesty: number; leadership: number; cooperation: number; handwriting: number; sports: number; remark?: string },
  submit = false
): Promise<SavePsychomotorResult> {
  let teacherId: string;
  try {
    ({ teacherId } = await requireTeacher());
  } catch {
    return { ok: false, error: "You are not signed in as an active teacher." };
  }

  if (session.trim() === "") {
    return {
      ok: false,
      error:
        "No academic session is set. An administrator must set the current session before ratings can be recorded.",
    };
  }

  const parsedClassId = idSchema.safeParse(classId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (!parsedClassId.success || !parsedTerm.success || !parsedSession.success) {
    return { ok: false, error: "Invalid class, term or session." };
  }

  const parsed = psychomotorInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await requireFormTeacher(teacherId, classId);
  } catch (err) {
    if (err instanceof TeacherAuthError) return { ok: false, error: err.message };
    throw err;
  }

  try {
    const [student, existing] = await Promise.all([
      prisma.student.findUnique({
        where: { id: parsed.data.studentId },
        select: { classId: true, status: true },
      }),
      prisma.psychomotorRating.findUnique({
        where: {
          studentId_term_session: { studentId: parsed.data.studentId, term, session },
        },
        select: { status: true },
      }),
    ]);

    if (!student || student.classId !== classId) {
      return { ok: false, error: "That student is not in this class." };
    }
    if (student.status === "INACTIVE") {
      return { ok: false, error: "That student is no longer enrolled." };
    }
    if (existing?.status === "SUBMITTED") {
      return {
        ok: false,
        error:
          "This rating has already been submitted and can't be changed here. Ask an administrator to correct it.",
      };
    }

    await upsertPsychomotorRating(prisma, {
      studentId: parsed.data.studentId,
      classId,
      term,
      session,
      ratedById: teacherId,
      punctuality: parsed.data.punctuality,
      neatness: parsed.data.neatness,
      honesty: parsed.data.honesty,
      leadership: parsed.data.leadership,
      cooperation: parsed.data.cooperation,
      handwriting: parsed.data.handwriting,
      sports: parsed.data.sports,
      remark: parsed.data.remark,
      status: submit ? "SUBMITTED" : "DRAFT",
    });
  } catch (err) {
    console.error("teacherSavePsychomotorAction failed:", err);
    return { ok: false, error: "Could not save this rating. Please try again." };
  }

  revalidateAfterPsychomotorWrite();
  return { ok: true };
}

export type SubmitAllPsychomotorResult =
  | { ok: true; submitted: number; failed: number }
  | { ok: false; error: string };

/**
 * Submit every complete draft rating for this class/term in one go — the
 * psychomotor twin of teacherSubmitAllAction. Never creates a row: only
 * students who already have a DRAFT rating are touched, so an unrated
 * student can't be silently published with a meaningless 1-across-the-board.
 */
export async function teacherSubmitAllPsychomotorAction(
  classId: string,
  term: TermValue,
  session: string
): Promise<SubmitAllPsychomotorResult> {
  let teacherId: string;
  try {
    ({ teacherId } = await requireTeacher());
  } catch {
    return { ok: false, error: "You are not signed in as an active teacher." };
  }

  const parsedClassId = idSchema.safeParse(classId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (!parsedClassId.success || !parsedTerm.success || !parsedSession.success) {
    return { ok: false, error: "Invalid class, term or session." };
  }

  try {
    await requireFormTeacher(teacherId, classId);
  } catch (err) {
    if (err instanceof TeacherAuthError) return { ok: false, error: err.message };
    throw err;
  }

  const draftRows = await prisma.psychomotorRating.findMany({
    where: {
      term,
      session,
      status: "DRAFT",
      classId,
      student: { classId, status: { in: ["ACTIVE", "AT_RISK"] } },
    },
  });

  if (draftRows.length === 0) {
    return { ok: true, submitted: 0, failed: 0 };
  }

  let submitted = 0;
  const failures: string[] = [];

  for (const draft of draftRows) {
    try {
      await upsertPsychomotorRating(prisma, {
        studentId: draft.studentId,
        classId,
        term,
        session,
        ratedById: teacherId,
        punctuality: draft.punctuality,
        neatness: draft.neatness,
        honesty: draft.honesty,
        leadership: draft.leadership,
        cooperation: draft.cooperation,
        handwriting: draft.handwriting,
        sports: draft.sports,
        remark: draft.remark ?? undefined,
        status: "SUBMITTED",
      });
      submitted += 1;
    } catch (err) {
      console.error("teacherSubmitAllPsychomotorAction row failed:", draft.studentId, err);
      failures.push(draft.studentId);
    }
  }

  revalidateAfterPsychomotorWrite();

  if (submitted === 0 && failures.length > 0) {
    return { ok: false, error: "Could not submit these ratings. Please try again." };
  }

  return { ok: true, submitted, failed: failures.length };
}

function revalidateAfterPsychomotorWrite() {
  revalidatePath("/portal/teacher");
  revalidatePath("/portal/teacher/psychomotor");
  revalidatePath("/portal/admin/psychomotor");
  revalidatePath("/portal", "layout");
}
