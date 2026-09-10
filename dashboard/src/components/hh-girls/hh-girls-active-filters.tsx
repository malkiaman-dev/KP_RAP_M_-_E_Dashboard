"use client";

import { X } from "lucide-react";
import type { HhGirlsMonitoringFilters } from "@/lib/data/hh-girls-monitoring";
import {
  defaultHhGirlsFilters,
  districtLabel,
  HH_GIRLS_SURVEY_FILTER_OPTIONS,
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

  for (const d of filters.district) {
    chips.push({
      key: `district:${d}`,
      label: filterOptions?.districts.find((o) => o.value === d)?.label || districtLabel(d),
    });
  }
  if (filters.surveyType.length < HH_GIRLS_SURVEY_FILTER_OPTIONS.length) {
    chips.push({
      key: "surveyType",
      label: filters.surveyType.map(hhGirlsSurveyFilterLabel).join(" + "),
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
              onChange({
                ...filters,
                surveyType: HH_GIRLS_SURVEY_FILTER_OPTIONS.map((o) => o.value),
              });
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
