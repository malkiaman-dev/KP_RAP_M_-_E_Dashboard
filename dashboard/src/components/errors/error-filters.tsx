"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCollapsedOnMobile } from "@/lib/hooks/use-collapsed-on-mobile";
import {
  Filter,
  MapPin,
  ClipboardList,
  ShieldAlert,
  Users,
  Calendar,
  ChevronDown,
  X,
} from "lucide-react";
import { cn, toIsoDateString } from "@/lib/utils";
import { FilterDateRange, FilterSelect } from "@/components/ui/filter-select";
import type { ErrorFilters, ErrorMetrics } from "@/lib/data/error-metrics";
import { defaultErrorFilters } from "@/lib/data/error-metrics";

interface ErrorFiltersPanelProps {
  filterOptions?: ErrorMetrics["filterOptions"];
  filters: ErrorFilters;
  onChange: (filters: ErrorFilters) => void;
  /** Hide district dropdown (field accounts are already district-scoped). */
  hideDistrict?: boolean;
  /** Show the Today toggle after the date range. */
  showTodayToggle?: boolean;
}

export function ErrorFiltersPanel({
  filterOptions,
  filters,
  onChange,
  hideDistrict = false,
  showTodayToggle = true,
}: ErrorFiltersPanelProps) {
  const [expanded, setExpanded] = useCollapsedOnMobile();

  const fields = [
    ...(!hideDistrict
      ? [
          {
            key: "district" as const,
            label: "District",
            icon: MapPin,
            options: [
              { value: "all", label: "All" },
              ...(filterOptions?.districts || []),
            ],
          },
        ]
      : []),
    {
      key: "survey" as const,
      label: "Survey",
      icon: ClipboardList,
      options: [
        { value: "all", label: "All" },
        ...(filterOptions?.surveys || []),
      ],
    },
    {
      key: "severity" as const,
      label: "Severity",
      icon: ShieldAlert,
      options: [
        { value: "all", label: "All" },
        ...(filterOptions?.severities || []),
      ],
    },
    {
      key: "enumerator" as const,
      label: "Enumerator",
      icon: Users,
      options: [
        { value: "all", label: "All enumerators" },
        ...(filterOptions?.enumerators || []),
      ],
    },
  ];

  const resetFilters: ErrorFilters = hideDistrict
    ? {
        ...defaultErrorFilters,
        district: filters.district,
      }
    : defaultErrorFilters;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 overflow-visible rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-teal" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Filters</h2>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-expanded={expanded}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-visible"
          >
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      onChange={(value) =>
                        onChange({ ...filters, [field.key]: value })
                      }
                      aria-label={field.label}
                    />
                  </div>
                );
              })}

              <div className="sm:col-span-2">
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
                    onChange({
                      ...filters,
                      dateFrom: range.dateFrom,
                      dateTo: range.dateTo,
                      todayOnly: false,
                    })
                  }
                  aria-label="Submission date range"
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
                    aria-checked={filters.todayOnly}
                    aria-label="Filter to today only"
                    onClick={() => {
                      if (filters.todayOnly) {
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
                      filters.todayOnly ? "bg-green-500" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200",
                        filters.todayOnly && "translate-x-5"
                      )}
                    />
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-border/60 px-5 py-3">
              <button
                onClick={() => onChange(resetFilters)}
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
