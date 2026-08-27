"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { setTeacherStatusAction, resetTeacherPasswordAction } from "./actions";

type TeacherStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export function TeacherRowActions({
  teacherId,
  teacherName,
  status,
}: {
  teacherId: string;
  teacherName: string;
  status: TeacherStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);
  // Reset-password and mark-on-leave used to fire straight from the dropdown,
  // with no confirmation and no undo — sitting one row apart in the same
  // menu. A mis-click invalidated a working teacher's password, or locked
  // them out of the system entirely. Both now confirm first.
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.refresh();
    });
  };

  const copyPassword = async () => {
    if (!resetResult) return;
    await navigator.clipboard.writeText(resetResult);
    setCopied(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${teacherName}`}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/portal/admin/teachers/${teacherId}`}>View</Link>
          </DropdownMenuItem>
          {status !== "INACTIVE" && (
            <>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setError(null);
                  setConfirmLeave(true);
                }}
              >
                {status === "ON_LEAVE" ? "Reactivate" : "Mark on leave"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setError(null);
                  setConfirmReset(true);
                }}
              >
                Reset password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  // Clear any stale error from a previous action (e.g. a
                  // failed reset-password) before opening this dialog, so
                  // it doesn't look like removal already failed.
                  setError(null);
                  setConfirmRemove(true);
                }}
              >
                Remove
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Errors from actions that don't open a dialog (mark on leave, reset
          password) surface right here, next to the trigger that caused
          them. */}
      {error && !confirmRemove && !confirmReset && !confirmLeave && (
        <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>
      )}

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {status === "ON_LEAVE" ? `Reactivate ${teacherName}?` : `Mark ${teacherName} on leave?`}
            </DialogTitle>
            <DialogDescription>
              {status === "ON_LEAVE"
                ? "They will be able to sign in again straight away. Their assignments and grade history were never touched."
                : "This blocks their login immediately — they will not be able to sign in until they are reactivated. Their assignments and grade history are kept."}
            </DialogDescription>
          </DialogHeader>
          {error && confirmLeave && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={toggleLeave} disabled={isPending}>
              {isPending
                ? "Saving…"
                : status === "ON_LEAVE"
                  ? "Reactivate"
                  : "Mark on leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset {teacherName}&apos;s password?</DialogTitle>
            <DialogDescription>
              Their current password stops working immediately. A new temporary one is shown
              once, and they must change it at their next login. Only do this if they have
              actually asked for it.
            </DialogDescription>
          </DialogHeader>
          {error && confirmReset && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}
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
              Write this down or copy it now — it won&apos;t be shown again. {teacherName} must
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
            <DialogTitle>Remove {teacherName}?</DialogTitle>
            <DialogDescription>
              This sets their status to inactive and disables login. Historical grade
              rows and assignments stay intact — this is not a permanent delete.
            </DialogDescription>
          </DialogHeader>
          {/* Previously a failed removal set `error` but left it rendered
              outside this dialog — invisible behind the modal overlay,
              since the dialog stays open on failure. Showing it here, where
              the user's attention actually is, is the fix. */}
          {error && confirmRemove && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
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
    </>
  );
}
