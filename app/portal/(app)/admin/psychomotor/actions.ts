"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { psychomotorInputSchema } from "@/lib/validation/psychomotor";
import { idSchema, termSchema, sessionSchema } from "@/lib/validation/id";
import { upsertPsychomotorRating } from "@/lib/psychomotor";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export type SavePsychomotorResult = { ok: true } | { ok: false; error: string };

// The admin twin of admin/grades/actions.ts's adminSaveGradeAction: "the
// same validated action as the form teacher's, without the ownership
// check." An admin can rate any class's students, including one with no
// form teacher assigned yet.
export async function adminSavePsychomotorAction(
  classId: string,
  term: "TERM_1" | "TERM_2" | "TERM_3",
  session: string,
  values: {
    studentId: string;
    punctuality: number;
    neatness: number;
    honesty: number;
    leadership: number;
    cooperation: number;
    handwriting: number;
    sports: number;
    remark?: string;
  },
  submit = false
): Promise<SavePsychomotorResult> {
  await requireAdmin();

  if (session.trim() === "") {
    return {
      ok: false,
      error:
        "No academic session is set. An administrator must set the current session before ratings can be recorded.",
    };
  }

  const parsedClassId = idSchema.safeParse(classId);
  const parsedTerm = termSchema.safeParse(term);
  const parsedSession = sessionSchema.safeParse(session);
  if (!parsedClassId.success || !parsedTerm.success || !parsedSession.success) {
    return { ok: false, error: "Invalid class, term or session." };
  }

  const parsed = psychomotorInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { formTeacherId: true } });
  const existing = await prisma.psychomotorRating.findUnique({
    where: {
      studentId_term_session: { studentId: parsed.data.studentId, term, session },
    },
  });

  // A rating always needs a ratedById — attribute it to the class's form
  // teacher when there is one, falling back to whatever the row already had.
  // If neither exists (no form teacher ever assigned, brand-new row), an
  // admin correction has nobody truthful to attribute it to.
  const ratedById = cls?.formTeacherId ?? existing?.ratedById;
  if (!ratedById) {
    return { ok: false, error: "No form teacher is assigned to this class yet." };
  }

  try {
    await upsertPsychomotorRating(prisma, {
      studentId: parsed.data.studentId,
      classId,
      term,
      session,
      ratedById,
      punctuality: parsed.data.punctuality,
      neatness: parsed.data.neatness,
      honesty: parsed.data.honesty,
      leadership: parsed.data.leadership,
      cooperation: parsed.data.cooperation,
      handwriting: parsed.data.handwriting,
      sports: parsed.data.sports,
      remark: parsed.data.remark,
      status: submit || existing?.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT",
    });
  } catch (err) {
    console.error("adminSavePsychomotorAction failed:", err);
    return { ok: false, error: "Could not save this rating. Please try again." };
  }

  revalidatePath("/portal/admin/psychomotor");
  revalidatePath("/portal/teacher/psychomotor");
  revalidatePath("/portal", "layout");

  return { ok: true };
}
