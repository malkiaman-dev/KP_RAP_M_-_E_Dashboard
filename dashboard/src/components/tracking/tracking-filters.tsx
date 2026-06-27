"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Calendar,
  MapPin,
  Layers,
  Users,
  School,
  ChevronDown,
  X,
  Group,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterDateRange, FilterSelect } from "@/components/ui/filter-select";
import type {
  TrackingFilters,
  TrackingMetrics,
} from "@/lib/data/tracking-metrics";
import { defaultTrackingFilters } from "@/lib/data/tracking-metrics";

interface TrackingFiltersPanelProps {
  filterOptions?: TrackingMetrics["filterOptions"];
  filters: TrackingFilters;
  onChange: (filters: TrackingFilters) => void;
}

export function TrackingFiltersPanel({
  filterOptions,
  filters,
  onChange,
}: TrackingFiltersPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const fields = [
    {
      key: "district" as const,
      label: "District",
      icon: MapPin,
      options: [
        { value: "all", label: "All" },
        ...(filterOptions?.districts || []),
      ],
    },
    {
      key: "trackingGroup" as const,
      label: "Tracking Group",
      icon: Group,
      options: [
        { value: "all", label: "All" },
        ...(filterOptions?.trackingGroups || []),
      ],
    },
    {
      key: "session" as const,
      label: "Session",
      icon: Layers,
      options: [
        { value: "all", label: "All" },
        ...(filterOptions?.sessions || []),
      ],
    },
    {
      key: "enumerator" as const,
      label: "Enumerator",
      icon: Users,
      options: [
        { value: "all", label: "All" },
        ...(filterOptions?.enumerators || []),
      ],
    },
    {
      key: "village" as const,
      label: "Village",
      icon: MapPin,
      options: [
        { value: "all", label: "All" },
        ...(filterOptions?.villages || []),
      ],
    },
    {
      key: "school" as const,
      label: "School",
      icon: School,
      options: [
        { value: "all", label: "All" },
        ...(filterOptions?.schools || []),
      ],
    },
  ];

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
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                    })
                  }
                  aria-label="Submission date range"
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-border/60 px-5 py-3">
              <button
                onClick={() => onChange(defaultTrackingFilters)}
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
