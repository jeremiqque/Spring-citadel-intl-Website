"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveResultRemarksAction } from "./actions";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

export function RemarkEditor({
  studentId,
  term,
  session,
  classTeacherRemark,
  principalRemark,
}: {
  studentId: string;
  term: TermValue;
  session: string;
  classTeacherRemark: string | null;
  principalRemark: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ctRemark, setCtRemark] = useState(classTeacherRemark ?? "");
  const [pRemark, setPRemark] = useState(principalRemark ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const run = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveResultRemarksAction(studentId, term, session, {
        classTeacherRemark: ctRemark.trim() || undefined,
        principalRemark: pRemark.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        value={ctRemark}
        onChange={(e) => {
          setSaved(false);
          setCtRemark(e.target.value);
        }}
        placeholder="Class teacher's remark"
        aria-label="Class teacher's remark"
        className="h-8 w-56"
      />
      <Input
        value={pRemark}
        onChange={(e) => {
          setSaved(false);
          setPRemark(e.target.value);
        }}
        placeholder="Principal's remark"
        aria-label="Principal's remark"
        className="h-8 w-56"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={run} disabled={isPending}>
          {isPending ? "Saving…" : saved ? "Saved" : "Save remarks"}
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  );
}
