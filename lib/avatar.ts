/**
 * Profile pictures — the shared rules, in one place.
 *
 * These constants are the contract between three files that must agree or
 * the feature breaks in a way that is hard to see:
 *   - avatar-uploader.tsx enforces them in the browser (so the user is told
 *     early, in terms of the file they picked)
 *   - profile/actions.ts enforces them again on the server (because the
 *     browser copy is advice, not a gate — a Server Action is a public POST
 *     endpoint and the client can be skipped entirely)
 *   - the /api/portal/avatar route reads what the other two produced
 *
 * A fourth caller joined this file without becoming a fourth copy of the
 * rules: admin/students/student-photo-picker.tsx (the "enroll a student"
 * passport-photo field) and admin/students/actions.ts both go through the
 * same cropToSquareJpeg()/decodeAvatarUpload() below rather than
 * reimplementing canvas cropping or the magic-number check a second time.
 * The student's photo IS an avatar — same User.avatar/avatarType/
 * avatarUpdatedAt columns, same serving route — the only thing new about it
 * is that it can be set by someone other than the account's own owner, at
 * enrolment, before that account has ever signed in.
 */

/** Stored edge length. Square, because every place one is rendered is a circle. */
export const AVATAR_SIZE = 256;

/**
 * Ceiling on the bytes the server will accept, checked AFTER decoding.
 *
 * 256px of JPEG at quality 0.82 lands around 30-60KB, so 300KB is generous
 * headroom for an unusually detailed image rather than a real constraint —
 * its job is to bound what a hand-crafted POST can push into the column, not
 * to reject a photo a student actually took. Comfortably under Next's 1MB
 * default Server Action body limit even after base64's 33% inflation.
 */
export const AVATAR_MAX_BYTES = 300 * 1024;

/**
 * What the *file picker* accepts, before any processing.
 *
 * Deliberately larger than AVATAR_MAX_BYTES: a modern phone photo is 3-8MB
 * and is perfectly valid input — it just gets downscaled before it is sent.
 * Rejecting it at the picker would be rejecting the normal case.
 */
export const AVATAR_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Formats the browser can reliably decode into a canvas. */
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Everything is re-encoded to JPEG regardless of what came in.
 *
 * One output format means the serving route never sniffs and never guesses,
 * and it strips EXIF as a side effect — which matters here more than it
 * looks: a phone photo carries GPS coordinates, and this is a portal full of
 * children's records. Canvas re-encoding drops that metadata entirely.
 */
export const AVATAR_OUTPUT_TYPE = "image/jpeg";
export const AVATAR_QUALITY = 0.82;

/**
 * The URL for a user's picture, or null when they have none.
 *
 * `v` is the cache key. The serving route sends a long, immutable
 * Cache-Control, which is only safe BECAUSE this changes whenever the photo
 * does — without it a browser keeps rendering the previous picture after an
 * upload, and the only remedy available to the user is a hard refresh they
 * will never think to perform.
 */
export function avatarUrl(userId: string, avatarUpdatedAt: Date | null | undefined): string | null {
  if (!avatarUpdatedAt) return null;
  return `/api/portal/avatar/${userId}?v=${avatarUpdatedAt.getTime()}`;
}

/**
 * Centre-crop a picked file to a square and re-encode it, client-side.
 *
 * BROWSER ONLY — uses `document.createElement` and `createImageBitmap`.
 * Every caller is a "use client" component (avatar-uploader.tsx,
 * student-photo-picker.tsx); this must never be called from a Server
 * Component or a Server Action.
 *
 * Centre-crop rather than letterbox: a face is almost always in the middle
 * of a portrait, and padding a rectangle into a circle produces a tiny head
 * with grey bars either side. `createImageBitmap(..., "from-image")` honours
 * the EXIF orientation flag, which is what stops a photo taken in portrait
 * from arriving on its side — the classic version of this bug.
 */
export async function cropToSquareJpeg(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari and older browsers without the options bag.
    bitmap = await createImageBitmap(file);
  }

  const edge = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - edge) / 2;
  const sy = (bitmap.height - edge) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");

  // A JPEG has no alpha channel, so a PNG with a transparent background
  // would otherwise composite onto black. Paint white first.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close?.();

  return canvas.toDataURL(AVATAR_OUTPUT_TYPE, AVATAR_QUALITY);
}

// FF D8 FF — the SOI marker every JPEG begins with.
function isJpegBytes(bytes: Buffer): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * Decode and validate a base64 (or data: URL) photo upload, SERVER SIDE.
 *
 * The client-side crop above exists so the person gets a fast, honest
 * preview and so nobody ships an 8MB phone photo over a school connection —
 * it is not a gate. A Server Action is a public POST endpoint; the uploader
 * can be skipped entirely and this function called with anything at all. So
 * every caller (profile/actions.ts's updateAvatarAction, and
 * admin/students/actions.ts's create/updateStudentAction for the passport
 * photo field) re-establishes all three properties independently here:
 *   1. it decodes as base64 at all,
 *   2. it is within the byte ceiling,
 *   3. it actually starts with the JPEG magic number.
 *
 * (3) is the one that matters. Without it the column could hold an HTML or
 * SVG document that the avatar route would then serve from our own origin —
 * stored XSS, delivered by a URL every page already loads in an <img>. The
 * serving route pins Content-Type and sends X-Content-Type-Options: nosniff
 * as well, so this is the inner of two independent locks rather than the
 * only one.
 */
export function decodeAvatarUpload(base64: string): { ok: true; bytes: Buffer } | { ok: false; error: string } {
  // Accept either a bare base64 payload or a full data: URL, and take only
  // the part after the comma — a caller that sends the whole data URL is
  // handled, not corrupted.
  const payload = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;

  let bytes: Buffer;
  try {
    bytes = Buffer.from(payload, "base64");
  } catch {
    return { ok: false, error: "That image could not be read. Try a different photo." };
  }

  if (bytes.length === 0) {
    return { ok: false, error: "That image could not be read. Try a different photo." };
  }
  if (bytes.length > AVATAR_MAX_BYTES) {
    return { ok: false, error: "That image is too large. Try a smaller photo." };
  }
  if (!isJpegBytes(bytes)) {
    // Deliberately vague to the user and precise in intent: a legitimate
    // upload cannot reach this branch, because the uploader always re-encodes
    // to JPEG. Anything here was hand-crafted.
    return { ok: false, error: "That file isn't a supported image." };
  }

  return { ok: true, bytes };
}
