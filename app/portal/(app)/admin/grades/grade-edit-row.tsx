"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { adminSaveGradeAction } from "./actions";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

const MAX = { assignment: 20, midterm: 30, exam: 50 } as const;
type Component = keyof typeof MAX;

// Scores are "" while empty rather than 0. `Number("")` is 0, so the previous
// version silently turned a cleared field into a zero — indistinguishable
// from a student who genuinely scored nothing.
type ScoreState = Record<Component, number | "">;

export function GradeEditRow({
  studentId,
  studentName,
  admissionNo,
  subjectId,
  classId,
  term,
  session,
  initial,
}: {
  studentId: string;
  studentName: string;
  admissionNo: string;
  subjectId: string;
  classId: string;
  term: TermValue;
  session: string;
  initial: { assignment: number; midterm: number; exam: number; status: "DRAFT" | "SUBMITTED" } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // An ungraded row starts EMPTY, not at 0. Seeding these with 0 made a
  // student who had never been graded render identically to one who scored
  // nothing — and one click of Submit then published total 0 / grade F to a
  // real child, notified them, and flagged them at-risk, with nothing in the
  // codebase able to un-submit it. The type has always allowed "" (see
  // ScoreState above); only the initial value was wrong.
  const [values, setValues] = useState<ScoreState>({
    assignment: initial?.assignment ?? "",
    midterm: initial?.midterm ?? "",
    exam: initial?.exam ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);

  const num = (v: number | "") => (v === "" ? 0 : v);
  const total = num(values.assignment) + num(values.midterm) + num(values.exam);
  const isSubmitted = initial?.status === "SUBMITTED";

  // Nothing is written while any component is blank. Allowing a partial save
  // would persist the missing components as 0, which puts the row straight
  // back into the "0 is indistinguishable from ungraded" state the empty
  // initial value above exists to prevent.
  const isIncomplete =
    values.assignment === "" || values.midterm === "" || values.exam === "";

  // The whole row is read-only when the school has no current session set:
  // `session` feeds the Grade unique key, so saving with "" files the result
  // under a session nothing queries. Silently orphaned results are far worse
  // than a disabled button.
  const noSession = session.trim() === "";

  // ── WHY A SUBMITTED ROW IS NOT LOCKED HERE ────────────────────────────────
  // It used to be (`locked = isSubmitted || noSession`), identically to the
  // teacher's row. That made a submitted result uneditable by ANYONE through
  // the UI — while the teacher's sheet, the confirm dialog and now the
  // teacher action's own error message all tell a teacher that "an
  // administrator would have to correct it." There was no such administrator
  // path: correcting a mistyped exam score (4 instead of 40, already
  // published to the child) required direct database access.
  //
  // adminSaveGradeAction has always accepted the write and preserved
  // SUBMITTED rather than refusing it — this was purely a client-side lock
  // contradicting the server it talks to. This is the escalation path the
  // rest of the product points at.
  const locked = noSession;

  // `max` on a number input is advisory — it blocks the spinner but not typing
  // or pasting, so 999 in a 0-20 field reached the action unchallenged. Clamp
  // on the way in.
  const setScore = (key: Component, raw: string) => {
    // Editing invalidates the "Saved" confirmation. This is the actual bug
    // fix: setSaved(false) used to live ONLY in run(), so after one save the
    // button read "Saved" permanently — including while typing a new,
    // unsaved score, on the app's most data-critical screen.
    setSaved(false);
    setError(null);
    if (raw === "") {
      setValues((v) => ({ ...v, [key]: "" }));
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    setValues((v) => ({ ...v, [key]: Math.min(Math.max(Math.round(parsed), 0), MAX[key]) }));
  };

  const run = (submit: boolean) => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await adminSaveGradeAction(
        classId,
        term,
        session,
        {
          studentId,
          subjectId,
          assignment: num(values.assignment),
          midterm: num(values.midterm),
          exam: num(values.exam),
        },
        submit
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setConfirmOpen(false);
      setCorrectOpen(false);
      router.refresh();
    });
  };

  const handleSave = () => {
    // Correcting a published result is a different act from saving a draft,
    // and it changes a number a child and their guardian have already been
    // shown. It gets a confirmation of its own rather than sharing the
    // submit dialog, whose wording is about publishing.
    if (isSubmitted) {
      setCorrectOpen(true);
      return;
    }
    run(false);
  };
  // Submitting is what actually triggers FR-36/FR-38 (lib/grades.ts only
  // fires those on a real DRAFT/nothing -> SUBMITTED transition) — Save
  // alone never notifies anyone, on purpose, so a teacher/admin can draft a
  // score over several visits without spamming the student every time.
  //
  // Which also makes Submit the one irreversible action in this build: it
  // notifies the student and nothing in the codebase can un-submit. Removing
  // a student — which IS reversible — gets a confirm dialog, so this
  // certainly should.
  const handleSubmit = () => run(true);

  const field = (key: Component, label: string) => (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      max={MAX[key]}
      value={values[key]}
      onChange={(e) => setScore(key, e.target.value)}
      disabled={locked}
      // 150 of these render on a full page. Without a name they are announced
      // as "spin button, 0" with no student and no component attached.
      aria-label={`${label} score out of ${MAX[key]} for ${studentName}`}
      className="h-8 w-16"
    />
  );

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{admissionNo}</TableCell>
      <TableCell>{studentName}</TableCell>
      <TableCell>{field("assignment", "Assignment")}</TableCell>
      <TableCell>{field("midterm", "Mid-term")}</TableCell>
      <TableCell>{field("exam", "Exam")}</TableCell>
      {/* An em dash, not 0, while the row is incomplete — the total is not
          "zero", it is "not yet entered". */}
      <TableCell className="font-medium">{isIncomplete ? "—" : total}</TableCell>
      <TableCell>{isSubmitted ? "Submitted" : initial ? "Draft" : "Not entered"}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={isPending || locked || isIncomplete}
            title={isIncomplete ? "Enter all three scores first" : undefined}
          >
            {isPending ? "Saving…" : saved ? "Saved" : isSubmitted ? "Correct" : "Save"}
          </Button>
          {/* A submitted row has nothing left to submit — the second button
              would re-publish an already-published result. Correcting it is
              the Save button above, which preserves SUBMITTED. */}
          {!isSubmitted && (
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={isPending || locked || isIncomplete}
              title={isIncomplete ? "Enter all three scores first" : undefined}
            >
              Submit
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}

        <Dialog open={correctOpen} onOpenChange={setCorrectOpen}>
          <DialogContent className="text-left">
            <DialogHeader>
              <DialogTitle>Correct {studentName}&apos;s submitted result?</DialogTitle>
              <DialogDescription>
                This result has already been published to {studentName}. Saving changes it
                to a total of{" "}
                <span className="font-medium text-foreground">{total}</span> and it stays
                submitted. {studentName} is not notified again, so tell them separately if
                the change matters to them.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                size="lg"
                disabled={isPending}
                onClick={() => setCorrectOpen(false)}
              >
                Cancel
              </Button>
              <Button size="lg" onClick={() => run(false)} disabled={isPending}>
                {isPending ? "Saving…" : "Save correction"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="text-left">
            <DialogHeader>
              <DialogTitle>Submit {studentName}&apos;s result?</DialogTitle>
              <DialogDescription>
                This publishes a total of <span className="font-medium text-foreground">{total}</span> and
                notifies {studentName} straight away. Submitted results can&apos;t be edited or
                un-submitted here, so check the scores first.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                size="lg"
                disabled={isPending}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button size="lg" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Submitting…" : "Submit result"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
