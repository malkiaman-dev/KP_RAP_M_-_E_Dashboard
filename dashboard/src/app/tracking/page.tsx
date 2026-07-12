"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { School, Target, Users } from "lucide-react";
import { TrackingFiltersPanel } from "@/components/tracking/tracking-filters";
import { TrackingActiveFilters } from "@/components/tracking/tracking-active-filters";
import { TrackingKpis } from "@/components/tracking/tracking-kpis";
import { TrackingSecondaryKpis } from "@/components/tracking/tracking-secondary-kpis";
import { TrackingRevisitSection } from "@/components/tracking/tracking-revisit-section";
import { TrackingDuplicateSection } from "@/components/tracking/tracking-duplicate-section";
import { TrackingTargetGapsSection } from "@/components/tracking/tracking-target-gaps-section";
import { TrackingCharts } from "@/components/tracking/tracking-charts";
import { TrackingCohortOverview } from "@/components/tracking/tracking-cohort-overview";
import { TrackingCohortSection } from "@/components/tracking/tracking-cohort-section";
import { PageHero, SectionHeader } from "@/components/ui/page-hero";
import { useFieldPeriod } from "@/components/filters/field-period-provider";
import {
  PROTOCOL,
  resolveTrackingTargets,
} from "@/lib/data/protocol";
import {
  applyTrackingFilters,
  computeTrackingMetrics,
  createDefaultTrackingFilters,
  resolveActiveCohort,
  trackingFiltersEqual,
  type TrackingFilters,
  type TrackingMetrics,
  type TrackingTargets,
} from "@/lib/data/tracking-metrics";
import { FIELD_PERIOD_START } from "@/lib/data/field-period";
import {
  fetchTrackingMetrics,
  QUERY_STALE_MS,
  TRACKING_METRICS_QUERY_KEY,
} from "@/lib/queries/app-data";

function targetsForFilters(filters: TrackingFilters): TrackingTargets {
  return resolveTrackingTargets({
    district: filters.district,
    cohort: resolveActiveCohort(filters),
  });
}

export default function TrackingPage() {
  const { dateFrom: fieldDateFrom } = useFieldPeriod();
  const [filters, setFilters] = useState<TrackingFilters>(() =>
    createDefaultTrackingFilters(fieldDateFrom)
  );
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, dateFrom: fieldDateFrom }));
  }, [fieldDateFrom]);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [...TRACKING_METRICS_QUERY_KEY],
    queryFn: fetchTrackingMetrics,
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

    // Server metrics are pre-scoped to the field-period start date.
    if (
      trackingFiltersEqual(
        deferredFilters,
        createDefaultTrackingFilters(FIELD_PERIOD_START)
      )
    ) {
      return data;
    }

    const emptyDefaults = createDefaultTrackingFilters("");
    if (
      !deferredFilters.dateFrom &&
      trackingFiltersEqual(deferredFilters, emptyDefaults)
    ) {
      return computeTrackingMetrics(
        data.allSubmissions,
        targets,
        data.allSubmissions,
        { includeExportLists: false }
      );
    }

    // Skip Excel row arrays while filtering — keeps the browser responsive.
    return computeTrackingMetrics(
      applyTrackingFilters(data.allSubmissions, deferredFilters),
      targets,
      data.allSubmissions,
      { includeExportLists: false }
    );
  }, [data, deferredFilters, targets]);

  /** Build full export lists on demand (download click) for the active filters. */
  const buildExportMetrics = (): TrackingMetrics | undefined => {
    if (!data?.allSubmissions) return undefined;
    return computeTrackingMetrics(
      applyTrackingFilters(data.allSubmissions, filters),
      targetsForFilters(filters),
      data.allSubmissions,
      { includeExportLists: true }
    );
  };

  const onFiltersChange = (next: TrackingFilters) => {
    // Update filter state immediately so the date picker / chips stay in sync.
    // Heavy metric recompute is already deferred via useDeferredValue(filters).
    setFilters(next);
  };

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
      <PageHero
        eyebrow="Tracking operations live"
        title="Tracking Survey"
        accent="Rollout"
        description={`${PROTOCOL.GIRLS_TO_TRACK.toLocaleString()} girls assigned (${PROTOCOL.BASELINE_GIRLS_TO_TRACK.toLocaleString()} baseline + ${PROTOCOL.NEW_SAMPLE_GIRLS_TO_TRACK.toLocaleString()} new sample). Success target ${PROTOCOL.SUCCESSFUL_TRACKING_TARGET.toLocaleString()} successfully tracked. Click charts and filters to drill into the field picture.`}
        loading={showLoading}
        links={[
          { href: "/analytics", label: "Analytics" },
          { href: "/monitoring", label: "Monitoring" },
          { href: "/reports", label: "Reports" },
        ]}
        stats={[
          {
            label: "Tracked",
            value: display?.totalTrackedGirls ?? 0,
            icon: Target,
            colorClass: "text-teal",
          },
          {
            label: "Success rate",
            value: display?.successRate ?? 0,
            icon: Target,
            colorClass: "text-teal",
            decimals: 1,
            suffix: "%",
          },
          {
            label: "Enumerators",
            value: display?.totalEnumerators ?? 0,
            icon: Users,
            colorClass: "text-deep-teal",
          },
          {
            label: "Schools",
            value: display?.totalSchools ?? 0,
            icon: School,
            colorClass: "text-amber-600 dark:text-gold",
          },
        ]}
      />

      <TrackingFiltersPanel
        filterOptions={data?.filterOptions}
        filters={filters}
        onChange={onFiltersChange}
        showTodayToggle
        resetFilters={() => createDefaultTrackingFilters(fieldDateFrom)}
      />

      <TrackingActiveFilters
        filters={filters}
        onChange={onFiltersChange}
        filterOptions={data?.filterOptions}
        resetFilters={() => createDefaultTrackingFilters(fieldDateFrom)}
      />

      <SectionHeader
        title="Protocol KPIs"
        subtitle="Assignment pool, tracked girls, and progress to the success target."
      />
      <TrackingKpis metrics={display} loading={showLoading} />

      <SectionHeader
        title="Cohort command"
        subtitle="Baseline and new-sample rollout side by side."
        className="mt-8"
      />
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

      <SectionHeader
        title="Outstanding for districts"
        subtitle="Target lists vs tracked girls — not attempted and revisit needed, ready to share by district."
        className="mt-8"
      />
      <TrackingTargetGapsSection
        districtFilter={deferredFilters.district}
        cohortFilter={activeCohort}
      />

      <SectionHeader
        title="Field quality & exports"
        subtitle="Operational flags, revisits, and duplicate controls."
        className="mt-8"
      />
      <TrackingSecondaryKpis
        metrics={display}
        loading={showLoading}
        buildExportMetrics={buildExportMetrics}
      />

      <TrackingRevisitSection
        metrics={display}
        loading={showLoading}
        buildExportMetrics={buildExportMetrics}
      />

      <TrackingDuplicateSection
        metrics={display}
        loading={showLoading}
        buildExportMetrics={buildExportMetrics}
      />

      <SectionHeader
        title="Interactive intelligence"
        subtitle="Click charts to cross-filter the tracking picture."
        className="mt-8"
      />
      <TrackingCharts
        metrics={display}
        loading={showLoading}
        filters={filters}
        onFilterChange={onFiltersChange}
      />
    </div>
  );
}
