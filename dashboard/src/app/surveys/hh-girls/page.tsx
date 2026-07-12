"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Home, Target, Users } from "lucide-react";
import { HhGirlsFiltersPanel } from "@/components/hh-girls/hh-girls-filters";
import { HhGirlsActiveFilters } from "@/components/hh-girls/hh-girls-active-filters";
import { HhGirlsMainKpis } from "@/components/hh-girls/hh-girls-main-kpis";
import { HhGirlsCoreKpis } from "@/components/hh-girls/hh-girls-kpis";
import { HhGirlsRolloutOverview } from "@/components/hh-girls/hh-girls-rollout-overview";
import { HhGirlsCharts } from "@/components/hh-girls/hh-girls-charts";
import { HhGirlsDuplicateSection } from "@/components/hh-girls/hh-girls-duplicate-section";
import { HhGirlsMissingSection } from "@/components/hh-girls/hh-girls-missing-section";
import { HhGirlsRevisitSection } from "@/components/hh-girls/hh-girls-revisit-section";
import { PageHero, SectionHeader } from "@/components/ui/page-hero";
import { useFieldPeriod } from "@/components/filters/field-period-provider";
import { FIELD_PERIOD_START } from "@/lib/data/field-period";
import {
  applyHhGirlsDataFilters,
  computeHhGirlsMetrics,
  createDefaultHhGirlsFilters,
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
  const { dateFrom: fieldDateFrom } = useFieldPeriod();
  const [filters, setFilters] = useState<HhGirlsFilters>(() =>
    createDefaultHhGirlsFilters(fieldDateFrom)
  );
  const deferredFilters = useDeferredValue(filters);
  const [exportsEnabled, setExportsEnabled] = useState(false);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, dateFrom: fieldDateFrom }));
  }, [fieldDateFrom]);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [...HH_GIRLS_METRICS_QUERY_KEY],
    queryFn: fetchHhGirlsMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const { data: exports } = useQuery({
    queryKey: [...HH_GIRLS_EXPORTS_QUERY_KEY],
    queryFn: fetchHhGirlsExports,
    staleTime: QUERY_STALE_MS,
    enabled: exportsEnabled,
  });

  // Defer Excel list payload until after first paint / idle.
  useEffect(() => {
    if (!data || exportsEnabled) return;
    const schedule =
      typeof window.requestIdleCallback === "function"
        ? (cb: () => void) => window.requestIdleCallback(() => cb())
        : (cb: () => void) => window.setTimeout(cb, 1500);
    const id = schedule(() => setExportsEnabled(true));
    return () => {
      if (typeof id === "number") window.clearTimeout(id);
    };
  }, [data, exportsEnabled]);

  const display = useMemo(() => {
    if (!data?.allHousehold) return undefined;

    const fieldPeriodDefaults = createDefaultHhGirlsFilters(FIELD_PERIOD_START);
    const isFieldPeriodDefault = hhGirlsFiltersEqual(
      deferredFilters,
      fieldPeriodDefaults
    );

    let metrics = isFieldPeriodDefault
      ? data
      : (() => {
          const { household, girls } = applyHhGirlsDataFilters(
            data.allHousehold,
            data.allGirls,
            deferredFilters
          );
          return computeHhGirlsMetrics(household, girls);
        })();

    if (exports && isFieldPeriodDefault) {
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
      <PageHero
        eyebrow="HH / Girls operations live"
        title="HH / Girls Survey"
        accent="Rollout"
        description={`${PROTOCOL.HH_SURVEY_TARGET.toLocaleString()} completed households target. Father, mother, and girl surveys combined in one operational view with revisits, missing forms, and quality checks.`}
        loading={showLoading}
        links={[
          { href: "/monitoring", label: "Monitoring" },
          { href: "/reports", label: "Reports" },
          { href: "/analytics", label: "Analytics" },
        ]}
        stats={[
          {
            label: "Completed HH",
            value: display?.core.completedHouseholds ?? 0,
            icon: Home,
            colorClass: "text-deep-teal",
          },
          {
            label: "Progress",
            value: display?.core.progressToTarget ?? 0,
            icon: Target,
            colorClass: "text-deep-teal",
            decimals: 1,
            suffix: "%",
          },
          {
            label: "Girls forms",
            value: display?.girls.totalSubmissions ?? 0,
            icon: ClipboardCheck,
            colorClass: "text-amber-600 dark:text-gold",
          },
          {
            label: "Enumerators",
            value: display?.core.totalEnumerators ?? 0,
            icon: Users,
            colorClass: "text-teal",
          },
        ]}
      />

      <HhGirlsFiltersPanel
        filterOptions={data?.filterOptions}
        filters={filters}
        onChange={setFilters}
        resetFilters={() => createDefaultHhGirlsFilters(fieldDateFrom)}
      />

      <HhGirlsActiveFilters
        filters={filters}
        onChange={setFilters}
        filterOptions={data?.filterOptions}
        resetFilters={() => createDefaultHhGirlsFilters(fieldDateFrom)}
      />

      <SectionHeader
        title="Rollout pulse"
        subtitle="Completed households versus protocol target and form mix."
      />
      <HhGirlsRolloutOverview metrics={display} loading={showLoading} />

      <SectionHeader
        title="Household & girls KPIs"
        subtitle="Completion, parental coverage, and girl survey attainment."
        className="mt-8"
      />
      <HhGirlsMainKpis metrics={display} loading={showLoading} />

      <HhGirlsCoreKpis metrics={display} loading={showLoading} />

      <SectionHeader
        title="Quality controls"
        subtitle="Revisits, missing forms, and duplicate detection."
        className="mt-8"
      />
      <HhGirlsRevisitSection metrics={display} loading={showLoading} />

      <HhGirlsMissingSection metrics={display} loading={showLoading} />

      <HhGirlsDuplicateSection metrics={display} loading={showLoading} />

      <SectionHeader
        title="Interactive intelligence"
        subtitle="District, velocity, and completion mix across HH and girls."
        className="mt-8"
      />
      <HhGirlsCharts metrics={display} loading={showLoading} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 via-card to-card p-5">
          <p className="text-sm font-medium text-foreground">
            Completed household definition
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Girl survey must be complete with girl available and both parental
            and child consents agreed (either consent refused → incomplete).
            Girl unavailable codes 1/4 (school/other) need revisits through
            attempt 3; codes 2/3 (another city/country) → incomplete, no
            revisit. Mother permanently unavailable (3/4/5) → father + girl.
            Father permanently unavailable → mother + girl. Both permanently
            unavailable → caretaker + girl. Parent temporary unavailability
            blocks until required revisits succeed (father: attempt 2;
            mother/caretaker/girl: attempts 2–3).
          </p>
        </div>
        <div className="rounded-2xl border border-teal/20 bg-gradient-to-br from-teal/5 via-card to-card p-5">
          <p className="text-sm font-medium text-foreground">
            Duplicate detection rule
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Same girl with mother (respondent=2) and father (respondent=1)
            forms is expected — not flagged as duplicate. Caretaker is
            respondent=3. Only same girl + same respondent + same attempt is
            flagged.
          </p>
        </div>
      </div>
    </div>
  );
}
