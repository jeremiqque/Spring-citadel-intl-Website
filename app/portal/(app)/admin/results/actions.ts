"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { idSchema, termSchema, sessionSchema } from "@/lib/validation/id";
import { compileClassResults } from "@/lib/term-result";
import { notifyAdmins, createNotification } from "@/lib/notify";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session.user.id;
}

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

export type CompileClassResultsResult = { ok: true; compiled: number } | { ok: false; error: string };

/**
 * "Compile class results" — the button. All the real logic lives in
 * lib/term-result.ts's compileClassResults(), which re-checks readiness
 * itself rather than trusting whatever the page rendered a moment ago (the
 * usual "server action re-derives, never trusts the client" rule this
 * codebase follows everywhere else).
 */
export async function compileClassResultsAction(
  classId: string,
  term: TermValue,
  session: string
): Promise<CompileClassResultsResult> {
  const adminId = await requireAdmin();

  const parsedClassId = idSchema.safeParse(classId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (!parsedClassId.success || !parsedTerm.success || !parsedSession.success) {
    return { ok: false, error: "Invalid class, term or session." };
  }

  const result = await compileClassResults(classId, term, session, adminId);

  if (result.ok) {
    revalidatePath("/portal/admin/results");
  }
  return result;
}

export type SaveRemarksResult = { ok: true } | { ok: false; error: string };

/**
 * Edit a single student's remarks on an already-compiled result. Only
 * touches the two remark fields — never the computed numbers, which only
 * compileClassResults() writes, so a remark edit can never accidentally
 * drift a result's average or position out of sync with its Grade rows.
 */
export async function saveResultRemarksAction(
  studentId: string,
  term: TermValue,
  session: string,
  values: { classTeacherRemark?: string; principalRemark?: string }
): Promise<SaveRemarksResult> {
  await requireAdmin();

  const parsedStudentId = idSchema.safeParse(studentId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (!parsedStudentId.success || !parsedTerm.success || !parsedSession.success) {
    return { ok: false, error: "Invalid student, term or session." };
  }

  try {
    await prisma.termResult.update({
      where: { studentId_term_session: { studentId, term, session } },
      data: {
        classTeacherRemark: values.classTeacherRemark ?? null,
        principalRemark: values.principalRemark ?? null,
      },
    });
  } catch (err) {
    console.error("saveResultRemarksAction failed:", err);
    return { ok: false, error: "Could not save. The result may not be compiled yet." };
  }

  revalidatePath("/portal/admin/results");
  return { ok: true };
}

export type PublishClassResultsResult =
  | { ok: true; published: number }
  | { ok: false; error: string };

/**
 * Publish every COMPILED result for a class/term in one click — the event
 * that actually makes a result reach a student (see the visibility rule in
 * the plan doc: students only ever see PUBLISHED, never DRAFT or COMPILED).
 * One notification per student, same "bulk write, one notification per
 * person affected, not per row" pattern as teacherSubmitAllAction and
 * teacherSubmitAllPsychomotorAction — an admin publishing a class of forty
 * results should not fan out forty identical rows into every admin's own
 * inbox.
 */
export async function publishClassResultsAction(
  classId: string,
  term: TermValue,
  session: string
): Promise<PublishClassResultsResult> {
  await requireAdmin();

  const parsedClassId = idSchema.safeParse(classId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (!parsedClassId.success || !parsedTerm.success || !parsedSession.success) {
    return { ok: false, error: "Invalid class, term or session." };
  }

  const compiled = await prisma.termResult.findMany({
    where: { classId, term, session, status: "COMPILED" },
    include: { student: { select: { userId: true, user: { select: { name: true } } } } },
  });

  if (compiled.length === 0) {
    return { ok: false, error: "No compiled results are ready to publish for this class." };
  }

  const now = new Date();
  try {
    await prisma.termResult.updateMany({
      where: { id: { in: compiled.map((r) => r.id) } },
      data: { status: "PUBLISHED", publishedAt: now },
    });
  } catch (err) {
    console.error("publishClassResultsAction failed:", err);
    return { ok: false, error: "Could not publish. Please try again." };
  }

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
  const termLabel = term.replace("_", " ");

  try {
    await Promise.all(
      compiled.map((r) =>
        createNotification({
          userId: r.student.userId,
          type: "RESULT_PUBLISHED",
          title: "Your result is ready",
          body: `Your ${termLabel} result for ${cls?.name ?? "your class"} has been published.`,
          link: "/portal/student",
        })
      )
    );
    await notifyAdmins({
      type: "RESULT_PUBLISHED",
      title: "Results published",
      body: `${compiled.length} result${compiled.length === 1 ? "" : "s"} published for ${cls?.name ?? "a class"}, ${termLabel}.`,
      link: `/portal/admin/results?class=${classId}&term=${term}`,
    });
  } catch (err) {
    console.error("notify(RESULT_PUBLISHED) failed:", err);
  }

  revalidatePath("/portal/admin/results");
  revalidatePath("/portal/student");
  revalidatePath("/portal/notifications");
  revalidatePath("/portal", "layout");

  return { ok: true, published: compiled.length };
}
