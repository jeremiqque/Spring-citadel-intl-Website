import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * One labelled form field, with its hint and its error in fixed positions.
 *
 * ── Why a component rather than three lines at each call site ──────────────
 * Because the ACCESSIBLE WIRING is the part that gets forgotten. A hint and
 * an error that sit next to an input but are not referenced by it are
 * invisible to a screen-reader user, who hears "Phone, edit text" and no
 * reason why their last attempt failed. Here `aria-describedby` always names
 * whichever of the two exists, `aria-invalid` flips with the error, and the
 * error is a live region so it is announced when it appears rather than only
 * if the user happens to navigate back to it.
 *
 * The error also RESERVES no space when absent — deliberately. A permanent
 * empty error slot pushes every field apart to accommodate a state that is
 * usually not there; these forms are short enough that the small reflow on
 * failure is cheaper than the constant looseness.
 */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs leading-body text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * A field the signed-in user may READ but not write.
 *
 * Rendered as a definition-list row, not a disabled <input>. A greyed-out
 * text box is the wrong metaphor here: it says "this is temporarily
 * unavailable, try again later", when the truth is "this is not yours to
 * change, and here is who changes it". A disabled input also invites a click
 * that does nothing, which is the single most common complaint about profile
 * screens with a mixed permission model. Plain text with the value in the
 * foreground colour reads as a fact rather than a broken control.
 */
export function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-words text-foreground sm:text-right">{value}</dd>
    </div>
  );
}
