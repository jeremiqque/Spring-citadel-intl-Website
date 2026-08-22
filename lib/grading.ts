import type { LetterGrade } from "@prisma/client";

/**
 * Grading policy — bands and the at-risk rule.
 *
 * ── WHY THIS IS CONFIGURATION AND NOT CONSTANTS ────────────────────────────
 * These numbers were placeholders hardcoded in this file, carrying a comment
 * saying "NOT YET CONFIRMED BY THE SCHOOL — confirm before grade entry
 * ships." Grade entry is now shipping, and the numbers are still unconfirmed.
 *
 * Hardcoding them meant the school's eventual answer required a code change,
 * a rebuild and a redeploy — for a policy question the school owns and may
 * revisit every session. Worse, it made the placeholder invisible: a letter
 * grade on a child's report looks equally authoritative whether the cutoff
 * behind it was agreed in a staff meeting or guessed by a developer.
 *
 * So the bands and the at-risk rule now live in the Setting table, next to
 * currentSession and currentTerm — which are already database-backed for
 * exactly this reason ("so the school can roll into a new term from the admin
 * UI without a code change and a redeploy"). The values below are the
 * DEFAULTS used when no Setting row exists; they are the same numbers this
 * file has always used, so nothing changes behaviourally until someone
 * deliberately changes it.
 *
 * Anything that RECORDS a grade must read the live config. Anything that
 * merely displays one may use the defaults, but shouldn't — see the call
 * sites, which all load it.
 *
 * ── WHY THE LOADER IS NOT IN THIS FILE ─────────────────────────────────────
 * This module is imported by CLIENT components (the grade-entry row bands a
 * running total into a letter as the teacher types; the settings form runs
 * validateGradingConfig() before enabling Save). So it must stay free of
 * Prisma — importing lib/prisma here would pull the query engine into the
 * browser bundle and fail the build. getGradingConfig() and
 * saveGradingConfig() therefore live in lib/grading-settings.ts, which is
 * server-only. The pure banding maths lives here, where both sides can use
 * the one copy of it.
 */

export type GradeBands = {
  /** Minimum total for an A. */
  A: number;
  B: number;
  C: number;
  D: number;
  // Anything below D is F. There is no "F cutoff" because F is the floor.
};

export type GradingConfig = {
  bands: GradeBands;
  /**
   * A term average strictly below this marks a student AT_RISK. At or above
   * it, ACTIVE. Historically pinned to the D cutoff; kept separate because
   * "failing" and "needs intervention" are different questions and the school
   * may well answer them with different numbers.
   */
  atRiskThreshold: number;
  /**
   * How many SUBMITTED subjects a student needs in the term before the
   * at-risk rule is allowed to fire at all. One subject is not a term
   * average — flagging on the first submitted grade meant a single low mark
   * set the flag before a second data point existed.
   */
  atRiskMinSubjects: number;
};

/** Standard Nigerian secondary scale. Still the default, still unconfirmed. */
export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  bands: { A: 70, B: 60, C: 50, D: 45 },
  atRiskThreshold: 45,
  atRiskMinSubjects: 3,
};

/** Setting.key values. One place, so a typo can't split reads from writes. */
export const GRADING_KEYS = {
  bands: "gradeBands",
  atRiskThreshold: "atRiskThreshold",
  atRiskMinSubjects: "atRiskMinSubjects",
} as const;

/**
 * Score -> letter.
 *
 * `config` is optional and defaults to DEFAULT_GRADING_CONFIG so that a
 * synchronous caller (a client component, a test) still works. Every server
 * call site passes the loaded config — grep for getGradingConfig().
 */
export function scoreToLetter(
  total: number,
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): LetterGrade {
  const { bands } = config;
  if (total >= bands.A) return "A";
  if (total >= bands.B) return "B";
  if (total >= bands.C) return "C";
  if (total >= bands.D) return "D";
  return "F";
}

export function average(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Validate a candidate config.
 *
 * Bands must be strictly descending. A non-descending set is not a cosmetic
 * problem: scoreToLetter() tests them in order, so B >= A makes the A branch
 * unreachable and silently deletes a grade from the scale. Returns a list of
 * human-readable problems; empty means valid.
 */
export function validateGradingConfig(config: GradingConfig): string[] {
  const errors: string[] = [];
  const { A, B, C, D } = config.bands;
  const entries: [string, number][] = [
    ["A", A],
    ["B", B],
    ["C", C],
    ["D", D],
  ];

  for (const [name, value] of entries) {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      errors.push(`The ${name} cutoff must be a whole number between 0 and 100.`);
    }
  }

  if (!(A > B && B > C && C > D)) {
    errors.push("Cutoffs must decrease from A to D — each grade needs a band of its own.");
  }

  if (
    !Number.isInteger(config.atRiskThreshold) ||
    config.atRiskThreshold < 0 ||
    config.atRiskThreshold > 100
  ) {
    errors.push("The at-risk threshold must be a whole number between 0 and 100.");
  }

  if (!Number.isInteger(config.atRiskMinSubjects) || config.atRiskMinSubjects < 1) {
    errors.push("At-risk needs at least 1 submitted subject before it can apply.");
  }

  return errors;
}
