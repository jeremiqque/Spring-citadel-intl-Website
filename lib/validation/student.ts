import { z } from "zod";

// One schema, two consumers: the create/edit form (client-side, via
// zodResolver) and the Server Actions behind it (server-side, on the raw
// values) — so a validation rule can never drift between what the form
// checks and what the database actually accepts.
//
// admissionNo is deliberately NOT a field here: it's generated server-side
// by lib/ids.ts's nextAdmissionNo(), inside the same transaction that
// creates the row, never typed in by an admin.
// Every admission-form field below is optional at the schema level: the
// office may not have all of it in hand at enrolment, and none of it gates
// creating the login/admission-number pair the rest of the flow depends on.
// z.string().trim().optional() rather than .nullable() because the form
// posts "" for an untouched field, not null — the create/update actions
// normalize "" to null before writing to the (nullable) database columns.
const optionalText = () => z.string().trim().optional();

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

  // ─── Admission-form fields ──────────────────────────────────────────────
  nationality: optionalText(),
  motherTongue: optionalText(),
  placeOfBirth: optionalText(),
  previousSchool: optionalText(),

  sibling1Name: optionalText(),
  sibling1Class: optionalText(),
  sibling2Name: optionalText(),
  sibling2Class: optionalText(),
  sibling3Name: optionalText(),
  sibling3Class: optionalText(),

  fatherName: optionalText(),
  fatherNationality: optionalText(),
  fatherState: optionalText(),
  fatherProfession: optionalText(),
  fatherEmployer: optionalText(),
  fatherPoBox: optionalText(),
  fatherAddress: optionalText(),
  fatherPhone: optionalText(),
  fatherEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),

  motherName: optionalText(),
  motherNationality: optionalText(),
  motherState: optionalText(),
  motherProfession: optionalText(),
  motherEmployer: optionalText(),
  motherPoBox: optionalText(),
  motherAddress: optionalText(),
  motherPhone: optionalText(),
  motherEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),

  // The enrolment passport photograph — a data: URL staged client-side by
  // StudentPhotoPicker (see admin/students/student-photo-picker.tsx), decoded
  // and validated for real server-side by lib/avatar.ts's decodeAvatarUpload
  // before anything is written. Optional, same as the rest of this form: the
  // office may take the photo later rather than at enrolment.
  photo: z.string().optional(),
});

// Converts "" (what an empty text input posts) to undefined so
// createStudentAction/updateStudentAction can write it straight through as
// Prisma's `undefined` (leave unset / don't touch) vs. an explicit null.
export function blankToUndefined(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

export type StudentFormValues = z.infer<typeof studentFormSchema>;
