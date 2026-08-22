"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Same pattern as the student side (Package 6): the notification's own id is
// the only thing the client ever supplies. Which rows that id is allowed to
// touch is constrained server-side by session.user.id in the WHERE clause,
// not by trusting that the id belongs to this user — updateMany simply
// matches zero rows (a harmless no-op) if it doesn't.
export async function markOneReadAction(notificationId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  // Revalidates this page AND the (app) layout above it, which is what
  // actually refetches the top-bar badge count on the next render.
  revalidatePath("/portal/notifications");
  revalidatePath("/portal", "layout");
}

export async function markAllReadAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/portal/notifications");
  revalidatePath("/portal", "layout");
}
