import { HugeiconsIcon } from "@hugeicons/react"
import { Book01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

type IconType = typeof Book01Icon

// The small set of icon-chip colours these cards come in. Same green/amber/
// red/blue/violet vocabulary the KPI tiles elsewhere in the portal already
// use (dashboard, student/teacher profile) — a card header just needs a
// couple of them, not the whole KPI palette.
const CHIP_COLOR = {
  blue: { bg: "bg-blue-100", text: "text-blue-800" },
  violet: { bg: "bg-violet-100", text: "text-violet-800" },
  green: { bg: "bg-green-100", text: "text-green-800" },
  amber: { bg: "bg-amber-100", text: "text-amber-800" },
} as const

/**
 * A read-only "here's a record's details" card — an icon-chip header over a
 * divided list of label/value rows (InfoRow below). Pulled out of the
 * student and teacher profile pages, which each had their own plain
 * `<h2>` + `dl`/`space-y-2` version of this: same content, no icons, no
 * shadow, rows just stacked with a gap rather than actually separated.
 * One component now, so "Personal details", "Guardian" and a teacher's
 * "Staff info" all read as the same kind of thing rather than three
 * slightly different one-offs.
 */
export function InfoCard({
  icon,
  color = "blue",
  title,
  className,
  children,
}: {
  icon: IconType
  color?: keyof typeof CHIP_COLOR
  title: string
  className?: string
  children: React.ReactNode
}) {
  const c = CHIP_COLOR[color]
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="mb-1 flex items-center gap-2.5">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", c.bg)}>
          <HugeiconsIcon icon={icon} size={15} className={c.text} />
        </span>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </div>
      <dl className="divide-y divide-border">{children}</dl>
    </div>
  )
}

/** One label/value row inside an InfoCard, with its own small leading icon. */
export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: IconType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 text-sm first:pt-3 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <HugeiconsIcon icon={icon} size={14} className="shrink-0 text-muted-foreground/70" />
        {label}
      </dt>
      <dd className="min-w-0 font-medium break-words text-foreground sm:text-right">{value}</dd>
    </div>
  )
}
