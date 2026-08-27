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
import { deleteStudentAction, resetStudentPasswordAction } from "./actions";

export function StudentRowActions({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The counterpart of the teacher flow. Without this a student who lost the
  // enrolment slip had no route back in at all — the login screen tells them
  // "the school office can issue a new one", and until now the office
  // couldn't.
  const handleResetPassword = () => {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await resetStudentPasswordAction(studentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmReset(false);
      setResetResult(result.tempPassword);
    });
  };

  const copyPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult);
      setCopied(true);
    } catch {
      // Clipboard access fails on insecure origins and when permission is
      // denied. Say so rather than leaving the button silently unchanged —
      // the password is on screen and can still be written down.
      setError("Couldn't copy automatically — write the password down instead.");
    }
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteStudentAction(studentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${studentName}`}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/portal/admin/students/${studentId}`}>View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/portal/admin/students/${studentId}/edit`}>Edit</Link>
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
              setConfirmOpen(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset {studentName}&apos;s password?</DialogTitle>
            <DialogDescription>
              Their current password stops working immediately. A new temporary one is shown
              once — write it down before closing — and they must change it at their next
              login.
            </DialogDescription>
          </DialogHeader>
          {error && confirmReset && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
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
              Write this down or copy it now — it won&apos;t be shown again. {studentName} must
              change it at their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 p-4 font-mono text-sm">
            {resetResult}
          </div>
          {error && resetResult && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={copyPassword}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={() => setResetResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {studentName}?</DialogTitle>
            <DialogDescription>
              This sets their status to inactive. They disappear from the default
              list and from grade averages, but their record and grade history are
              kept — this is not a permanent delete.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Removing…" : "Remove student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
