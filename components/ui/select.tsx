"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "radix-ui"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[placeholder]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="shrink-0 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  side = "bottom",
  sideOffset = 4,
  align = "start",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        // ALWAYS OPENS DOWNWARD. Radix defaults to avoidCollisions, which
        // flips the list above the trigger whenever it doesn't fit below —
        // and the class list (16 options) never fits below a trigger in the
        // lower half of a form, so it flipped constantly and covered the
        // field you had just clicked. Pinning side="bottom" alone would push
        // the list off the bottom of the screen, so the two go together:
        // avoidCollisions={false} to stop the flip, and a max-height tied to
        // Radix's own --radix-select-content-available-height so the list
        // stops at the viewport edge and scrolls instead of overflowing.
        side={side}
        sideOffset={sideOffset}
        align={align}
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
          "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
          // Never taller than the space left below the trigger, and at least
          // as wide as the trigger itself so options don't render narrower
          // than the field they belong to.
          "max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          position === "popper" && "translate-y-1",
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="max-h-[inherit] overflow-y-auto p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm select-none",
        // See the note in dropdown-menu.tsx: focus:bg-muted was a ~1.05:1
        // change and outline-none suppressed the global focus ring.
        "focus:bg-foreground/10 focus:text-foreground",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
        <HugeiconsIcon icon={Tick02Icon} size={14} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem }
