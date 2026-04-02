import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display email in lowercase across the app. Use for UI only. */
export function displayEmail(email: string | null | undefined, fallback = "—"): string {
  const s = (email ?? "").trim().toLowerCase()
  return s || fallback
}
