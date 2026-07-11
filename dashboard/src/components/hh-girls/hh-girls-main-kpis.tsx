"use client";

import {
  FileStack,
  MapPin,
  Users,
  Target,
  Home,
  Flag,
  Percent,
  UserCheck,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";

const kpiConfig: {
  key: keyof HhGirlsMetrics["core"];
  label: string;
  colorClass: string;
  icon: typeof FileStack;
  suffix?: string;
  decimals?: number;
}[] = [
  {
    key: "totalSubmissions",
    label: "Total Submissions",
    colorClass: "text-foreground",
    icon: FileStack,
  },
  {
    key: "totalVillages",
    label: "Total Villages",
    colorClass: "text-pink-500",
    icon: MapPin,
  },
  {
    key: "totalEnumerators",
    label: "Total Enumerators",
    colorClass: "text-sky-500",
    icon: Users,
  },
  {
    key: "uniqueGirls",
    label: "Unique Submissions",
    colorClass: "text-blue-500",
    icon: UserCheck,
  },
  {
    key: "hhTarget",
    label: "HH Target",
    colorClass: "text-slate-700 dark:text-slate-200",
    icon: Target,
  },
  {
    key: "completedHouseholds",
    label: "Completed Households",
    colorClass: "text-teal",
    icon: Home,
  },
  {
    key: "remainingToTarget",
    label: "Remaining to Target",
    colorClass: "text-red-600",
    icon: Flag,
  },
  {
    key: "progressToTarget",
    label: "Progress to Target %",
    colorClass: "text-teal",
    icon: Percent,
    suffix: "%",
    decimals: 1,
  },
];

export function HhGirlsMainKpis({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
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

  const c = metrics.core;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
      {kpiConfig.map((kpi, i) => {
        const raw = c[kpi.key];
        const value = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;

        return (
          <StatCard
            key={kpi.key}
            index={i}
            label={kpi.label}
            value={value}
            icon={kpi.icon}
            color={kpi.colorClass}
            suffix={kpi.suffix}
            decimals={kpi.decimals}
          />
        );
      })}
    </div>
  );
}
