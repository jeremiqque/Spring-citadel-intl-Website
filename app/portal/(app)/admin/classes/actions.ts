"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validation/id";
import { classFormSchema, gradingEnabledForLevel, type ClassFormValues } from "@/lib/validation/class";

// Defense in depth, not the real gate — same pattern as every other
// admin-only action in this app (see admin/teachers/actions.ts).
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export type SetFormTeacherResult = { ok: true } | { ok: false; error: string };

/**
 * Set (or clear) a class's form/class teacher.
 *
 * Classes are otherwise read-only on this page by design (see the comment
 * at the bottom of admin/classes/page.tsx) — this is the second thing,
 * after teacher/subject coverage, that's an exception, for the same reason:
 * it's "who's responsible for this class," not "what this class fundamentally
 * is." Class.formTeacherId is DB-unique, so assigning a teacher who already
 * owns another class fails here with a clear message rather than a raw
 * constraint violation reaching the client.
 */
export async function setFormTeacherAction(
  classId: string,
  teacherId: string | null
): Promise<SetFormTeacherResult> {
  await requireAdmin();

  const parsedClassId = idSchema.safeParse(classId);
  if (!parsedClassId.success) {
    return { ok: false, error: "Class not found." };
  }

  if (teacherId !== null) {
    const parsedTeacherId = idSchema.safeParse(teacherId);
    if (!parsedTeacherId.success) {
      return { ok: false, error: "Teacher not found." };
    }

    const existing = await prisma.class.findUnique({
      where: { formTeacherId: teacherId },
      select: { id: true, name: true },
    });
    if (existing && existing.id !== classId) {
      return { ok: false, error: `Already the form teacher of ${existing.name}.` };
    }
  }

  try {
    await prisma.class.update({
      where: { id: classId },
      data: { formTeacherId: teacherId },
    });
  } catch (err) {
    console.error("setFormTeacherAction failed:", err);
    return { ok: false, error: "Could not save. Please try again." };
  }

  revalidatePath("/portal/admin/classes");
  return { ok: true };
}


export type CreateClassResult = { ok: true; classId: string } | { ok: false; error: string };

/**
 * Adds a class. There is deliberately no updateClassAction — see
 * classFormSchema's own comment on why `code` (and therefore every field
 * here, since a class is a small enough row that a partial edit form would
 * just be this same form again) is write-once: it feeds admission numbers
 * already printed on paper the moment the first student enrols. Get the
 * level and code right here, at creation, or delete the class and add it
 * again before anyone has been enrolled into it.
 */
export async function createClassAction(values: ClassFormValues): Promise<CreateClassResult> {
  await requireAdmin();

  const parsed = classFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  // Checked ahead of the write, same style as admin/subjects/actions.ts's
  // code check — a friendly "already exists" beats a raw database
  // constraint error for the person who just typed a duplicate code.
  const existing = await prisma.class.findUnique({ where: { code: data.code } });
  if (existing) {
    return { ok: false, error: `A class with the code "${data.code}" already exists.` };
  }

  try {
    const cls = await prisma.class.create({
      data: {
        name: data.name,
        code: data.code,
        level: data.level,
        gradingEnabled: gradingEnabledForLevel(data.level),
      },
    });

    revalidatePath("/portal/admin/classes");
    // The dashboard and student enrollment forms both read the class list.
    revalidatePath("/portal/admin");
    return { ok: true, classId: cls.id };
  } catch (err) {
    console.error("createClassAction failed:", err);
    return { ok: false, error: "Could not create the class. Please try again." };
  }
}

export type DeleteClassResult = { ok: true } | { ok: false; error: string };

/**
 * Deleting a class is refused, not attempted, the moment anything real is
 * tied to it. Five tables carry `classId` with `onDelete: Restrict` for
 * exactly this reason (see the relation comments in schema.prisma) — a hard
 * delete must never silently take a child's enrolment, grades, attendance,
 * psychomotor ratings or term results with it. This checks all five ahead of
 * the write so the admin gets one plain-English reason instead of a raw
 * constraint error, and still catches the delete failing anyway (a student
 * enrolled in the moment between the check and the write) as a safety net.
 *
 * Note this checks EVERY student ever tied to this class, not just currently
 * enrolled ones — Grade/Attendance/PsychomotorRating/TermResult.classId is
 * denormalised from Student at the time (see Grade's own schema comment), so
 * a class with zero students enrolled today can still hold last term's
 * results for a student who has since moved on.
 */
export async function deleteClassAction(classId: string): Promise<DeleteClassResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(classId);
  if (!parsedId.success) {
    return { ok: false, error: "Class not found." };
  }

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) {
    return { ok: false, error: "Class not found." };
  }

  const [students, grades, attendance, psychomotor, termResults] = await Promise.all([
    prisma.student.count({ where: { classId } }),
    prisma.grade.count({ where: { classId } }),
    prisma.attendance.count({ where: { classId } }),
    prisma.psychomotorRating.count({ where: { classId } }),
    prisma.termResult.count({ where: { classId } }),
  ]);

  if (students + grades + attendance + psychomotor + termResults > 0) {
    return {
      ok: false,
      error:
        students > 0
          ? `${cls.name} has ${students} student${students === 1 ? "" : "s"} enrolled and can't be deleted. Move or remove them first.`
          : `${cls.name} has academic records on file (grades, attendance or ratings) and can't be deleted.`,
    };
  }

  try {
    await prisma.class.delete({ where: { id: classId } });
  } catch (err) {
    console.error("deleteClassAction failed:", err);
    return { ok: false, error: "Could not delete the class. Please try again." };
  }

  revalidatePath("/portal/admin/classes");
  revalidatePath("/portal/admin");
  return { ok: true };
}
