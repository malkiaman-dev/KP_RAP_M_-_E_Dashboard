"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrackingFiltersPanel } from "@/components/tracking/tracking-filters";
import { TrackingActiveFilters } from "@/components/tracking/tracking-active-filters";
import { HhGirlsFiltersPanel } from "@/components/hh-girls/hh-girls-filters";
import { HhGirlsActiveFilters } from "@/components/hh-girls/hh-girls-active-filters";
import { MonitoringKpis } from "@/components/monitoring/monitoring-kpis";
import { MonitoringCharts } from "@/components/monitoring/monitoring-charts";
import { MonitoringEnumeratorTable } from "@/components/monitoring/monitoring-enumerator-table";
import { HhGirlsMonitoringKpis } from "@/components/monitoring/hh-girls-monitoring-kpis";
import { HhGirlsMonitoringCharts } from "@/components/monitoring/hh-girls-monitoring-charts";
import { HhGirlsMonitoringEnumeratorTable } from "@/components/monitoring/hh-girls-monitoring-enumerator-table";
import {
  applyTrackingFilters,
  computeMonitoringMetrics,
  defaultMonitoringFilters,
  type TrackingFilters,
} from "@/lib/data/tracking-metrics";
import {
  applyHhGirlsMonitoringFilters,
  computeHhGirlsMonitoringMetrics,
  defaultHhGirlsMonitoringFilters,
  type HhGirlsMonitoringFilters,
} from "@/lib/data/hh-girls-monitoring";
import type { HhGirlsFilters } from "@/lib/data/hh-girls-metrics";
import {
  fetchHhGirlsMetrics,
  fetchTrackingMetrics,
  HH_GIRLS_METRICS_QUERY_KEY,
  QUERY_STALE_MS,
  TRACKING_METRICS_QUERY_KEY,
} from "@/lib/queries/app-data";
import {
  DAILY_HH_FORMS_TARGET_PER_ENUMERATOR,
  DAILY_HH_TARGET_PER_ENUMERATOR,
  DAILY_TRACKING_TARGET_PER_ENUMERATOR,
} from "@/lib/data/protocol";

type MonitoringMode = "tracking" | "hh-girls";

