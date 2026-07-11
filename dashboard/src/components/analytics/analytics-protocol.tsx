"use client";

import { motion } from "framer-motion";
import { Layers, Target, TrendingUp, Users } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";
import type { ProtocolProgress } from "@/lib/data/analytics-insights";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";

function ProgressBar({
  value,
  max,
  barClass,
}: {
  value: number;
  max: number;
  barClass: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted/60">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={cn("h-full rounded-full", barClass)}
      />
    </div>
  );
}

function ProtocolCard({
  title,
  subtitle,
  value,
  target,
  remaining,
  accentClass,
  barClass,
  index,
}: {
  title: string;
  subtitle: string;
  value: number;
  target: number;
  remaining: number;
  accentClass: string;
  barClass: string;
  index: number;
}) {
  const pct = target > 0 ? (value / target) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className={cn("text-sm font-semibold", accentClass)}>{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className={cn("text-lg font-bold tabular-nums", accentClass)}>
            <AnimatedCounter value={remaining} />
          </p>
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Progress</span>
          <span>
            {value.toLocaleString()} / {target.toLocaleString()} (
            {pct.toFixed(1)}%)
          </span>
        </div>
        <ProgressBar value={value} max={target} barClass={barClass} />
      </div>
    </motion.div>
  );
}

function CohortMini({
  label,
  tracked,
  target,
  remaining,
  successRate,
  submissions,
  attempted,
  accentClass,
  barClass,
  index,
}: {
  label: string;
  tracked: number;
  target: number;
  remaining: number;
  successRate: number;
  submissions: number;
  attempted: number;
  accentClass: string;
  barClass: string;
  index: number;
}) {
  const stats = [
    { label: "Submissions", value: submissions, icon: Layers },
    { label: "Attempted", value: attempted, icon: Users },
    { label: "Tracked", value: tracked, icon: Target },
    {
      label: "Success",
      value: successRate,
      icon: TrendingUp,
      suffix: "%",
      decimals: 1,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.06 }}
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className={cn("text-sm font-semibold", accentClass)}>{label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {target.toLocaleString()} success target
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className={cn("text-lg font-bold tabular-nums", accentClass)}>
            <AnimatedCounter value={remaining} />
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Success progress</span>
          <span>
            {tracked.toLocaleString()} / {target.toLocaleString()}
          </span>
        </div>
        <ProgressBar value={tracked} max={target} barClass={barClass} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2"
          >
            <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
              <stat.icon className="h-3 w-3" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-wide">
                {stat.label}
              </span>
            </div>
            <p className={cn("text-sm font-bold tabular-nums", accentClass)}>
              <AnimatedCounter
                value={stat.value}
                suffix={stat.suffix}
                decimals={stat.decimals}
              />
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

interface AnalyticsProtocolProps {
  progress?: ProtocolProgress;
  tracking?: TrackingMetrics;
  loading?: boolean;
}

export function AnalyticsProtocol({
  progress,
  tracking,
  loading,
}: AnalyticsProtocolProps) {
  if (loading || !progress || !tracking) {
    return (
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Protocol Progress
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Field targets across tracking and household modules
        </p>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ProtocolCard
          title="Tracking Success"
          subtitle={`${progress.trackingTarget.toLocaleString()} girls successfully tracked`}
          value={progress.trackingTracked}
          target={progress.trackingTarget}
          remaining={progress.trackingRemaining}
          accentClass="text-teal"
          barClass="bg-teal"
          index={0}
        />
        <ProtocolCard
          title="Household Completion"
          subtitle={`${progress.hhTarget.toLocaleString()} both-parent households`}
          value={progress.hhCompleted}
          target={progress.hhTarget}
          remaining={progress.hhRemaining}
          accentClass="text-deep-teal"
          barClass="bg-deep-teal"
          index={1}
        />
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Cohort Comparison
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Baseline vs new sample progress toward success targets
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CohortMini
          label={tracking.cohorts.baseline.label}
          tracked={tracking.cohorts.baseline.totalTrackedGirls}
          target={tracking.cohorts.baseline.successTarget}
          remaining={tracking.cohorts.baseline.remainingToSuccessTarget}
          successRate={tracking.cohorts.baseline.successRate}
          submissions={tracking.cohorts.baseline.totalSubmissions}
          attempted={tracking.cohorts.baseline.uniqueGirlsAttempted}
          accentClass="text-teal"
          barClass="bg-teal"
          index={0}
        />
        <CohortMini
          label={tracking.cohorts.newSample.label}
          tracked={tracking.cohorts.newSample.totalTrackedGirls}
          target={tracking.cohorts.newSample.successTarget}
          remaining={tracking.cohorts.newSample.remainingToSuccessTarget}
          successRate={tracking.cohorts.newSample.successRate}
          submissions={tracking.cohorts.newSample.totalSubmissions}
          attempted={tracking.cohorts.newSample.uniqueGirlsAttempted}
          accentClass="text-deep-teal"
          barClass="bg-deep-teal"
          index={1}
        />
      </div>
    </section>
  );
}
