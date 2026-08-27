import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * A segmented control built out of plain links.
 *
 * ── Why links and not buttons ──────────────────────────────────────────────
 * The term switcher has to keep working with JavaScript off and every term
 * has to be a shareable URL — that constraint is why the grade sheet used
 * anchors in the first place, and it is preserved here exactly. What changes
 * is only the presentation: the previous version drew the selected term as a
 * grey `bg-secondary` pill floating on the page background with nothing
 * around it, which reads as "a button someone highlighted" rather than "one
 * of three positions". A track makes the set legible as a set — you can see
 * the options you are NOT on, which is the whole point of a segmented
 * control over a dropdown.
 *
 * `aria-current="page"` stays on the selected item and is what actually
 * conveys selection to assistive tech; the thumb is decoration on top of it.
 * That matches the sidebar and the student results page, so "selected" is
 * announced the same way everywhere in the portal.
 */
export function Segmented({
  items,
  className,
  label,
}: {
  label: string
  className?: string
  items: { key: string; href: string; label: React.ReactNode; current: boolean }[]
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-0.5",
        className
      )}
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
            item.current
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
