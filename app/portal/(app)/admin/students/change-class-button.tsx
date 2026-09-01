"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/ui/filter-select";
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
import { changeStudentClassAction } from "./class-change-actions";

const REASON_OPTIONS: { value: ClassChangeReason; label: string; leaves: boolean }[] = [
  { value: "PROMOTED", label: "Promote", leaves: false },
  { value: "REPEATED", label: "Repeat this class", leaves: false },
  { value: "CORRECTED", label: "Move (wrong class)", leaves: false },
  { value: "GRADUATED", label: "Graduate (leaving the school)", leaves: true },
  { value: "WITHDRAWN", label: "Withdraw (leaving the school)", leaves: true },
];

type ClassOption = { id: string; name: string };

/**
 * The single-student side of promotion/demotion — always available on a
 * student's profile, not just at a term boundary. See
 * app/portal/(app)/admin/promotions/ for the bulk, end-of-session sibling
 * that reuses the exact same server action's underlying primitive
 * (changeStudentClass in lib/class-change.ts), one row at a time.
 */
export function ChangeClassButton({
  studentId,
  studentName,
  currentClassId,
  currentClassName,
  promotesToClassId,
  classes,
}: {
  studentId: string;
  studentName: string;
  currentClassId: string;
  currentClassName: string;
  /** This class's configured next class, if any — pre-fills the target
   *  when the reason is "Promote," same default the bulk screen uses. */
  promotesToClassId: string | null;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState<ClassChangeReason>("PROMOTED");
  const [toClassId, setToClassId] = useState(promotesToClassId ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = REASON_OPTIONS.find((r) => r.value === reason)!;
  const targetClassName = classes.find((c) => c.id === toClassId)?.name;

  const run = () => {
    setError(null);
    if (!selected.leaves && !toClassId) {
      setError("Choose a destination class.");
      return;
    }
    startTransition(async () => {
      const result = await changeStudentClassAction(
        studentId,
        selected.leaves ? null : toClassId,
        reason,
        note
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setNote("");
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
          setReason("PROMOTED");
          setToClassId(promotesToClassId ?? "");
          setNote("");
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Change class</Button>
      </DialogTrigger>
      <DialogContent className="text-left">
        <DialogHeader>
          <DialogTitle>Change {studentName}&apos;s class</DialogTitle>
          <DialogDescription>
            Currently in {currentClassName}. This is recorded on {studentName}&apos;s class
            history, and {studentName} is notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason</Label>
            <FilterSelect
              id="reason"
              value={reason}
              className="mt-1"
              onValueChange={(v) => {
                const next = v as ClassChangeReason;
                setReason(next);
                if (next === "PROMOTED") setToClassId(promotesToClassId ?? "");
                else if (next === "REPEATED") setToClassId(currentClassId);
                else if (next === "CORRECTED") setToClassId("");
              }}
              options={REASON_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
            />
          </div>

          {!selected.leaves && (
            <div>
              <Label htmlFor="toClass">New class</Label>
              <FilterSelect
                id="toClass"
                value={toClassId || undefined}
                placeholder="Select class"
                className="mt-1"
                onValueChange={setToClassId}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          )}

          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              className="mt-1"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Visible only to admins on this student's class history."
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="lg" disabled={isPending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="lg" onClick={run} disabled={isPending}>
            {isPending
              ? "Saving…"
              : selected.leaves
                ? selected.label
                : targetClassName
                  ? `Move to ${targetClassName}`
                  : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
