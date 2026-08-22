import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchRemoveIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

// Renders inside PortalShell, so a notFound() from a student/teacher detail
// page keeps the sidebar and top bar instead of dropping the user onto
// Next's bare 404 outside the app with only the browser back button.
//
// Reachable from a stale bookmark, or a link to a record another admin has
// since removed — both normal, so the copy treats it as normal.
export default function PortalNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={SearchRemoveIcon} size={24} className="text-muted-foreground" />
        </div>

        <h1 className="text-lg font-semibold text-foreground">We couldn&apos;t find that page</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          It may have been removed, or the link may be out of date.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/portal/admin/students">Go to students</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/portal">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
