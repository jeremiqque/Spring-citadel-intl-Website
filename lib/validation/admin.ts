import { z } from "zod";

// Unlike Teacher/Student, an admin's email IS their login credential (see
// lib/ids.ts's comment on nextStaffId: "the admin account logs in with
// email... every teacher added afterwards gets the next number" — admins
// never get a minted ID). So this is real, user-typed input, not a
// server-generated internal address, and has to be validated and checked
// for uniqueness accordingly.
export const adminFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the admin's full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type AdminFormValues = z.infer<typeof adminFormSchema>;
