"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrackingFiltersPanel } from "@/components/tracking/tracking-filters";
import { TrackingActiveFilters } from "@/components/tracking/tracking-active-filters";
import { TrackingKpis } from "@/components/tracking/tracking-kpis";
import { TrackingSecondaryKpis } from "@/components/tracking/tracking-secondary-kpis";
import { TrackingRevisitSection } from "@/components/tracking/tracking-revisit-section";
import { TrackingCharts } from "@/components/tracking/tracking-charts";
import { TrackingCohortOverview } from "@/components/tracking/tracking-cohort-overview";
import { TrackingCohortSection } from "@/components/tracking/tracking-cohort-section";
import {
  applyTrackingFilters,
  computeTrackingMetrics,
  defaultTrackingFilters,
  resolveActiveCohort,
  type TrackingFilters,
  type TrackingMetrics,
  type TrackingTargets,
} from "@/lib/data/tracking-metrics";
import {
  DEFAULT_TRACKING_TARGETS,
  PROTOCOL,
  baselineSuccessTarget,
  newSampleSuccessTarget,
} from "@/lib/data/protocol";

async function fetchTracking(): Promise<TrackingMetrics> {
  const res = await fetch("/api/tracking");
  if (!res.ok) throw new Error("Failed to load tracking data");
  return res.json();
}

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tracking-metrics"],
    queryFn: fetchTracking,
  });

  const targets = useMemo(() => targetsForFilters(filters), [filters]);

  const activeCohort = useMemo(
    () => resolveActiveCohort(filters),
    [filters]
  );

  const filtered = useMemo(() => {
    if (!data?.allSubmissions) return undefined;
    const rows = applyTrackingFilters(data.allSubmissions, filters);
    return computeTrackingMetrics(rows, targets, data.allSubmissions);
  }, [data, filters, targets]);

  const display = filtered ?? data;

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
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Tracking Survey — Rollout Overview
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
      />

      <TrackingActiveFilters
        filters={filters}
        onChange={setFilters}
        filterOptions={data?.filterOptions}
      />

      <TrackingKpis metrics={display} loading={isLoading} />

      <TrackingCohortOverview metrics={display} loading={isLoading} />

      {(activeCohort === "all" || activeCohort === "baseline") && (
        <TrackingCohortSection
          metrics={display}
          loading={isLoading}
          cohort="baseline"
        />
      )}

      {(activeCohort === "all" || activeCohort === "new-sample") && (
        <TrackingCohortSection
          metrics={display}
          loading={isLoading}
          cohort="new-sample"
        />
      )}

      <TrackingSecondaryKpis metrics={display} loading={isLoading} />

      <TrackingRevisitSection metrics={display} loading={isLoading} />

      {display && !isLoading && (
        <p className="mb-4 text-xs text-muted-foreground">
          {display.untrackedInData} girls in export not yet successfully tracked ·{" "}
          {display.secondaryKpis.locatedGirls} households located ·{" "}
          {display.successTarget.toLocaleString()} success target ·{" "}
          {display.secondaryKpis.avgSubmissionsPerEnumerator.toFixed(1)} avg
          submissions per enumerator
        </p>
      )}

      <TrackingCharts
        metrics={display}
        loading={isLoading}
        filters={filters}
        onFilterChange={setFilters}
      />
    </div>
  );
}
