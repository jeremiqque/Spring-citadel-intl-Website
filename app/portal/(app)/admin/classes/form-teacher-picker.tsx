"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { setFormTeacherAction } from "./actions";

const NONE = "__none__";

type TeacherOption = { id: string; name: string };

// Inline, not a dialog — a single value with a "none" option is a plain
// <Select>, and this doesn't need ClassCoverage's list-of-existing-rows
// treatment because there's only ever zero or one form teacher per class.
export function FormTeacherPicker({
  classId,
  formTeacherId,
  teachers,
}: {
  classId: string;
  formTeacherId: string | null;
  teachers: TeacherOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setError(null);
    startTransition(async () => {
      const result = await setFormTeacherAction(classId, value === NONE ? null : value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="w-40">
      <Select value={formTeacherId ?? NONE} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">Unassigned</span>
          </SelectItem>
          {teachers.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
