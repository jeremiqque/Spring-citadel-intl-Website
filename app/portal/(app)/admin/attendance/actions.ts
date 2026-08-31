"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { attendanceInputSchema } from "@/lib/validation/attendance";
import { idSchema, termSchema, sessionSchema } from "@/lib/validation/id";
import { upsertAttendance } from "@/lib/attendance";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export type SaveAttendanceResult = { ok: true } | { ok: false; error: string };

// The admin twin of admin/psychomotor/actions.ts's adminSavePsychomotorAction:
// "the same validated action as the form teacher's, without the ownership
// check." An admin can correct any class's register, including one with no
// form teacher assigned yet — same fallback-attribution reasoning as that
// action: a mark always needs a markedById, so it's attributed to the
// class's form teacher when there is one, or whoever last marked this exact
// day when correcting an existing row.
export async function adminSaveAttendanceAction(
  classId: string,
  term: "TERM_1" | "TERM_2" | "TERM_3",
  session: string,
  values: { studentId: string; date: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" }
): Promise<SaveAttendanceResult> {
  await requireAdmin();

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

  const date = new Date(parsed.data.date);

  const [cls, existing] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId }, select: { formTeacherId: true } }),
    prisma.attendance.findUnique({
      where: { studentId_date: { studentId: parsed.data.studentId, date } },
      select: { markedById: true },
    }),
  ]);

  const markedById = cls?.formTeacherId ?? existing?.markedById;
  if (!markedById) {
    return { ok: false, error: "No form teacher is assigned to this class yet." };
  }

  try {
    await upsertAttendance(prisma, {
      studentId: parsed.data.studentId,
      classId,
      term,
      session,
      date,
      status: parsed.data.status,
      markedById,
    });
  } catch (err) {
    console.error("adminSaveAttendanceAction failed:", err);
    return { ok: false, error: "Could not save this mark. Please try again." };
  }

  revalidatePath("/portal/admin/attendance");
  revalidatePath("/portal/teacher/attendance");
  revalidatePath("/portal", "layout");

  return { ok: true };
}
