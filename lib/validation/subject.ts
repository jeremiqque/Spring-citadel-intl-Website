import { z } from "zod";

// Mirrors the Level and SubjectStream enums in prisma/schema.prisma. Zod has
// no way to import a Prisma enum directly into a client-safe module (this
// file is imported from a "use client" form as well as the server actions
// behind it), so the values are re-listed here — the same trade every other
// schema in lib/validation/ makes.
export const LEVEL_VALUES = ["EARLY_YEARS", "PRIMARY", "JSS", "SS"] as const;
export const STREAM_VALUES = ["CORE", "SCIENCE", "ARTS", "COMMERCIAL"] as const;

/**
 * A subject's `code` doubles as its unique key at the database level
 * (`Subject.code @unique`) and shows up read-only elsewhere (grade sheets,
 * report cards), so it is deliberately narrow: uppercase letters, digits and
 * "/" only, no spaces. Normalised to uppercase before validation so "acc" and
 * "ACC" collide here rather than becoming two subjects that only differ by
 * case.
 */
export const subjectFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the subject's name"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Enter a subject code")
    .max(20, "Code is too long")
    .regex(/^[A-Z0-9/]+$/, "Use letters, numbers and / only"),
  levels: z.array(z.enum(LEVEL_VALUES)).min(1, "Select at least one level"),
  streams: z.array(z.enum(STREAM_VALUES)),
  compulsory: z.boolean(),
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;
