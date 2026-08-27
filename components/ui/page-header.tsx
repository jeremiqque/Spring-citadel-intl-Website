import { cn } from "@/lib/utils"

/**
 * The standard top-of-page block: title, one line of context beneath it, and
 * an optional right-hand slot for the page's primary action.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * Every portal page hand-rolled its own `<div><h1 className="text-2xl
 * font-semibold">…</h1><p className="mt-1 text-sm text-muted-foreground">`.
 * Two problems with that, beyond the duplication:
 *
 *   1. `text-2xl` is 34px on this project's scale — the rung the scale's own
 *      comment reserves for "hero / auth headings". Every portal page title
 *      was rendering one rung above the page-title size the scale defines
 *      (`--text-xl`, 24px), which is why the portal read as shouty next to
 *      its own data. This uses the rung that was designed for it.
 *   2. There was nowhere for a page-level action to go, so actions ended up
 *      scattered into the body (the grade sheet's "Open" button sitting
 *      inside a filter row halfway down the page).
 *
 * The `eyebrow` is a small uppercase overline on --text-2xs, the rung the
 * scale reserves for exactly that. It carries the "where am I" breadcrumb
 * (class · subject · session) so the title itself can stay short.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-2xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl leading-heading font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm leading-body text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
