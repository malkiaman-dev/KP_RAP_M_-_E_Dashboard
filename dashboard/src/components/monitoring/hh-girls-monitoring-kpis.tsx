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
import type { HhGirlsMonitoringMetrics } from "@/lib/data/hh-girls-monitoring";

type Card = {
  label: string;
  value: number;
  hint: string;
  icon: typeof ClipboardList;
  color: string;
  suffix?: string;
  decimals?: number;
};

export function HhGirlsMonitoringKpis({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMonitoringMetrics;
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
      hint: `Forms (M ${metrics.motherForms} · F ${metrics.fatherForms} · G ${metrics.girlsForms}) · target ${metrics.dailyFormsTarget}/day`,
      icon: ClipboardList,
      color: "text-foreground",
    },
    {
      label: "Girls Attempted",
      value: metrics.uniqueGirls,
      hint: "Unique girls with any HH/Girls form",
      icon: Users,
      color: "text-sky-500",
    },
    {
      label: "Completed Households",
      value: metrics.totalCompleted,
      hint: "Unique girls with completed HH (protocol)",
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
      label: "Avg Completed / Enum / Day",
      value: metrics.avgCompletedPerEnumeratorPerDay,
      hint: `Target ${metrics.dailyHhTarget} HH/day`,
      icon: Gauge,
      color:
        metrics.avgCompletedPerEnumeratorPerDay >= metrics.dailyHhTarget
          ? "text-teal"
          : "text-red-600",
    },
    {
      label: "HH Target Achievement %",
      value: metrics.targetAchievement,
      hint: `${metrics.totalCompleted.toLocaleString()} of ${metrics.expectedCompleted.toLocaleString()} expected HH`,
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
      hint: `${metrics.enumeratorDaysMeetingTarget} of ${metrics.enumeratorDays} enum-days (≥${metrics.dailyHhTarget} HH)`,
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
