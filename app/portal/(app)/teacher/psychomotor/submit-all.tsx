"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { teacherSubmitAllPsychomotorAction } from "./actions";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

export function SubmitAllPsychomotorDrafts({
  classId,
  term,
  session,
  draftCount,
  className,
}: {
  classId: string;
  term: TermValue;
  session: string;
  draftCount: number;
  className: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await teacherSubmitAllPsychomotorAction(classId, term, session);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const parts = [`Submitted ${res.submitted} rating${res.submitted === 1 ? "" : "s"}.`];
      if (res.failed > 0) {
        parts.push(`${res.failed} failed — try those rows individually.`);
      }
      setResult(parts.join(" "));
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="field"
        onClick={() => setOpen(true)}
        disabled={isPending || draftCount === 0 || session.trim() === ""}
        title={draftCount === 0 ? "No saved drafts to submit" : undefined}
      >
        {isPending ? "Submitting…" : `Submit ${draftCount} draft${draftCount === 1 ? "" : "s"}`}
      </Button>

      {result && <p className="text-xs text-muted-foreground">{result}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-left">
          <DialogHeader>
            <DialogTitle>
              Submit {draftCount} saved draft{draftCount === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              This publishes psychomotor ratings for {className}. Students you
              haven&apos;t rated yet are not affected — only rows you&apos;ve already
              saved as drafts are submitted. Submitted ratings can&apos;t be
              un-submitted here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="lg" disabled={isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" onClick={run} disabled={isPending}>
              {isPending ? "Submitting…" : "Submit drafts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
