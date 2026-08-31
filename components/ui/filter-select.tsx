"use client"

import * as React from "react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type FilterSelectOption = { value: string; label: string }

/**
 * Sentinel for "no explicit choice" — the option a filter shows before
 * anyone picks something, e.g. "All classes" or "Active (default)". Radix's
 * Select can't take an empty-string item value (it reserves "" internally
 * to mean "nothing selected" and throws if an <Item> uses it — see its own
 * source), which is exactly the value every one of these filters used to
 * carry as a plain <option value="">. Using this sentinel instead, and
 * mapping it back to "" the moment a page reads its query param, keeps the
 * *filtering* logic (an empty classId/subjectId/statusParam means "no
 * filter") unchanged everywhere it already worked.
 */
export const FILTER_ALL_VALUE = "__all__"

/**
 * The one dropdown every filter row and settings form renders through —
 * Students, Teachers, Grades, Attendance, Psychomotor, Results and
 * Settings' Term picker all use this instead of six independent native
 * <select>s that merely shared a className, so they look and behave like
 * one control app-wide rather than each page's own approximation of one.
 *
 * Two ways to use it, matching how each caller already manages its value:
 *  - Inside a plain GET filter form (every admin list/table page): pass
 *    `name` and `defaultValue`, leave `value`/`onValueChange` unset.
 *    Radix's Select.Root renders its own hidden native <select> whenever
 *    it's given a `name`, so the surrounding <form>'s "Apply"/"Open" submit
 *    still picks up the chosen value exactly like the native <select> it
 *    replaces — every filter combination stays a shareable URL, only the
 *    visual control changed.
 *  - Inside a controlled client form (Settings' Term picker): pass `value`
 *    and `onValueChange` instead, same as talking to Select directly.
 */
export function FilterSelect({
  id,
  name,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  options,
  className,
}: {
  id?: string
  name?: string
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  options: FilterSelectOption[]
  className?: string
}) {
  return (
    <Select name={name} defaultValue={defaultValue} value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={cn("mt-1 w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
