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
import { adminRemoveAvatarAction } from "./avatar-actions";

/**
 * "Remove photo", on an admin's view of someone else's record.
 *
 * ── WHY THIS ONE IS CONFIRMED WHEN THE SELF-SERVE REMOVE IS NOT ────────────
 * Removing your OWN photo is trivially reversible — you have the file, you
 * re-upload it — so a dialog there would be ceremony. Removing SOMEONE
 * ELSE'S is not: the admin does not hold the image, the person is told it
 * happened, and only they can put it back. Different act, different weight,
 * different affordance. The dialog also states the notification, so an admin
 * cannot do this believing it is quiet.
 */
export function RemovePhotoButton({
  userId,
  personName,
}: {
  userId: string;
  personName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await adminRemoveAvatarAction(userId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Remove photo
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-left">
          <DialogHeader>
            <DialogTitle>Remove {personName}&apos;s profile photo?</DialogTitle>
            <DialogDescription>
              The photo is deleted and their initial is shown instead. {personName} is notified
              that an administrator removed it, and only they can upload a replacement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="lg" disabled={isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" variant="destructive" loading={isPending} onClick={run}>
              Remove photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
