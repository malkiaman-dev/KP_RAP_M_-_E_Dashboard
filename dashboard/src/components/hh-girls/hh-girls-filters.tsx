"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCollapsedOnMobile } from "@/lib/hooks/use-collapsed-on-mobile";
import { Filter, Calendar, MapPin, Users, ChevronDown, X, ClipboardList } from "lucide-react";
import { cn, toIsoDateString } from "@/lib/utils";
import { FilterDateRange, FilterSelect } from "@/components/ui/filter-select";
import {
  defaultHhGirlsFilters,
  HH_GIRLS_SURVEY_FILTER_OPTIONS,
  type HhGirlsFilters,
  type HhGirlsMetrics,
} from "@/lib/data/hh-girls-metrics";
import type { HhGirlsMonitoringFilters } from "@/lib/data/hh-girls-monitoring";

export function HhGirlsFiltersPanel({
  filterOptions,
  filters,
  onChange,
  showTodayToggle = false,
  resetFilters,
}: {
  filterOptions?: HhGirlsMetrics["filterOptions"];
  filters: HhGirlsFilters | HhGirlsMonitoringFilters;
  onChange: (filters: HhGirlsFilters | HhGirlsMonitoringFilters) => void;
  showTodayToggle?: boolean;
  resetFilters?: () => HhGirlsFilters | HhGirlsMonitoringFilters;
}) {
  const [expanded, setExpanded] = useCollapsedOnMobile();

  const fields = [
    {
      key: "district" as const,
      label: "District",
      icon: MapPin,
      options: [{ value: "all", label: "All" }, ...(filterOptions?.districts || [])],
    },
    {
      key: "surveyType" as const,
      label: "Survey",
      icon: ClipboardList,
      options: HH_GIRLS_SURVEY_FILTER_OPTIONS,
    },
    {
      key: "enumerator" as const,
      label: "Enumerator",
      icon: Users,
      options: [{ value: "all", label: "All" }, ...(filterOptions?.enumerators || [])],
    },
    {
      key: "village" as const,
      label: "Village",
      icon: MapPin,
      options: [{ value: "all", label: "All" }, ...(filterOptions?.villages || [])],
    },
  ];

  const todayOnly =
    "todayOnly" in filters ? filters.todayOnly === true : false;

  const hasActive =
    filters.surveyType !== "all" ||
    filters.district !== "all" ||
    filters.enumerator !== "all" ||
    filters.village !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    todayOnly;

  const handleReset = () => {
    onChange(resetFilters ? resetFilters() : defaultHhGirlsFilters);
  };

  return (
    <div className="mb-6 overflow-visible rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 lg:px-5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold lg:cursor-default"
        >
          <Filter className="h-4 w-4 text-teal" aria-hidden="true" />
          Filters
          <ChevronDown
            className={cn("ml-auto h-4 w-4 lg:hidden", expanded && "rotate-180")}
          />
        </button>
        {hasActive && (
          <button
            type="button"
            onClick={handleReset}
            className="ml-3 hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground lg:flex"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-visible"
          >
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.key}>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      {field.label}
                    </label>
                    <FilterSelect
                      value={filters[field.key]}
                      options={field.options}
                      onChange={(value) => onChange({ ...filters, [field.key]: value })}
                      aria-label={field.label}
                    />
                  </div>
                );
              })}
              <div className="sm:col-span-2">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  Submission Date
                </label>
                <FilterDateRange
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  min={filterOptions?.dateRange.start}
                  max={filterOptions?.dateRange.end}
                  onChange={(range) =>
                    onChange({
                      ...filters,
                      todayOnly: false,
                      dateFrom: range.dateFrom,
                      dateTo: range.dateTo,
                    })
                  }
                />
              </div>
              {showTodayToggle && (
                <div className="flex flex-col justify-end">
                  <label className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Today
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={todayOnly}
                    aria-label="Filter to today only"
                    onClick={() => {
                      if (todayOnly) {
                        onChange({
                          ...filters,
                          todayOnly: false,
                          dateFrom: "",
                          dateTo: "",
                        });
                      } else {
                        const today = toIsoDateString(new Date());
                        onChange({
                          ...filters,
                          todayOnly: true,
                          dateFrom: today,
                          dateTo: today,
                        });
                      }
                    }}
                    className={cn(
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
                      todayOnly ? "bg-green-500" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200",
                        todayOnly && "translate-x-5"
                      )}
                    />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
