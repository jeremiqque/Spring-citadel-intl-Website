import { cn } from "@/lib/utils"

/**
 * Status vocabulary for the small "state of the work" indicators.
 *
 * These are STATUS colours, not a categorical series palette — green/amber/
 * neutral mean submitted/in-progress/untouched everywhere in the portal and
 * are never reused to mean "the third thing". They match the Badge variants
 * (success / warning / outline) already in use so a badge and a meter
 * segment describing the same fact are the same colour.
 *
 * Every one of them is paired with a text label at every call site below —
 * colour is never the only carrier of meaning, which is what keeps this
 * legible to a colour-blind teacher and in forced-colours mode.
 */
const TONE = {
  neutral: { dot: "bg-muted-foreground/40", bar: "bg-muted-foreground/30", text: "text-foreground" },
  brand: { dot: "bg-brand", bar: "bg-brand", text: "text-foreground" },
  success: { dot: "bg-green-600", bar: "bg-green-600", text: "text-foreground" },
  warning: { dot: "bg-amber-500", bar: "bg-amber-500", text: "text-foreground" },
  danger: { dot: "bg-destructive", bar: "bg-destructive", text: "text-destructive" },
} as const

export type StatTone = keyof typeof TONE

/**
 * A row of counts, as tiles rather than a sentence.
 *
 * Replaces the run-on grey line the grade sheet shipped — "0 students
 * 0 submitted 0 drafts 0 not entered", four numbers at the same weight and
 * colour as the words around them, so reading any one of them required
 * reading all four. Here the number is the loud element (--text-lg, tabular
 * via data-numeric so the digits don't jitter between renders) and the label
 * is the quiet one, which is the correct hierarchy for a figure you glance
 * at rather than read.
 */
export function StatGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4", className)}>
      {children}
    </dl>
  )
}

export function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: React.ReactNode
  value: React.ReactNode
  tone?: StatTone
  hint?: React.ReactNode
}) {
  const t = TONE[tone]
  return (
    <div className="bg-card px-4 py-3.5">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", t.dot)} />
        {label}
      </dt>
      <dd data-numeric className={cn("mt-1 text-lg leading-heading font-semibold", t.text)}>
        {value}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  )
}

/**
 * A stacked part-to-whole meter — how much of one job is done.
 *
 * The teacher's actual question on a grade sheet is "how far through this
 * class am I", and no screen answered it: the counts were there, but turning
 * "12 submitted, 3 drafts, 25 not entered" into a sense of progress was
 * arithmetic the reader had to do. One bar does it pre-attentively.
 *
 * Segments are separated by a 2px surface-coloured gap rather than butting up
 * against each other, so adjacent fills stay countable, and the whole bar
 * carries explicit ARIA progressbar semantics with a human-readable
 * `aria-valuetext` — a screen-reader user gets the same summary, in words,
 * that a sighted user gets from the geometry.
 */
export function ProgressMeter({
  segments,
  total,
  label,
  className,
}: {
  segments: { value: number; tone: StatTone; label: string }[]
  total: number
  label: string
  className?: string
}) {
  const safeTotal = Math.max(total, 1)
  const done = segments[0]?.value ?? 0
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${pct}% — ${segments.map((s) => `${s.value} ${s.label}`).join(", ")}`}
        className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {segments.map((s) =>
          s.value > 0 ? (
            <span
              key={s.label}
              className={cn("h-full rounded-full first:rounded-l-full last:rounded-r-full", TONE[s.tone].bar)}
              style={{ width: `${(s.value / safeTotal) * 100}%` }}
            />
          ) : null
        )}
      </div>
    </div>
  )
}
