"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterSelect, FILTER_ALL_VALUE, type FilterSelectOption } from "@/components/ui/filter-select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { type ClassChangeReason } from "@/lib/class-change";
import { promoteClassAction } from "../actions";

const REASON_OPTIONS: { value: ClassChangeReason; label: string; leaves: boolean }[] = [
  { value: "PROMOTED", label: "Promote", leaves: false },
  { value: "REPEATED", label: "Repeat this class", leaves: false },
  { value: "CORRECTED", label: "Move (wrong class)", leaves: false },
  { value: "GRADUATED", label: "Graduate (leaving)", leaves: true },
  { value: "WITHDRAWN", label: "Withdraw (leaving)", leaves: true },
];

const REASON_LEAVES: Record<ClassChangeReason, boolean> = Object.fromEntries(
  REASON_OPTIONS.map((r) => [r.value, r.leaves])
) as Record<ClassChangeReason, boolean>;

const REASON_FILTER_OPTIONS: FilterSelectOption[] = REASON_OPTIONS.map((r) => ({
  value: r.value,
  label: r.label,
}));

type StudentOption = { id: string; name: string };
type ClassOption = { id: string; name: string };

type Row = {
  studentId: string;
  name: string;
  included: boolean;
  reason: ClassChangeReason;
  toClassId: string | null;
};

/**
 * The review table itself — every currently-enrolled student in this class,
 * one row each, pre-filled with the class's default promotion target and
 * ready to confirm as-is. Nothing is saved until "Confirm", which sends the
 * whole batch to promoteClassAction (../actions.ts) in one call; that action
 * loops the same changeStudentClass a single-student correction uses, so
 * this table is purely a way to fill in forty of those in one sitting, not
 * a different code path.
 *
 * "Include" per row (not a delete/remove) is deliberate: excluding a
 * student here just leaves them out of THIS run — they're still enrolled,
 * still on this same list next time the admin opens this class, nothing
 * about them changes until a row for them is actually confirmed.
 */
export function PromotionReview({
  classId,
  className,
  defaultToClassId,
  students,
  classes,
  disabled,
}: {
  classId: string;
  className: string;
  defaultToClassId: string | null;
  students: StudentOption[];
  classes: ClassOption[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ submitted: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<Row[]>(() =>
    students.map((s) => ({
      studentId: s.id,
      name: s.name,
      included: true,
      reason: "PROMOTED",
      toClassId: defaultToClassId,
    }))
  );

  const classOptions: FilterSelectOption[] = classes.map((c) => ({ value: c.id, label: c.name }));

  const includedRows = rows.filter((r) => r.included);
  const summary = useMemo(() => {
    const counts: Partial<Record<ClassChangeReason, number>> = {};
    for (const r of includedRows) counts[r.reason] = (counts[r.reason] ?? 0) + 1;
    return counts;
  }, [includedRows]);

  function updateRow(studentId: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        const next = { ...r, ...patch };
        if (patch.reason && REASON_LEAVES[patch.reason]) next.toClassId = null;
        if (patch.reason && !REASON_LEAVES[patch.reason] && next.toClassId === null) {
          next.toClassId = defaultToClassId;
        }
        return next;
      })
    );
  }

  function setReasonForAll(reason: ClassChangeReason) {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        reason,
        toClassId: REASON_LEAVES[reason] ? null : defaultToClassId,
      }))
    );
  }

  function toggleAll(included: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, included })));
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const outcome = await promoteClassAction(
        classId,
        includedRows.map((r) => ({ studentId: r.studentId, reason: r.reason, toClassId: r.toClassId }))
      );
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      setResult({ submitted: outcome.submitted, failed: outcome.failed });
      setConfirmOpen(false);
      router.refresh();
    });
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No enrolled students in {className}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {result && (
        <div className="rounded-lg border border-green-600/30 bg-green-50 p-4 text-sm text-green-900">
          {result.submitted} student{result.submitted === 1 ? "" : "s"} updated
          {result.failed > 0
            ? `. ${result.failed} row${result.failed === 1 ? "" : "s"} could not be saved — please try those again.`
            : "."}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Set reason for every row:</span>
          <div className="w-full min-w-0 sm:w-48">
            <FilterSelect
              placeholder="Choose…"
              options={REASON_FILTER_OPTIONS}
              onValueChange={(v) => setReasonForAll(v as ClassChangeReason)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button type="button" className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => toggleAll(true)}>
            Include all
          </button>
          <button type="button" className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => toggleAll(false)}>
            Exclude all
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <Table caption={`Students in ${className}`}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Student</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Destination class</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.studentId} className={row.included ? undefined : "opacity-50"}>
                <TableCell>
                  <Checkbox
                    checked={row.included}
                    onCheckedChange={(checked) => updateRow(row.studentId, { included: checked === true })}
                    aria-label={`Include ${row.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                <TableCell>
                  <div className="w-44">
                    <FilterSelect
                      value={row.reason}
                      onValueChange={(v) => updateRow(row.studentId, { reason: v as ClassChangeReason })}
                      options={REASON_FILTER_OPTIONS}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  {REASON_LEAVES[row.reason] ? (
                    <span className="text-xs text-muted-foreground">Leaving the school</span>
                  ) : (
                    <div className="w-48">
                      <FilterSelect
                        value={row.toClassId ?? FILTER_ALL_VALUE}
                        placeholder="Choose a class"
                        onValueChange={(v) =>
                          updateRow(row.studentId, { toClassId: v === FILTER_ALL_VALUE ? null : v })
                        }
                        options={classOptions}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {includedRows.length} of {rows.length} included
          {Object.keys(summary).length > 0 && (
            <>
              {" — "}
              {REASON_OPTIONS.filter((r) => summary[r.value]).map((r, i, arr) => (
                <span key={r.value}>
                  {summary[r.value]} {r.label.toLowerCase()}
                  {i < arr.length - 1 ? ", " : ""}
                </span>
              ))}
            </>
          )}
        </p>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button disabled={disabled || includedRows.length === 0}>
              Confirm {includedRows.length > 0 ? `(${includedRows.length})` : ""}
            </Button>
          </DialogTrigger>
          <DialogContent className="text-left">
            <DialogHeader>
              <DialogTitle>Confirm class changes?</DialogTitle>
              <DialogDescription>
                This updates {includedRows.length} student{includedRows.length === 1 ? "" : "s"} in{" "}
                {className} right away — a leaving student is marked inactive, everyone else moves to
                their chosen class. Each student is notified individually. This can be corrected
                afterwards, one student at a time, from their profile.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending ? "Saving…" : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
