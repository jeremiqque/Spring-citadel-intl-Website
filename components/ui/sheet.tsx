"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

// A left-edge drawer, built on Radix Dialog rather than hand-rolled, so it
// gets focus trapping, Escape-to-close, scroll locking and inert background
// content for free. Those are the things a div-with-a-transform silently
// omits, and they are exactly what a keyboard or screen-reader user needs
// from a navigation drawer.
//
// Only used below `lg` — see app/portal/(app)/portal-shell.tsx, where the
// same nav renders as a static <aside> from `lg` up.

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      {/* `portal` on both portalled elements: Radix renders these into
          document.body, outside the .portal wrapper that scopes every design
          token. Without it bg-sidebar/border-sidebar-border resolve to
          undefined vars and the drawer renders transparent. */}
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="portal fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "portal fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left data-[state=open]:duration-200 data-[state=closed]:duration-200",
          className
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

// Radix throws a dev warning if a Dialog has no Title. The drawer's heading
// is the school crest block, which is decorative, so callers render this
// visually hidden instead.
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("sr-only", className)} {...props} />
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("sr-only", className)}
      {...props}
    />
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription }
