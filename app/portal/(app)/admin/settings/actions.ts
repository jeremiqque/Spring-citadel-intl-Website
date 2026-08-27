"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { termSchema, sessionSchema } from "@/lib/validation/id";
import { type GradingConfig, validateGradingConfig } from "@/lib/grading";
import { saveGradingConfig } from "@/lib/grading-settings";

// Defense in depth, not the real gate: middleware already keeps a non-ADMIN
// session from reaching any /portal/admin/* page. Same pattern as
// admin/grades/actions.ts.
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export type SettingsResult = { ok: true } | { ok: false; error: string };

/**
 * Set the current academic session and term.
 *
 * These two rows were previously only reachable by someone with database
 * access — the grades page literally told admins to "ask whoever administers
 * the database." That is a strange thing to require for a value the school
 * changes three times a year, and with no session set, grade entry is
 * disabled outright (session is part of Grade's unique key).
 *
 * Changing them is NOT destructive: existing Grade rows keep the session and
 * term they were written with. What it changes is which term every screen
 * reads by default and which term new grades are filed under.
 */
export async function setAcademicPeriodAction(
  session: string,
  term: string
): Promise<SettingsResult> {
  await requireAdmin();

  const parsedSession = sessionSchema.safeParse(session.trim());
  if (!parsedSession.success) {
    return {
      ok: false,
      error: parsedSession.error.issues[0]?.message ?? "Invalid session.",
    };
  }

  const parsedTerm = termSchema.safeParse(term);
  if (!parsedTerm.success) {
    return { ok: false, error: "Invalid term." };
  }

  try {
    for (const [key, value] of [
      ["currentSession", parsedSession.data],
      ["currentTerm", parsedTerm.data],
    ] as const) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  } catch (err) {
    console.error("setAcademicPeriodAction failed:", err);
    return { ok: false, error: "Could not save. Please try again." };
  }

  revalidateEverythingSettingsTouch();
  return { ok: true };
}

/**
 * Set the grade bands and the at-risk rule.
 *
 * Validation runs here, not only in the form: a server action is a live HTTP
 * endpoint and the client-side checks are a convenience. validateGradingConfig
 * is the same function the form calls, so the two can't drift.
 *
 * Note on blast radius, stated plainly because it is easy to get wrong:
 * changing the bands does NOT rewrite Grade.grade on rows already written.
 * Stored letters stay as they were published; only future writes and
 * live-computed averages use the new bands. See lib/grades.ts.
 */
export async function setGradingConfigAction(
  input: GradingConfig
): Promise<SettingsResult> {
  await requireAdmin();

  // Re-shape defensively: the argument crosses the network as JSON, so its
  // TypeScript type is documentation, not a check.
  const candidate: GradingConfig = {
    bands: {
      A: Number(input?.bands?.A),
      B: Number(input?.bands?.B),
      C: Number(input?.bands?.C),
      D: Number(input?.bands?.D),
    },
    atRiskThreshold: Number(input?.atRiskThreshold),
    atRiskMinSubjects: Number(input?.atRiskMinSubjects),
  };

  const errors = validateGradingConfig(candidate);
  if (errors.length > 0) {
    return { ok: false, error: errors[0] };
  }

  try {
    await saveGradingConfig(candidate);
  } catch (err) {
    console.error("setGradingConfigAction failed:", err);
    return { ok: false, error: "Could not save. Please try again." };
  }

  revalidateEverythingSettingsTouch();
  return { ok: true };
}

/**
 * Both settings feed letters, averages and default terms on every results
 * screen in the portal, for all three roles. Revalidating only the settings
 * page would leave a student looking at a letter grade computed from the old
 * bands until their next hard reload.
 */
function revalidateEverythingSettingsTouch() {
  revalidatePath("/portal/admin/settings");
  revalidatePath("/portal/admin/settings/academic-period");
  revalidatePath("/portal/admin/settings/grading-policy");
  revalidatePath("/portal/admin");
  revalidatePath("/portal/admin/grades");
  revalidatePath("/portal/teacher");
  revalidatePath("/portal/teacher/grades");
  revalidatePath("/portal/teacher/classes");
  revalidatePath("/portal/student");
  revalidatePath("/portal/student/grades");
  revalidatePath("/portal", "layout");
}
