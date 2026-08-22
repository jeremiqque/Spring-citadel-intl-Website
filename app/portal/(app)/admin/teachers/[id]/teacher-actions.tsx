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
import { setTeacherStatusAction, resetTeacherPasswordAction } from "../actions";

type TeacherStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export function TeacherActions({ teacherId, status }: { teacherId: string; status: TeacherStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  // Same reasoning as the row menu: neither of these had a confirmation, and
  // both take effect immediately with no undo.
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleLeave = () => {
    setError(null);
    startTransition(async () => {
      const next: TeacherStatus = status === "ON_LEAVE" ? "ACTIVE" : "ON_LEAVE";
      const result = await setTeacherStatusAction(teacherId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmLeave(false);
      router.refresh();
    });
  };

  const handleResetPassword = () => {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await resetTeacherPasswordAction(teacherId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmReset(false);
      setResetResult(result.tempPassword);
    });
  };

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      const result = await setTeacherStatusAction(teacherId, "INACTIVE");
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmRemove(false);
      router.push("/portal/admin/teachers");
    });
  };

  const copyPassword = async () => {
    if (!resetResult) return;
    await navigator.clipboard.writeText(resetResult);
    setCopied(true);
  };

  if (status === "INACTIVE") return null; // nothing actionable on a removed teacher

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onClick={() => {
          setError(null);
          setConfirmLeave(true);
        }}
        disabled={isPending}
      >
        {status === "ON_LEAVE" ? "Reactivate" : "Mark on leave"}
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setError(null);
          setConfirmReset(true);
        }}
        disabled={isPending}
      >
        Reset password
      </Button>
      <Button variant="destructive" onClick={() => setConfirmRemove(true)} disabled={isPending}>
        Remove
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {status === "ON_LEAVE" ? "Reactivate this teacher?" : "Mark this teacher on leave?"}
            </DialogTitle>
            <DialogDescription>
              {status === "ON_LEAVE"
                ? "They will be able to sign in again straight away. Their assignments and grade history were never touched."
                : "This blocks their login immediately — they will not be able to sign in until they are reactivated. Their assignments and grade history are kept."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={toggleLeave} disabled={isPending}>
              {isPending ? "Saving…" : status === "ON_LEAVE" ? "Reactivate" : "Mark on leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset this teacher&apos;s password?</DialogTitle>
            <DialogDescription>
              Their current password stops working immediately. A new temporary one is shown
              once, and they must change it at their next login. Only do this if they have
              actually asked for it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isPending}>
              {isPending ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetResult} onOpenChange={(open) => !open && setResetResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password reset</DialogTitle>
            <DialogDescription>
              Write this down or copy it now — it won&apos;t be shown again. The teacher must
              change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 p-4 font-mono text-sm">
            {resetResult}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyPassword}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={() => setResetResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this teacher?</DialogTitle>
            <DialogDescription>
              This sets their status to inactive and disables login. Historical grade
              rows and assignments stay intact — this is not a permanent delete.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
              {isPending ? "Removing…" : "Remove teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
