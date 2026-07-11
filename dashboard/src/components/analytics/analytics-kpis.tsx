"use client";

import { Activity, Home, Target, Timer } from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type { PaceInsight, ProtocolProgress } from "@/lib/data/analytics-insights";

interface AnalyticsKpisProps {
  progress?: ProtocolProgress;
  trackingPace?: PaceInsight;
  hhPace?: PaceInsight;
  loading?: boolean;
}

export function AnalyticsKpis({
  progress,
  trackingPace,
  hhPace,
  loading,
}: AnalyticsKpisProps) {
  if (loading || !progress || !trackingPace || !hhPace) {
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
        trackingPace.daysToTarget == null
          ? "Insufficient recent pace"
          : trackingPace.daysToTarget === 0
            ? "Target reached"
            : `~${trackingPace.daysToTarget} days at current pace`,
    },
    {
      label: "7-Day Pace",
      value: trackingPace.dailyRate,
      decimals: 1,
      icon: Activity,
      color: trackingPace.onTrack
        ? "text-teal"
        : "text-amber-600 dark:text-gold",
      hint: `+${trackingPace.recentGain.toLocaleString()} girls in ${trackingPace.windowDays} days`,
    },
    {
      label: "HH Completed vs Target",
      value: progress.hhPct,
      suffix: "%",
      decimals: 1,
      icon: Home,
      color: "text-deep-teal",
      hint: `${progress.hhCompleted.toLocaleString()} of ${progress.hhTarget.toLocaleString()}`,
    },
    {
      label: "HH Remaining to Target",
      value: progress.hhRemaining,
      icon: Timer,
      color: "text-amber-600 dark:text-gold",
      hint:
        hhPace.daysToTarget == null
          ? "Insufficient recent pace"
          : hhPace.daysToTarget === 0
            ? "Target reached"
            : `~${hhPace.daysToTarget} days at current pace`,
    },
    {
      label: "HH 7-Day Pace",
      value: hhPace.dailyRate,
      decimals: 1,
      icon: Activity,
      color: hhPace.onTrack
        ? "text-deep-teal"
        : "text-amber-600 dark:text-gold",
      hint: `+${hhPace.recentGain.toLocaleString()} households in ${hhPace.windowDays} days`,
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
