"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCollapsedOnMobile } from "@/lib/hooks/use-collapsed-on-mobile";
import {
  Filter,
  MapPin,
  ClipboardList,
  ShieldAlert,
  Users,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterSelect } from "@/components/ui/filter-select";
import type { ErrorFilters, ErrorMetrics } from "@/lib/data/error-metrics";
import { defaultErrorFilters } from "@/lib/data/error-metrics";

interface ErrorFiltersPanelProps {
  filterOptions?: ErrorMetrics["filterOptions"];
  filters: ErrorFilters;
  onChange: (filters: ErrorFilters) => void;
  /** Hide district dropdown (field accounts are already district-scoped). */
  hideDistrict?: boolean;
}

export function ErrorFiltersPanel({
  filterOptions,
  filters,
  onChange,
  hideDistrict = false,
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

  const resetFilters = hideDistrict
    ? { ...defaultErrorFilters, district: filters.district }
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
            <div className={`grid gap-4 p-5 sm:grid-cols-2 ${hideDistrict ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
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
