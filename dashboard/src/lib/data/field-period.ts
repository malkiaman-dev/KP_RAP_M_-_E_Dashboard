/**
 * Operational field window start. Empty = no default start date: every tab
 * includes the full dataset (incl. March baseline). Users can still narrow
 * dates manually via the filters.
 */
export const FIELD_PERIOD_START = "";

export const FIELD_PERIOD_START_LABEL = "All data";

export const FIELD_PERIOD_STORAGE_KEY = "kprap-field-period-enabled";

export function fieldPeriodDateFrom(enabled: boolean): string {
  return enabled ? FIELD_PERIOD_START : "";
}
