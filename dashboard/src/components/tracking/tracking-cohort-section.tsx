"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  FileText,
  MapPin,
  Target,
  Users,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type {
  CohortMetrics,
  TrackingCohort,
  TrackingMetrics,
} from "@/lib/data/tracking-metrics";
import { PROTOCOL } from "@/lib/data/protocol";

function StatTile({
  label,
  value,
  icon: Icon,
  suffix = "",
  decimals = 0,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <div className="rounded-xl border border-teal/15 bg-teal/5 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3 text-teal" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-teal">
        <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
      </p>
    </div>
  );
}

const COHORT_COPY: Record<
  TrackingCohort,
  {
    eyebrow: string;
    title: string;
    assignmentPool: number;
    poolLabel: string;
  }
> = {
  baseline: {
    eyebrow: "Baseline tracking",
    title: "Baseline listed girls · Tracking_Survey_Baseline",
    assignmentPool: PROTOCOL.BASELINE_GIRLS_TO_TRACK,
    poolLabel: "baseline",
  },
  "new-sample": {
    eyebrow: "New sample tracking",
    title: "New sample listed girls · Tracking_Survey_NewSample",
    assignmentPool: PROTOCOL.NEW_SAMPLE_GIRLS_TO_TRACK,
    poolLabel: "new sample",
  },
};

export function TrackingCohortSection({
  metrics,
  loading,
  cohort,
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
  cohort: TrackingCohort;
}) {
  if (loading) {
    return <div className="mb-6 h-64 animate-pulse rounded-2xl bg-muted/50" />;
  }

  const cohortData: CohortMetrics | undefined =
    cohort === "baseline"
      ? metrics?.cohorts?.baseline
      : metrics?.cohorts?.newSample;

  if (!cohortData) return null;

  const copy = COHORT_COPY[cohort];

  const cohortDistricts = cohortData.districtBreakdown;

  const successPct =
    cohortData.successTarget > 0
      ? Math.min(
          100,
          (cohortData.totalTrackedGirls / cohortData.successTarget) * 100
        )
      : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 overflow-hidden rounded-2xl border border-teal/20 bg-gradient-to-br from-teal/5 via-card to-card shadow-sm"
    >
      <div className="border-b border-teal/15 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal">
              {copy.eyebrow}
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {copy.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {copy.assignmentPool.toLocaleString()} girls in the {copy.poolLabel}{" "}
              assignment pool, contributing toward the overall{" "}
              {PROTOCOL.SUCCESSFUL_TRACKING_TARGET.toLocaleString()} successfully
              tracked target ({cohortData.successTarget.toLocaleString()}{" "}
              {copy.poolLabel} share).
            </p>
          </div>
          <div className="rounded-xl border border-teal/20 bg-card px-4 py-3 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Success rate
            </p>
            <p className="text-2xl font-bold tabular-nums text-teal">
              <AnimatedCounter
                value={cohortData.successRate}
                suffix="%"
                decimals={1}
              />
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Submissions"
              value={cohortData.totalSubmissions}
              icon={FileText}
            />
            <StatTile
              label="Girls Attempted"
              value={cohortData.uniqueGirlsAttempted}
              icon={Users}
            />
            <StatTile
              label="Successfully Tracked"
              value={cohortData.totalTrackedGirls}
              icon={CheckCircle2}
            />
            <StatTile
              label="Remaining to Target"
              value={cohortData.remainingToSuccessTarget}
              icon={Target}
            />
          </div>

          <div className="rounded-xl border border-border/50 bg-card/80 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <BarChart3 className="h-3.5 w-3.5 text-teal" aria-hidden="true" />
                Progress toward {copy.poolLabel} success target
              </span>
              <span className="tabular-nums">
                {cohortData.totalTrackedGirls.toLocaleString()} /{" "}
                {cohortData.successTarget.toLocaleString()}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${successPct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full bg-teal"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {cohortData.untrackedInData.toLocaleString()} girls in export not yet
              successfully tracked ·{" "}
              {cohortData.assignmentCoverage.toFixed(1)}% of{" "}
              {cohortData.assignmentTarget.toLocaleString()} assignment pool
              attempted
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/80 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-teal" aria-hidden="true" />
            By district
          </p>
          <div className="space-y-2">
            {cohortDistricts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No district data</p>
            ) : (
              cohortDistricts.map((d) => (
                <div
                  key={d.district}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{d.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    <span className="font-semibold text-teal">{d.tracked}</span>
                    {" tracked · "}
                    {d.inData} in data
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
