import { z } from "zod";

// Shared by teacher grade entry and admin grade editing — one schema, one
// set of bounds, so "the same validated action as the teacher's" stays
// literally true. The 20/30/50 split is the school's assessment scheme; it
// is NOT configurable the way the letter bands now are, because changing it
// would change what a `total` out of 100 even means for rows already
// written.
export const gradeInputSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  assignment: z.coerce.number().int().min(0).max(20),
  midterm: z.coerce.number().int().min(0).max(30),
  exam: z.coerce.number().int().min(0).max(50),
});
