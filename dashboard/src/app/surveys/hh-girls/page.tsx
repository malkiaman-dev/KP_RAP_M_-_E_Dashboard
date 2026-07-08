"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Home, UserCheck } from "lucide-react";
import { HhGirlsFiltersPanel } from "@/components/hh-girls/hh-girls-filters";
import { HhGirlsActiveFilters } from "@/components/hh-girls/hh-girls-active-filters";
import {
  HhGirlsGirlsKpis,
  HhGirlsHouseholdKpis,
} from "@/components/hh-girls/hh-girls-kpis";
import { HhGirlsRolloutOverview } from "@/components/hh-girls/hh-girls-rollout-overview";
import { HhGirlsSecondaryKpis } from "@/components/hh-girls/hh-girls-secondary-kpis";
import {
  HhGirlsGirlsCharts,
  HhGirlsHouseholdCharts,
} from "@/components/hh-girls/hh-girls-charts";
import {
  applyHhGirlsFilters,
  computeHhGirlsMetrics,
  defaultHhGirlsFilters,
  hhGirlsFiltersEqual,
  type HhGirlsFilters,
} from "@/lib/data/hh-girls-metrics";
import { PROTOCOL } from "@/lib/data/protocol";
import {
  fetchHhGirlsMetrics,
  HH_GIRLS_METRICS_QUERY_KEY,
  QUERY_STALE_MS,
} from "@/lib/queries/app-data";

function SurveySection({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  delay = 0,
}: {
  icon: typeof Home;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-10"
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10">
          <Icon className="h-5 w-5 text-teal" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-teal">
            {eyebrow}
          </p>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

export default function HhGirlsSurveyPage() {
  const [filters, setFilters] = useState<HhGirlsFilters>(defaultHhGirlsFilters);
  const deferredFilters = useDeferredValue(filters);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [...HH_GIRLS_METRICS_QUERY_KEY],
    queryFn: fetchHhGirlsMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const display = useMemo(() => {
    if (!data?.allHousehold) return undefined;

    if (hhGirlsFiltersEqual(deferredFilters, defaultHhGirlsFilters)) {
      return data;
    }

    const household = applyHhGirlsFilters(data.allHousehold, deferredFilters);
    const girls = applyHhGirlsFilters(data.allGirls, deferredFilters);
    return computeHhGirlsMetrics(household, girls);
  }, [data, deferredFilters]);

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
          {PROTOCOL.HH_SURVEY_TARGET.toLocaleString()} fully completed households
          target · Parent interviews and direct girl survey with learning
          assessment
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

      <HhGirlsHouseholdKpis metrics={display} loading={showLoading} />

      <HhGirlsSecondaryKpis metrics={display} loading={showLoading} />

      <SurveySection
        icon={Home}
        eyebrow="Household survey"
        title="Father and Mother Surveys of Tracked Girls"
        description="Two forms per tracked girl expected — mother (required) and father"
        delay={0.05}
      >
        <div className="mt-6">
          <HhGirlsHouseholdCharts metrics={display} loading={showLoading} />
        </div>
        <div className="mt-4 rounded-2xl border border-gold/20 bg-gold/5 p-5">
          <p className="text-sm font-medium text-foreground">
            Duplicate Detection Rule
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Same girl with mother (respondent=2) and father (respondent=1) forms
            is expected — not flagged as duplicate. Only same girl + same
            respondent + same attempt is flagged.
          </p>
        </div>
      </SurveySection>

      <SurveySection
        icon={UserCheck}
        eyebrow="Girls survey"
        title="Direct Girl Interview with Learning Assessment"
        description="Parental consent, child consent, and education status"
        delay={0.1}
      >
        <HhGirlsGirlsKpis metrics={display} loading={showLoading} />
        <div className="mt-6">
          <HhGirlsGirlsCharts metrics={display} loading={showLoading} />
        </div>
      </SurveySection>
    </div>
  );
}
