"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { AVATAR_ACCEPT, AVATAR_MAX_UPLOAD_BYTES, AVATAR_SIZE, cropToSquareJpeg } from "@/lib/avatar";

/**
 * The passport-photograph field on the "Enroll a student" (and edit) form.
 *
 * This is deliberately NOT a smaller copy of ./profile/avatar-uploader.tsx —
 * it can't save anything itself. AvatarUploader calls updateAvatarAction the
 * instant a file is picked because it always acts on the CALLER's own
 * account (auth().user.id — see profile/actions.ts's comment on why none of
 * those actions take a target id). An admin filling out this form is setting
 * someone ELSE's photo, on a student row that, in "create" mode, does not
 * exist yet. So this component only stages a cropped data: URL into the
 * surrounding react-hook-form state via onChange; the actual write happens
 * inside createStudentAction/updateStudentAction, together with — and no
 * faster than — the rest of the form, in the same transaction as everything
 * else the office typed in.
 *
 * One consequence of staging rather than saving: this picker can offer
 * "choose" and "undo this pick", but not "remove the saved photo" — while
 * the form is open there IS no saved photo yet as far as this component
 * knows, only whatever currentPhotoUrl was rendered with. Removing an
 * already-persisted photo stays on the student's profile page, via the
 * existing RemovePhotoButton / adminRemoveAvatarAction pair, where "remove"
 * unambiguously means "right now" rather than "when this form submits".
 */
export function StudentPhotoPicker({
  value,
  onChange,
  currentPhotoUrl,
  name,
}: {
  /** The staged data: URL, if the office has picked a new photo this visit. */
  value: string | undefined;
  onChange: (dataUrl: string | undefined) => void;
  /** The already-saved photo, if any — edit mode only; create mode passes null. */
  currentPhotoUrl?: string | null;
  /** For the avatar fallback initial and its accessible name. */
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = value ?? currentPhotoUrl ?? null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset immediately: without this, picking the SAME file twice in a row
    // fires no change event the second time, so a rejected photo can't be
    // retried by choosing it again.
    e.target.value = "";
    if (!file) return;

    setError(null);

    if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
      setError("That file is over 10MB. Choose a smaller photo.");
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await cropToSquareJpeg(file);
      onChange(dataUrl);
    } catch {
      setError("That image could not be read. Try a different photo.");
    } finally {
      setBusy(false);
    }
  }

  function undoPick() {
    setError(null);
    onChange(undefined);
  }

  return (
    <div>
      <Label>Passport photograph</Label>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Avatar src={shown} name={name || "?"} size="lg" className={busy ? "opacity-60" : undefined} />

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
              {shown ? "Change photo" : "Upload photo"}
            </Button>
            {/* Only ever undoes THIS visit's pick — see the file doc comment
                for why a saved photo isn't removable from here. */}
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={undoPick}>
                Undo
              </Button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            onChange={onPick}
            className="sr-only"
            aria-label="Choose a passport photograph"
            tabIndex={-1}
          />

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : (
            <p className="max-w-xs text-xs leading-body text-muted-foreground">
              Optional — the office can add this later. JPG, PNG or WebP, up to 10MB, cropped to a
              square at {AVATAR_SIZE}px.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
