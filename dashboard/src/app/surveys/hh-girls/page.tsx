"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { HhGirlsFiltersPanel } from "@/components/hh-girls/hh-girls-filters";
import { HhGirlsActiveFilters } from "@/components/hh-girls/hh-girls-active-filters";
import { HhGirlsMainKpis } from "@/components/hh-girls/hh-girls-main-kpis";
import { HhGirlsCoreKpis } from "@/components/hh-girls/hh-girls-kpis";
import { HhGirlsRolloutOverview } from "@/components/hh-girls/hh-girls-rollout-overview";
import { HhGirlsCharts } from "@/components/hh-girls/hh-girls-charts";
import { HhGirlsDuplicateSection } from "@/components/hh-girls/hh-girls-duplicate-section";
import { HhGirlsRevisitSection } from "@/components/hh-girls/hh-girls-revisit-section";
import {
  applyHhGirlsDataFilters,
  computeHhGirlsMetrics,
  defaultHhGirlsFilters,
  hhGirlsFiltersEqual,
  type HhGirlsFilters,
} from "@/lib/data/hh-girls-metrics";
import { mergeHhGirlsExportLists } from "@/lib/data/hh-girls-serialization";
import { PROTOCOL } from "@/lib/data/protocol";
import {
  fetchHhGirlsExports,
  fetchHhGirlsMetrics,
  HH_GIRLS_EXPORTS_QUERY_KEY,
  HH_GIRLS_METRICS_QUERY_KEY,
  QUERY_STALE_MS,
} from "@/lib/queries/app-data";

export default function HhGirlsSurveyPage() {
  const [filters, setFilters] = useState<HhGirlsFilters>(defaultHhGirlsFilters);
  const deferredFilters = useDeferredValue(filters);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [...HH_GIRLS_METRICS_QUERY_KEY],
    queryFn: fetchHhGirlsMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const { data: exports } = useQuery({
    queryKey: [...HH_GIRLS_EXPORTS_QUERY_KEY],
    queryFn: fetchHhGirlsExports,
    staleTime: QUERY_STALE_MS,
  });

  const display = useMemo(() => {
    if (!data?.allHousehold) return undefined;

    let metrics =
      hhGirlsFiltersEqual(deferredFilters, defaultHhGirlsFilters)
        ? data
        : (() => {
            const { household, girls } = applyHhGirlsDataFilters(
              data.allHousehold,
              data.allGirls,
              deferredFilters
            );
            return computeHhGirlsMetrics(household, girls);
          })();

    if (
      exports &&
      hhGirlsFiltersEqual(deferredFilters, defaultHhGirlsFilters)
    ) {
      metrics = mergeHhGirlsExportLists(metrics, exports);
    }

    return metrics;
  }, [data, deferredFilters, exports]);

  const showLoading = isLoading || (isFetching && !display);
  const filtering = !hhGirlsFiltersEqual(filters, deferredFilters);

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">
            Failed to load HH/Girls survey data
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure Household_Survey.csv and Girls_Survey.csv exist in the
            Surveys folder.
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
          HH / Girls Survey — Rollout Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PROTOCOL.HH_SURVEY_TARGET.toLocaleString()} completed households
          target · Father, mother, and girl surveys combined in one view
        </p>
      </motion.div>

      <HhGirlsFiltersPanel
        filterOptions={data?.filterOptions}
        filters={filters}
        onChange={setFilters}
      />

      <HhGirlsActiveFilters
        filters={filters}
        onChange={setFilters}
        filterOptions={data?.filterOptions}
      />

      <HhGirlsRolloutOverview metrics={display} loading={showLoading} />

      <HhGirlsMainKpis metrics={display} loading={showLoading} />

      <HhGirlsCoreKpis metrics={display} loading={showLoading} />

      <HhGirlsRevisitSection metrics={display} loading={showLoading} />

      <HhGirlsDuplicateSection metrics={display} loading={showLoading} />

      <HhGirlsCharts metrics={display} loading={showLoading} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5">
          <p className="text-sm font-medium text-foreground">
            Completed household definition
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Girl survey complete with both consents, plus each parent slot
            complete or permanently unavailable (another city/country/deceased).
            Temporary unavailability (e.g. away for work) blocks completion
            until revisits are done or the case is closed.
          </p>
        </div>
        <div className="rounded-2xl border border-teal/20 bg-teal/5 p-5">
          <p className="text-sm font-medium text-foreground">
            Duplicate detection rule
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Same girl with mother (respondent=2) and father (respondent=1)
            forms is expected — not flagged as duplicate. Only same girl + same
            respondent + same attempt is flagged.
          </p>
        </div>
      </div>
    </div>
  );
}
