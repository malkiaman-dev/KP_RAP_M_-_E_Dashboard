"use client";

import {
  AlertTriangle,
  ShieldAlert,
  Flag,
  Percent,
  Users,
  ListChecks,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type { ErrorMetrics } from "@/lib/data/error-metrics";

type Card = {
  label: string;
  value: number;
  hint: string;
  icon: typeof AlertTriangle;
  color: string;
  suffix?: string;
  decimals?: number;
};

export function ErrorKpis({
  metrics,
  loading,
}: {
  metrics?: ErrorMetrics;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCardSkeleton count={7} />
      </div>
    );
  }

  if (!metrics) return null;

  const cards: Card[] = [
    {
      label: "Total Errors",
      value: metrics.totalErrors,
      hint: "All issues detected",
      icon: AlertTriangle,
      color: "text-sky-500",
    },
    {
      label: "Critical Errors",
      value: metrics.criticalErrors,
      hint: "Must-fix data integrity issues",
      icon: ShieldAlert,
      color: "text-red-600",
    },
    {
      label: "Quality Errors",
      value: metrics.flagErrors,
      hint: "Flags for review",
      icon: Flag,
      color: "text-gold",
    },
    {
      label: "Critical Rate %",
      value: metrics.criticalRate,
      hint: "Critical ÷ total errors",
      icon: Percent,
      color: "text-red-600",
      suffix: "%",
      decimals: 1,
    },
    {
      label: "Enumerator Critical",
      value: metrics.enumeratorCriticalErrors,
      hint: "Critical issues by field enumerators",
      icon: ShieldAlert,
      color: "text-red-600",
    },
    {
      label: "Affected Enumerators",
      value: metrics.affectedEnumerators,
      hint: "Distinct enumerators with errors",
      icon: Users,
      color: "text-indigo-500",
    },
    {
      label: "Rule Types",
      value: metrics.ruleTypes,
      hint: "Distinct validation rules triggered",
      icon: ListChecks,
      color: "text-teal",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
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
