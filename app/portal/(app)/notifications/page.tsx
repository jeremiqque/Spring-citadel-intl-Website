import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationList } from "./notification-list";

const PAGE_SIZE = 25;

// Step 88: ONE route for every role — no /portal/admin/notifications,
// /portal/teacher/notifications, etc. What a user sees here is scoped
// entirely by session.user.id, same security shape as the student side in
// Package 6: nothing here is a client-supplied id that could reach someone
// else's notifications.
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/portal/login"); // defense in depth; middleware already guarantees this

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  // Previously a flat take: 100 with no page control at all — a fixed cap
  // is still a cap, but a user with more than 100 notifications simply
  // never saw the rest. Paginated like every other list in the app instead.
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where: { userId: session.user.id } }),
  ]);

  const items = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    link: n.link,
    createdAt: n.createdAt.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    isUnread: n.readAt === null,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
      <NotificationList notifications={items} page={page} totalPages={totalPages} />
    </div>
  );
}
