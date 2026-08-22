"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { idSchema, teacherStatusSchema } from "@/lib/validation/id";
import { BCRYPT_COST } from "@/lib/password";
import { nextStaffId } from "@/lib/ids";
import { generateTempPassword } from "@/lib/temp-password";
import { teacherFormSchema, type TeacherFormValues } from "@/lib/validation/teacher";

// Defense in depth, not the real gate: middleware's authorized() callback
// already keeps a non-ADMIN session from reaching a page that could call
// these. This is what stops a crafted request straight at the action itself.
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export type CreateTeacherResult =
  | { ok: true; teacherId: string; staffId: string; tempPassword: string }
  | { ok: false; error: string };

export async function createTeacherAction(values: TeacherFormValues): Promise<CreateTeacherResult> {
  await requireAdmin();

  const parsed = teacherFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, BCRYPT_COST);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Same Counter-table pattern as nextAdmissionNo, same reasoning: the
      // staffId mint and both row creations commit or roll back together.
      const staffId = await nextStaffId("2026", tx);

      // Internal only, never shown to anyone — teachers log in with their
      // Staff ID (see auth.ts's identifyCredential), not email.
      const email = `${staffId.replace(/\//g, "-").toLowerCase()}@staff.springcitadel.internal`;

      const user = await tx.user.create({
        data: {
          name: data.name,
          email,
          password: hash,
          role: "TEACHER",
          mustChangePassword: true,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          staffId,
          userId: user.id,
          phone: data.phone,
          gender: data.gender,
          primarySubjectId: data.primarySubjectId || null,
        },
      });

      return { teacher, staffId };
    });

    revalidatePath("/portal/admin/teachers");
  revalidatePath("/portal/admin");

    return {
      ok: true,
      teacherId: result.teacher.id,
      staffId: result.staffId,
      tempPassword,
    };
  } catch (err) {
    console.error("createTeacherAction failed:", err);
    return { ok: false, error: "Could not create the teacher. Please try again." };
  }
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

// Backs both "Mark on leave" / "Reactivate" (ACTIVE <-> ON_LEAVE) and
// "Remove" (-> INACTIVE). Status is the only thing this touches — the
// account, its assignments, and every historical Grade row stay exactly as
// they are, per step 70/72's "account preserved" / "grade rows stay intact."
export async function setTeacherStatusAction(
  teacherId: string,
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE"
): Promise<SimpleResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(teacherId);
  const parsedStatus = teacherStatusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, error: "Could not update status. Please try again." };
  }

  try {
    await prisma.teacher.update({ where: { id: teacherId }, data: { status } });
  } catch (err) {
    console.error("setTeacherStatusAction failed:", err);
    return { ok: false, error: "Could not update status. Please try again." };
  }

  revalidatePath("/portal/admin/teachers");
  revalidatePath("/portal/admin");
  revalidatePath(`/portal/admin/teachers/${teacherId}`);

  return { ok: true };
}

export type ResetPasswordResult = { ok: true; tempPassword: string } | { ok: false; error: string };

export async function resetTeacherPasswordAction(teacherId: string): Promise<ResetPasswordResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(teacherId);
  if (!parsedId.success) {
    return { ok: false, error: "Teacher not found." };
  }

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) {
    return { ok: false, error: "Teacher not found." };
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, BCRYPT_COST);

  try {
    await prisma.user.update({
      where: { id: teacher.userId },
      data: {
        password: hash,
        mustChangePassword: true,
        // Kill any session already open on this account — a reset that
        // leaves a stolen cookie working is not a reset.
        tokenVersion: { increment: 1 },
      },
    });
  } catch (err) {
    console.error("resetTeacherPasswordAction failed:", err);
    return { ok: false, error: "Could not reset the password. Please try again." };
  }

  revalidatePath(`/portal/admin/teachers/${teacherId}`);

  return { ok: true, tempPassword };
}

export type AssignmentResult = { ok: true } | { ok: false; error: string };

export async function addAssignmentAction(
  teacherId: string,
  classId: string,
  subjectId: string
): Promise<AssignmentResult> {
  await requireAdmin();

  const [cls, subject] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId } }),
    prisma.subject.findUnique({ where: { id: subjectId } }),
  ]);
  if (!cls || !subject) {
    return { ok: false, error: "Class or subject not found." };
  }
  if (!subject.levels.includes(cls.level)) {
    return { ok: false, error: `${subject.name} isn't taught at ${cls.name}'s level.` };
  }

  try {
    await prisma.teacherAssignment.upsert({
      where: { teacherId_classId_subjectId: { teacherId, classId, subjectId } },
      update: {},
      create: { teacherId, classId, subjectId },
    });
  } catch (err) {
    console.error("addAssignmentAction failed:", err);
    return { ok: false, error: "Could not add the assignment. Please try again." };
  }

  revalidatePath(`/portal/admin/teachers/${teacherId}`);

  return { ok: true };
}

export async function removeAssignmentAction(
  assignmentId: string,
  teacherId: string
): Promise<AssignmentResult> {
  await requireAdmin();

  try {
    // No FK from Grade to TeacherAssignment — Grade rows reference
    // teacherId/classId/subjectId directly, so deleting the assignment link
    // never touches historical grades. That's what makes "warn, don't
    // block" (step 69) safe: there is nothing to actually block here.
    await prisma.teacherAssignment.delete({ where: { id: assignmentId } });
  } catch (err) {
    console.error("removeAssignmentAction failed:", err);
    return { ok: false, error: "Could not remove the assignment. Please try again." };
  }

  revalidatePath(`/portal/admin/teachers/${teacherId}`);

  return { ok: true };
}
