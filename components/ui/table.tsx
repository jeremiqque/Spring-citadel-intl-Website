import * as React from "react"

import { cn } from "@/lib/utils"

function Table({
  className,
  caption,
  ...props
}: React.ComponentProps<"table"> & { caption?: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      >
        {/* Optional, sr-only by default — a caption is what actually
            associates "what is this table" with the table for a screen
            reader, on top of whatever heading happens to sit above it in
            the DOM. Visually silent since the on-page heading already
            covers sighted users. */}
        {caption && <caption className="sr-only">{caption}</caption>}
        {props.children}
      </table>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead data-slot="table-header" className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b border-border transition-colors hover:bg-muted/50", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      // Every TableHead in this app is a column header (no row-header use
      // yet) — scope="col" is what actually ties each header to its
      // column for screen-reader users navigating the table by cell,
      // rather than relying on visual position alone. Still overridable
      // via props for the day a row header shows up.
      scope="col"
      className={cn(
        "h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-3 align-middle whitespace-nowrap", className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
