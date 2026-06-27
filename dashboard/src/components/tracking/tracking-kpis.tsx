"use client";

import {
  FileStack,
  School,
  MapPin,
  Users,
  Target,
  CheckCircle2,
  Flag,
  Percent,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";

const kpiConfig: {
  key: keyof Pick<
    TrackingMetrics,
    | "totalSubmissions"
    | "totalSchools"
    | "totalVillages"
    | "totalEnumerators"
    | "assignmentPool"
    | "totalTrackedGirls"
    | "remainingToSuccessTarget"
    | "successRate"
  >;
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
  { key: "totalSchools", label: "Total Schools", colorClass: "text-gold", icon: School },
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
    key: "assignmentPool",
    label: "Assignment Pool",
    colorClass: "text-slate-700 dark:text-slate-200",
    icon: Target,
  },
  {
    key: "totalTrackedGirls",
    label: "Successfully Tracked",
    colorClass: "text-teal",
    icon: CheckCircle2,
  },
  {
    key: "remainingToSuccessTarget",
    label: "Remaining to Target",
    colorClass: "text-red-600",
    icon: Flag,
  },
  {
    key: "successRate",
    label: "Success Rate %",
    colorClass: "text-teal",
    icon: Percent,
    suffix: "%",
    decimals: 1,
  },
];

export function TrackingKpis({
  metrics,
  loading,
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <StatCardSkeleton count={8} />
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {kpiConfig.map((kpi, i) => (
        <StatCard
          key={kpi.key}
          index={i}
          label={kpi.label}
          value={metrics[kpi.key] as number}
          icon={kpi.icon}
          color={kpi.colorClass}
          suffix={kpi.suffix}
          decimals={kpi.decimals}
        />
      ))}
    </div>
  );
}
