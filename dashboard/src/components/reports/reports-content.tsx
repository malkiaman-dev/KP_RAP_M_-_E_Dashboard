"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrackingFiltersPanel } from "@/components/tracking/tracking-filters";
import { TrackingActiveFilters } from "@/components/tracking/tracking-active-filters";
import { HhGirlsFiltersPanel } from "@/components/hh-girls/hh-girls-filters";
import { HhGirlsActiveFilters } from "@/components/hh-girls/hh-girls-active-filters";
import { TrackingStatusReportCard } from "@/components/reports/tracking-status-report-card";
import { TrackingProgressReportCard } from "@/components/reports/tracking-progress-report-card";
import { HhGirlsStatusReportCard } from "@/components/reports/hh-girls-status-report-card";
import { HhGirlsProgressReportCard } from "@/components/reports/hh-girls-progress-report-card";
import { cn } from "@/lib/utils";
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

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Reports
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Generate and export field operations or programme progress reports for
          Tracking or combined HH / Girls surveys. Download district-wise or
          all-district reports in PDF or Word.
        </p>
      </motion.div>

      <div className="mb-4 inline-flex rounded-xl border border-border/60 bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setSurveyModule("tracking")}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-medium transition-colors",
            surveyModule === "tracking"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Tracking
        </button>
        <button
          type="button"
          onClick={() => setSurveyModule("hh-girls")}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-medium transition-colors",
            surveyModule === "hh-girls"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          HH / Girls
        </button>
      </div>

      <div className="mb-6 inline-flex rounded-xl border border-border/60 bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setReportMode("operations")}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-medium transition-colors",
            reportMode === "operations"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Field Operations
        </button>
        <button
          type="button"
          onClick={() => setReportMode("progress")}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-medium transition-colors",
            reportMode === "progress"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Progress Summary
        </button>
      </div>

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
