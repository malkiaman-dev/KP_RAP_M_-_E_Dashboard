"use client";

import { X } from "lucide-react";
import type { HhGirlsMonitoringFilters } from "@/lib/data/hh-girls-monitoring";
import {
  defaultHhGirlsFilters,
  districtLabel,
  hhGirlsSurveyFilterLabel,
  type HhGirlsFilters,
  type HhGirlsMetrics,
} from "@/lib/data/hh-girls-metrics";

export function HhGirlsActiveFilters({
  filters,
  onChange,
  filterOptions,
  resetFilters,
}: {
  filters: HhGirlsFilters | HhGirlsMonitoringFilters;
  onChange: (filters: HhGirlsFilters | HhGirlsMonitoringFilters) => void;
  filterOptions?: HhGirlsMetrics["filterOptions"];
  resetFilters?: () => HhGirlsFilters | HhGirlsMonitoringFilters;
}) {
  const chips: { key: string; label: string }[] = [];
  const todayOnly =
    "todayOnly" in filters ? filters.todayOnly === true : false;

  if (filters.district !== "all") {
    chips.push({
      key: "district",
      label:
        filterOptions?.districts.find((d) => d.value === filters.district)
          ?.label || districtLabel(filters.district),
    });
  }
  if (filters.surveyType !== "all") {
    chips.push({
      key: "surveyType",
      label: hhGirlsSurveyFilterLabel(filters.surveyType),
    });
  }
  if (filters.enumerator !== "all") {
    chips.push({
      key: "enumerator",
      label:
        filterOptions?.enumerators.find((e) => e.value === filters.enumerator)
          ?.label || filters.enumerator,
    });
  }
  if (filters.village !== "all") {
    chips.push({ key: "village", label: filters.village });
  }
  if (todayOnly) {
    chips.push({ key: "todayOnly", label: "Today" });
  } else if (filters.dateFrom || filters.dateTo) {
    chips.push({
      key: "dateFrom",
      label: `${filters.dateFrom || "…"} → ${filters.dateTo || "…"}`,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => {
            if (chip.key === "dateFrom" || chip.key === "todayOnly") {
              onChange({
                ...filters,
                ...("todayOnly" in filters ? { todayOnly: false } : {}),
                dateFrom: "",
                dateTo: "",
              });
            } else if (chip.key === "surveyType") {
              onChange({ ...filters, surveyType: "all" });
            } else {
              onChange({ ...filters, [chip.key]: "all" });
            }
          }}
          className="inline-flex items-center gap-1 rounded-full border border-teal/25 bg-teal/10 px-3 py-1 text-xs font-medium text-teal"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange(resetFilters ? resetFilters() : defaultHhGirlsFilters)
        }
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
