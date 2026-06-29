"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ErrorFiltersPanel } from "@/components/errors/error-filters";
import { ErrorActiveFilters } from "@/components/errors/error-active-filters";
import { ErrorKpis } from "@/components/errors/error-kpis";
import { ErrorCharts } from "@/components/errors/error-charts";
import { ErrorTable } from "@/components/errors/error-table";
import {
  applyErrorFilters,
  computeErrorMetrics,
  defaultErrorFilters,
  type ErrorFilters,
  type ErrorMetrics,
} from "@/lib/data/error-metrics";

async function fetchErrors(): Promise<ErrorMetrics> {
  const res = await fetch("/api/errors");
  if (!res.ok) throw new Error("Failed to load error log");
  return res.json();
}

export default function ErrorReportPage() {
  const [filters, setFilters] = useState<ErrorFilters>(defaultErrorFilters);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["error-metrics"],
    queryFn: fetchErrors,
  });

  const display = useMemo(() => {
    if (!data?.allErrors) return data;
    const rows = applyErrorFilters(data.allErrors, filters);
    return computeErrorMetrics(rows);
  }, [data, filters]);

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">Failed to load error log</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure Daily_Error_Log.xlsx exists in the Error_log folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Error Report - Rollout Data Quality Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Critical vs quality issues, root causes, and enumerator accountability
          across KPRAP field surveys
        </p>
      </motion.div>

      <ErrorFiltersPanel
        filterOptions={data?.filterOptions}
        filters={filters}
        onChange={setFilters}
      />

      <ErrorActiveFilters filters={filters} onChange={setFilters} />

      <ErrorKpis metrics={display} loading={isLoading} />

      {display && !isLoading && (
        <p className="mb-4 text-xs text-muted-foreground">
          {display.criticalErrors.toLocaleString()} critical ·{" "}
          {display.flagErrors.toLocaleString()} quality ·{" "}
          {display.affectedEnumerators} enumerators ·{" "}
          {display.affectedDistricts} districts ·{" "}
          {display.affectedDevices} devices
        </p>
      )}

      <div className="mb-6">
        <ErrorCharts
          metrics={display}
          loading={isLoading}
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>

      <ErrorTable metrics={display} loading={isLoading} />
    </div>
  );
}
