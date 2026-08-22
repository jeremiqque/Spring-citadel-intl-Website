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
import { scoreToLetter, type GradingConfig } from "@/lib/grading";
import { teacherSaveGradeAction } from "./actions";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

const MAX = { assignment: 20, midterm: 30, exam: 50 } as const;
type Component = keyof typeof MAX;

// Scores are "" while empty rather than 0. `Number("")` is 0, so treating an
// empty field as a number silently turns a cleared input into a zero —
// indistinguishable from a student who genuinely scored nothing. Same
// reasoning as the admin row; deliberately identical, because the two
// screens write to the same table and any divergence here is a data bug.
type ScoreState = Record<Component, number | "">;

export function TeacherGradeRow({
  studentId,
  studentName,
  admissionNo,
  classId,
  subjectId,
  term,
  session,
  gradingConfig,
  initial,
}: {
  studentId: string;
  studentName: string;
  admissionNo: string;
  classId: string;
  subjectId: string;
  term: TermValue;
  session: string;
  gradingConfig: GradingConfig;
  initial: { assignment: number; midterm: number; exam: number; status: "DRAFT" | "SUBMITTED" } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<ScoreState>({
    assignment: initial?.assignment ?? "",
    midterm: initial?.midterm ?? "",
    exam: initial?.exam ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const num = (v: number | "") => (v === "" ? 0 : v);
  const total = num(values.assignment) + num(values.midterm) + num(values.exam);
  const isSubmitted = initial?.status === "SUBMITTED";

  const isIncomplete =
    values.assignment === "" || values.midterm === "" || values.exam === "";

  // Read-only when the school has no current session set: `session` feeds
  // Grade's unique key, so writing with "" files the result under a session
  // nothing queries. A disabled row is much better than a silently orphaned
  // result.
  const noSession = session.trim() === "";
  const locked = isSubmitted || noSession;

  // `max` on a number input is advisory — it blocks the spinner but not
  // typing or pasting, so 999 in a 0-20 field would reach the action
  // unchallenged. Clamp on the way in. (The action re-validates regardless;
  // this is so the teacher sees the bound, not so the server can trust it.)
  const setScore = (key: Component, raw: string) => {
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
      const result = await teacherSaveGradeAction(
        classId,
        subjectId,
        term,
        session,
        {
          studentId,
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
      router.refresh();
    });
  };

  const field = (key: Component, label: string) => (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      max={MAX[key]}
      value={values[key]}
      onChange={(e) => setScore(key, e.target.value)}
      disabled={locked}
      // Forty of these render on a full class sheet. Without a name they are
      // announced as "spin button, 0" with no student and no component
      // attached to them.
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
          "zero", it is "not yet entered". Same for the letter. */}
      <TableCell className="font-medium">{isIncomplete ? "—" : total}</TableCell>
      <TableCell>{isIncomplete ? "—" : scoreToLetter(total, gradingConfig)}</TableCell>
      <TableCell>{isSubmitted ? "Submitted" : initial ? "Draft" : "Not entered"}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => run(false)}
            disabled={isPending || locked || isIncomplete}
            title={isIncomplete ? "Enter all three scores first" : undefined}
          >
            {isPending ? "Saving…" : saved ? "Saved" : "Save draft"}
          </Button>
          <Button
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending || locked || isIncomplete}
            title={isIncomplete ? "Enter all three scores first" : undefined}
          >
            {isSubmitted ? "Submitted" : "Submit"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* Submit is the one irreversible action in this build: it notifies
            the student immediately and nothing in the codebase can un-submit
            it. Saving a draft notifies nobody, on purpose, so a teacher can
            mark a class over several sittings. */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="text-left">
            <DialogHeader>
              <DialogTitle>Submit {studentName}&apos;s result?</DialogTitle>
              <DialogDescription>
                This publishes a total of{" "}
                <span className="font-medium text-foreground">
                  {total} ({scoreToLetter(total, gradingConfig)})
                </span>{" "}
                and notifies {studentName} straight away. Submitted results can&apos;t be
                edited or un-submitted here — an administrator would have to correct them.
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
              <Button size="lg" onClick={() => run(true)} disabled={isPending}>
                {isPending ? "Submitting…" : "Submit result"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
