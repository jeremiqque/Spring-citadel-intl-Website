"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        // BUG FIX: Radix renders this into document.body via Portal, which is
        // OUTSIDE the .portal wrapper in app/portal/(app)/layout.tsx. Every
        // scoped token (--popover, --border, --foreground, --font-sans) is
        // declared under .portal in globals.css, so out here bg-popover
        // resolved to an undefined var = fully TRANSPARENT: the page's own
        // buttons and labels showed straight through the open menu. Re-adding
        // the class on the portalled element restores the token scope.
        // RESPONSIVE: three things here are load-bearing, not styling.
        //   max-h + overflow-y-auto — without them a dialog taller than the
        //     viewport was clipped symmetrically by -translate-y-1/2 with no
        //     way to scroll, which put its OWN confirm button permanently out
        //     of reach on a short screen (a landscape phone, or a 667px
        //     handset with the keyboard up). Every dialog in the portal
        //     inherits the guard from here rather than each one capping
        //     itself and half of them forgetting to.
        //   svh, not vh — mobile Safari measures vh against the URL-bar-
        //     expanded viewport, so a 100vh-tall dialog hides its footer under
        //     the browser chrome on first paint.
        //   w-[calc(100%-2rem)], not w-full or 100vw — this element is
        //     `fixed`, so a percentage resolves against the viewport EXCLUDING
        //     the scrollbar (100vw includes it and shifts the panel
        //     off-centre on desktop). w-full made it edge-to-edge at 320-430px
        //     with the rounded corners and shadow clipped off, and no overlay
        //     visible to tap for "click outside to dismiss".
        className={cn(
          "portal",
          "fixed top-1/2 left-1/2 z-50 max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-lg border border-border bg-background p-5 shadow-lg outline-none sm:p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("mb-4 flex flex-col gap-1.5 pr-9", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
