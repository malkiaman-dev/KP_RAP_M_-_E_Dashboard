"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Home, UserCheck } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import { PROTOCOL } from "@/lib/data/protocol";
import {
  fetchDashboardMetrics,
  QUERY_STALE_MS,
  DASHBOARD_METRICS_QUERY_KEY,
} from "@/lib/queries/app-data";

function KpiCard({
  label,
  value,
  loading,
  suffix = "",
  decimals = 0,
  accent,
}: {
  label: string;
  value?: number;
  loading?: boolean;
  suffix?: string;
  decimals?: number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? ""}`}>
        {loading ? (
          "-"
        ) : (
          <AnimatedCounter
            value={value ?? 0}
            suffix={suffix}
            decimals={decimals}
          />
        )}
      </p>
    </div>
  );
}

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
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-8"
    >
      <div className="mb-4 flex items-start gap-3">
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
  const { data, isLoading, isError } = useQuery({
    queryKey: [...DASHBOARD_METRICS_QUERY_KEY],
    queryFn: fetchDashboardMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const hh = data?.household;
  const gs = data?.girls;
  const childConsentRate = gs?.total ? (gs.complete / gs.total) * 100 : 0;
  const hhTargetRate = hh?.uniqueGirls
    ? (hh.bothParent / PROTOCOL.HH_SURVEY_TARGET) * 100
    : 0;

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
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
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

      <SurveySection
        icon={Home}
        eyebrow="Household survey"
        title="Father and mother interviews"
        description="Two forms per tracked girl expected — mother (required) and father"
        delay={0.05}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Submissions" value={hh?.total} loading={isLoading} />
          <KpiCard label="Unique Girls" value={hh?.uniqueGirls} loading={isLoading} />
          <KpiCard label="Mother Forms" value={hh?.motherForms} loading={isLoading} />
          <KpiCard label="Father Forms" value={hh?.fatherForms} loading={isLoading} />
          <KpiCard
            label="Both Parents"
            value={hh?.bothParent}
            loading={isLoading}
            accent="text-teal"
          />
          <KpiCard
            label="Completion Rate"
            value={hh?.completionRate}
            loading={isLoading}
            suffix="%"
            decimals={1}
          />
          <KpiCard
            label="Progress to Target"
            value={hhTargetRate}
            loading={isLoading}
            suffix="%"
            decimals={1}
            accent="text-gold"
          />
          <KpiCard
            label="Target N"
            value={PROTOCOL.HH_SURVEY_TARGET}
            loading={isLoading}
          />
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
        title="Direct girl interview"
        description="Parental consent, child consent, and learning assessment"
        delay={0.1}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Total Submissions" value={gs?.total} loading={isLoading} />
          <KpiCard
            label="Completed"
            value={gs?.complete}
            loading={isLoading}
            accent="text-teal"
          />
          <KpiCard label="Revisits" value={gs?.revisits} loading={isLoading} />
        </div>

        <div className="mt-4 rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Child Consent Rate</p>
              <p className="text-xs text-muted-foreground">Target: 90%</p>
            </div>
            <span className="text-3xl font-bold text-teal">
              {isLoading ? (
                "-"
              ) : (
                <AnimatedCounter
                  value={childConsentRate}
                  suffix="%"
                  decimals={1}
                />
              )}
            </span>
          </div>
          <div className="relative mt-4 h-4 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${childConsentRate}%` }}
              className="h-full rounded-full bg-gradient-to-r from-teal to-gold"
            />
            <div className="absolute left-[90%] top-0 h-full w-0.5 bg-foreground/30" />
          </div>
        </div>
      </SurveySection>
    </div>
  );
}
