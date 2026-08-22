import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Sizes exist because callers were reaching for className height overrides.
 * `grade-edit-row.tsx` set h-8 on 150 score fields per page; the header
 * search in portal-shell rebuilt this component from scratch as a plain div
 * purely to get h-8; the login flow used h-[50px] and h-[57px]. Button got a
 * size ladder for exactly this reason — Input never did.
 */
const inputSizes = {
  sm: "h-8 px-2.5 text-sm",
  default: "h-9 px-3 text-sm",
  // The auth screens. One height for the whole flow, replacing 50px on
  // login and 57px on first-login.
  auth: "h-[50px] rounded-none px-3.5 text-[length:var(--text-base)]",
} as const

function Input({
  className,
  type,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  size?: keyof typeof inputSizes
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        "flex w-full min-w-0 rounded-md border border-input bg-transparent py-1 shadow-xs transition-[color,box-shadow]",
        inputSizes[size],
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
