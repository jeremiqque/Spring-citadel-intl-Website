"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BCRYPT_COST } from "@/lib/password";
import { nextAdmissionNo } from "@/lib/ids";
import { generateTempPassword } from "@/lib/temp-password";
import { studentFormSchema, blankToUndefined, type StudentFormValues } from "@/lib/validation/student";
import { decodeAvatarUpload } from "@/lib/avatar";
import { idSchema } from "@/lib/validation/id";
import { notifyAdmins } from "@/lib/notify";
import { requireTeacher, requireClassAssignment, TeacherAuthError } from "@/lib/teacher";

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

// Enrollment only. A teacher may enroll a student into a class they hold a
// TeacherAssignment for — nothing else about student records opens up to
// them (edit, delete and password-reset below all still call
// requireAdmin()). Throws TeacherAuthError for a legitimate teacher hitting
// a class they don't hold — that message is safe to show them. Any other
// role throws a plain Error, same "should never happen past middleware"
// defense-in-depth as requireAdmin() above, and is left uncaught.
async function requireStudentCreateAccess(classId: string) {
  const session = await auth();
  const role = session?.user?.role;

  if (role === "ADMIN") return;

  if (role === "TEACHER") {
    const { teacherId } = await requireTeacher();
    await requireClassAssignment(teacherId, classId);
    return;
  }

  throw new Error("Forbidden");
}

export type CreateStudentResult =
  | { ok: true; studentId: string; admissionNo: string; tempPassword: string }
  | { ok: false; error: string };

export async function createStudentAction(values: StudentFormValues): Promise<CreateStudentResult> {
  const parsed = studentFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  try {
    await requireStudentCreateAccess(data.classId);
  } catch (err) {
    if (err instanceof TeacherAuthError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const cls = await prisma.class.findUnique({ where: { id: data.classId } });
  if (!cls) {
    return { ok: false, error: "Selected class no longer exists." };
  }

  let avatarFields: { avatar: Uint8Array<ArrayBuffer>; avatarType: string; avatarUpdatedAt: Date } | undefined;
  if (data.photo) {
    const decoded = decodeAvatarUpload(data.photo);
    if (!decoded.ok) {
      return { ok: false, error: decoded.error };
    }
    avatarFields = { avatar: new Uint8Array(decoded.bytes), avatarType: "image/jpeg", avatarUpdatedAt: new Date() };
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
          ...avatarFields,
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

          nationality: blankToUndefined(data.nationality),
          motherTongue: blankToUndefined(data.motherTongue),
          placeOfBirth: blankToUndefined(data.placeOfBirth),
          previousSchool: blankToUndefined(data.previousSchool),

          sibling1Name: blankToUndefined(data.sibling1Name),
          sibling1Class: blankToUndefined(data.sibling1Class),
          sibling2Name: blankToUndefined(data.sibling2Name),
          sibling2Class: blankToUndefined(data.sibling2Class),
          sibling3Name: blankToUndefined(data.sibling3Name),
          sibling3Class: blankToUndefined(data.sibling3Class),

          fatherName: blankToUndefined(data.fatherName),
          fatherNationality: blankToUndefined(data.fatherNationality),
          fatherState: blankToUndefined(data.fatherState),
          fatherProfession: blankToUndefined(data.fatherProfession),
          fatherEmployer: blankToUndefined(data.fatherEmployer),
          fatherPoBox: blankToUndefined(data.fatherPoBox),
          fatherAddress: blankToUndefined(data.fatherAddress),
          fatherPhone: blankToUndefined(data.fatherPhone),
          fatherEmail: blankToUndefined(data.fatherEmail),

          motherName: blankToUndefined(data.motherName),
          motherNationality: blankToUndefined(data.motherNationality),
          motherState: blankToUndefined(data.motherState),
          motherProfession: blankToUndefined(data.motherProfession),
          motherEmployer: blankToUndefined(data.motherEmployer),
          motherPoBox: blankToUndefined(data.motherPoBox),
          motherAddress: blankToUndefined(data.motherAddress),
          motherPhone: blankToUndefined(data.motherPhone),
          motherEmail: blankToUndefined(data.motherEmail),
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

  // Same shape as createStudentAction: decoded and validated BEFORE the
  // transaction, so a bad photo blocks the whole save rather than silently
  // going through without it. Absent entirely (not just falsy) when no new
  // photo was staged this submission, so the spread below leaves the
  // existing avatar columns untouched instead of overwriting them.
  let avatarUpdate: { avatar: Uint8Array<ArrayBuffer>; avatarType: string; avatarUpdatedAt: Date } | undefined;
  if (data.photo) {
    const decoded = decodeAvatarUpload(data.photo);
    if (!decoded.ok) {
      return { ok: false, error: decoded.error };
    }
    avatarUpdate = { avatar: new Uint8Array(decoded.bytes), avatarType: "image/jpeg", avatarUpdatedAt: new Date() };
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.userId },
        data: { name: data.name, ...avatarUpdate },
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

          nationality: blankToUndefined(data.nationality) ?? null,
          motherTongue: blankToUndefined(data.motherTongue) ?? null,
          placeOfBirth: blankToUndefined(data.placeOfBirth) ?? null,
          previousSchool: blankToUndefined(data.previousSchool) ?? null,

          sibling1Name: blankToUndefined(data.sibling1Name) ?? null,
          sibling1Class: blankToUndefined(data.sibling1Class) ?? null,
          sibling2Name: blankToUndefined(data.sibling2Name) ?? null,
          sibling2Class: blankToUndefined(data.sibling2Class) ?? null,
          sibling3Name: blankToUndefined(data.sibling3Name) ?? null,
          sibling3Class: blankToUndefined(data.sibling3Class) ?? null,

          fatherName: blankToUndefined(data.fatherName) ?? null,
          fatherNationality: blankToUndefined(data.fatherNationality) ?? null,
          fatherState: blankToUndefined(data.fatherState) ?? null,
          fatherProfession: blankToUndefined(data.fatherProfession) ?? null,
          fatherEmployer: blankToUndefined(data.fatherEmployer) ?? null,
          fatherPoBox: blankToUndefined(data.fatherPoBox) ?? null,
          fatherAddress: blankToUndefined(data.fatherAddress) ?? null,
          fatherPhone: blankToUndefined(data.fatherPhone) ?? null,
          fatherEmail: blankToUndefined(data.fatherEmail) ?? null,

          motherName: blankToUndefined(data.motherName) ?? null,
          motherNationality: blankToUndefined(data.motherNationality) ?? null,
          motherState: blankToUndefined(data.motherState) ?? null,
          motherProfession: blankToUndefined(data.motherProfession) ?? null,
          motherEmployer: blankToUndefined(data.motherEmployer) ?? null,
          motherPoBox: blankToUndefined(data.motherPoBox) ?? null,
          motherAddress: blankToUndefined(data.motherAddress) ?? null,
          motherPhone: blankToUndefined(data.motherPhone) ?? null,
          motherEmail: blankToUndefined(data.motherEmail) ?? null,
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
