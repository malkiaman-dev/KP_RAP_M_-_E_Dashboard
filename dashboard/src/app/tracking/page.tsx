"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrackingFiltersPanel } from "@/components/tracking/tracking-filters";
import { TrackingActiveFilters } from "@/components/tracking/tracking-active-filters";
import { TrackingKpis } from "@/components/tracking/tracking-kpis";
import { TrackingSecondaryKpis } from "@/components/tracking/tracking-secondary-kpis";
import { TrackingRevisitSection } from "@/components/tracking/tracking-revisit-section";
import { TrackingDuplicateSection } from "@/components/tracking/tracking-duplicate-section";
import { TrackingCharts } from "@/components/tracking/tracking-charts";
import { TrackingCohortOverview } from "@/components/tracking/tracking-cohort-overview";
import { TrackingCohortSection } from "@/components/tracking/tracking-cohort-section";
import {
  applyTrackingFilters,
  computeTrackingMetrics,
  defaultTrackingFilters,
  resolveActiveCohort,
  trackingFiltersEqual,
  type TrackingFilters,
  type TrackingTargets,
} from "@/lib/data/tracking-metrics";
import { mergeTrackingExportLists } from "@/lib/data/tracking-serialization";
import {
  fetchTrackingExports,
  fetchTrackingMetrics,
  QUERY_STALE_MS,
  TRACKING_EXPORTS_QUERY_KEY,
  TRACKING_METRICS_QUERY_KEY,
} from "@/lib/queries/app-data";
import {
  DEFAULT_TRACKING_TARGETS,
  PROTOCOL,
  baselineSuccessTarget,
  newSampleSuccessTarget,
} from "@/lib/data/protocol";

function targetsForFilters(filters: TrackingFilters): TrackingTargets {
  const cohort = resolveActiveCohort(filters);

  if (cohort === "baseline") {
    return {
      assignmentPool: PROTOCOL.BASELINE_GIRLS_TO_TRACK,
      successTarget: baselineSuccessTarget(),
      baselineAssignment: PROTOCOL.BASELINE_GIRLS_TO_TRACK,
      newSampleAssignment: PROTOCOL.NEW_SAMPLE_GIRLS_TO_TRACK,
      baselineSuccessTarget: baselineSuccessTarget(),
      newSampleSuccessTarget: newSampleSuccessTarget(),
    };
  }
  if (cohort === "new-sample") {
    return {
      assignmentPool: PROTOCOL.NEW_SAMPLE_GIRLS_TO_TRACK,
      successTarget: newSampleSuccessTarget(),
      baselineAssignment: PROTOCOL.BASELINE_GIRLS_TO_TRACK,
      newSampleAssignment: PROTOCOL.NEW_SAMPLE_GIRLS_TO_TRACK,
      baselineSuccessTarget: baselineSuccessTarget(),
      newSampleSuccessTarget: newSampleSuccessTarget(),
    };
  }
  return { ...DEFAULT_TRACKING_TARGETS };
}

export default function TrackingPage() {
  const [filters, setFilters] = useState<TrackingFilters>(defaultTrackingFilters);
  const deferredFilters = useDeferredValue(filters);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [...TRACKING_METRICS_QUERY_KEY],
    queryFn: fetchTrackingMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const { data: exports } = useQuery({
    queryKey: [...TRACKING_EXPORTS_QUERY_KEY],
    queryFn: fetchTrackingExports,
    staleTime: QUERY_STALE_MS,
  });

  const targets = useMemo(
    () => targetsForFilters(deferredFilters),
    [deferredFilters]
  );

  const activeCohort = useMemo(
    () => resolveActiveCohort(deferredFilters),
    [deferredFilters]
  );

  const display = useMemo(() => {
    if (!data?.allSubmissions) return undefined;

    let metrics =
      trackingFiltersEqual(deferredFilters, defaultTrackingFilters)
        ? data
        : computeTrackingMetrics(
            applyTrackingFilters(data.allSubmissions, deferredFilters),
            targets,
            data.allSubmissions
          );

    if (
      exports &&
      trackingFiltersEqual(deferredFilters, defaultTrackingFilters)
    ) {
      metrics = mergeTrackingExportLists(metrics, exports);
    }

    return metrics;
  }, [data, deferredFilters, targets, exports]);

  const showLoading = isLoading || (isFetching && !display);
  const filtering = !trackingFiltersEqual(filters, deferredFilters);

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">Failed to load tracking data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure Tracking_Survey_Baseline.csv and Tracking_Survey_NewSample.csv
            exist in the Surveys folder.
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
          Tracking Survey - Rollout Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PROTOCOL.GIRLS_TO_TRACK.toLocaleString()} girls assigned (
          {PROTOCOL.BASELINE_GIRLS_TO_TRACK.toLocaleString()} baseline group +{" "}
          {PROTOCOL.NEW_SAMPLE_GIRLS_TO_TRACK.toLocaleString()} new sample group) ·
          Success target: {PROTOCOL.SUCCESSFUL_TRACKING_TARGET.toLocaleString()}{" "}
          successfully tracked
        </p>
      </motion.div>

      <TrackingFiltersPanel
        filterOptions={data?.filterOptions}
        filters={filters}
        onChange={setFilters}
        showTodayToggle
      />

      <TrackingActiveFilters
        filters={filters}
        onChange={setFilters}
        filterOptions={data?.filterOptions}
      />

      <TrackingKpis metrics={display} loading={showLoading} />

      <TrackingCohortOverview metrics={display} loading={showLoading} />

      {(activeCohort === "all" || activeCohort === "baseline") && (
        <TrackingCohortSection
          metrics={display}
          loading={showLoading}
          cohort="baseline"
        />
      )}

      {(activeCohort === "all" || activeCohort === "new-sample") && (
        <TrackingCohortSection
          metrics={display}
          loading={showLoading}
          cohort="new-sample"
        />
      )}

      <TrackingSecondaryKpis metrics={display} loading={showLoading} />

      <TrackingRevisitSection metrics={display} loading={showLoading} />

      <TrackingDuplicateSection metrics={display} loading={showLoading} />

      {display && !showLoading && (
        <p className="mb-4 text-xs text-muted-foreground">
          {display.untrackedInData} girls in export not yet successfully tracked ·{" "}
          {display.secondaryKpis.locatedGirls} households located ·{" "}
          {display.successTarget.toLocaleString()} success target ·{" "}
          {Math.round(display.secondaryKpis.avgSubmissionsPerEnumerator)} avg
          submissions per enumerator
        </p>
      )}

      <TrackingCharts
        metrics={display}
        loading={showLoading}
        filters={filters}
        onFilterChange={setFilters}
      />
    </div>
  );
}
