"use client";

import {
  Activity,
  ClipboardCheck,
  Home,
  Target,
  Timer,
  Users,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type { PaceInsight, ProtocolProgress } from "@/lib/data/analytics-insights";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";

interface AnalyticsKpisProps {
  progress?: ProtocolProgress;
  pace?: PaceInsight;
  tracking?: TrackingMetrics;
  loading?: boolean;
}

export function AnalyticsKpis({
  progress,
  pace,
  tracking,
  loading,
}: AnalyticsKpisProps) {
  if (loading || !progress || !pace || !tracking) {
    return (
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCardSkeleton count={6} />
      </div>
    );
  }

  const cards = [
    {
      label: "Tracked vs Target",
      value: progress.trackingPct,
      suffix: "%",
      decimals: 1,
      icon: Target,
      color: "text-teal",
      hint: `${progress.trackingTracked.toLocaleString()} of ${progress.trackingTarget.toLocaleString()}`,
    },
    {
      label: "Remaining to Target",
      value: progress.trackingRemaining,
      icon: Timer,
      color: "text-amber-600 dark:text-gold",
      hint:
        pace.daysToTarget == null
          ? "Insufficient recent pace"
          : pace.daysToTarget === 0
            ? "Target reached"
            : `~${pace.daysToTarget} days at current pace`,
    },
    {
      label: "7-Day Pace",
      value: pace.dailyRate,
      decimals: 1,
      icon: Activity,
      color: pace.onTrack ? "text-teal" : "text-amber-600 dark:text-gold",
      hint: `+${pace.recentGain.toLocaleString()} girls in ${pace.windowDays} days`,
    },
    {
      label: "HH Both Parents",
      value: progress.hhPct,
      suffix: "%",
      decimals: 1,
      icon: Home,
      color: "text-deep-teal",
      hint: `${progress.hhCompleted.toLocaleString()} of ${progress.hhTarget.toLocaleString()} target`,
    },
    {
      label: "Pool Coverage",
      value: progress.coveragePct,
      suffix: "%",
      decimals: 1,
      icon: Users,
      color: "text-deep-teal",
      hint: `${progress.uniqueGirlsInData.toLocaleString()} of ${progress.assignmentPool.toLocaleString()} assigned`,
    },
    {
      label: "Survey Completion",
      value: tracking.secondaryKpis.completionRate,
      suffix: "%",
      decimals: 1,
      icon: ClipboardCheck,
      color: "text-teal",
      hint: `${tracking.totalSubmissions.toLocaleString()} tracking submissions`,
    },
  ];

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          color={card.color}
          hint={card.hint}
          suffix={card.suffix}
          decimals={card.decimals}
          index={index}
        />
      ))}
    </div>
  );
}
