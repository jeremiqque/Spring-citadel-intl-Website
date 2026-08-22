import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_GRADING_CONFIG,
  GRADING_KEYS,
  validateGradingConfig,
  type GradeBands,
  type GradingConfig,
} from "@/lib/grading";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * SERVER ONLY. The database half of the grading policy.
 *
 * Split from lib/grading.ts because that module is imported by client
 * components and this one imports Prisma — see the comment there.
 */

/**
 * Read the live config from Setting rows.
 *
 * FAILS SAFE, NOT CLOSED. A missing row, malformed JSON, a value someone
 * typed straight into the database, or a dropped connection all fall back to
 * DEFAULT_GRADING_CONFIG rather than throwing. The alternative — a grade
 * write that 500s because a settings row is malformed — is worse: it blocks
 * a teacher from recording marks over a configuration problem they cannot
 * see or fix.
 */
export async function getGradingConfig(db: Db = prisma): Promise<GradingConfig> {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await db.setting.findMany({
      where: { key: { in: Object.values(GRADING_KEYS) } },
      select: { key: true, value: true },
    });
  } catch (err) {
    console.error("[grading] could not read grading settings, using defaults:", err);
    return DEFAULT_GRADING_CONFIG;
  }

  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  // A MISSING row falls back to the default for that field — that is the
  // normal state before the school has set anything, and each field is
  // independent. A PRESENT BUT UNREADABLE row does not: see parseBands.
  const bands = byKey.has(GRADING_KEYS.bands)
    ? parseBands(byKey.get(GRADING_KEYS.bands))
    : DEFAULT_GRADING_CONFIG.bands;
  const atRiskThreshold = byKey.has(GRADING_KEYS.atRiskThreshold)
    ? parseInteger(byKey.get(GRADING_KEYS.atRiskThreshold))
    : DEFAULT_GRADING_CONFIG.atRiskThreshold;
  const atRiskMinSubjects = byKey.has(GRADING_KEYS.atRiskMinSubjects)
    ? parseInteger(byKey.get(GRADING_KEYS.atRiskMinSubjects))
    : DEFAULT_GRADING_CONFIG.atRiskMinSubjects;

  if (bands === null || atRiskThreshold === null || atRiskMinSubjects === null) {
    console.error(
      "[grading] a stored grading setting is unreadable, using defaults for the whole policy"
    );
    return DEFAULT_GRADING_CONFIG;
  }

  const candidate: GradingConfig = { bands, atRiskThreshold, atRiskMinSubjects };

  const errors = validateGradingConfig(candidate);
  if (errors.length > 0) {
    console.error("[grading] stored grading config is invalid, using defaults:", errors);
    return DEFAULT_GRADING_CONFIG;
  }

  return candidate;
}

/** Write the config back. Callers must validate first. */
export async function saveGradingConfig(config: GradingConfig, db: Db = prisma) {
  const pairs: [string, string][] = [
    [GRADING_KEYS.bands, JSON.stringify(config.bands)],
    [GRADING_KEYS.atRiskThreshold, String(config.atRiskThreshold)],
    [GRADING_KEYS.atRiskMinSubjects, String(config.atRiskMinSubjects)],
  ];
  for (const [key, value] of pairs) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

/**
 * All-or-nothing, deliberately.
 *
 * The first version of this fell back PER FIELD, which is worse than either
 * extreme. A row of {"A":80,"B":75,"C":"70","D":45} — one field quoted by
 * whoever hand-edited it — silently became A:80 B:75 C:50 D:45: a mixture of
 * the school's policy and the developer defaults, which then PASSED
 * validateGradingConfig() because the mixture happened to still descend. A
 * student totalling 72 would be stamped C instead of B, permanently, on a
 * published report, with nothing anywhere indicating a problem.
 *
 * Returning null for a partially-unreadable row makes the caller fall back to
 * DEFAULT_GRADING_CONFIG wholesale and log it — which is what this module's
 * fail-safe story claims to do, and is at least a coherent state.
 */
function parseBands(raw: string | undefined): GradeBands | null {
  if (raw === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const bands = {
      A: strictInteger(obj.A),
      B: strictInteger(obj.B),
      C: strictInteger(obj.C),
      D: strictInteger(obj.D),
    };
    if (Object.values(bands).some((v) => v === null)) return null;
    return bands as GradeBands;
  } catch {
    return null;
  }
}

/**
 * `Number("")` is 0, and 0 is an integer — so an empty or whitespace-only
 * Setting row used to parse as a threshold of ZERO, which silently disables
 * the at-risk rule forever (no average is below 0). Reject it instead.
 */
function parseInteger(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

function strictInteger(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) ? raw : null;
}
