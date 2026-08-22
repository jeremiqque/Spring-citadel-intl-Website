"use client";

import Link from "next/link";
import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

// Route-segment error boundary for every authenticated page.
//
// Before this existed, ANY throw below /portal — most likely a Prisma
// "Can't reach database server", which this project hits whenever the Neon
// connection drops — escaped to the root and Next rendered its bare
// "Application error: a server-side exception has occurred". No shell, no
// nav, no retry, and a stack digest as the only content.
//
// This boundary is a child of (app)/layout.tsx, so it renders INSIDE
// PortalShell: the sidebar and top bar stay, and the failure is contained to
// the page area. reset() re-runs the failed segment, which is the right
// first move for a dropped connection because the pool reconnects.
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side digest only; the real stack is in the server logs.
    console.error("[portal] segment error:", error);
  }, [error]);

  const isConnectivity =
    /can't reach database|connection|ECONNREFUSED|ETIMEDOUT|terminated/i.test(error.message);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <HugeiconsIcon icon={Alert01Icon} size={24} className="text-destructive" />
        </div>

        <h1 className="text-lg font-semibold text-foreground">
          {isConnectivity ? "Can't reach the server" : "Something went wrong"}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {isConnectivity
            ? "The connection to the database dropped. This is usually temporary — try again in a moment."
            : "This page failed to load. Trying again often works; if it keeps happening, let your administrator know."}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/portal">Back to dashboard</Link>
          </Button>
          <Button size="lg" onClick={reset}>
            <HugeiconsIcon icon={RefreshIcon} size={16} />
            Try again
          </Button>
        </div>

        {error.digest && (
          <p className="mt-4 font-mono text-[10px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
