"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BCRYPT_COST } from "@/lib/password";
import { nextAdmissionNo } from "@/lib/ids";
import { generateTempPassword } from "@/lib/temp-password";
import { studentFormSchema, type StudentFormValues } from "@/lib/validation/student";
import { idSchema } from "@/lib/validation/id";
import { notifyAdmins } from "@/lib/notify";

// Defense in depth, not the real gate: middleware's authorized() callback
// already keeps a TEACHER or STUDENT session from ever reaching a page that
// could call these. This exists because a Server Action is still a live
// network endpoint underneath the page — this is what actually stops a
// crafted request straight at it.
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export type CreateStudentResult =
  | { ok: true; studentId: string; admissionNo: string; tempPassword: string }
  | { ok: false; error: string };

export async function createStudentAction(values: StudentFormValues): Promise<CreateStudentResult> {
  await requireAdmin();

  const parsed = studentFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const cls = await prisma.class.findUnique({ where: { id: data.classId } });
  if (!cls) {
    return { ok: false, error: "Selected class no longer exists." };
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, BCRYPT_COST);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Counter increment + both row creations all commit or roll back
      // together — if Student.create fails after the admission number is
      // minted, the whole transaction (Counter included) rolls back, so the
      // number isn't silently burned and skipped.
      const admissionNo = await nextAdmissionNo(cls.code, "2026", tx);

      // Internal only, never shown to anyone — students log in with their
      // Admission No. (see auth.ts's identifyCredential), not email.
      // User.email exists purely because the column is NOT NULL UNIQUE.
      const email = `${admissionNo.replace(/\//g, "-").toLowerCase()}@students.springcitadel.internal`;

      const user = await tx.user.create({
        data: {
          name: data.name,
          email,
          password: hash,
          role: "STUDENT",
          mustChangePassword: true,
        },
      });

      const student = await tx.student.create({
        data: {
          admissionNo,
          userId: user.id,
          classId: data.classId,
          dob: new Date(data.dob),
          gender: data.gender,
          guardianName: data.guardianName,
          guardianPhone: data.guardianPhone,
          address: data.address,
        },
      });

      return { student, admissionNo };
    });

    revalidatePath("/portal/admin/students");
  // The dashboard's enrolment KPI and recent-students table read this too.
  revalidatePath("/portal/admin");

    // FR-35: student enrolled → admin. Fired after the transaction commits,
    // not inside it — this is a side effect of enrollment succeeding, not
    // part of what makes enrollment valid. A failure here must never undo or
    // block the enrollment itself, so it's swallowed and logged, not thrown.
    try {
      await notifyAdmins({
        type: "STUDENT_ENROLLED",
        title: "New student enrolled",
        body: `${data.name} (${result.admissionNo}) was enrolled in ${cls.name}.`,
        link: `/portal/admin/students/${result.student.id}`,
      });
    } catch (err) {
      console.error("notifyAdmins(STUDENT_ENROLLED) failed:", err);
    }

    return {
      ok: true,
      studentId: result.student.id,
      admissionNo: result.admissionNo,
      tempPassword,
    };
  } catch (err) {
    console.error("createStudentAction failed:", err);
    return { ok: false, error: "Could not create the student. Please try again." };
  }
}

export type UpdateStudentResult = { ok: true } | { ok: false; error: string };

export async function updateStudentAction(
  studentId: string,
  values: StudentFormValues
): Promise<UpdateStudentResult> {
  await requireAdmin();

  // The id arrives raw from the client — a server action is a live endpoint,
  // and the TypeScript `string` type is erased at runtime.
  const parsedId = idSchema.safeParse(studentId);
  if (!parsedId.success) {
    return { ok: false, error: "Student not found." };
  }

  const parsed = studentFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing) {
    return { ok: false, error: "Student not found." };
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.userId },
        data: { name: data.name },
      }),
      prisma.student.update({
        where: { id: studentId },
        data: {
          classId: data.classId,
          dob: new Date(data.dob),
          gender: data.gender,
          guardianName: data.guardianName,
          guardianPhone: data.guardianPhone,
          address: data.address,
        },
      }),
    ]);
  } catch (err) {
    console.error("updateStudentAction failed:", err);
    return { ok: false, error: "Could not save changes. Please try again." };
  }

  revalidatePath("/portal/admin/students");
  // The dashboard's enrolment KPI and recent-students table read this too.
  revalidatePath("/portal/admin");
  revalidatePath(`/portal/admin/students/${studentId}`);

  return { ok: true };
}

export type DeleteStudentResult = { ok: true } | { ok: false; error: string };

export async function deleteStudentAction(studentId: string): Promise<DeleteStudentResult> {
  await requireAdmin();

  // The id arrives raw from the client — a server action is a live endpoint,
  // and the TypeScript `string` type is erased at runtime.
  const parsedId = idSchema.safeParse(studentId);
  if (!parsedId.success) {
    return { ok: false, error: "Student not found." };
  }

  try {
    // Soft delete only — status = INACTIVE, never a row deletion. Grade
    // history and the admission number stay intact; every list and average
    // elsewhere in the app filters INACTIVE out by default instead.
    await prisma.student.update({
      where: { id: parsedId.data },
      data: { status: "INACTIVE" },
    });
  } catch (err) {
    console.error("deleteStudentAction failed:", err);
    return { ok: false, error: "Could not remove the student. Please try again." };
  }

  revalidatePath("/portal/admin/students");
  // The dashboard's enrolment KPI and recent-students table read this too.
  revalidatePath("/portal/admin");
  revalidatePath(`/portal/admin/students/${studentId}`);

  return { ok: true };
}


export type ResetStudentPasswordResult =
  | { ok: true; tempPassword: string }
  | { ok: false; error: string };

/**
 * Issue a fresh temporary password for a student.
 *
 * This existed for teachers but not for students, which made the login
 * screen's promise — "Forgotten your password? The school office can issue a
 * new one" — untrue. A student's temp password is shown exactly once at
 * enrolment and is unrecoverable, so without this a child who lost the slip
 * was permanently locked out and the only remedy was deleting and
 * re-enrolling them, which mints a new admission number onto records the
 * school keeps for years.
 *
 * Bumps tokenVersion so any session already open on that account stops
 * working — a reset that leaves a stolen cookie valid isn't a reset.
 */
export async function resetStudentPasswordAction(
  studentId: string
): Promise<ResetStudentPasswordResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(studentId);
  if (!parsedId.success) {
    return { ok: false, error: "Student not found." };
  }

  const student = await prisma.student.findUnique({ where: { id: parsedId.data } });
  if (!student) {
    return { ok: false, error: "Student not found." };
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, BCRYPT_COST);

  try {
    await prisma.user.update({
      where: { id: student.userId },
      data: {
        password: hash,
        mustChangePassword: true,
        tokenVersion: { increment: 1 },
      },
    });
  } catch (err) {
    console.error("resetStudentPasswordAction failed:", err);
    return { ok: false, error: "Could not reset the password. Please try again." };
  }

  revalidatePath(`/portal/admin/students/${parsedId.data}`);

  return { ok: true, tempPassword };
}
