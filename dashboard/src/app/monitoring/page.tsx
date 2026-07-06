"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrackingFiltersPanel } from "@/components/tracking/tracking-filters";
import { TrackingActiveFilters } from "@/components/tracking/tracking-active-filters";
import { MonitoringKpis } from "@/components/monitoring/monitoring-kpis";
import { MonitoringCharts } from "@/components/monitoring/monitoring-charts";
import { MonitoringEnumeratorTable } from "@/components/monitoring/monitoring-enumerator-table";
import {
  applyTrackingFilters,
  computeMonitoringMetrics,
  defaultMonitoringFilters,
  type TrackingFilters,
} from "@/lib/data/tracking-metrics";
import {
  fetchTrackingMetrics,
  QUERY_STALE_MS,
  TRACKING_METRICS_QUERY_KEY,
} from "@/lib/queries/app-data";
import { DAILY_TRACKING_TARGET_PER_ENUMERATOR } from "@/lib/data/protocol";

export default function MonitoringPage() {
  const [filters, setFilters] = useState<TrackingFilters>(() =>
    defaultMonitoringFilters()
  );
  const deferredFilters = useDeferredValue(filters);

  const { data, isLoading, isError } = useQuery({
    queryKey: [...TRACKING_METRICS_QUERY_KEY],
    queryFn: fetchTrackingMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const monitoring = useMemo(() => {
    if (!data?.allSubmissions) return undefined;
    const rows = applyTrackingFilters(data.allSubmissions, deferredFilters);
    return computeMonitoringMetrics(rows, DAILY_TRACKING_TARGET_PER_ENUMERATOR);
  }, [data, deferredFilters]);

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">Failed to load monitoring data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure Tracking_Survey_Baseline.csv and Tracking_Survey_NewSample.csv
            exist in the Surveys folder.
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
          Field Monitoring - Enumerator Performance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily tracking target of{" "}
          {DAILY_TRACKING_TARGET_PER_ENUMERATOR} girls per enumerator · live
          progress, productivity and target attainment across the field team
        </p>
      </motion.div>

      <TrackingFiltersPanel
        filterOptions={data?.filterOptions}
        filters={filters}
        onChange={setFilters}
        showTodayToggle
        resetFilters={defaultMonitoringFilters}
      />

      <TrackingActiveFilters
        filters={filters}
        onChange={setFilters}
        filterOptions={data?.filterOptions}
        resetFilters={defaultMonitoringFilters}
      />

      <MonitoringKpis metrics={monitoring} loading={isLoading} />

      {monitoring && !isLoading && (
        <p className="mb-4 text-xs text-muted-foreground">
          {monitoring.activeEnumerators} active enumerators ·{" "}
          {monitoring.enumeratorDays.toLocaleString()} enumerator-days ·{" "}
          {monitoring.expectedTracked.toLocaleString()} girls expected at target ·{" "}
          {monitoring.totalTracked.toLocaleString()} actually tracked
          {monitoring.topPerformer && (
            <>
              {" · "}Top: {monitoring.topPerformer.name} (
              {monitoring.topPerformer.value} tracked)
            </>
          )}
        </p>
      )}

      <MonitoringEnumeratorTable
        metrics={monitoring}
        loading={isLoading}
        filters={filters}
        districtOptions={data?.filterOptions?.districts}
      />

      <MonitoringCharts
        metrics={monitoring}
        loading={isLoading}
        filters={filters}
        onFilterChange={setFilters}
      />
    </div>
  );
}