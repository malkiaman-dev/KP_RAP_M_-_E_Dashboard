"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Home, Target, Timer } from "lucide-react";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { AnalyticsKpis } from "@/components/analytics/analytics-kpis";
import { AnalyticsProtocol } from "@/components/analytics/analytics-protocol";
import { DashboardActiveFilters } from "@/components/dashboard/dashboard-active-filters";
import { FiltersPanel } from "@/components/dashboard/filters-panel";
import { PageHero, SectionHeader } from "@/components/ui/page-hero";
import { useFieldPeriod } from "@/components/filters/field-period-provider";
import {
  buildHhCompletionTrend,
  computePaceInsight,
  computeProtocolProgress,
} from "@/lib/data/analytics-insights";
import {
  applyFilters,
  computeMetrics,
  createDefaultDashboardFilters,
  dashboardFiltersEqual,
  type DashboardFilters,
} from "@/lib/data/survey-metrics";
import { FIELD_PERIOD_START } from "@/lib/data/field-period";
import {
  applyHhGirlsDataFilters,
  computeHhGirlsMetrics,
  createDefaultHhGirlsFilters,
  hhGirlsFiltersEqual,
  type HhGirlsFilters,
} from "@/lib/data/hh-girls-metrics";
import { PROTOCOL } from "@/lib/data/protocol";
import {
  applyTrackingFilters,
  computeTrackingMetrics,
  createDefaultTrackingFilters,
  trackingFiltersEqual,
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
    ...createDefaultTrackingFilters(filters.dateFrom),
    district: filters.district,
    enumerator: filters.enumerator,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
}

function toHhGirlsFilters(filters: DashboardFilters): HhGirlsFilters {
  return {
    ...createDefaultHhGirlsFilters(filters.dateFrom),
    district: filters.district,
    enumerator: filters.enumerator,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
}

const FIELD_PERIOD_DASHBOARD = createDefaultDashboardFilters(FIELD_PERIOD_START);
const FIELD_PERIOD_TRACKING = createDefaultTrackingFilters(FIELD_PERIOD_START);
const FIELD_PERIOD_HH = createDefaultHhGirlsFilters(FIELD_PERIOD_START);

export function AnalyticsContent() {
  const { dateFrom: fieldDateFrom } = useFieldPeriod();
  const [filters, setFilters] = useState<DashboardFilters>(() =>
    createDefaultDashboardFilters(fieldDateFrom)
  );
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, dateFrom: fieldDateFrom }));
  }, [fieldDateFrom]);

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
    if (dashboardFiltersEqual(deferredFilters, FIELD_PERIOD_DASHBOARD)) {
      return dashboardQuery.data;
    }
    return computeMetrics(
      applyFilters(dashboardQuery.data.allSubmissions, deferredFilters),
      { allRows: dashboardQuery.data.allSubmissions }
    );
  }, [dashboardQuery.data, deferredFilters]);

  /** Protocol cards ignore survey/status filters so module targets stay comparable. */
  const protocolDashboard = useMemo(() => {
    if (!dashboardQuery.data?.allSubmissions) return undefined;
    const protocolFilters = {
      ...deferredFilters,
      surveyType: "all",
      status: "all",
    };
    if (dashboardFiltersEqual(protocolFilters, FIELD_PERIOD_DASHBOARD)) {
      return dashboardQuery.data;
    }
    return computeMetrics(
      applyFilters(dashboardQuery.data.allSubmissions, protocolFilters),
      { allRows: dashboardQuery.data.allSubmissions }
    );
  }, [dashboardQuery.data, deferredFilters]);

  const tracking = useMemo(() => {
    if (!trackingQuery.data?.allSubmissions) return undefined;
    const trackingFilters = toTrackingFilters(deferredFilters);
    if (trackingFiltersEqual(trackingFilters, FIELD_PERIOD_TRACKING)) {
      return trackingQuery.data;
    }
    return computeTrackingMetrics(
      applyTrackingFilters(trackingQuery.data.allSubmissions, trackingFilters),
      undefined,
      trackingQuery.data.allSubmissions,
      { includeExportLists: false }
    );
  }, [trackingQuery.data, deferredFilters]);

  const hhGirls = useMemo(() => {
    if (!hhQuery.data?.allHousehold || !hhQuery.data?.allGirls) return undefined;
    const hhFilters = toHhGirlsFilters(deferredFilters);
    if (hhGirlsFiltersEqual(hhFilters, FIELD_PERIOD_HH)) {
      return hhQuery.data;
    }
    const { household, girls } = applyHhGirlsDataFilters(
      hhQuery.data.allHousehold,
      hhQuery.data.allGirls,
      hhFilters
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
      <PageHero
        eyebrow="Cross-module intelligence"
        title="Analytics"
        accent="Insights"
        description={`Protocol progress toward ${PROTOCOL.SUCCESSFUL_TRACKING_TARGET.toLocaleString()} tracked girls and ${PROTOCOL.HH_SURVEY_TARGET.toLocaleString()} completed households. Cohort comparison, pace, and quality across all survey modules.`}
        loading={isLoading}
        links={[
          { href: "/", label: "Dashboard" },
          { href: "/tracking", label: "Tracking" },
          { href: "/surveys/hh-girls", label: "HH / Girls" },
        ]}
        stats={[
          {
            label: "Tracked vs target",
            value: progress?.trackingPct ?? 0,
            icon: Target,
            colorClass: "text-teal",
            decimals: 1,
            suffix: "%",
          },
          {
            label: "Remaining",
            value: progress?.trackingRemaining ?? 0,
            icon: Timer,
            colorClass: "text-amber-600 dark:text-gold",
          },
          {
            label: "HH completed",
            value: progress?.hhPct ?? 0,
            icon: Home,
            colorClass: "text-deep-teal",
            decimals: 1,
            suffix: "%",
          },
          {
            label: "7-day pace",
            value: trackingPace?.dailyRate ?? 0,
            icon: Activity,
            colorClass: "text-teal",
            decimals: 1,
          },
        ]}
      />

      <FiltersPanel
        filterOptions={dashboardQuery.data?.filterOptions}
        filters={filters}
        onChange={setFilters}
        showPresets={false}
        resetFilters={() => createDefaultDashboardFilters(fieldDateFrom)}
      />
      <DashboardActiveFilters
        filters={filters}
        onChange={setFilters}
        filterOptions={dashboardQuery.data?.filterOptions}
      />

      <SectionHeader
        title="Pace & protocol KPIs"
        subtitle="Tracking and household progress against targets with 7-day velocity."
      />
      <AnalyticsKpis
        progress={progress}
        trackingPace={trackingPace}
        hhPace={hhPace}
        loading={isLoading}
      />

      <SectionHeader
        title="Protocol pulse"
        subtitle="Live attainment rings and cohort contribution to the success target."
        className="mt-8"
      />
      <AnalyticsProtocol
        progress={progress}
        tracking={tracking}
        loading={isLoading}
      />

      <SectionHeader
        title="Cross-module charts"
        subtitle="Click any series to drill filters across analytics."
        className="mt-8"
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
