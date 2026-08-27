import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// One or two initials for an avatar circle — "Chidi Nwosu" -> "CN",
// "Cher" -> "C". Shared so the student and teacher profile headers (and
// anywhere else that wants a quick visual identity for a name) render the
// same letters for the same name rather than each screen picking its own
// slice of it.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
