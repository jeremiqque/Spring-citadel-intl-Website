"use client";

import { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// A child enrolling here runs from a toddler (Pre-Nursery) to ~18 (SS3), so
// the window is generous on both ends rather than tightly matched to the
// current cohort — a late-enrolling 19-year-old SS3 repeat student or an
// admin correcting a typo shouldn't find their actual birth year missing
// from the list.
const MIN_AGE = 1;
const MAX_AGE = 25;

function daysInMonth(year: number, month: number): number {
  // Day 0 of the NEXT month is the last day of THIS one — the standard JS
  // trick for a month length that already accounts for leap years.
  return new Date(year, month, 0).getDate();
}

function parseIso(value: string): { year?: number; month?: number; day?: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return {};
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * Date of birth, as three selects instead of the browser's native
 * `<input type="date">`.
 *
 * The native control's own calendar popup is what this replaces, and the
 * reason is specific: to pick a birth date it opens on TODAY and the only
 * way back is a year-by-year up/down arrow (or the month grid, one month at
 * a time) — correcting a 2015 birth date from an August-2026 default is
 * roughly a dozen clicks on a tiny target before you've even started
 * looking for the day. Government form guidance (GOV.UK's own design
 * system among others) recommends day/month/year selects for exactly this
 * reason: a birth date is *recalled*, not *browsed to* on a calendar the
 * way a future appointment is.
 *
 * Emits a "yyyy-mm-dd" string — the exact format the native date input
 * already produced — so nothing downstream (studentFormSchema's
 * Date.parse check, createStudentAction's `new Date(data.dob)`) had to
 * change. Emits "" while incomplete, which fails that same schema check
 * with the existing "Enter a valid date of birth" message rather than a
 * new one.
 */
export function DateOfBirthField({
  value,
  onChange,
  invalid,
  labelId,
}: {
  /** The form's current value: "" or an ISO "yyyy-mm-dd" string. */
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  /** id of the visual <Label> this group belongs to, for aria-labelledby. */
  labelId?: string;
}) {
  const parsed = parseIso(value);
  const [year, setYear] = useState<number | undefined>(parsed.year);
  const [month, setMonth] = useState<number | undefined>(parsed.month);
  const [day, setDay] = useState<number | undefined>(parsed.day);

  // Re-sync when the FORM's value changes out from under these three
  // selects rather than through them — StudentForm's reset() after a
  // successful create, or the edit page's defaultValues resolving async
  // after this component has already mounted with an empty value.
  useEffect(() => {
    const next = parseIso(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [value]);

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - MIN_AGE; y >= currentYear - MAX_AGE; y--) years.push(y);

  const maxDay = year && month ? daysInMonth(year, month) : 31;
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  function commit(nextYear: number | undefined, nextMonth: number | undefined, nextDay: number | undefined) {
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
    if (nextYear && nextMonth && nextDay) {
      // 31 stays selected switching FROM a 31-day month TO a 30-day or
      // shorter one otherwise points at a date that doesn't exist —
      // clamped down to that month's real last day instead of emitting an
      // impossible "yyyy-mm-31" in April.
      const clampedDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth));
      const iso = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
      onChange(iso);
    } else {
      onChange("");
    }
  }

  return (
    <div role="group" aria-labelledby={labelId} className="grid grid-cols-3 gap-2">
      <Select value={day ? String(day) : undefined} onValueChange={(v) => commit(year, month, Number(v))}>
        <SelectTrigger aria-label="Day of birth" aria-invalid={invalid}>
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          {days.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month ? String(month) : undefined} onValueChange={(v) => commit(year, Number(v), day)}>
        <SelectTrigger aria-label="Month of birth" aria-invalid={invalid}>
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year ? String(year) : undefined} onValueChange={(v) => commit(Number(v), month, day)}>
        <SelectTrigger aria-label="Year of birth" aria-invalid={invalid}>
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
