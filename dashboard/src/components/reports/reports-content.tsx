"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileText, Layers, Target } from "lucide-react";
import { TrackingFiltersPanel } from "@/components/tracking/tracking-filters";
import { TrackingActiveFilters } from "@/components/tracking/tracking-active-filters";
import { HhGirlsFiltersPanel } from "@/components/hh-girls/hh-girls-filters";
import { HhGirlsActiveFilters } from "@/components/hh-girls/hh-girls-active-filters";
import { ErrorFiltersPanel } from "@/components/errors/error-filters";
import { ErrorActiveFilters } from "@/components/errors/error-active-filters";
import { TrackingStatusReportCard } from "@/components/reports/tracking-status-report-card";
import { TrackingProgressReportCard } from "@/components/reports/tracking-progress-report-card";
import { HhGirlsStatusReportCard } from "@/components/reports/hh-girls-status-report-card";
import { HhGirlsProgressReportCard } from "@/components/reports/hh-girls-progress-report-card";
import { ErrorReportCard } from "@/components/reports/error-report-card";
import { ModeToggle, PageHero, SectionHeader } from "@/components/ui/page-hero";
import { useFieldPeriod } from "@/components/filters/field-period-provider";
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
  defaultErrorFilters,
  type ErrorFilters,
} from "@/lib/data/error-metrics";
import {
  ERROR_METRICS_QUERY_KEY,
  fetchErrorMetrics,
  fetchHhGirlsMetrics,
  fetchTrackingMetrics,
  HH_GIRLS_METRICS_QUERY_KEY,
  QUERY_STALE_MS,
  TRACKING_METRICS_QUERY_KEY,
} from "@/lib/queries/app-data";

type SurveyModule = "tracking" | "hh-girls" | "errors";
type ReportMode = "operations" | "progress";

export function ReportsContent() {
  const { dateFrom: fieldDateFrom } = useFieldPeriod();
  const [surveyModule, setSurveyModule] = useState<SurveyModule>("tracking");
  const [reportMode, setReportMode] = useState<ReportMode>("operations");

  const [trackingFilters, setTrackingFilters] = useState<TrackingFilters>(() =>
    defaultMonitoringFilters(fieldDateFrom)
  );
  const [hhFilters, setHhFilters] = useState<HhGirlsMonitoringFilters>(() =>
    defaultHhGirlsMonitoringFilters(fieldDateFrom)
  );
  const [errorFilters, setErrorFilters] =
    useState<ErrorFilters>(defaultErrorFilters);

  useEffect(() => {
    setTrackingFilters((prev) => ({ ...prev, dateFrom: fieldDateFrom }));
    setHhFilters((prev) => ({ ...prev, dateFrom: fieldDateFrom }));
  }, [fieldDateFrom]);

  const setHhReportFilters = (
    next: HhGirlsFilters | HhGirlsMonitoringFilters
  ) => {
    setHhFilters({
      ...defaultHhGirlsMonitoringFilters(fieldDateFrom),
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

  const errorQuery = useQuery({
    queryKey: [...ERROR_METRICS_QUERY_KEY],
    queryFn: fetchErrorMetrics,
    staleTime: QUERY_STALE_MS,
    enabled: surveyModule === "errors",
  });

  const isError =
    surveyModule === "tracking"
      ? trackingQuery.isError
      : surveyModule === "hh-girls"
        ? hhQuery.isError
        : errorQuery.isError;
  const isLoading =
    surveyModule === "tracking"
      ? trackingQuery.isLoading
      : surveyModule === "hh-girls"
        ? hhQuery.isLoading
        : errorQuery.isLoading;

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">Failed to load report data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {surveyModule === "tracking"
              ? "Ensure tracking survey CSV files are available in the Surveys folder."
              : surveyModule === "hh-girls"
                ? "Ensure Household_Survey.csv and Girls_Survey.csv are available in the Surveys folder."
                : "Ensure Daily_Error_Log.xlsx exists in the Error_log folder."}
          </p>
        </div>
      </div>
    );
  }

  const trackingDistricts =
    trackingQuery.data?.filterOptions?.districts ?? [];
  const hhDistricts = hhQuery.data?.filterOptions?.districts ?? [];
  const errorDistricts = errorQuery.data?.filterOptions?.districts ?? [];
  const districtCount =
    surveyModule === "tracking"
      ? trackingDistricts.length
      : surveyModule === "hh-girls"
        ? hhDistricts.length
        : errorDistricts.length;

  const moduleLabel =
    surveyModule === "tracking"
      ? "Tracking"
      : surveyModule === "hh-girls"
        ? "HH / Girls"
        : "Errors";

  return (
    <div>
      <PageHero
        eyebrow="Export & stakeholder briefings"
        title="Field Reports"
        accent="Studio"
        description="Generate district-wise or all-district reports for Tracking, HH / Girls, or Error quality. Export to PDF or Word for partners and leadership."
        loading={isLoading}
        links={[
          { href: "/tracking", label: "Tracking" },
          { href: "/surveys/hh-girls", label: "HH / Girls" },
          { href: "/surveys/errors", label: "Error Report" },
        ]}
        stats={[
          {
            label: "Module",
            value: moduleLabel,
            icon: surveyModule === "errors" ? AlertTriangle : Layers,
            colorClass: "text-teal",
          },
          {
            label: "Report type",
            value:
              surveyModule === "errors"
                ? "Quality"
                : reportMode === "operations"
                  ? "Operations"
                  : "Progress",
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
              { value: "errors", label: "Errors" },
            ]}
          />
          {surveyModule !== "errors" && (
            <ModeToggle
              value={reportMode}
              onChange={setReportMode}
              options={[
                { value: "operations", label: "Field Operations" },
                { value: "progress", label: "Progress Summary" },
              ]}
            />
          )}
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
            resetFilters={() => defaultMonitoringFilters(fieldDateFrom)}
          />
          <TrackingActiveFilters
            filters={trackingFilters}
            onChange={setTrackingFilters}
            filterOptions={trackingQuery.data?.filterOptions}
            resetFilters={() => defaultMonitoringFilters(fieldDateFrom)}
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
      ) : surveyModule === "hh-girls" ? (
        <>
          <HhGirlsFiltersPanel
            filterOptions={hhQuery.data?.filterOptions}
            filters={hhFilters}
            onChange={setHhReportFilters}
            showTodayToggle
            resetFilters={() => defaultHhGirlsMonitoringFilters(fieldDateFrom)}
          />
          <HhGirlsActiveFilters
            filters={hhFilters}
            onChange={setHhReportFilters}
            filterOptions={hhQuery.data?.filterOptions}
            resetFilters={() => defaultHhGirlsMonitoringFilters(fieldDateFrom)}
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
      ) : (
        <>
          <ErrorFiltersPanel
            filterOptions={errorQuery.data?.filterOptions}
            filters={errorFilters}
            onChange={setErrorFilters}
            showTodayToggle
          />
          <ErrorActiveFilters
            filters={errorFilters}
            onChange={setErrorFilters}
          />
          <div className="mt-6 space-y-4">
            <ErrorReportCard
              allErrors={errorQuery.data?.allErrors}
              filters={errorFilters}
              districtOptions={errorDistricts}
              loading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
