import { z } from "zod";

// A plain calendar date, "YYYY-MM-DD" — what a native <input type="date">
// posts and what Attendance.date (@db.Date) expects. Same
// Date.parse-based check dob uses in lib/validation/student.ts, for the same
// reason: reject a malformed string before it reaches `new Date(...)`.
export const attendanceDateSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date");

export const attendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

export const attendanceInputSchema = z.object({
  studentId: z.string().min(1),
  date: attendanceDateSchema,
  status: attendanceStatusSchema,
});

export type AttendanceInputValues = z.infer<typeof attendanceInputSchema>;
