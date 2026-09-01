"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { updateStaffProfile } from "./actions";

/**
 * ADMIN / TEACHER: edit your own name, and (teachers) your own phone.
 *
 * ── THE TWO UX RULES THIS FORM FOLLOWS ─────────────────────────────────────
 * 1. SAVE IS DISABLED UNTIL SOMETHING CHANGED. A live Save button on an
 *    untouched form invites a pointless round-trip and then shows "Saved",
 *    which teaches the user that "Saved" is noise. Here the button can only
 *    be pressed when there is genuinely something to save, so its confirmation
 *    always means something happened.
 *
 * 2. THE CONFIRMATION IS TIED TO THE EDIT, NOT TO TIME. "Saved" clears the
 *    moment the user types again, rather than after an arbitrary timeout —
 *    a message that fades on its own can vanish before it is read, and one
 *    that lingers is lying about the current state of the form.
 */
export function StaffProfileForm({
  initialName,
  initialPhone,
  showPhone,
}: {
  initialName: string;
  initialPhone: string;
  /** Teachers have a phone on their staff record; admins have no Teacher row. */
  showPhone: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = name !== initialName || (showPhone && phone !== initialPhone);

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setSaved(false);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateStaffProfile({
        name,
        ...(showPhone ? { phone } : {}),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      // The sidebar avatar's initial and the dashboard greeting read the
      // session, which the action has just refreshed — this is what makes
      // them catch up without a reload.
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="profile-name"
          label="Full name"
          value={name}
          onChange={(e) => edit(setName)(e.target.value)}
          autoComplete="name"
          hint="Shown on your account and anywhere the portal greets you."
          error={error}
        />
        {showPhone && (
          <Field
            id="profile-phone"
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => edit(setPhone)(e.target.value)}
            autoComplete="tel"
            hint="How the school office reaches you."
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={isPending} disabled={!dirty}>
          Save changes
        </Button>
        {/* aria-live so the confirmation is announced, not just drawn. */}
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {saved && !dirty ? "Saved." : dirty ? "Unsaved changes." : ""}
        </p>
      </div>
    </form>
  );
}
