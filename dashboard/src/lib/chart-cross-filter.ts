export const CHART_CLICK_HINT = "Click to filter the dashboard";

export const pointerBarStyle = { cursor: "pointer" } as const;

export function barPayload(data: unknown): Record<string, string> | undefined {
  if (!data || typeof data !== "object") return undefined;
  const row = data as { payload?: Record<string, string> };
  return row.payload ?? (data as Record<string, string>);
}

/** Tooltip title for charts keyed by enumerator name — shows district when available. */
export function enumeratorTooltipLabel(
  label: unknown,
  payload?: readonly { payload?: { name?: string; district?: string } }[]
): string {
  const row = payload?.[0]?.payload;
  if (row?.name && row?.district) return `${row.name} · ${row.district}`;
  return String(row?.name ?? label ?? "");
}

/** Toggle a single string filter field (click again to clear). */
export function toggleField(
  current: string,
  value: string,
  empty = "all"
): string {
  return current === value ? empty : value;
}

/** Toggle a date range — same day click clears both ends. */
export function toggleDateRange(
  dateFrom: string,
  dateTo: string,
  iso: string
): { dateFrom: string; dateTo: string } {
  if (dateFrom === iso && dateTo === iso) {
    return { dateFrom: "", dateTo: "" };
  }
  return { dateFrom: iso, dateTo: iso };
}
