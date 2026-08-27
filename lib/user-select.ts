import type { Prisma } from "@prisma/client";

/**
 * The columns of User that a page is allowed to load about *another* person.
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 * Twelve queries across the admin screens were written as
 * `include: { user: true }`, which means SELECT *. That was already worse
 * than it looked — every one of them pulled the bcrypt PASSWORD HASH into a
 * React Server Component, one prop-drill away from being serialised into a
 * page — and adding the avatar BYTEA column made it visibly expensive as
 * well: the students list would have fetched a photograph for every row in
 * order to render a column of names.
 *
 * So the fix is one shared selection rather than twelve hand-written ones,
 * because the failure mode of hand-written ones is that the thirteenth query
 * forgets. `avatarUpdatedAt` is in here; `avatar` deliberately is not — the
 * bytes are read in exactly one place, the /api/portal/avatar route, and
 * everywhere else needs only the timestamp that builds the URL.
 *
 * If a page genuinely needs a field that is not here, add it here rather
 * than reaching for `user: true`.
 */
export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUpdatedAt: true,
} satisfies Prisma.UserSelect;

/** Ready to drop into an `include`/`select`: `user: PUBLIC_USER` */
export const PUBLIC_USER = { select: PUBLIC_USER_SELECT } as const;
