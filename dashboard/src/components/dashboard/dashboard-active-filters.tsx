"use client";

import { X } from "lucide-react";
import {
  DASHBOARD_SURVEY_TYPES,
  defaultDashboardFilters,
  type DashboardFilters,
} from "@/lib/data/survey-metrics";
import { formatDisplayDate } from "@/lib/utils";

const SURVEY_LABELS: Record<string, string> = {
  tracking: "Tracking",
  household: "Household",
  girls: "Girls",
};

const STATUS_LABELS: Record<string, string> = {
  complete: "Completed",
  incomplete: "Incomplete",
  revisit: "Revisits",
};

export function DashboardActiveFilters({
  filters,
  onChange,
  filterOptions,
}: {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  filterOptions?: {
    districts?: { value: string; label: string }[];
    enumerators?: { value: string; label: string }[];
  };
}) {
  const chips: { key: string; label: string }[] = [];

  for (const d of filters.district) {
    const label =
      filterOptions?.districts?.find((o) => o.value === d)?.label || d;
    chips.push({ key: `district:${d}`, label: `District: ${label}` });
  }
  if (filters.surveyType.length < DASHBOARD_SURVEY_TYPES.length) {
    chips.push({
      key: "surveyType",
      label: `Survey: ${filters.surveyType
        .map((t) => SURVEY_LABELS[t] || t)
        .join(" + ")}`,
    });
  }
  if (filters.enumerator !== "all") {
    const label =
      filterOptions?.enumerators?.find((e) => e.value === filters.enumerator)
        ?.label || filters.enumerator;
    chips.push({ key: "enumerator", label: `Enumerator: ${label}` });
  }
  if (filters.status !== "all") {
    chips.push({
      key: "status",
      label: `Status: ${STATUS_LABELS[filters.status] || filters.status}`,
    });
  }
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom
      ? formatDisplayDate(filters.dateFrom) || filters.dateFrom
      : "…";
    const to = filters.dateTo
      ? formatDisplayDate(filters.dateTo) || filters.dateTo
      : "…";
    const same = filters.dateFrom && filters.dateFrom === filters.dateTo;
    chips.push({
      key: "date",
      label: same ? `Date: ${from}` : `Dates: ${from} to ${to}`,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">
        Chart filters:
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => {
            if (chip.key === "date") {
              onChange({ ...filters, dateFrom: "", dateTo: "" });
            } else if (chip.key === "surveyType") {
              onChange({ ...filters, surveyType: [...DASHBOARD_SURVEY_TYPES] });
            } else if (chip.key.startsWith("district:")) {
              const removed = chip.key.slice("district:".length);
              onChange({
                ...filters,
                district: filters.district.filter((d) => d !== removed),
              });
            } else {
              onChange({ ...filters, [chip.key]: "all" });
            }
          }}
          className="inline-flex items-center gap-1 rounded-full border border-teal/30 bg-teal/10 px-2.5 py-0.5 text-[11px] font-medium text-teal hover:bg-teal/15"
        >
          {chip.label}
          <X className="h-3 w-3 opacity-70" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(defaultDashboardFilters)}
        className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
