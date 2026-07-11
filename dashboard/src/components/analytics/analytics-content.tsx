"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { AnalyticsKpis } from "@/components/analytics/analytics-kpis";
import { AnalyticsProtocol } from "@/components/analytics/analytics-protocol";
import { DashboardActiveFilters } from "@/components/dashboard/dashboard-active-filters";
import {
  defaultFilters,
  FiltersPanel,
} from "@/components/dashboard/filters-panel";
import {
  buildHhCompletionTrend,
  computePaceInsight,
  computeProtocolProgress,
} from "@/lib/data/analytics-insights";
import {
  applyHhGirlsDataFilters,
  computeHhGirlsMetrics,
  defaultHhGirlsFilters,
  type HhGirlsFilters,
} from "@/lib/data/hh-girls-metrics";
import { PROTOCOL } from "@/lib/data/protocol";
import {
  applyFilters,
  computeMetrics,
  type DashboardFilters,
} from "@/lib/data/survey-metrics";
import {
  applyTrackingFilters,
  computeTrackingMetrics,
  defaultTrackingFilters,
  type TrackingFilters,
} from "@/lib/data/tracking-metrics";
import {
  DASHBOARD_METRICS_QUERY_KEY,
  fetchDashboardMetrics,
  fetchHhGirlsMetrics,
  fetchTrackingMetrics,
  HH_GIRLS_METRICS_QUERY_KEY,
  QUERY_STALE_MS,
  TRACKING_METRICS_QUERY_KEY,
} from "@/lib/queries/app-data";

function toTrackingFilters(filters: DashboardFilters): TrackingFilters {
  return {
    ...defaultTrackingFilters,
    district: filters.district,
    enumerator: filters.enumerator,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
}

function toHhGirlsFilters(filters: DashboardFilters): HhGirlsFilters {
  return {
    ...defaultHhGirlsFilters,
    district: filters.district,
    enumerator: filters.enumerator,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
}

export function AnalyticsContent() {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const deferredFilters = useDeferredValue(filters);

  const dashboardQuery = useQuery({
    queryKey: [...DASHBOARD_METRICS_QUERY_KEY],
    queryFn: fetchDashboardMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const trackingQuery = useQuery({
    queryKey: [...TRACKING_METRICS_QUERY_KEY],
    queryFn: fetchTrackingMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const hhQuery = useQuery({
    queryKey: [...HH_GIRLS_METRICS_QUERY_KEY],
    queryFn: fetchHhGirlsMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const dashboard = useMemo(() => {
    if (!dashboardQuery.data?.allSubmissions) return undefined;
    return computeMetrics(
      applyFilters(dashboardQuery.data.allSubmissions, deferredFilters)
    );
  }, [dashboardQuery.data, deferredFilters]);

  /** Protocol cards ignore survey/status filters so module targets stay comparable. */
  const protocolDashboard = useMemo(() => {
    if (!dashboardQuery.data?.allSubmissions) return undefined;
    return computeMetrics(
      applyFilters(dashboardQuery.data.allSubmissions, {
        ...deferredFilters,
        surveyType: "all",
        status: "all",
      })
    );
  }, [dashboardQuery.data, deferredFilters]);

  const tracking = useMemo(() => {
    if (!trackingQuery.data?.allSubmissions) return undefined;
    const trackingFilters = toTrackingFilters(deferredFilters);
    return computeTrackingMetrics(
      applyTrackingFilters(trackingQuery.data.allSubmissions, trackingFilters),
      undefined,
      trackingQuery.data.allSubmissions,
      { includeExportLists: false }
    );
  }, [trackingQuery.data, deferredFilters]);

  const hhGirls = useMemo(() => {
    if (!hhQuery.data?.allHousehold || !hhQuery.data?.allGirls) return undefined;
    const { household, girls } = applyHhGirlsDataFilters(
      hhQuery.data.allHousehold,
      hhQuery.data.allGirls,
      toHhGirlsFilters(deferredFilters)
    );
    return computeHhGirlsMetrics(household, girls);
  }, [hhQuery.data, deferredFilters]);

  const progress = useMemo(() => {
    if (!protocolDashboard || !tracking) return undefined;
    return computeProtocolProgress(protocolDashboard, tracking, hhGirls?.core);
  }, [protocolDashboard, tracking, hhGirls]);

  const trackingPace = useMemo(() => {
    if (!tracking) return undefined;
    return computePaceInsight(
      tracking.trackingTrend,
      tracking.remainingToSuccessTarget
    );
  }, [tracking]);

  const hhPace = useMemo(() => {
    if (!hhGirls) return undefined;
    const trend = buildHhCompletionTrend(
      hhGirls.allHousehold,
      hhGirls.allGirls
    );
    return computePaceInsight(trend, hhGirls.core.remainingToTarget);
  }, [hhGirls]);

  const isError =
    dashboardQuery.isError || trackingQuery.isError || hhQuery.isError;
  const isLoading =
    (dashboardQuery.isLoading && !dashboard) ||
    (trackingQuery.isLoading && !tracking) ||
    (hhQuery.isLoading && !hhGirls);
  const filtering =
    filters.district !== deferredFilters.district ||
    filters.surveyType !== deferredFilters.surveyType ||
    filters.enumerator !== deferredFilters.enumerator ||
    filters.status !== deferredFilters.status ||
    filters.dateFrom !== deferredFilters.dateFrom ||
    filters.dateTo !== deferredFilters.dateTo;

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">
            Failed to load analytics data
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure survey CSV files exist in the Surveys folder for tracking,
            household, and girls modules.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={filtering ? "opacity-80 transition-opacity" : undefined}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Analytics - Cross-Module Insights
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Protocol progress toward{" "}
          {PROTOCOL.SUCCESSFUL_TRACKING_TARGET.toLocaleString()} tracked girls
          and {PROTOCOL.HH_SURVEY_TARGET.toLocaleString()} completed households ·
          cohort comparison, pace, and quality across all survey modules
        </p>
      </motion.div>

      <FiltersPanel
        filterOptions={dashboardQuery.data?.filterOptions}
        filters={filters}
        onChange={setFilters}
        showPresets={false}
      />
      <DashboardActiveFilters
        filters={filters}
        onChange={setFilters}
        filterOptions={dashboardQuery.data?.filterOptions}
      />

      <AnalyticsKpis
        progress={progress}
        trackingPace={trackingPace}
        hhPace={hhPace}
        loading={isLoading}
      />
      <AnalyticsProtocol
        progress={progress}
        tracking={tracking}
        loading={isLoading}
      />
      <AnalyticsCharts
        dashboard={dashboard}
        tracking={tracking}
        progress={progress}
        filters={filters}
        onFilterChange={setFilters}
        loading={isLoading}
      />
    </div>
  );
}
