import { z } from "zod";

// One schema, two consumers: the create/edit form (client-side, via
// zodResolver) and the Server Actions behind it (server-side, on the raw
// values) — so a validation rule can never drift between what the form
// checks and what the database actually accepts.
//
// admissionNo is deliberately NOT a field here: it's generated server-side
// by lib/ids.ts's nextAdmissionNo(), inside the same transaction that
// creates the row, never typed in by an admin.
export const studentFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the student's full name"),
  dob: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date of birth"),
  gender: z.enum(["MALE", "FEMALE"], { message: "Select a gender" }),
  classId: z.string().min(1, "Select a class"),
  guardianName: z.string().trim().min(2, "Enter the guardian's full name"),
  guardianPhone: z.string().trim().min(7, "Enter a valid phone number"),
  address: z.string().trim().min(5, "Enter the guardian's address"),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
