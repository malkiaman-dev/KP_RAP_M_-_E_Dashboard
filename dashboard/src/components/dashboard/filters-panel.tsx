"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  MapPin,
  ClipboardList,
  Users,
  CheckCircle,
  ChevronDown,
  Bookmark,
  X,
  Calendar,
} from "lucide-react";
import { cn, formatDisplayDate } from "@/lib/utils";
import { FilterDateRange, FilterSelect } from "@/components/ui/filter-select";
import type {
  DashboardFilters,
  FilterOptions,
} from "@/lib/data/survey-metrics";

export const defaultFilters: DashboardFilters = {
  district: "all",
  surveyType: "all",
  enumerator: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

const presets: { id: string; label: string; filters: Partial<DashboardFilters> }[] = [
  { id: "all", label: "All Data", filters: defaultFilters },
  { id: "tracking", label: "Tracking Only", filters: { surveyType: "tracking" } },
  { id: "complete", label: "Completed", filters: { status: "complete" } },
  { id: "revisits", label: "Revisits", filters: { status: "revisit" } },
];

interface FiltersPanelProps {
  filterOptions?: FilterOptions;
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

export function FiltersPanel({
  filterOptions,
  filters,
  onChange,
}: FiltersPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activePreset, setActivePreset] = useState("all");

  const update = (partial: Partial<DashboardFilters>) => {
    onChange({ ...filters, ...partial });
    setActivePreset("");
  };

  const applyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    onChange({ ...defaultFilters, ...preset.filters });
  };

  const districtOptions = [
    { value: "all", label: "All Districts" },
    ...(filterOptions?.districts || []),
  ];

  const enumeratorOptions = [
    { value: "all", label: "All Enumerators" },
    ...(filterOptions?.enumerators || []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 overflow-visible rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-teal" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          {filterOptions?.dateRange.start && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              · Data: {formatDisplayDate(filterOptions.dateRange.start)} to{" "}
              {formatDisplayDate(filterOptions.dateRange.end)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  activePreset === p.id
                    ? "bg-teal/10 text-teal"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Bookmark className="h-3 w-3" aria-hidden="true" />
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse filters" : "Expand filters"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-visible"
          >
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <LabeledFilterSelect
                label="District"
                icon={MapPin}
                value={filters.district}
                options={districtOptions}
                onChange={(v) => update({ district: v })}
              />
              <LabeledFilterSelect
                label="Survey Type"
                icon={ClipboardList}
                value={filters.surveyType}
                options={[
                  { value: "all", label: "All Surveys" },
                  { value: "tracking", label: "Tracking" },
                  { value: "household", label: "Household" },
                  { value: "girls", label: "Girls" },
                ]}
                onChange={(v) => update({ surveyType: v })}
              />
              <LabeledFilterSelect
                label="Enumerator"
                icon={Users}
                value={filters.enumerator}
                options={enumeratorOptions}
                onChange={(v) => update({ enumerator: v })}
              />
              <LabeledFilterSelect
                label="Status"
                icon={CheckCircle}
                value={filters.status}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "complete", label: "Complete" },
                  { value: "incomplete", label: "Incomplete" },
                  { value: "revisit", label: "Revisit" },
                ]}
                onChange={(v) => update({ status: v })}
              />
              <div className="sm:col-span-2 xl:col-span-1">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  Submission Date Range
                </label>
                <FilterDateRange
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  min={filterOptions?.dateRange.start}
                  max={filterOptions?.dateRange.end}
                  onChange={(range) =>
                    update({
                      dateFrom: range.dateFrom,
                      dateTo: range.dateTo,
                    })
                  }
                  aria-label="Submission date range"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
              <button
                onClick={() => {
                  setActivePreset("all");
                  onChange(defaultFilters);
                }}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Reset
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LabeledFilterSelect({
  label,
  icon: Icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: typeof MapPin;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </label>
      <FilterSelect
        value={value}
        options={options}
        onChange={onChange}
        aria-label={label}
      />
    </div>
  );
}
