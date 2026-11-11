import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names cleanly without style conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO timestamp string into a readable UTC/Local time label.
 */
export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) {
    return "N/A";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}
