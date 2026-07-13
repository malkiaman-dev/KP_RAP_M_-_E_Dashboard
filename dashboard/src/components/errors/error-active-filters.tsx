"use client";

import { X } from "lucide-react";
import { displayEnumeratorLabel } from "@/lib/data/enumerator-identity";
import { formatDisplayDate } from "@/lib/utils";
import { defaultErrorFilters, type ErrorFilters } from "@/lib/data/error-metrics";

type ChipKey = keyof ErrorFilters | "dateRange";

const LABELS: Record<Exclude<ChipKey, "dateFrom" | "dateTo" | "todayOnly" | "dateRange">, string> = {
  district: "District",
  survey: "Survey",
  severity: "Severity",
  enumerator: "Enumerator",
  ruleId: "Rule",
};

function displayValue(key: keyof ErrorFilters, value: string): string {
  if (key === "severity") {
    return value === "CRITICAL" ? "Critical" : "Quality";
  }
  if (key === "enumerator") {
    return displayEnumeratorLabel(value);
  }
  return value;
}

export function ErrorActiveFilters({
  filters,
  onChange,
  hideDistrict = false,
}: {
  filters: ErrorFilters;
  onChange: (filters: ErrorFilters) => void;
  hideDistrict?: boolean;
}) {
  const chips: { key: ChipKey; label: string }[] = [];

  const categorical = (
    ["district", "survey", "severity", "enumerator", "ruleId"] as const
  ).filter((key) => {
    if (hideDistrict && key === "district") return false;
    return filters[key] !== "all";
  });

  for (const key of categorical) {
    chips.push({
      key,
      label: `${LABELS[key]}: ${displayValue(key, filters[key])}`,
    });
  }

  if (filters.todayOnly) {
    chips.push({ key: "todayOnly", label: "Today" });
  } else if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom
      ? formatDisplayDate(filters.dateFrom) || filters.dateFrom
      : "…";
    const to = filters.dateTo
      ? formatDisplayDate(filters.dateTo) || filters.dateTo
      : "…";
    chips.push({
      key: "dateRange",
      label: `${from} → ${to}`,
    });
  }

  if (chips.length === 0) return null;

  const clearAll: ErrorFilters = hideDistrict
    ? { ...defaultErrorFilters, district: filters.district }
    : defaultErrorFilters;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">
        Active filters:
      </span>
      {chips.map((chip) => (
        <button
          key={String(chip.key)}
          type="button"
          onClick={() => {
            if (chip.key === "todayOnly" || chip.key === "dateRange") {
              onChange({
                ...filters,
                todayOnly: false,
                dateFrom: "",
                dateTo: "",
              });
              return;
            }
            onChange({ ...filters, [chip.key]: "all" });
          }}
          className="inline-flex items-center gap-1 rounded-full border border-teal/30 bg-teal/10 px-2.5 py-0.5 text-[11px] font-medium text-teal hover:bg-teal/15"
        >
          {chip.label}
          <X className="h-3 w-3 opacity-70" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(clearAll)}
        className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
