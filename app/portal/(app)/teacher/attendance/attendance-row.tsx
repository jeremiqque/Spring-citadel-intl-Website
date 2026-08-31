"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { teacherSaveAttendanceAction } from "./actions";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";
type StatusValue = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUS_LABEL: Record<StatusValue, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

/**
 * One register cell — inline select-and-save, same pattern as
 * admin/classes/form-teacher-picker.tsx's FormTeacherPicker: a single value
 * with no meaningfully separate "edit mode" doesn't need a form, a dialog,
 * or a save button, it just needs to write on change. Unlike that picker
 * there's no "none" option once a day is marked — every status the school
 * actually uses is a real value, so the placeholder only ever shows before
 * the first mark.
 */
export function AttendanceRow({
  studentId,
  classId,
  term,
  session,
  date,
  status,
}: {
  studentId: string;
  classId: string;
  term: TermValue;
  session: string;
  date: string;
  status: StatusValue | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setError(null);
    startTransition(async () => {
      const result = await teacherSaveAttendanceAction(classId, term, session, {
        studentId,
        date,
        status: value as StatusValue,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="w-32">
      <Select value={status ?? undefined} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Not marked" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(STATUS_LABEL) as StatusValue[]).map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
