import { z } from "zod";

/**
 * Runtime validation for identifiers and enums crossing a server-action
 * boundary.
 *
 * WHY THIS EXISTS — every action in this app Zod-parsed its `values` payload
 * and then passed its ID arguments straight through:
 *
 *   deleteStudentAction(studentId: string)
 *   setTeacherStatusAction(teacherId: string, status: "ACTIVE" | ...)
 *   adminSaveGradeAction(classId, term, session, values, submit)
 *
 * TypeScript types are erased at runtime. A server action is a live HTTP
 * endpoint, so those unions are documentation, not checks — a crafted POST
 * could send anything. Most of them happened to fail closed because Prisma
 * throws on an unknown enum value, but that is accident, not design, and
 * `session: string` did NOT fail closed: any string was accepted and wrote
 * grade rows filed under a session label no screen ever queries.
 */

/** Every id in this schema is a uuid (`@default(uuid())`). */
export const idSchema = z.string().uuid();

export const termSchema = z.enum(["TERM_1", "TERM_2", "TERM_3"]);

export const teacherStatusSchema = z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"]);

/**
 * Academic session label, e.g. "2026/2027".
 *
 * Deliberately strict. `session` is part of Grade's unique key, so a typo
 * doesn't error — it silently files results under a session nothing reads.
 * The format is also what makes `orderBy: { session: "desc" }` sort
 * correctly, since the column is a plain string with no calendar behind it.
 */
export const sessionSchema = z
  .string()
  .regex(/^\d{4}\/\d{4}$/, "Session must look like 2026/2027")
  .refine((v) => {
    const [start, end] = v.split("/").map(Number);
    return end === start + 1;
  }, "Session must span consecutive years, e.g. 2026/2027");

/**
 * Read a term out of an untrusted string (a URL param, a Setting row someone
 * hand-edited) and fall back rather than throwing.
 *
 * Exists because `params.term as TermValue` is an unchecked assertion that
 * goes straight into a Prisma `where` clause. One stale or mistyped link —
 * ?term=Term1 — produced a PrismaClientValidationError and replaced the whole
 * grades screen with the error boundary. A bad term in a link should show the
 * default term, not an error page.
 */
export function parseTerm(
  raw: string | null | undefined
): "TERM_1" | "TERM_2" | "TERM_3" | null {
  const result = termSchema.safeParse(raw);
  return result.success ? result.data : null;
}
