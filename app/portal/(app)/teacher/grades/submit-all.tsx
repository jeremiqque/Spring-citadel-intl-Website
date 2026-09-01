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
import { teacherSubmitAllAction } from "./actions";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * "Submit all drafts" for one class + subject.
 *
 * Deliberately says how many rows it will touch, in the button and again in
 * the dialog. A bulk publish that just says "Submit all" gives a teacher no
 * way to notice they are about to publish twelve results when they thought
 * they had marked forty.
 */
export function SubmitAllDrafts({
  classId,
  subjectId,
  term,
  session,
  draftCount,
  className,
  subjectName,
  isCurrentTerm,
}: {
  classId: string;
  subjectId: string;
  term: TermValue;
  session: string;
  draftCount: number;
  className: string;
  subjectName: string;
  isCurrentTerm: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await teacherSubmitAllAction(classId, subjectId, term, session);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Reported separately because the two numbers mean different things
      // and need different responses from the teacher: `failed` is an error
      // to retry, `deferred` is a draft written under another class that the
      // teacher should review and submit by hand.
      const parts = [`Submitted ${res.submitted} result${res.submitted === 1 ? "" : "s"}.`];
      if (res.failed > 0) {
        parts.push(`${res.failed} failed — try those rows individually.`);
      }
      if (res.deferred > 0) {
        parts.push(
          `${res.deferred} draft${res.deferred === 1 ? " was" : "s were"} entered in another class ` +
            `(a student who transferred in) — check and submit ${res.deferred === 1 ? "it" : "them"} row by row.`
        );
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
        disabled={isPending || draftCount === 0 || session.trim() === "" || !isCurrentTerm}
        title={
          !isCurrentTerm
            ? "This term is read-only — it isn't the current term"
            : draftCount === 0
              ? "No saved drafts to submit"
              : undefined
        }
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
              This publishes {subjectName} results for {className} and notifies each of
              those {draftCount} student{draftCount === 1 ? "" : "s"} straight away.
              Students you haven&apos;t marked yet are not affected — only rows you have
              already saved as drafts are submitted. Submitted results can&apos;t be
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
