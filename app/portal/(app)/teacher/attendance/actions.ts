"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { upsertAttendance, markClassPresentByDefault } from "@/lib/attendance";
import { attendanceInputSchema } from "@/lib/validation/attendance";
import { idSchema, termSchema, sessionSchema } from "@/lib/validation/id";
import { requireTeacher, requireFormTeacher, TeacherAuthError } from "@/lib/teacher";

export type SaveAttendanceResult = { ok: true } | { ok: false; error: string };

/**
 * Form-teacher attendance entry — one row of the daily register. The
 * attendance twin of teacher/psychomotor/actions.ts's
 * teacherSavePsychomotorAction, minus the draft/submit branch: see
 * lib/attendance.ts's upsertAttendance() for why there isn't one here.
 */
export async function teacherSaveAttendanceAction(
  classId: string,
  term: "TERM_1" | "TERM_2" | "TERM_3",
  session: string,
  values: { studentId: string; date: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" }
): Promise<SaveAttendanceResult> {
  let teacherId: string;
  try {
    ({ teacherId } = await requireTeacher());
  } catch {
    return { ok: false, error: "You are not signed in as an active teacher." };
  }

  if (session.trim() === "") {
    return {
      ok: false,
      error: "No academic session is set. An administrator must set the current session before attendance can be recorded.",
    };
  }

  const parsedClassId = idSchema.safeParse(classId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (!parsedClassId.success || !parsedTerm.success || !parsedSession.success) {
    return { ok: false, error: "Invalid class, term or session." };
  }

  const parsed = attendanceInputSchema.safeParse(values);
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
    const student = await prisma.student.findUnique({
      where: { id: parsed.data.studentId },
      select: { classId: true, status: true },
    });
    if (!student || student.classId !== classId) {
      return { ok: false, error: "That student is not in this class." };
    }
    if (student.status === "INACTIVE") {
      return { ok: false, error: "That student is no longer enrolled." };
    }

    await upsertAttendance(prisma, {
      studentId: parsed.data.studentId,
      classId,
      term,
      session,
      date: new Date(parsed.data.date),
      status: parsed.data.status,
      markedById: teacherId,
    });
  } catch (err) {
    console.error("teacherSaveAttendanceAction failed:", err);
    return { ok: false, error: "Could not save this mark. Please try again." };
  }

  revalidateAfterAttendanceWrite();
  return { ok: true };
}

export type MarkAllPresentResult = { ok: true; marked: number } | { ok: false; error: string };

/**
 * "Mark all present" — creates a PRESENT row for every student in the class
 * who doesn't already have one for this date. See
 * markClassPresentByDefault() for why this is additive-only, never a bulk
 * overwrite.
 */
export async function teacherMarkAllPresentAction(
  classId: string,
  term: "TERM_1" | "TERM_2" | "TERM_3",
  session: string,
  date: string
): Promise<MarkAllPresentResult> {
  let teacherId: string;
  try {
    ({ teacherId } = await requireTeacher());
  } catch {
    return { ok: false, error: "You are not signed in as an active teacher." };
  }

  const parsedClassId = idSchema.safeParse(classId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  const parsedDate = attendanceInputSchema.shape.date.safeParse(date);
  if (!parsedClassId.success || !parsedTerm.success || !parsedSession.success || !parsedDate.success) {
    return { ok: false, error: "Invalid class, term, session or date." };
  }

  try {
    await requireFormTeacher(teacherId, classId);
  } catch (err) {
    if (err instanceof TeacherAuthError) return { ok: false, error: err.message };
    throw err;
  }

  try {
    const students = await prisma.student.findMany({
      where: { classId, status: { in: ["ACTIVE", "AT_RISK"] } },
      select: { id: true },
    });

    const marked = await markClassPresentByDefault(prisma, {
      classId,
      term,
      session,
      date: new Date(parsedDate.data),
      markedById: teacherId,
      studentIds: students.map((s) => s.id),
    });

    revalidateAfterAttendanceWrite();
    return { ok: true, marked };
  } catch (err) {
    console.error("teacherMarkAllPresentAction failed:", err);
    return { ok: false, error: "Could not mark attendance. Please try again." };
  }
}

function revalidateAfterAttendanceWrite() {
  revalidatePath("/portal/teacher");
  revalidatePath("/portal/teacher/attendance");
  revalidatePath("/portal/admin/attendance");
  revalidatePath("/portal", "layout");
}
