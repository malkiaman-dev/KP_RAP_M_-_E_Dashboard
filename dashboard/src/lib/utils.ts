import { clsx, type ClassValue } from "clsx";
import { format, isValid, parse, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export const DISPLAY_DATE_FORMAT = "dd-MMM-yyyy";
export const DISPLAY_DATE_PLACEHOLDER = "dd-MMM-yyyy";

const ENGLISH_DATE_FORMATS = [
  "MMM d, yyyy h:mm:ss a",
  "MMM d, yyyy h:mm a",
  "MMM d, yyyy",
];

/**
 * SurveyCTO exports mix English stamps ("Jul 8, 2026 11:48:57 PM") with
 * day-first numeric stamps ("08-07-26 23:48", "25-07-26 0:59"). Native
 * `Date.parse` treats the numeric form as US month-first, so 12-07-26
 * becomes 7 Dec instead of 12 Jul, and 25-07-26 is invalid.
 */
export function parseFlexibleDate(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const iso = parseISO(trimmed.replace(" ", "T"));
    if (isValid(iso)) return iso;
  }

  for (const fmt of ENGLISH_DATE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }

  const dmy = trimmed.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const hour = dmy[4] != null ? Number(dmy[4]) : 0;
    const minute = dmy[5] != null ? Number(dmy[5]) : 0;
    const second = dmy[6] != null ? Number(dmy[6]) : 0;
    const date = new Date(year, month - 1, day, hour, minute, second);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : null;
}

export function submissionTimestamp(raw: string | undefined | null): number {
  return parseFlexibleDate(raw || "")?.getTime() ?? 0;
}

export function formatDisplayDate(raw: string): string {
  const date = parseFlexibleDate(raw);
  return date ? format(date, DISPLAY_DATE_FORMAT) : "";
}

export function toIsoDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}
