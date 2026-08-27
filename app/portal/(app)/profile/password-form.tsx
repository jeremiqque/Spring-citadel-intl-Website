"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { changePasswordAction } from "./actions";

/**
 * Change password.
 *
 * ── WHY THIS IS ITS OWN CARD AND ITS OWN SAVE ──────────────────────────────
 * Because it has a consequence none of the other fields on this page have:
 * it signs the account out everywhere else. Folding it into one big "Save
 * profile" button would mean a user correcting a typo in their name could
 * knock their own phone offline without ever having decided to. Separate
 * act, separate button, and the consequence is stated BEFORE the button
 * rather than in a toast afterwards — a warning that arrives after the
 * irreversible thing has happened is not a warning.
 *
 * The current password is required. That is not friction for its own sake:
 * without it, anyone holding a live cookie — a borrowed phone, an unattended
 * machine in a school lab — could take the account over permanently, and the
 * legitimate owner has no self-service recovery in this system.
 */
export function PasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const filled = currentPassword !== "" && newPassword !== "" && confirmPassword !== "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await changePasswordAction({ currentPassword, newPassword, confirmPassword });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Clear the fields on success. Leaving a filled password form on
      // screen after a successful change leaves three plaintext secrets
      // sitting in the DOM of a machine the user is about to walk away from.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setDone(true);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          id="current-password"
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            setError(null);
            setDone(false);
          }}
          autoComplete="current-password"
        />
        <Field
          id="new-password"
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setError(null);
            setDone(false);
          }}
          autoComplete="new-password"
          // The rule is stated up front, not discovered by failing. A
          // minimum revealed only in an error message costs the user a
          // round-trip to learn something we knew before they typed.
          hint="At least 10 characters."
        />
        <Field
          id="confirm-password"
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setError(null);
            setDone(false);
          }}
          autoComplete="new-password"
          error={error}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={isPending} disabled={!filled}>
          Update password
        </Button>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {done
            ? "Password updated. You have been signed out on your other devices."
            : "Changing your password signs you out on every other device."}
        </p>
      </div>
    </form>
  );
}
