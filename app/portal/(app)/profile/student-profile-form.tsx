"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { updateStudentProfile } from "./actions";

/**
 * STUDENT: the one field on their record they own.
 *
 * A form with a single input is still worth being a form: it gives the value
 * a label, a hint that explains what the number is FOR (students otherwise
 * assume it replaces their guardian's), and a save with real feedback. The
 * alternative — an inline "click to edit" — hides the affordance behind a
 * hover state that does not exist on the phones most of these users are on.
 */
export function StudentProfileForm({ initialContactPhone }: { initialContactPhone: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contactPhone, setContactPhone] = useState(initialContactPhone);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = contactPhone !== initialContactPhone;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateStudentProfile({ contactPhone });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        id="profile-contact-phone"
        label="My phone number"
        type="tel"
        value={contactPhone}
        onChange={(e) => {
          setContactPhone(e.target.value);
          setSaved(false);
          setError(null);
        }}
        autoComplete="tel"
        placeholder="Optional"
        // Says what it is NOT, because that is the confusion: a student who
        // thinks this replaces their guardian's number may delete the only
        // number the school can actually reach a responsible adult on.
        hint="Optional. This is your own number — it does not replace your guardian's contact details."
        error={error}
        className="sm:max-w-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={isPending} disabled={!dirty}>
          Save
        </Button>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {saved && !dirty ? "Saved." : dirty ? "Unsaved changes." : ""}
        </p>
      </div>
    </form>
  );
}
