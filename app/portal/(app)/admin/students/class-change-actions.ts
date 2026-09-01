"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { changeStudentClass, type ClassChangeReason } from "@/lib/class-change";
import { idSchema } from "@/lib/validation/id";

// Same defense-in-depth pattern as every other admin action file in this
// directory — middleware already keeps a non-admin session from reaching
// the page that renders the "Change class" button, this exists because a
// Server Action is still a live network endpoint underneath it.
async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session.user.id;
}

export type ChangeStudentClassResult = { ok: true } | { ok: false; error: string };

const REASONS: ClassChangeReason[] = ["PROMOTED", "REPEATED", "CORRECTED", "GRADUATED", "WITHDRAWN"];

/**
 * The single-student path to lib/class-change.ts's changeStudentClass — a
 * one-off correction or an individual promotion/demotion, called from the
 * "Change class" button on a student's own admin profile page. Available
 * year-round, unlike the bulk Promotions screen, which is naturally an
 * end-of-session thing: a wrongly-placed student needs fixing whenever it's
 * noticed, not just at a term boundary. The bulk screen's own action
 * (app/portal/(app)/admin/promotions/actions.ts) calls the same
 * changeStudentClass in a loop rather than duplicating this.
 */
export async function changeStudentClassAction(
  studentId: string,
  toClassId: string | null,
  reason: ClassChangeReason,
  note?: string
): Promise<ChangeStudentClassResult> {
  const adminUserId = await requireAdmin();

  const parsedStudentId = idSchema.safeParse(studentId);
  if (!parsedStudentId.success) {
    return { ok: false, error: "Student not found." };
  }
  if (!REASONS.includes(reason)) {
    return { ok: false, error: "Invalid reason." };
  }
  if (toClassId !== null) {
    const parsedClassId = idSchema.safeParse(toClassId);
    if (!parsedClassId.success) {
      return { ok: false, error: "Invalid class." };
    }
  }

  const sessionSetting = await prisma.setting.findUnique({ where: { key: "currentSession" } });
  const currentSession = sessionSetting?.value ?? "";
  if (currentSession === "") {
    return {
      ok: false,
      error: "No academic session is set. Set the current session in Settings first.",
    };
  }

  const result = await changeStudentClass(prisma, {
    studentId,
    toClassId,
    reason,
    session: currentSession,
    note: note?.trim() || undefined,
    changedById: adminUserId,
  });

  if (result.ok) {
    revalidatePath(`/portal/admin/students/${studentId}`);
    revalidatePath("/portal/admin/students");
    revalidatePath("/portal/admin/promotions");
    revalidatePath("/portal/student");
    revalidatePath("/portal", "layout");
  }

  return result;
}
