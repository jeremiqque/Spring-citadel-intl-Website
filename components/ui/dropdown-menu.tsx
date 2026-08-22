"use client"

import * as React from "react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  side = "bottom",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        // Same rule as SelectContent: menus open downward, never flipping up
        // over the trigger. The row-actions menu at the bottom of a long
        // student table was the visible case. Height is clamped to the space
        // actually available so a pinned-down menu scrolls rather than
        // running off-screen.
        side={side}
        avoidCollisions={false}
        // BUG FIX: Radix renders this into document.body via Portal, which is
        // OUTSIDE the .portal wrapper in app/portal/(app)/layout.tsx. Every
        // scoped token (--popover, --border, --foreground, --font-sans) is
        // declared under .portal in globals.css, so out here bg-popover
        // resolved to an undefined var = fully TRANSPARENT: the page's own
        // buttons and labels showed straight through the open menu. Re-adding
        // the class on the portalled element restores the token scope.
        className={cn(
          "portal",
          "z-50 min-w-[8rem] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
          "max-h-[var(--radix-dropdown-menu-content-available-height)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none",
        // Was `outline-none` + `focus:bg-muted`. --muted is oklch(0.97) on a
        // white popover: a ~1.05:1 state change, and outline-none killed the
        // global focus ring too, so arrowing toward a destructive item was
        // untrackable. Deeper tint, and the ring is allowed through.
        "focus:bg-foreground/10 focus:text-foreground",
        "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator }
