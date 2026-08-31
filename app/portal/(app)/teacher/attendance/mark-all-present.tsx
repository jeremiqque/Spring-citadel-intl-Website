"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { teacherMarkAllPresentAction } from "./actions";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

export function MarkAllPresentButton({
  classId,
  term,
  session,
  date,
  notMarkedCount,
}: {
  classId: string;
  term: TermValue;
  session: string;
  date: string;
  notMarkedCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const run = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await teacherMarkAllPresentAction(classId, term, session, date);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(`Marked ${res.marked} student${res.marked === 1 ? "" : "s"} present.`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="field"
        variant="outline"
        onClick={run}
        disabled={isPending || notMarkedCount === 0 || session.trim() === ""}
        title={notMarkedCount === 0 ? "Everyone already has a mark for this day" : undefined}
      >
        {isPending ? "Marking…" : `Mark ${notMarkedCount} unmarked present`}
      </Button>
      {result && <p className="text-xs text-muted-foreground">{result}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
