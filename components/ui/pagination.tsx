import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Previous/Next pagination.
 *
 * WHY THIS EXISTS — ten sites across five files hand-rolled the same thing:
 *
 *   <Button asChild variant="outline" size="sm"
 *           className={onFirstPage ? "pointer-events-none opacity-50" : undefined}>
 *     <Link href={pageHref(page - 1)} aria-disabled={onFirstPage}
 *           tabIndex={onFirstPage ? -1 : undefined}>Previous</Link>
 *   </Button>
 *
 * That produces a control which LOOKS disabled and is only disabled by CSS.
 * `pointer-events-none` stops the mouse; it does nothing for the keyboard, and
 * `aria-disabled` is an announcement, not a behaviour — so a keyboard user
 * could still activate "Previous" on page 1. Reproducing it ten times meant
 * ten chances to get the tabIndex dance wrong, and two of the five sites
 * already spelled it differently.
 *
 * Here the disabled edge renders a real <button disabled>, which the browser
 * removes from the tab order and refuses to activate, and only the live edge
 * renders a link. The visual result is identical.
 */
export function Pagination({
  page,
  totalPages,
  hrefForPage,
  itemLabel,
  totalItems,
}: {
  page: number;
  totalPages: number;
  /** Build the query string for a target page. Return "" for page 1. */
  hrefForPage: (page: number) => string;
  /** Singular noun, e.g. "student". Pluralised with a naive +s. */
  itemLabel?: string;
  totalItems?: number;
}) {
  const onFirstPage = page <= 1;
  const onLastPage = page >= totalPages;

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {totalPages}
        {itemLabel !== undefined && totalItems !== undefined && (
          <>
            {" "}
            ({totalItems} {itemLabel}
            {totalItems === 1 ? "" : "s"})
          </>
        )}
      </span>

      <div className="flex gap-2">
        {onFirstPage ? (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page - 1)} rel="prev">
              Previous
            </Link>
          </Button>
        )}

        {onLastPage ? (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page + 1)} rel="next">
              Next
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
