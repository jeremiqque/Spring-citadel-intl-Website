import { prisma } from "@/lib/prisma";
import { parseTerm } from "@/lib/validation/id";

export type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

export const TERM_LABEL: Record<TermValue, string> = {
  TERM_1: "First Term",
  TERM_2: "Second Term",
  TERM_3: "Third Term",
};

export const TERM_ORDER: TermValue[] = ["TERM_1", "TERM_2", "TERM_3"];

/**
 * The admin-set "live" session/term — Setting rows currentSession/
 * currentTerm, same two keys settings/actions.ts's setAcademicPeriodAction
 * already writes. Every screen that shows a term selector already reads
 * these as a default; this is the same read, centralised so the *lock*
 * (below) and every future call site agree on exactly what "current" means
 * instead of each re-deriving it slightly differently.
 */
export async function getCurrentPeriod(): Promise<{ session: string; term: TermValue | null }> {
  const [sessionSetting, termSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "currentSession" } }),
    prisma.setting.findUnique({ where: { key: "currentTerm" } }),
  ]);
  return {
    session: sessionSetting?.value ?? "",
    term: parseTerm(termSetting?.value) ?? null,
  };
}

/**
 * The actual term lock. Only the admin's current session/term is open for
 * TEACHER entry — grade sheets, psychomotor ratings. A term that has been
 * left behind (or one that hasn't opened yet) is view-only for teachers
 * until an admin moves the live term back onto it; admins are never subject
 * to this check (adminSaveGradeAction, adminSavePsychomotorAction and the
 * results compile/publish actions call requireAdmin() instead and keep
 * editing any term directly, by design — see the settings discussion this
 * came out of).
 *
 * Call this AFTER shape validation (termSchema/sessionSchema) and BEFORE any
 * write, same position teacherSaveGradeAction's other four ordered checks
 * already occupy.
 */
export async function assertCurrentTerm(
  term: TermValue,
  session: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await getCurrentPeriod();

  if (!current.term || !current.session) {
    return {
      ok: false,
      error: "No current term is set. An administrator must set the current session and term first.",
    };
  }

  if (term !== current.term || session !== current.session) {
    return {
      ok: false,
      error: `${TERM_LABEL[term]} isn't open for entry right now — ${TERM_LABEL[current.term]} (${current.session}) is the current term. Ask an administrator to reopen this term if you need to make a change here.`,
    };
  }

  return { ok: true };
}
