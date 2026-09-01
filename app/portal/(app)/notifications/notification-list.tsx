"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { markOneReadAction, markAllReadAction } from "./actions";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string; // pre-formatted server-side, not a Date — this is a client component
  isUnread: boolean;
};

export function NotificationList({
  notifications,
  page,
  totalPages,
}: {
  notifications: NotificationItem[];
  page: number;
  totalPages: number;
}) {
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || unreadCount === 0}
          onClick={() => startTransition(() => markAllReadAction())}
        >
          Mark all read
        </Button>
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          No notifications yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={
                "flex items-start justify-between gap-4 p-4 " +
                // bg-brand/5 alone was a 1.03:1 tint — invisible on most
                // screens and to anyone with a colour-vision deficiency. The
                // left border carries the same signal at full strength, and
                // is a shape rather than a hue.
                (n.isUnread ? "border-l-2 border-l-brand bg-brand/5" : "border-l-2 border-l-transparent")
              }
            >
              <div className="min-w-0">
                <p className="flex min-w-0 items-start gap-2 text-sm font-medium break-words text-foreground">
                  {n.isUnread && (
                    <>
                      <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />
                      {/* The dot is aria-hidden, so before this a screen
                          reader was told nothing at all about unread state. */}
                      <span className="sr-only">Unread. </span>
                    </>
                  )}
                  {n.link ? (
                    <Link href={n.link} className="hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                  {/* The dot above is aria-hidden and decorative-only — this
                      is the actual, non-color signal that a screen-reader
                      user gets for "unread", on top of the "Mark read"
                      button below only rendering for unread items. */}
                  {n.isUnread && <span className="sr-only">(unread)</span>}
                </p>
                <p className="mt-0.5 text-sm break-words text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.createdAt}</p>
              </div>
              {n.isUnread && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => startTransition(() => markOneReadAction(n.id))}
                  className="shrink-0"
                >
                  Mark read
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Previously this route fetched a flat take: 100 with nothing below
          it — a cap, not pagination, so anyone with more than 100
          notifications lost the rest silently. Same Previous/Next,
          disabled-at-the-boundary pattern as every other list. */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          hrefForPage={(p) => (p > 1 ? `?page=${p}` : "?")}
        />
      )}
    </div>
  );
}
