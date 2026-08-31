"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteClassAction } from "./actions";

/**
 * A single icon-only action, not a dropdown menu — there is only one thing
 * to do to a class from this table (delete it; nothing here is editable,
 * see class-form.tsx's own comment on why), so a menu with one item in it
 * would be a click to open a click. The confirmation dialog is where the
 * real information lives: deleteClassAction checks students, grades,
 * attendance, psychomotor ratings and term results before touching the row,
 * so a class that's actually in use gets a plain-English reason here rather
 * than the delete silently doing nothing or a raw database error.
 */
export function ClassDeleteButton({ classId, className }: { classId: string; className: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteClassAction(classId);
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
      <button
        type="button"
        aria-label={`Delete ${className}`}
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        <HugeiconsIcon icon={Delete02Icon} size={16} />
      </button>

      <Dialog open={confirmOpen} onOpenChange={(open) => !open && setConfirmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {className}?</DialogTitle>
            <DialogDescription>
              This can&apos;t be undone. Deleting only works while the class has never had a
              student, grade, attendance mark or rating recorded against it.
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
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
