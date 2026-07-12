"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Target, Users } from "lucide-react";
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
import { ModeToggle, PageHero, SectionHeader } from "@/components/ui/page-hero";
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
      <PageHero
        eyebrow="Enumerator performance live"
        title="Field Monitoring"
        accent="Command"
        description={
          mode === "tracking"
            ? `Daily tracking target of ${DAILY_TRACKING_TARGET_PER_ENUMERATOR} girls per enumerator. Live progress, productivity, and target attainment across the field force.`
            : `Daily HH target of ${DAILY_HH_TARGET_PER_ENUMERATOR} completed households (${DAILY_HH_FORMS_TARGET_PER_ENUMERATOR} forms: mother + father + girls) per enumerator.`
        }
        loading={isLoading}
        links={[
          { href: "/tracking", label: "Tracking" },
          { href: "/surveys/hh-girls", label: "HH / Girls" },
          { href: "/reports", label: "Reports" },
        ]}
        stats={
          mode === "tracking"
            ? [
                {
                  label: "Active enumerators",
                  value: trackingMonitoring?.activeEnumerators ?? 0,
                  icon: Users,
                  colorClass: "text-teal",
                },
                {
                  label: "On track",
                  value: trackingMonitoring?.enumeratorsOnTrack ?? 0,
                  icon: Target,
                  colorClass: "text-teal",
                },
                {
                  label: "Avg tracked / day",
                  value: trackingMonitoring?.avgTrackedPerEnumeratorPerDay ?? 0,
                  icon: Activity,
                  colorClass: "text-deep-teal",
                  decimals: 1,
                },
                {
                  label: "Daily target",
                  value: DAILY_TRACKING_TARGET_PER_ENUMERATOR,
                  icon: Target,
                  colorClass: "text-amber-600 dark:text-gold",
                },
              ]
            : [
                {
                  label: "Active enumerators",
                  value: hhMonitoring?.activeEnumerators ?? 0,
                  icon: Users,
                  colorClass: "text-deep-teal",
                },
                {
                  label: "On track",
                  value: hhMonitoring?.enumeratorsOnTrack ?? 0,
                  icon: Target,
                  colorClass: "text-deep-teal",
                },
                {
                  label: "HH daily target",
                  value: DAILY_HH_TARGET_PER_ENUMERATOR,
                  icon: Target,
                  colorClass: "text-teal",
                },
                {
                  label: "Forms / day",
                  value: DAILY_HH_FORMS_TARGET_PER_ENUMERATOR,
                  icon: Activity,
                  colorClass: "text-amber-600 dark:text-gold",
                },
              ]
        }
      >
        <ModeToggle
          value={mode}
          onChange={setMode}
          options={[
            { value: "tracking", label: "Tracking" },
            { value: "hh-girls", label: "HH / Girls" },
          ]}
        />
      </PageHero>

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
          <SectionHeader
            title="Enumerator performance"
            subtitle="Daily target attainment, productivity, and field force status."
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

          <SectionHeader
            title="Enumerator roster"
            subtitle="Sortable performance ledger for supervisors."
            className="mt-6"
          />
          <MonitoringEnumeratorTable
            metrics={trackingMonitoring}
            loading={isLoading}
            filters={trackingFilters}
            districtOptions={trackingQuery.data?.filterOptions?.districts}
          />

          <SectionHeader
            title="Performance intelligence"
            subtitle="Click charts to focus filters on geography or date windows."
            className="mt-8"
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
          <SectionHeader
            title="HH enumerator performance"
            subtitle="Completed households and form throughput versus daily targets."
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

          <SectionHeader
            title="Enumerator roster"
            subtitle="Sortable HH performance ledger for supervisors."
            className="mt-6"
          />
          <HhGirlsMonitoringEnumeratorTable
            metrics={hhMonitoring}
            loading={isLoading}
            filters={hhFilters}
            districtOptions={hhQuery.data?.filterOptions?.districts}
          />

          <SectionHeader
            title="Performance intelligence"
            subtitle="Click charts to focus filters on geography or date windows."
            className="mt-8"
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
