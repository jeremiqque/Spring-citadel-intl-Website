"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon, MinusSignIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

/**
 * A tri-state checkbox (unchecked / checked / indeterminate) built on
 * radix-ui's own Checkbox primitive, styled to match the app's other form
 * controls (Select, Input) — same 1px border, same rounded-md, same focus
 * ring. `checked` accepts Radix's own `boolean | "indeterminate"`, which is
 * what the students table's header "select all" checkbox needs when only
 * some rows on the page are selected.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative size-4 shrink-0 rounded border border-input bg-transparent shadow-xs transition-shadow",
        "before:absolute before:-inset-2 before:content-[''] sm:before:hidden",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === "indeterminate" ? (
          <HugeiconsIcon icon={MinusSignIcon} size={12} />
        ) : (
          <HugeiconsIcon icon={Tick02Icon} size={12} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
