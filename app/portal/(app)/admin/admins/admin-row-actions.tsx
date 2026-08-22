"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { resetAdminPasswordAction } from "./actions";

export function AdminRowActions({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = () => {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await resetAdminPasswordAction(adminId);
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
    await navigator.clipboard.writeText(resetResult);
    setCopied(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${adminName}`}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setError(null);
              setConfirmReset(true);
            }}
          >
            Reset password
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && !confirmReset && (
        <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>
      )}

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset {adminName}&apos;s password?</DialogTitle>
            <DialogDescription>
              Their current password stops working immediately, along with any session
              they&apos;re already signed in on. A new temporary one is shown once, and they
              must change it at their next login.
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
              Write this down or copy it now — it won&apos;t be shown again. {adminName} must
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
    </>
  );
}
