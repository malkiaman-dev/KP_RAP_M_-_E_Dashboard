"use client";

import {
  ClipboardList,
  Users,
  CheckCircle2,
  Target,
  CalendarDays,
  Gauge,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type { MonitoringMetrics } from "@/lib/data/tracking-metrics";

type Card = {
  label: string;
  value: number;
  hint: string;
  icon: typeof ClipboardList;
  color: string;
  suffix?: string;
  decimals?: number;
};

export function MonitoringKpis({
  metrics,
  loading,
}: {
  metrics?: MonitoringMetrics;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCardSkeleton count={8} />
      </div>
    );
  }

  if (!metrics) return null;

  const cards: Card[] = [
    {
      label: "Total Submissions",
      value: metrics.totalSubmissions,
      hint: "Tracking forms received",
      icon: ClipboardList,
      color: "text-foreground",
    },
    {
      label: "Girls Attempted",
      value: metrics.uniqueGirls,
      hint: "Unique girls visited",
      icon: Users,
      color: "text-sky-500",
    },
    {
      label: "Successfully Tracked",
      value: metrics.totalTracked,
      hint: "Unique girls tracked",
      icon: CheckCircle2,
      color: "text-teal",
    },
    {
      label: "Active Enumerators",
      value: metrics.activeEnumerators,
      hint: "Submitted in this view",
      icon: UserCheck,
      color: "text-indigo-500",
    },
    {
      label: "Field Days",
      value: metrics.activeFieldDays,
      hint: "Distinct days with activity",
      icon: CalendarDays,
      color: "text-amber-500",
    },
    {
      label: "Avg Tracked / Enum / Day",
      value: metrics.avgTrackedPerEnumeratorPerDay,
      hint: `Target ${metrics.dailyTarget} girls/day`,
      icon: Gauge,
      color:
        metrics.avgTrackedPerEnumeratorPerDay >= metrics.dailyTarget
          ? "text-teal"
          : "text-red-600",
    },
    {
      label: "Target Achievement %",
      value: metrics.targetAchievement,
      hint: `${metrics.totalTracked.toLocaleString()} of ${metrics.expectedTracked.toLocaleString()} expected`,
      icon: Target,
      color:
        metrics.targetAchievement >= 100
          ? "text-teal"
          : metrics.targetAchievement >= 70
            ? "text-amber-500"
            : "text-red-600",
      suffix: "%",
      decimals: 1,
    },
    {
      label: "Days Meeting Target %",
      value: metrics.pctDaysMeetingTarget,
      hint: `${metrics.enumeratorDaysMeetingTarget} of ${metrics.enumeratorDays} enum-days`,
      icon: TrendingUp,
      color:
        metrics.pctDaysMeetingTarget >= 50 ? "text-teal" : "text-red-600",
      suffix: "%",
      decimals: 1,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
      {cards.map((card, i) => (
        <StatCard
          key={card.label}
          index={i}
          label={card.label}
          value={card.value}
          icon={card.icon}
          color={card.color}
          hint={card.hint}
          suffix={card.suffix}
          decimals={card.decimals}
        />
      ))}
    </div>
  );
}
