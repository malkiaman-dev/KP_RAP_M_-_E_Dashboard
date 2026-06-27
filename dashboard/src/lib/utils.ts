import { clsx, type ClassValue } from "clsx";
import { format, isValid, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export const DISPLAY_DATE_FORMAT = "dd-MMM-yyyy";
export const DISPLAY_DATE_PLACEHOLDER = "dd-MMM-yyyy";

export function parseFlexibleDate(raw: string): Date | null {
  if (!raw) return null;
  const iso = parseISO(raw);
  if (isValid(iso)) return iso;
  const parsed = new Date(raw);
  return isValid(parsed) ? parsed : null;
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
