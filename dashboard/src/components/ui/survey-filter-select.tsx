"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { FilterSelect, type SelectOption } from "@/components/ui/filter-select";
import { HH_GIRLS_COMBINED } from "@/lib/data/survey-filter-shared";

interface SurveyFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Flat option list as before (e.g. All / Household / Girls / Tracking). */
  options: SelectOption[];
  householdValue: string;
  girlsValue: string;
  combinedLabel?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/**
 * Survey filter with a combined "HH & Girls" option. Selecting it replaces
 * the separate Household/Girls entries in the dropdown; once active, two
 * checkboxes appear below to narrow the selection back down to just one
 * (or restore both).
 */
export function SurveyFilterSelect({
  value,
  onChange,
  options,
  householdValue,
  girlsValue,
  combinedLabel = "HH & Girls",
  className,
  disabled = false,
  "aria-label": ariaLabel,
}: SurveyFilterSelectProps) {
  const isGroupActive =
    value === HH_GIRLS_COMBINED ||
    value === householdValue ||
    value === girlsValue;

  const dropdownOptions = useMemo<SelectOption[]>(() => {
    const insertIndex = options.findIndex(
      (o) => o.value === householdValue || o.value === girlsValue
    );
    const rest = options.filter(
      (o) => o.value !== householdValue && o.value !== girlsValue
    );
    const combinedOption: SelectOption = {
      value: HH_GIRLS_COMBINED,
      label: combinedLabel,
    };
    if (insertIndex === -1) return [...rest, combinedOption];
    const restBeforeInsert = options
      .slice(0, insertIndex)
      .filter((o) => o.value !== householdValue && o.value !== girlsValue).length;
    return [
      ...rest.slice(0, restBeforeInsert),
      combinedOption,
      ...rest.slice(restBeforeInsert),
    ];
  }, [options, householdValue, girlsValue, combinedLabel]);

  const dropdownValue = isGroupActive ? HH_GIRLS_COMBINED : value;

  const householdChecked = value === HH_GIRLS_COMBINED || value === householdValue;
  const girlsChecked = value === HH_GIRLS_COMBINED || value === girlsValue;

  const applyChecked = (nextHousehold: boolean, nextGirls: boolean) => {
    if (!nextHousehold && !nextGirls) return; // keep at least one selected
    if (nextHousehold && nextGirls) onChange(HH_GIRLS_COMBINED);
    else if (nextHousehold) onChange(householdValue);
    else onChange(girlsValue);
  };

  return (
    <div className={className}>
      <FilterSelect
        value={dropdownValue}
        options={dropdownOptions}
        onChange={(next) => onChange(next)}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      {isGroupActive && (
        <div className="mt-2 flex items-center gap-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <label
            className={cn(
              "flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <input
              type="checkbox"
              checked={householdChecked}
              disabled={disabled}
              onChange={(e) => applyChecked(e.target.checked, girlsChecked)}
              className="h-3.5 w-3.5 rounded border-border/70 text-teal focus:ring-2 focus:ring-teal/30"
            />
            Household
          </label>
          <label
            className={cn(
              "flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <input
              type="checkbox"
              checked={girlsChecked}
              disabled={disabled}
              onChange={(e) => applyChecked(householdChecked, e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border/70 text-teal focus:ring-2 focus:ring-teal/30"
            />
            Girls
          </label>
        </div>
      )}
    </div>
  );
}
