"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { teacherSavePsychomotorAction } from "./actions";

type TermValue = "TERM_1" | "TERM_2" | "TERM_3";

const TRAITS = [
  ["punctuality", "Punctuality"],
  ["neatness", "Neatness"],
  ["honesty", "Honesty"],
  ["leadership", "Leadership"],
  ["cooperation", "Cooperation"],
  ["handwriting", "Handwriting"],
  ["sports", "Sports"],
] as const;
type Trait = (typeof TRAITS)[number][0];

// Same "" vs. 0 distinction as TeacherGradeRow, same reasoning: an empty
// 1-5 field is "not yet rated", not "rated 0" — a value 0 isn't even valid
// on this scale, so leaving a field blank must never silently become a
// number the row would then submit.
type RatingState = Record<Trait, number | "">;

export function PsychomotorRow({
  studentId,
  studentName,
  admissionNo,
  classId,
  term,
  session,
  initial,
}: {
  studentId: string;
  studentName: string;
  admissionNo: string;
  classId: string;
  term: TermValue;
  session: string;
  initial: (Record<Trait, number> & { remark: string | null; status: "DRAFT" | "SUBMITTED" }) | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<RatingState>({
    punctuality: initial?.punctuality ?? "",
    neatness: initial?.neatness ?? "",
    honesty: initial?.honesty ?? "",
    leadership: initial?.leadership ?? "",
    cooperation: initial?.cooperation ?? "",
    handwriting: initial?.handwriting ?? "",
    sports: initial?.sports ?? "",
  });
  const [remark, setRemark] = useState(initial?.remark ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSubmitted = initial?.status === "SUBMITTED";
  const isIncomplete = TRAITS.some(([key]) => values[key] === "");
  const noSession = session.trim() === "";
  const locked = isSubmitted || noSession;

  const setTrait = (key: Trait, raw: string) => {
    setSaved(false);
    setError(null);
    if (raw === "") {
      setValues((v) => ({ ...v, [key]: "" }));
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    setValues((v) => ({ ...v, [key]: Math.min(Math.max(Math.round(parsed), 1), 5) }));
  };

  const run = (submit: boolean) => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const num = (v: number | "") => (v === "" ? 1 : v);
      const result = await teacherSavePsychomotorAction(
        classId,
        term,
        session,
        {
          studentId,
          punctuality: num(values.punctuality),
          neatness: num(values.neatness),
          honesty: num(values.honesty),
          leadership: num(values.leadership),
          cooperation: num(values.cooperation),
          handwriting: num(values.handwriting),
          sports: num(values.sports),
          remark: remark.trim() || undefined,
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

  return (
    <TableRow>
      <TableCell className="pl-5 font-mono text-xs text-muted-foreground">{admissionNo}</TableCell>
      <TableCell className="font-medium text-foreground">{studentName}</TableCell>
      {TRAITS.map(([key, label]) => (
        <TableCell key={key}>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={5}
            value={values[key]}
            onChange={(e) => setTrait(key, e.target.value)}
            disabled={locked}
            aria-label={`${label} (1-5) for ${studentName}`}
            className="h-8 w-14"
          />
        </TableCell>
      ))}
      <TableCell className="w-48">
        <Input
          value={remark}
          onChange={(e) => {
            setSaved(false);
            setRemark(e.target.value);
          }}
          disabled={locked}
          placeholder="Remark (optional)"
          aria-label={`Remark for ${studentName}`}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Badge variant={isSubmitted ? "success" : initial ? "warning" : "outline"}>
          {isSubmitted ? "Submitted" : initial ? "Draft" : "Not entered"}
        </Badge>
      </TableCell>
      <TableCell className="pr-5 text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => run(false)}
            disabled={isPending || locked || isIncomplete}
            title={isIncomplete ? "Rate every trait first" : undefined}
          >
            {isPending ? "Saving…" : saved ? "Saved" : "Save draft"}
          </Button>
          <Button
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending || locked || isIncomplete}
            title={isIncomplete ? "Rate every trait first" : undefined}
          >
            {isSubmitted ? "Submitted" : "Submit"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="text-left">
            <DialogHeader>
              <DialogTitle>Submit {studentName}&apos;s psychomotor rating?</DialogTitle>
              <DialogDescription>
                Submitted ratings can&apos;t be edited or un-submitted here — an
                administrator would have to correct them.
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
                {isPending ? "Submitting…" : "Submit rating"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
