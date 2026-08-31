"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { subjectFormSchema, type SubjectFormValues } from "@/lib/validation/subject";
import { idSchema } from "@/lib/validation/id";

// Defense in depth, not the real gate: middleware's authorized() callback
// already keeps a non-admin session from ever reaching a page that could
// call these. This exists because a Server Action is still a live network
// endpoint underneath the page.
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export type CreateSubjectResult = { ok: true; subjectId: string } | { ok: false; error: string };

/**
 * Curriculum management, promoted from a seed-script-only change to an admin
 * action. `levels` is the whole of "which classes teach this subject" — see
 * page.tsx's grouping and Subject.levels' own comment in schema.prisma —
 * there is no per-class override, so adding a level here adds the subject to
 * every class at that level at once, and removing one (via
 * updateSubjectAction) takes it out of every class at that level at once.
 */
export async function createSubjectAction(values: SubjectFormValues): Promise<CreateSubjectResult> {
  await requireAdmin();

  const parsed = subjectFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  // Checked ahead of the write, same style as admin/admins/actions.ts's email
  // check — a friendly "already exists" beats surfacing a raw database
  // constraint error to the person who just typed a duplicate code.
  const existing = await prisma.subject.findUnique({ where: { code: data.code } });
  if (existing) {
    return { ok: false, error: `A subject with the code "${data.code}" already exists.` };
  }

  try {
    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        code: data.code,
        levels: data.levels,
        streams: data.streams,
        compulsory: data.compulsory,
      },
    });

    revalidatePath("/portal/admin/subjects");
    return { ok: true, subjectId: subject.id };
  } catch (err) {
    console.error("createSubjectAction failed:", err);
    return { ok: false, error: "Could not create the subject. Please try again." };
  }
}

export type UpdateSubjectResult = { ok: true } | { ok: false; error: string };

export async function updateSubjectAction(
  subjectId: string,
  values: SubjectFormValues
): Promise<UpdateSubjectResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(subjectId);
  if (!parsedId.success) {
    return { ok: false, error: "Subject not found." };
  }

  const parsed = subjectFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const existing = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!existing) {
    return { ok: false, error: "Subject not found." };
  }

  // A code change could collide with a DIFFERENT subject's code — excluded
  // by id, or editing a subject without touching its code would trip over
  // itself.
  if (data.code !== existing.code) {
    const collision = await prisma.subject.findUnique({ where: { code: data.code } });
    if (collision) {
      return { ok: false, error: `A subject with the code "${data.code}" already exists.` };
    }
  }

  try {
    await prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: data.name,
        code: data.code,
        levels: data.levels,
        streams: data.streams,
        compulsory: data.compulsory,
      },
    });
  } catch (err) {
    console.error("updateSubjectAction failed:", err);
    return { ok: false, error: "Could not save changes. Please try again." };
  }

  revalidatePath("/portal/admin/subjects");
  return { ok: true };
}

export type DeleteSubjectResult = { ok: true } | { ok: false; error: string };

/**
 * Deleting a subject that has ANY grade history is refused, not attempted —
 * Grade.subjectId is `onDelete: Restrict` precisely so a hard delete can
 * never erase a child's results (see the comment on that relation in
 * schema.prisma), so this checks first and gives the admin a next step
 * instead of letting the database throw a raw constraint error.
 *
 * A subject with no grades yet but WITH teacher assignments can still be
 * deleted — TeacherAssignment.subjectId is `onDelete: Cascade`, and removing
 * a subject that turned out to be a mistake (wrong code typed at creation,
 * duplicate entry) should not first require someone to manually unassign
 * every teacher from it.
 */
export async function deleteSubjectAction(subjectId: string): Promise<DeleteSubjectResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(subjectId);
  if (!parsedId.success) {
    return { ok: false, error: "Subject not found." };
  }

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return { ok: false, error: "Subject not found." };
  }

  const gradeCount = await prisma.grade.count({ where: { subjectId } });
  if (gradeCount > 0) {
    return {
      ok: false,
      error: `${subject.name} has grade records on file and can't be deleted. Remove all its levels instead to retire it without losing history.`,
    };
  }

  try {
    await prisma.subject.delete({ where: { id: subjectId } });
  } catch (err) {
    console.error("deleteSubjectAction failed:", err);
    return { ok: false, error: "Could not delete the subject. Please try again." };
  }

  revalidatePath("/portal/admin/subjects");
  return { ok: true };
}
