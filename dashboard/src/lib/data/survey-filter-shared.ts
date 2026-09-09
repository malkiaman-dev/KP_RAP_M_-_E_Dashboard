/**
 * Sentinel value for the combined "HH & Girls" survey filter option.
 *
 * Used wherever a Survey filter groups Household + Girls into one selectable
 * option (with Household/Girls as narrowing sub-choices underneath it),
 * across both the ErrorFilters (`survey`, values like "Household"/"Girls")
 * and DashboardFilters (`surveyType`, values like "household"/"girls")
 * filter shapes. Never collides with real survey names/types.
 */
export const HH_GIRLS_COMBINED = "__hh_girls_combined__";

/** True when a survey filter value means "match Household or Girls only". */
export function isHhGirlsCombinedGroup(
  value: string,
  householdValue: string,
  girlsValue: string
): boolean {
  return (
    value === HH_GIRLS_COMBINED ||
    value === householdValue ||
    value === girlsValue
  );
}
