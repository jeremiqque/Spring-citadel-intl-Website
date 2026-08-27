import { cn } from "@/lib/utils"

/**
 * The portal's card. One containment primitive, so a roster, a grade sheet
 * and a stat tile all sit on the same kind of paper.
 *
 * ── Why rounded-xl + shadow-sm ─────────────────────────────────────────────
 * Not a new look — it is the treatment `InfoCard` already shipped
 * (`rounded-xl border border-border bg-card p-5 shadow-sm`). What was
 * inconsistent is that everything ELSE in the portal used a flatter
 * `rounded-lg border` with no elevation, so the profile pages quietly looked
 * a tier more finished than the pages teachers actually live in. This picks
 * the better of the two treatments already in the codebase and makes it the
 * one, rather than inventing a third.
 *
 * Padding is a prop rather than baked in because tables need to run edge to
 * edge inside the card (padded content would double up with TableCell's own
 * p-3 and leave a gutter the header rule can't cross). `padding="none"` is
 * the table case; the SurfaceHeader below then supplies its own inset.
 */
export function Surface({
  padding = "md",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { padding?: "none" | "sm" | "md" }) {
  return (
    <div
      data-slot="surface"
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        padding === "md" && "p-5",
        padding === "sm" && "p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * The header strip of a Surface: a title, optional meta text after it, and a
 * right-hand actions slot. Draws its own bottom rule so a table can start
 * immediately beneath it with nothing between them.
 *
 * `title` renders as a plain node, not a heading element, because the caller
 * decides the outline level — a roster card inside a page is an <h2>, the
 * same card on a detail page might be an <h3>. Pass the element you want.
 */
export function SurfaceHeader({
  className,
  children,
  actions,
  ...props
}: React.ComponentProps<"div"> & { actions?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border px-5 py-4",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">{children}</div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/**
 * The "nothing here yet" block inside a Surface.
 *
 * Empty states were previously a single grey sentence, or — worse, on the
 * grade sheet — a `colSpan={9}` table row, which renders a full set of column
 * headers describing columns that contain nothing. That is a table pretending
 * to have data. This replaces the table entirely when there are no rows, so
 * the screen says one thing instead of nine empty ones.
 *
 * Title states the fact; `children` says what would change it. An empty state
 * that doesn't tell you who can fix it (here: an administrator enrols
 * students) is just a dead end.
 */
export function EmptyState({
  icon,
  title,
  className,
  compact = false,
  children,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  className?: string
  /**
   * Tighter vertical rhythm, for an empty state that fills a SLOT inside a
   * card rather than a whole page — an unenrolled class on My Classes, where
   * five populated class cards sit around it. At full height that one card
   * grew taller than the five rosters beneath it combined, which made the
   * emptiest thing on the page the most prominent thing on it.
   */
  compact?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 text-center",
        compact ? "py-7" : "py-12",
        className
      )}
    >
      {icon && (
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && (
        <p className="mt-1.5 max-w-sm text-xs leading-body text-muted-foreground">{children}</p>
      )}
    </div>
  )
}
