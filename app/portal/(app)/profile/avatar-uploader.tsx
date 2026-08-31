"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AVATAR_ACCEPT, AVATAR_MAX_UPLOAD_BYTES, AVATAR_SIZE, cropToSquareJpeg } from "@/lib/avatar";
import { updateAvatarAction, removeAvatarAction } from "./actions";

/**
 * Upload / replace / remove your profile picture.
 *
 * ── WHY THE BROWSER DOES THE RESIZING ──────────────────────────────────────
 * A photo straight off a phone is 3-8MB and 4000px wide. Sending that to be
 * resized server-side would mean a slow upload on a school connection, a
 * Server Action body far past Next's 1MB default, and an image library
 * (sharp) added to a deployment that has none. Downscaling to a 256px square
 * in a canvas first turns every upload into ~40KB regardless of the camera,
 * costs nothing to run, and — the part that is easy to miss — STRIPS EXIF,
 * including the GPS coordinates a phone photo carries. That matters in a
 * portal full of children's records.
 *
 * The server re-validates everything anyway; see updateAvatarAction.
 *
 * ── THE UX RULES ───────────────────────────────────────────────────────────
 * 1. THE PREVIEW IS THE CROP. The moment a file is chosen, the picture on
 *    screen becomes the exact square that will be saved. A file input that
 *    silently centre-crops and only reveals the result after a round-trip is
 *    how people end up with the top of their head missing and no idea why.
 * 2. CONSTRAINTS ARE STATED BEFORE THE PICKER, not discovered by failing.
 * 3. REMOVE IS PLAIN, NOT GUARDED. It is trivially reversible — upload
 *    another photo — so a confirmation dialog would be ceremony over a
 *    decision that costs nothing to undo.
 */
export function AvatarUploader({
  initialSrc,
  name,
}: {
  initialSrc: string | null;
  name: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The preview wins while it exists, so the new face appears the instant the
  // file is picked rather than after the round-trip.
  const shown = preview ?? initialSrc;
  const hasPhoto = Boolean(shown);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input immediately: without this, picking the SAME file twice
    // in a row fires no change event the second time, so a failed upload
    // cannot be retried by choosing the same photo again.
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
    let dataUrl: string;
    try {
      dataUrl = await cropToSquareJpeg(file);
    } catch {
      setBusy(false);
      setError("That image could not be read. Try a different photo.");
      return;
    }

    setPreview(dataUrl);
    setBusy(false);

    startTransition(async () => {
      const res = await updateAvatarAction(dataUrl);
      if (!res.ok) {
        // Roll the preview back. Leaving the new face on screen after a
        // failed save is a lie about what the server holds — the user walks
        // away believing it worked.
        setPreview(null);
        setError(res.error);
        return;
      }
      // Drop the local preview and let the server-rendered URL take over, so
      // what is on screen is what is actually stored.
      setPreview(null);
      router.refresh();
    });
  }

  function onRemove() {
    setError(null);
    startTransition(async () => {
      const res = await removeAvatarAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPreview(null);
      router.refresh();
    });
  }

  const working = busy || isPending;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar src={shown} name={name} size="xl" className={working ? "opacity-60" : undefined} />

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            loading={working}
            onClick={() => inputRef.current?.click()}
          >
            {hasPhoto ? "Change photo" : "Upload photo"}
          </Button>
          {hasPhoto && (
            <Button type="button" size="sm" variant="ghost" disabled={working} onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>

        {/* The real control. Hidden rather than styled, because a file input
            cannot be restyled reliably across browsers — but it stays a real
            input in the DOM with a label, so keyboard and screen-reader
            users reach it through the button above (which forwards the
            click) rather than being locked out of the feature. */}
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          onChange={onPick}
          className="sr-only"
          aria-label="Choose a profile photo"
          tabIndex={-1}
        />

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : (
          <p className="max-w-xs text-xs leading-body text-muted-foreground">
            JPG, PNG or WebP, up to 10MB. Cropped to a square from the centre and saved at{" "}
            {AVATAR_SIZE}px.
          </p>
        )}
      </div>
    </div>
  );
}
