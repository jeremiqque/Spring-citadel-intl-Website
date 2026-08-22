import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

// The whole notification system, on purpose: one helper, called directly
// from inside the Server Actions that already existed before this package.
// No queue, no event bus, no cron — a notification is just a row written in
// the same request that caused it, right after the thing it's about
// succeeds. If this insert fails, it must never take down the action that
// triggered it (enrolling a student matters more than the toast telling an
// admin about it), so every call site wraps this in try/catch and only logs.
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    },
  });
}

// FR-35/36/37 all fan out to "every admin," never a specific admin — there is
// no concept of an assigned admin anywhere else in this build, so this is the
// one place that decides who "the admins" are.
export async function notifyAdmins(params: { type: NotificationType; title: string; body: string; link?: string }) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    })),
  });
}
