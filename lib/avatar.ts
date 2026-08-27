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
