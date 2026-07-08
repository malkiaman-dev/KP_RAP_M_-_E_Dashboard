"use client";

import { X } from "lucide-react";
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
}: {
  filters: HhGirlsFilters;
  onChange: (filters: HhGirlsFilters) => void;
  filterOptions?: HhGirlsMetrics["filterOptions"];
}) {
  const chips: { key: keyof HhGirlsFilters; label: string }[] = [];

  if (filters.surveyType !== "all") {
    chips.push({
      key: "surveyType",
      label: hhGirlsSurveyFilterLabel(filters.surveyType),
    });
  }
  if (filters.district !== "all") {
    chips.push({
      key: "district",
      label:
        filterOptions?.districts.find((d) => d.value === filters.district)?.label ||
        districtLabel(filters.district),
    });
  }
  if (filters.enumerator !== "all") {
    chips.push({
      key: "enumerator",
      label:
        filterOptions?.enumerators.find((e) => e.value === filters.enumerator)?.label ||
        filters.enumerator,
    });
  }
  if (filters.village !== "all") {
    chips.push({ key: "village", label: filters.village });
  }
  if (filters.dateFrom || filters.dateTo) {
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
            if (chip.key === "dateFrom") {
              onChange({ ...filters, dateFrom: "", dateTo: "" });
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
        onClick={() => onChange(defaultHhGirlsFilters)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
