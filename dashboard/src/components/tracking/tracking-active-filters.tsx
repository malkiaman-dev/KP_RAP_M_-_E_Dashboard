"use client";

import { X } from "lucide-react";
import {
  defaultTrackingFilters,
  type TrackingFilters,
} from "@/lib/data/tracking-metrics";
import { formatDisplayDate } from "@/lib/utils";

const LABELS: Partial<Record<keyof TrackingFilters, string>> = {
  district: "District",
  trackingGroup: "Tracking group",
  session: "Session",
  enumerator: "Enumerator",
  village: "Village",
  school: "School",
  untrackedReason: "Untracked reason",
  enrollStatus: "Enrollment",
  dateFrom: "From",
  dateTo: "To",
};

const REASON_LABELS: Record<string, string> = {
  girlNotFound: "Girl not found",
  noConsent: "No consent",
  houseNotLocated: "House not located",
  houseUntraceable: "House untracked",
  incomplete: "Incomplete survey",
};

const GROUP_LABELS: Record<string, string> = {
  baseline: "Baseline",
  "new-sample": "New sample",
};

function displayValue(key: keyof TrackingFilters, value: string): string {
  if (key === "untrackedReason") return REASON_LABELS[value] || value;
  if (key === "trackingGroup") return GROUP_LABELS[value] || value;
  if (key === "dateFrom" || key === "dateTo") {
    return formatDisplayDate(value) || value;
  }
  return value;
}

export function TrackingActiveFilters({
  filters,
  onChange,
  filterOptions,
}: {
  filters: TrackingFilters;
  onChange: (filters: TrackingFilters) => void;
  filterOptions?: {
    districts?: { value: string; label: string }[];
    enumerators?: { value: string; label: string }[];
    villages?: { value: string; label: string }[];
    schools?: { value: string; label: string }[];
    sessions?: { value: string; label: string }[];
  };
}) {
  const resolveLabel = (key: keyof TrackingFilters, value: string) => {
    if (key === "district") {
      return (
        filterOptions?.districts?.find((d) => d.value === value)?.label || value
      );
    }
    if (key === "enumerator") {
      return (
        filterOptions?.enumerators?.find((e) => e.value === value)?.label ||
        value
      );
    }
    if (key === "village") {
      return (
        filterOptions?.villages?.find((v) => v.value === value)?.label || value
      );
    }
    if (key === "school") return value;
    if (key === "session") {
      return (
        filterOptions?.sessions?.find((s) => s.value === value)?.label || value
      );
    }
    return displayValue(key, value);
  };

  const chips: { key: keyof TrackingFilters; label: string }[] = [];

  (Object.keys(filters) as (keyof TrackingFilters)[]).forEach((key) => {
    const value = filters[key];
    if (key === "dateFrom" || key === "dateTo") return;
    if (!value || value === "all") return;
    chips.push({
      key,
      label: `${LABELS[key]}: ${resolveLabel(key, value)}`,
    });
  });

  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom
      ? formatDisplayDate(filters.dateFrom) || filters.dateFrom
      : "…";
    const to = filters.dateTo
      ? formatDisplayDate(filters.dateTo) || filters.dateTo
      : "…";
    const same = filters.dateFrom && filters.dateFrom === filters.dateTo;
    chips.push({
      key: "dateFrom",
      label: same ? `Date: ${from}` : `Dates: ${from} – ${to}`,
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
            if (chip.key === "dateFrom") {
              onChange({ ...filters, dateFrom: "", dateTo: "" });
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
        onClick={() => onChange(defaultTrackingFilters)}
        className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
