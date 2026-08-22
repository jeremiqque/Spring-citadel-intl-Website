import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";

// A STUDENT-role session with no Student row is a data-integrity problem —
// but it is the STUDENT who ends up looking at it, and they can do nothing
// about it. Previously both student pages threw, which (with no error
// boundary) meant a white screen showing a raw internal message and the
// user's own session id.
//
// The condition is still worth shouting about, so the pages log it
// server-side; this is only what the student sees.
export function StudentRecordMissing() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100">
          <HugeiconsIcon icon={Alert01Icon} size={24} className="text-amber-800" />
        </div>

        <h1 className="text-lg font-semibold text-foreground">Your student record isn&apos;t set up yet</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Your account exists, but it hasn&apos;t been linked to a student record, so there are no
          results to show. Please ask the school office to finish setting up your account.
        </p>
      </div>
    </div>
  );
}
