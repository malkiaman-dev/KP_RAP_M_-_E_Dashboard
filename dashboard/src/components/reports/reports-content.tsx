"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Layers, Target } from "lucide-react";
import { TrackingFiltersPanel } from "@/components/tracking/tracking-filters";
import { TrackingActiveFilters } from "@/components/tracking/tracking-active-filters";
import { HhGirlsFiltersPanel } from "@/components/hh-girls/hh-girls-filters";
import { HhGirlsActiveFilters } from "@/components/hh-girls/hh-girls-active-filters";
import { TrackingStatusReportCard } from "@/components/reports/tracking-status-report-card";
import { TrackingProgressReportCard } from "@/components/reports/tracking-progress-report-card";
import { HhGirlsStatusReportCard } from "@/components/reports/hh-girls-status-report-card";
import { HhGirlsProgressReportCard } from "@/components/reports/hh-girls-progress-report-card";
import { ModeToggle, PageHero, SectionHeader } from "@/components/ui/page-hero";
import {
  defaultMonitoringFilters,
  type TrackingFilters,
} from "@/lib/data/tracking-metrics";
import {
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

type SurveyModule = "tracking" | "hh-girls";
type ReportMode = "operations" | "progress";

export function ReportsContent() {
  const [surveyModule, setSurveyModule] = useState<SurveyModule>("tracking");
  const [reportMode, setReportMode] = useState<ReportMode>("operations");

  const [trackingFilters, setTrackingFilters] = useState<TrackingFilters>(() =>
    defaultMonitoringFilters()
  );
  const [hhFilters, setHhFilters] = useState<HhGirlsMonitoringFilters>(() =>
    defaultHhGirlsMonitoringFilters()
  );

  const setHhReportFilters = (
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
    enabled: surveyModule === "tracking",
  });

  const hhQuery = useQuery({
    queryKey: [...HH_GIRLS_METRICS_QUERY_KEY],
    queryFn: fetchHhGirlsMetrics,
    staleTime: QUERY_STALE_MS,
    enabled: surveyModule === "hh-girls",
  });

  const isError =
    surveyModule === "tracking" ? trackingQuery.isError : hhQuery.isError;
  const isLoading =
    surveyModule === "tracking" ? trackingQuery.isLoading : hhQuery.isLoading;

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">Failed to load report data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {surveyModule === "tracking"
              ? "Ensure tracking survey CSV files are available in the Surveys folder."
              : "Ensure Household_Survey.csv and Girls_Survey.csv are available in the Surveys folder."}
          </p>
        </div>
      </div>
    );
  }

  const trackingDistricts =
    trackingQuery.data?.filterOptions?.districts ?? [];
  const hhDistricts = hhQuery.data?.filterOptions?.districts ?? [];
  const districtCount =
    surveyModule === "tracking"
      ? trackingDistricts.length
      : hhDistricts.length;

  return (
    <div>
      <PageHero
        eyebrow="Export & stakeholder briefings"
        title="Field Reports"
        accent="Studio"
        description="Generate district-wise or all-district field operations and programme progress reports for Tracking or combined HH / Girls surveys. Export to PDF or Word for partners and leadership."
        loading={isLoading}
        links={[
          { href: "/tracking", label: "Tracking" },
          { href: "/surveys/hh-girls", label: "HH / Girls" },
          { href: "/monitoring", label: "Monitoring" },
        ]}
        stats={[
          {
            label: "Module",
            value: surveyModule === "tracking" ? "Tracking" : "HH / Girls",
            icon: Layers,
            colorClass: "text-teal",
          },
          {
            label: "Report type",
            value:
              reportMode === "operations" ? "Operations" : "Progress",
            icon: FileText,
            colorClass: "text-deep-teal",
          },
          {
            label: "Districts in scope",
            value: districtCount,
            icon: Target,
            colorClass: "text-amber-600 dark:text-gold",
          },
          {
            label: "Export formats",
            value: "PDF · Word",
            icon: FileText,
            colorClass: "text-teal",
          },
        ]}
      >
        <div className="flex flex-wrap gap-3">
          <ModeToggle
            value={surveyModule}
            onChange={setSurveyModule}
            options={[
              { value: "tracking", label: "Tracking" },
              { value: "hh-girls", label: "HH / Girls" },
            ]}
          />
          <ModeToggle
            value={reportMode}
            onChange={setReportMode}
            options={[
              { value: "operations", label: "Field Operations" },
              { value: "progress", label: "Progress Summary" },
            ]}
          />
        </div>
      </PageHero>

      <SectionHeader
        title="Report scope"
        subtitle="Narrow filters, then generate and download the briefing package."
      />

      {surveyModule === "tracking" ? (
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
          <div className="mt-6 space-y-4">
            {reportMode === "progress" ? (
              <TrackingProgressReportCard
                allSubmissions={trackingQuery.data?.allSubmissions}
                filters={trackingFilters}
                districtOptions={trackingDistricts}
                loading={isLoading}
              />
            ) : (
              <TrackingStatusReportCard
                allSubmissions={trackingQuery.data?.allSubmissions}
                filters={trackingFilters}
                districtOptions={trackingDistricts}
                loading={isLoading}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <HhGirlsFiltersPanel
            filterOptions={hhQuery.data?.filterOptions}
            filters={hhFilters}
            onChange={setHhReportFilters}
            showTodayToggle
            resetFilters={defaultHhGirlsMonitoringFilters}
          />
          <HhGirlsActiveFilters
            filters={hhFilters}
            onChange={setHhReportFilters}
            filterOptions={hhQuery.data?.filterOptions}
            resetFilters={defaultHhGirlsMonitoringFilters}
          />
          <div className="mt-6 space-y-4">
            {reportMode === "progress" ? (
              <HhGirlsProgressReportCard
                allHousehold={hhQuery.data?.allHousehold}
                allGirls={hhQuery.data?.allGirls}
                filters={hhFilters}
                districtOptions={hhDistricts}
                loading={isLoading}
              />
            ) : (
              <HhGirlsStatusReportCard
                allHousehold={hhQuery.data?.allHousehold}
                allGirls={hhQuery.data?.allGirls}
                filters={hhFilters}
                districtOptions={hhDistricts}
                loading={isLoading}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
