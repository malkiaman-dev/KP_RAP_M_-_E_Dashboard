"use client";

import { motion } from "framer-motion";
import { Layers, Target, TrendingUp, Users } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";
import type { CohortMetrics, TrackingMetrics } from "@/lib/data/tracking-metrics";

function ProgressBar({
  value,
  max,
  colorClass,
}: {
  value: number;
  max: number;
  colorClass: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted/60">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={cn("h-full rounded-full", colorClass)}
      />
    </div>
  );
}

function CohortCard({
  metrics,
  accentClass,
  barClass,
}: {
  metrics: CohortMetrics;
  accentClass: string;
  barClass: string;
}) {
  const stats = [
    {
      label: "Submissions",
      value: metrics.totalSubmissions,
      icon: Layers,
    },
    {
      label: "Girls Attempted",
      value: metrics.uniqueGirlsAttempted,
      icon: Users,
    },
    {
      label: "Successfully Tracked",
      value: metrics.totalTrackedGirls,
      icon: Target,
    },
    {
      label: "Success Rate",
      value: metrics.successRate,
      icon: TrendingUp,
      suffix: "%",
      decimals: 1,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className={cn("text-sm font-semibold", accentClass)}>
            {metrics.label}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {metrics.assignmentTarget.toLocaleString()} assigned ·{" "}
            {metrics.successTarget.toLocaleString()} success target
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className={cn("text-lg font-bold tabular-nums", accentClass)}>
            <AnimatedCounter value={metrics.remainingToSuccessTarget} />
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Success progress</span>
          <span>
            {metrics.totalTrackedGirls.toLocaleString()} /{" "}
            {metrics.successTarget.toLocaleString()}
          </span>
        </div>
        <ProgressBar
          value={metrics.totalTrackedGirls}
          max={metrics.successTarget}
          colorClass={barClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2"
            >
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Icon className="h-3 w-3" aria-hidden="true" />
                {stat.label}
              </div>
              <p className={cn("mt-0.5 text-base font-bold tabular-nums", accentClass)}>
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix || ""}
                  decimals={stat.decimals ?? 0}
                />
              </p>
            </div>
          );
        })}
      </div>

      {metrics.untrackedInData > 0 && (
        <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Attempted but not tracked ({metrics.untrackedInData})
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground">
            {metrics.untrackedBreakdown.girlNotFound > 0 && (
              <span>
                <span className="font-semibold text-red-600">
                  {metrics.untrackedBreakdown.girlNotFound}
                </span>{" "}
                girl not found
              </span>
            )}
            {metrics.untrackedBreakdown.noConsent > 0 && (
              <span>
                <span className="font-semibold text-amber-600">
                  {metrics.untrackedBreakdown.noConsent}
                </span>{" "}
                no consent
              </span>
            )}
            {metrics.untrackedBreakdown.houseUntraceable > 0 && (
              <span>
                <span className="font-semibold text-red-600">
                  {metrics.untrackedBreakdown.houseUntraceable}
                </span>{" "}
                untraceable HH
              </span>
            )}
            {metrics.untrackedBreakdown.houseNotLocated > 0 && (
              <span>
                <span className="font-semibold text-orange-600">
                  {metrics.untrackedBreakdown.houseNotLocated}
                </span>{" "}
                house not located
              </span>
            )}
            {metrics.untrackedBreakdown.incomplete > 0 && (
              <span>
                <span className="font-semibold text-orange-600">
                  {metrics.untrackedBreakdown.incomplete}
                </span>{" "}
                incomplete
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function TrackingCohortOverview({
  metrics,
  loading,
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!metrics?.cohorts) return null;

  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Tracking cohorts
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <CohortCard
          metrics={metrics.cohorts.baseline}
          accentClass="text-teal"
          barClass="bg-teal"
        />
        <CohortCard
          metrics={metrics.cohorts.newSample}
          accentClass="text-gold dark:text-light-gold"
          barClass="bg-gold"
        />
      </div>
    </div>
  );
}
