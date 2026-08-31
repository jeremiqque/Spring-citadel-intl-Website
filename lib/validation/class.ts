import { z } from "zod";
import { LEVEL_VALUES, type Level } from "@/lib/validation/subject";

// Same four levels a subject can run at (see lib/validation/subject.ts) — a
// class and the subjects taught in it share one curriculum vocabulary, so
// the values are imported from there rather than re-listed.
export { LEVEL_VALUES };
export type { Level };

/**
 * `code` feeds every admission number issued to this class for as long as
 * it exists — "SCIS/2026/JSS3/001", see lib/ids.ts's nextAdmissionNo — and
 * those numbers go on paper records the school keeps for years. Two things
 * follow from that:
 *   1. No "/" — nextAdmissionNo splices the code straight into a
 *      "/"-separated string, and auth.ts's identifyCredential() tells an
 *      admission number apart from a staff ID by counting "/"-segments. A
 *      code containing one would silently corrupt every admission number
 *      minted from it and could make a login credential unrecognisable.
 *   2. There is no updateClassAction — see actions.ts and page.tsx's own
 *      comments for why a class's code (and therefore this schema) is
 *      write-once, not editable after creation.
 */
export const classFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the class's name"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Enter a class code")
    .max(10, "Code is too long")
    .regex(/^[A-Z0-9]+$/, "Use letters and numbers only — no spaces or slashes"),
  level: z.enum(LEVEL_VALUES),
});

export type ClassFormValues = z.infer<typeof classFormSchema>;

/**
 * Whether grading is turned on for a class is decided by its level, not
 * typed in by an admin — see admin/classes/page.tsx's long-standing comment
 * on why an open toggle here is a trap: turning it on for a level the school
 * has no 20/30/50 assessment scheme for would hand teachers a marking sheet
 * that doesn't correspond to anything. Mirrors prisma/seed.ts's own
 * GRADED_LEVELS = [JSS, SS].
 */
const GRADED_LEVELS: Level[] = ["JSS", "SS"];
export function gradingEnabledForLevel(level: Level): boolean {
  return GRADED_LEVELS.includes(level);
}
