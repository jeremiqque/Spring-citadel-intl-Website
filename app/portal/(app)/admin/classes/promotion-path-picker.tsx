"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { setClassPromotionPathAction } from "./actions";

const NONE = "__none__";

type ClassOption = { id: string; name: string };

// Same inline-picker pattern as FormTeacherPicker (see that file) — a single
// value with a "none" option, rendered in a table cell, no dialog needed.
// "None" here means "terminal — no next class" (SS3 today), a perfectly
// ordinary state, not an unfinished setup.
export function PromotionPathPicker({
  classId,
  promotesToClassId,
  classes,
}: {
  classId: string;
  promotesToClassId: string | null;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setError(null);
    startTransition(async () => {
      const result = await setClassPromotionPathAction(classId, value === NONE ? null : value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="w-40">
      <Select value={promotesToClassId ?? NONE} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Terminal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">Terminal — none</span>
          </SelectItem>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
