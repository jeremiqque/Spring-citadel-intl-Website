import { z } from "zod";

// admissionNo has no teacher equivalent to worry about here, but staffId is
// the same story as Student's admissionNo: generated server-side by
// lib/ids.ts's nextStaffId(), inside the create transaction, never typed in.
export const teacherFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the teacher's full name"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  gender: z.enum(["MALE", "FEMALE"], { message: "Select a gender" }),
  // Optional: a teacher can exist before the school has assigned them a
  // headline subject — what they can actually grade is governed by
  // TeacherAssignment rows, added separately after creation.
  primarySubjectId: z.string().optional(),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;