export default function MonitoringPage() {
  const [mode, setMode] = useState<MonitoringMode>("tracking");

  const [trackingFilters, setTrackingFilters] = useState<TrackingFilters>(() =>
    defaultMonitoringFilters()
  );
  const deferredTrackingFilters = useDeferredValue(trackingFilters);

  const [hhFilters, setHhFilters] = useState<HhGirlsMonitoringFilters>(() =>
    defaultHhGirlsMonitoringFilters()
  );
  const deferredHhFilters = useDeferredValue(hhFilters);

  const setHhMonitoringFilters = (
    next: HhGirlsFilters | HhGirlsMonitoringFilters
  ) => {
    setHhFilters({
      ...defaultHhGirlsMonitoringFilters(),
      ...next,
      todayOnly: "todayOnly" in next ? Boolean(next.todayOnly) : false,
    });
  };

  const trackingQuery = useQuery({
    queryKey: [...TRACKING_METRICS_QUERY_KEY],
    queryFn: fetchTrackingMetrics,
    staleTime: QUERY_STALE_MS,
    enabled: mode === "tracking",
  });

  const hhQuery = useQuery({
    queryKey: [...HH_GIRLS_METRICS_QUERY_KEY],
    queryFn: fetchHhGirlsMetrics,
    staleTime: QUERY_STALE_MS,
    enabled: mode === "hh-girls",
  });

  const trackingMonitoring = useMemo(() => {
    if (!trackingQuery.data?.allSubmissions) return undefined;
    const rows = applyTrackingFilters(
      trackingQuery.data.allSubmissions,
      deferredTrackingFilters
    );
    return computeMonitoringMetrics(
      rows,
      DAILY_TRACKING_TARGET_PER_ENUMERATOR
    );
  }, [trackingQuery.data, deferredTrackingFilters]);

  const hhMonitoring = useMemo(() => {
    if (!hhQuery.data?.allHousehold || !hhQuery.data?.allGirls)
      return undefined;
    const { household, girls } = applyHhGirlsMonitoringFilters(
      hhQuery.data.allHousehold,
      hhQuery.data.allGirls,
      deferredHhFilters
    );
    return computeHhGirlsMonitoringMetrics(
      household,
      girls,
      DAILY_HH_TARGET_PER_ENUMERATOR,
      DAILY_HH_FORMS_TARGET_PER_ENUMERATOR
    );
  }, [hhQuery.data, deferredHhFilters]);

  const isError =
    mode === "tracking" ? trackingQuery.isError : hhQuery.isError;
  const isLoading =
    mode === "tracking" ? trackingQuery.isLoading : hhQuery.isLoading;

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">
            Failed to load monitoring data
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "tracking"
              ? "Ensure Tracking_Survey_Baseline.csv and Tracking_Survey_NewSample.csv exist in the Surveys folder."
              : "Ensure Household_Survey.csv and Girls_Survey.csv exist in the Surveys folder."}
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
          {mode === "tracking"
            ? `Daily tracking target of ${DAILY_TRACKING_TARGET_PER_ENUMERATOR} girls per enumerator · live progress, productivity and target attainment`
            : `Daily HH target of ${DAILY_HH_TARGET_PER_ENUMERATOR} completed households (${DAILY_HH_FORMS_TARGET_PER_ENUMERATOR} forms: 3 mother + 3 father + 3 girls) per enumerator`}
        </p>
      </motion.div>

      <div className="mb-6 inline-flex rounded-xl border border-border/60 bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setMode("tracking")}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-medium transition-colors",
            mode === "tracking"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Tracking
        </button>
        <button
          type="button"
          onClick={() => setMode("hh-girls")}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-medium transition-colors",
            mode === "hh-girls"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          HH / Girls
        </button>
      </div>

      {mode === "tracking" ? (
        <>
          <TrackingFiltersPanel
            filterOptions={trackingQuery.data?.filterOptions}
            filters={trackingFilters}
            onChange={setTrackingFilters}
            showTodayToggle
            resetFilters={defaultMonitoringFilters}
          />
          <TrackingActiveFilters
            filters={trackingFilters}
            onChange={setTrackingFilters}
            filterOptions={trackingQuery.data?.filterOptions}
            resetFilters={defaultMonitoringFilters}
          />
          <MonitoringKpis
            metrics={trackingMonitoring}
            loading={isLoading}
          />
          {trackingMonitoring && !isLoading && (
            <p className="mb-4 text-xs text-muted-foreground">
              {trackingMonitoring.activeEnumerators} active enumerators ·{" "}
              {trackingMonitoring.enumeratorDays.toLocaleString()} enumerator-days
              · {trackingMonitoring.expectedTracked.toLocaleString()} girls
              expected at target ·{" "}
              {trackingMonitoring.totalTracked.toLocaleString()} actually tracked
              {trackingMonitoring.topPerformer && (
                <>
                  {" · "}Top: {trackingMonitoring.topPerformer.name} (
                  {trackingMonitoring.topPerformer.value} tracked)
                </>
              )}
            </p>
          )}
          <MonitoringEnumeratorTable
            metrics={trackingMonitoring}
            loading={isLoading}
            filters={trackingFilters}
            districtOptions={trackingQuery.data?.filterOptions?.districts}
          />
          <MonitoringCharts
            metrics={trackingMonitoring}
            loading={isLoading}
            filters={trackingFilters}
            onFilterChange={setTrackingFilters}
          />
        </>
      ) : (
        <>
          <HhGirlsFiltersPanel
            filterOptions={hhQuery.data?.filterOptions}
            filters={hhFilters}
            onChange={setHhMonitoringFilters}
            showTodayToggle
            resetFilters={defaultHhGirlsMonitoringFilters}
          />
          <HhGirlsActiveFilters
            filters={hhFilters}
            onChange={setHhMonitoringFilters}
            filterOptions={hhQuery.data?.filterOptions}
            resetFilters={defaultHhGirlsMonitoringFilters}
          />
          <HhGirlsMonitoringKpis metrics={hhMonitoring} loading={isLoading} />
          {hhMonitoring && !isLoading && (
            <p className="mb-4 text-xs text-muted-foreground">
              {hhMonitoring.activeEnumerators} active enumerators ·{" "}
              {hhMonitoring.enumeratorDays.toLocaleString()} enumerator-days ·{" "}
              {hhMonitoring.expectedCompleted.toLocaleString()} HH expected ·{" "}
              {hhMonitoring.totalCompleted.toLocaleString()} completed ·{" "}
              {hhMonitoring.totalSubmissions.toLocaleString()} of{" "}
              {hhMonitoring.expectedSubmissions.toLocaleString()} forms expected
              {hhMonitoring.topPerformer && (
                <>
                  {" · "}Top: {hhMonitoring.topPerformer.name} (
                  {hhMonitoring.topPerformer.value} HH)
                </>
              )}
            </p>
          )}
          <HhGirlsMonitoringEnumeratorTable
            metrics={hhMonitoring}
            loading={isLoading}
            filters={hhFilters}
            districtOptions={hhQuery.data?.filterOptions?.districts}
          />
          <HhGirlsMonitoringCharts
            metrics={hhMonitoring}
            loading={isLoading}
            filters={hhFilters}
            onFilterChange={setHhMonitoringFilters}
          />
        </>
      )}
    </div>
  );
}
