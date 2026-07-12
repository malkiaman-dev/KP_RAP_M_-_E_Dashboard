/** Operational field window — exclude earlier test/pilot submissions by default. */
export const FIELD_PERIOD_START = "2026-06-21";

export const FIELD_PERIOD_START_LABEL = "21 Jun 2026";

export const FIELD_PERIOD_STORAGE_KEY = "kprap-field-period-enabled";

export function fieldPeriodDateFrom(enabled: boolean): string {
  return enabled ? FIELD_PERIOD_START : "";
}
