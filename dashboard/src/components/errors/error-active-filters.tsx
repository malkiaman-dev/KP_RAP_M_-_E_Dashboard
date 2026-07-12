"use client";

import { X } from "lucide-react";
import { displayEnumeratorLabel } from "@/lib/data/enumerator-identity";
import { defaultErrorFilters, type ErrorFilters } from "@/lib/data/error-metrics";

const LABELS: Record<keyof ErrorFilters, string> = {
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
}: {
  filters: ErrorFilters;
  onChange: (filters: ErrorFilters) => void;
}) {
  const active = (Object.keys(filters) as (keyof ErrorFilters)[]).filter(
    (key) => filters[key] !== "all"
  );

  if (active.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">
        Chart filters:
      </span>
      {active.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange({ ...filters, [key]: "all" })}
          className="inline-flex items-center gap-1 rounded-full border border-teal/30 bg-teal/10 px-2.5 py-0.5 text-[11px] font-medium text-teal hover:bg-teal/15"
        >
          {LABELS[key]}: {displayValue(key, filters[key])}
          <X className="h-3 w-3 opacity-70" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(defaultErrorFilters)}
        className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
