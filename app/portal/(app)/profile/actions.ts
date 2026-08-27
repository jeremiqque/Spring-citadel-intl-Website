"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BCRYPT_COST } from "@/lib/password";
import { AVATAR_MAX_BYTES } from "@/lib/avatar";
import {
  staffProfileSchema,
  studentProfileSchema,
  passwordChangeSchema,
  type StaffProfileValues,
  type StudentProfileValues,
  type PasswordChangeValues,
} from "@/lib/validation/profile";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Self-service profile actions.
 *
 * ── THE SECURITY SHAPE OF THIS FILE ────────────────────────────────────────
 * Not one of these functions takes a user id, a student id or a role from the
 * caller. Every one of them re-derives WHO is acting from `auth()` and reads
 * the row fresh from the database. That is the entire reason a Server Action
 * can be safe: it is a public POST endpoint, callable by anyone with a
 * session cookie and no page of ours ever having rendered, so a parameter
 * naming the target row is a parameter an attacker gets to choose.
 *
 * The role gate is likewise re-read, not trusted from the JWT: the token is
 * issued for up to 30 days and its claims are a snapshot of sign-in time, so
 * a user demoted from ADMIN this morning still carries ADMIN in their cookie.
 * `updateStaffProfile` therefore refuses a caller whose CURRENT row says
 * STUDENT, even if their token says otherwise — which is what stops the
 * student-name policy from being bypassed by simply calling the staff action.
 */

/** ADMIN and TEACHER only: own name, plus a teacher's own phone. */
export async function updateStaffProfile(values: StaffProfileValues): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Your session has expired. Please sign in again." };

  const parsed = staffProfileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details you entered." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, teacher: { select: { id: true } } },
  });
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };

  // The policy check, server-side and role-fresh. A STUDENT calling this
  // endpoint directly is the exact attack this line exists for.
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return { ok: false, error: "Your name is maintained by the school office." };
  }

  const { name, phone } = parsed.data;

  // One transaction: a name saved without its phone (or the reverse) would
  // leave the form showing a half-applied save with no way to tell which
  // half landed.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name } });
    // Only a TEACHER has a phone to write. An admin has no Teacher row, so
    // `phone` is silently ignored rather than erroring — the client never
    // sends it for an admin, and an extra field on a hand-crafted POST
    // should be dropped, not treated as an attack.
    if (user.teacher && phone) {
      await tx.teacher.update({ where: { id: user.teacher.id }, data: { phone } });
    }
  });

  // The session token carries `name` and is only populated at sign-in, so
  // without this the header avatar's initial and the dashboard's "Welcome,
  // …" keep showing the OLD name until the cookie expires — up to 30 days
  // of the save looking like it failed.
  await unstable_update({ user: { name } });

  revalidatePath("/portal/profile");
  return { ok: true };
}

/** STUDENT only: their own contact number. Nothing else on the record. */
export async function updateStudentProfile(values: StudentProfileValues): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Your session has expired. Please sign in again." };

  const parsed = studentProfileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details you entered." };
  }

  // Scoped by userId, not by a student id from the client. There is no
  // /portal/student/[id] route in this app precisely so that "Student A
  // cannot reach Student B" holds by construction; an action that accepted
  // a studentId would hand that back.
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) return { ok: false, error: "No student record is attached to this account." };

  const contactPhone = parsed.data.contactPhone.trim();
  await prisma.student.update({
    where: { id: student.id },
    // "" means the student cleared it. Stored as NULL so the column never
    // holds an empty string standing in for absent — see the schema note.
    data: { contactPhone: contactPhone === "" ? null : contactPhone },
  });

  revalidatePath("/portal/profile");
  return { ok: true };
}

/**
 * Change the signed-in user's password.
 *
 * Same three gates as the first-login flow, for the same reasons: a live
 * session, the CURRENT password, and a fresh read of the user row rather
 * than trust in the token.
 */
export async function changePasswordAction(values: PasswordChangeValues): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Your session has expired. Please sign in again." };

  const parsed = passwordChangeSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true, tokenVersion: true },
  });
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };

  const currentValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!currentValid) {
    // Deliberately says which field is wrong. This is an authenticated user
    // proving they are still at the keyboard, not a login form — there is no
    // account to enumerate here, and a vague "something went wrong" would
    // just cost them a second attempt.
    return { ok: false, error: "That current password isn't right." };
  }

  const hash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
  const nextVersion = user.tokenVersion + 1;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      // A user who reaches this screen and sets their own password has done
      // what the temporary-password flag exists to force, so clear it too —
      // otherwise middleware would bounce them into first-login on their
      // next navigation, immediately after a successful change.
      mustChangePassword: false,
      // Invalidates every OTHER session for this account. Without a version
      // to compare against, a stolen cookie survives a password change — the
      // one thing a password change is supposed to stop.
      tokenVersion: nextVersion,
    },
  });

  // Carry the new version into THIS session's cookie, or auth.config.ts's
  // per-request check invalidates the session we are sitting in and signs
  // the user out of the tab they just used.
  await unstable_update({ user: { mustChangePassword: false, tokenVersion: nextVersion } });

  return { ok: true };
}


/**
 * ── PROFILE PICTURES ───────────────────────────────────────────────────────
 *
 * The browser downscales to a 256px square JPEG before anything is sent (see
 * ./avatar-uploader.tsx). None of that is trusted here. The client-side work
 * exists so the USER gets a fast, honest preview and so we are not shipping
 * an 8MB phone photo over their connection — it is not a gate. A Server
 * Action is a public POST endpoint; the uploader can be skipped entirely and
 * this function called with anything at all.
 *
 * So the server re-establishes all three properties independently:
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

// FF D8 FF — the SOI marker every JPEG begins with.
function isJpeg(bytes: Buffer): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Set the signed-in user's own picture. Any role. */
export async function updateAvatarAction(base64: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Your session has expired. Please sign in again." };

  // Accept either a bare base64 payload or a full data: URL, and take only
  // the part after the comma. Doing this here rather than assuming a shape
  // means a caller that sends the whole data URL is handled, not corrupted.
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
  if (!isJpeg(bytes)) {
    // Deliberately vague to the user and precise in intent: a legitimate
    // upload cannot reach this branch, because the uploader always re-encodes
    // to JPEG. Anything here was hand-crafted.
    return { ok: false, error: "That file isn't a supported image." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      avatar: bytes,
      avatarType: "image/jpeg",
      // Drives the ?v= cache key on the serving URL. Without touching this
      // the browser keeps showing the previous photo forever.
      avatarUpdatedAt: new Date(),
    },
  });

  revalidatePath("/portal/profile");
  return { ok: true };
}

/** Clear the signed-in user's own picture. */
export async function removeAvatarAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Your session has expired. Please sign in again." };

  await prisma.user.update({
    where: { id: session.user.id },
    // All three cleared together. Leaving avatarUpdatedAt set with no bytes
    // would make avatarUrl() hand out a URL that 404s, and the Avatar
    // component would render a broken image instead of falling back to the
    // initial.
    data: { avatar: null, avatarType: null, avatarUpdatedAt: null },
  });

  revalidatePath("/portal/profile");
  return { ok: true };
}
