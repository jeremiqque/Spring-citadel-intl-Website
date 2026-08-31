import { z } from "zod";

// One row per student per term — no subjectId, unlike gradeInputSchema,
// because psychomotor/affective traits aren't scored per subject. 1-5 for
// every trait, per the standard Nigerian rubric decided for Phase 1 (see
// docs/planning/result-management-and-attendance-plan.md, decision #1).
export const psychomotorInputSchema = z.object({
  studentId: z.string().min(1),
  punctuality: z.coerce.number().int().min(1).max(5),
  neatness: z.coerce.number().int().min(1).max(5),
  honesty: z.coerce.number().int().min(1).max(5),
  leadership: z.coerce.number().int().min(1).max(5),
  cooperation: z.coerce.number().int().min(1).max(5),
  handwriting: z.coerce.number().int().min(1).max(5),
  sports: z.coerce.number().int().min(1).max(5),
  remark: z.string().trim().max(500, "Keep the remark under 500 characters").optional(),
});

export type PsychomotorInputValues = z.infer<typeof psychomotorInputSchema>;
