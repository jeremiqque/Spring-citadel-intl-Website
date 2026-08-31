"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import { adminSavePsychomotorAction } from "./actions";

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

type RatingState = Record<Trait, number | "">;

// The admin twin of teacher/psychomotor/psychomotor-row.tsx. The one
// deliberate difference: a SUBMITTED row is NOT locked here, for the same
// reason admin/grades/grade-edit-row.tsx unlocked submitted grades — a form
// teacher's typo (2 instead of 5, already submitted) needs a correction path
// that doesn't require database access, and admin edits are attributable to
// an admin account rather than silently reopening the form teacher's own.
export function AdminPsychomotorRow({
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

  const isSubmitted = initial?.status === "SUBMITTED";
  const isIncomplete = TRAITS.some(([key]) => values[key] === "");
  const locked = session.trim() === "";

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
      const result = await adminSavePsychomotorAction(
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
            {isPending ? "Saving…" : saved ? "Saved" : isSubmitted ? "Save correction" : "Save draft"}
          </Button>
          {!isSubmitted && (
            <Button
              size="sm"
              onClick={() => run(true)}
              disabled={isPending || locked || isIncomplete}
              title={isIncomplete ? "Rate every trait first" : undefined}
            >
              {isPending ? "Submitting…" : "Submit"}
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </TableCell>
    </TableRow>
  );
}
