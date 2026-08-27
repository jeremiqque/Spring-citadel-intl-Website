"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validation/id";
import { createNotification } from "@/lib/notify";

export type RemoveAvatarResult = { ok: true } | { ok: false; error: string };

/**
 * An administrator removes someone else's profile photo.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Profile photos on this portal are uploaded by students, who are children,
 * and are then visible to staff. The model chosen for that is "goes live
 * immediately, staff can remove" rather than a moderation queue — which only
 * works if the removal control actually exists and is one click from the
 * student's record. A safeguarding policy with no button behind it is not a
 * policy.
 *
 * ── AND WHY THE PERSON IS ALWAYS TOLD ──────────────────────────────────────
 * Removal raises a notification to the account it happened to. Doing this
 * silently is worse than it sounds: the student sees their initial back,
 * concludes the upload broke, and re-uploads the same photo — repeatedly,
 * against a member of staff who is repeatedly removing it, with neither
 * party aware the other is acting. The notification turns an invisible
 * conflict into a conversation with the office.
 *
 * The role is re-read from the database rather than taken from the session,
 * unlike the older requireAdmin() helpers in this directory: a JWT lasts up
 * to 30 days and still says ADMIN after a demotion. That matters more here
 * than on most actions, because this one reaches into another user's row.
 */
export async function adminRemoveAvatarAction(userId: string): Promise<RemoveAvatarResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Your session has expired." };

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (actor?.role !== "ADMIN") return { ok: false, error: "Forbidden." };

  const parsedId = idSchema.safeParse(userId);
  if (!parsedId.success) return { ok: false, error: "Unknown account." };

  const target = await prisma.user.findUnique({
    where: { id: parsedId.data },
    select: { id: true, avatarUpdatedAt: true },
  });
  if (!target) return { ok: false, error: "Unknown account." };

  // Nothing to do, and — more to the point — nothing to notify anyone about.
  // Without this an admin double-clicking the button would send a second
  // "your photo was removed" for a photo that was already gone.
  if (!target.avatarUpdatedAt) return { ok: true };

  await prisma.user.update({
    where: { id: target.id },
    data: { avatar: null, avatarType: null, avatarUpdatedAt: null },
  });

  await createNotification({
    userId: target.id,
    type: "PROFILE_PHOTO_REMOVED",
    title: "Your profile photo was removed",
    body:
      "An administrator removed the photo on your profile. You can upload a different one from " +
      "your profile page, or speak to the school office if you are not sure why it was removed.",
    link: "/portal/profile",
  });

  // Both the record page the admin is standing on and the target's own
  // profile, which may be open in another session.
  revalidatePath("/portal/admin/students");
  revalidatePath("/portal/admin/teachers");
  revalidatePath("/portal/profile");
  return { ok: true };
}
