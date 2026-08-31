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
import { compileClassResultsAction, publishClassResultsAction } from "./actions";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

/**
 * The two buttons that move a class/term through DRAFT -> COMPILED ->
 * PUBLISHED. Kept together in one component because they share the same
 * classId/term/session and because "compile again" (re-run after a grade
 * correction reset things to DRAFT — see lib/term-result.ts) and "publish"
 * are the two actions an admin actually takes on this screen, in that
 * order, every time.
 */
export function CompileAndPublish({
  classId,
  term,
  session,
  className,
  readyToCompile,
  blockedReason,
  compiledCount,
  draftCount,
}: {
  classId: string;
  term: TermValue;
  session: string;
  className: string;
  readyToCompile: boolean;
  blockedReason?: string;
  compiledCount: number;
  draftCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [publishOpen, setPublishOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runCompile = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await compileClassResultsAction(classId, term, session);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(`Compiled ${res.compiled} result${res.compiled === 1 ? "" : "s"}.`);
      router.refresh();
    });
  };

  const runPublish = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await publishClassResultsAction(classId, term, session);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(`Published ${res.published} result${res.published === 1 ? "" : "s"}.`);
      setPublishOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="field"
        variant="secondary"
        onClick={runCompile}
        disabled={isPending || !readyToCompile}
        title={!readyToCompile ? blockedReason : undefined}
      >
        {isPending ? "Compiling…" : draftCount > 0 && compiledCount > 0 ? "Re-compile" : "Compile results"}
      </Button>
      <Button
        size="field"
        onClick={() => setPublishOpen(true)}
        disabled={isPending || compiledCount === 0}
        title={compiledCount === 0 ? "Nothing compiled yet" : undefined}
      >
        Publish {compiledCount > 0 ? compiledCount : ""} result{compiledCount === 1 ? "" : "s"}
      </Button>

      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {!readyToCompile && blockedReason && draftCount === 0 && compiledCount === 0 && (
        <p className="text-xs text-muted-foreground">{blockedReason}</p>
      )}

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="text-left">
          <DialogHeader>
            <DialogTitle>
              Publish {compiledCount} result{compiledCount === 1 ? "" : "s"} for {className}?
            </DialogTitle>
            <DialogDescription>
              Each student is notified immediately and can see their average, position and
              remarks straight away. If a grade changes after this, that student&apos;s
              result reverts to draft automatically and needs re-compiling and
              re-publishing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="lg" disabled={isPending} onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" onClick={runPublish} disabled={isPending}>
              {isPending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
