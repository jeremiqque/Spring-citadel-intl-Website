"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validation/id";

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
