"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { changeStudentClass, type ClassChangeReason } from "@/lib/class-change";
import { idSchema } from "@/lib/validation/id";
import { notifyAdmins } from "@/lib/notify";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session.user.id;
}

const rowSchema = z
  .object({
    studentId: idSchema,
    reason: z.enum(["PROMOTED", "REPEATED", "CORRECTED", "GRADUATED", "WITHDRAWN"]),
    toClassId: idSchema.nullable(),
  })
  .refine(
    (row) => (row.reason === "GRADUATED" || row.reason === "WITHDRAWN") === (row.toClassId === null),
    { message: "A leaving student can't have a destination class, and a staying student needs one." }
  );

export type PromoteClassResult =
  | { ok: true; submitted: number; failed: number }
  | { ok: false; error: string };

/**
 * The bulk side of the Promotions screen — one row per student in a class,
 * each with its own reason and (usually) destination, decided by the admin
 * on /portal/admin/promotions/[classId] before this is ever called. Every
 * row goes through the exact same lib/class-change.ts's changeStudentClass
 * the single-student "Change class" button uses, so a bulk end-of-session
 * promotion and an individual correction are never two different code
 * paths that could quietly drift apart.
 *
 * Loops, not one big transaction, deliberately — the same choice
 * teacherSubmitAllAction (app/portal/(app)/teacher/grades/actions.ts) makes
 * for the same reason: forty students is a batch of forty independent real
 * events, not one atomic unit. One student's row failing (a class that was
 * deleted mid-review, say) must not roll back the other thirty-nine that
 * already succeeded — the admin sees exactly which ones need a retry
 * instead of starting over from zero.
 */
export async function promoteClassAction(
  fromClassId: string,
  rows: { studentId: string; reason: ClassChangeReason; toClassId: string | null }[]
): Promise<PromoteClassResult> {
  const adminUserId = await requireAdmin();

  const parsedClassId = idSchema.safeParse(fromClassId);
  if (!parsedClassId.success) {
    return { ok: false, error: "Class not found." };
  }

  if (rows.length === 0) {
    return { ok: true, submitted: 0, failed: 0 };
  }
  if (rows.length > 500) {
    return { ok: false, error: "Too many students in one batch. Please contact support." };
  }

  const parsedRows: { studentId: string; reason: ClassChangeReason; toClassId: string | null }[] = [];
  for (const row of rows) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid row." };
    }
    parsedRows.push(parsed.data);
  }

  const sessionSetting = await prisma.setting.findUnique({ where: { key: "currentSession" } });
  const currentSession = sessionSetting?.value ?? "";
  if (currentSession === "") {
    return {
      ok: false,
      error: "No academic session is set. Set the current session in Settings first.",
    };
  }

  // Every row must actually belong to the class this screen was opened
  // for — a defence against a stale client sending a studentId that has
  // since moved elsewhere, not something the UI can normally produce.
  const students = await prisma.student.findMany({
    where: { id: { in: parsedRows.map((r) => r.studentId) }, classId: fromClassId },
    select: { id: true },
  });
  const validIds = new Set(students.map((s) => s.id));

  let submitted = 0;
  const failures: string[] = [];

  for (const row of parsedRows) {
    if (!validIds.has(row.studentId)) {
      failures.push(row.studentId);
      continue;
    }
    const result = await changeStudentClass(prisma, {
      studentId: row.studentId,
      toClassId: row.toClassId,
      reason: row.reason,
      session: currentSession,
      changedById: adminUserId,
    });
    if (result.ok) {
      submitted += 1;
    } else {
      console.error("promoteClassAction row failed:", row.studentId, result.error);
      failures.push(row.studentId);
    }
  }

  if (submitted > 0) {
    try {
      const cls = await prisma.class.findUnique({ where: { id: fromClassId }, select: { name: true } });
      await notifyAdmins({
        type: "STUDENT_CLASS_CHANGED",
        title: "Students promoted",
        body: `${submitted} student${submitted === 1 ? "" : "s"} from ${cls?.name ?? "a class"} ${
          submitted === 1 ? "was" : "were"
        } moved for ${currentSession}.`,
        link: "/portal/admin/promotions",
      });
    } catch (err) {
      console.error("notifyAdmins(bulk STUDENT_CLASS_CHANGED) failed:", err);
    }
  }

  revalidatePath("/portal/admin/promotions");
  revalidatePath(`/portal/admin/promotions/${fromClassId}`);
  revalidatePath("/portal/admin/students");
  revalidatePath("/portal/student");
  revalidatePath("/portal", "layout");

  if (submitted === 0 && failures.length > 0) {
    return { ok: false, error: "Could not save these changes. Please try again." };
  }

  return { ok: true, submitted, failed: failures.length };
}
