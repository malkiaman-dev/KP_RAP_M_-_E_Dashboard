"use client";

import { useQuery } from "@tanstack/react-query";
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
import type {
  TrackingCohort,
  TrackingMetrics,
} from "@/lib/data/tracking-metrics";
import { assignmentFrameCounts } from "@/lib/data/tracking-target-gap-filters";
import {
  fetchTrackingGaps,
  QUERY_STALE_MS,
  TRACKING_GAPS_QUERY_KEY,
} from "@/lib/queries/app-data";

type FrameCounts = NonNullable<ReturnType<typeof assignmentFrameCounts>>;

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
  /**
   * When set, the card value comes from the assignment frame so
   * Pool = Tracked + Remaining always holds.
   */
  frameValue?: (frame: FrameCounts) => number;
  hint?: (m: TrackingMetrics, frame: FrameCounts | null) => string;
}[] = [
  {
    key: "totalSubmissions",
    label: "Total Submissions",
    colorClass: "text-foreground",
    icon: FileStack,
    hint: (m) => `${m.totalTrackedGirls.toLocaleString()} successfully tracked`,
  },
  {
    key: "totalSchools",
    label: "Total Schools",
    colorClass: "text-gold",
    icon: School,
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
    key: "assignmentPool",
    label: "Assignment Pool",
    colorClass: "text-slate-700 dark:text-slate-200",
    icon: Target,
    frameValue: (frame) => frame.targetTotal,
    hint: (_m, frame) =>
      frame
        ? `${frame.targetTotal.toLocaleString()} girls in active target pool`
        : "Loading assignment frame…",
  },
  {
    key: "totalTrackedGirls",
    label: "Successfully Tracked",
    colorClass: "text-teal",
    icon: CheckCircle2,
    frameValue: (frame) => frame.tracked,
    hint: (_m, frame) =>
      frame
        ? `Of ${frame.targetTotal.toLocaleString()} assignment-frame girls`
        : "Loading assignment frame…",
  },
  {
    key: "remainingToSuccessTarget",
    label: "Remaining to Target",
    colorClass: "text-red-600",
    icon: Flag,
    frameValue: (frame) =>
      frame.notAttempted + frame.attemptedNotTracked + frame.needsRevisit,
    hint: (_m, frame) => {
      if (!frame) return "Loading assignment-frame details…";
      const lines = [
        `Not tracked ${frame.attemptedNotTracked.toLocaleString()}`,
        `Not attempted ${frame.notAttempted.toLocaleString()}`,
      ];
      if (frame.needsRevisit > 0) {
        lines.push(`Needs revisit ${frame.needsRevisit.toLocaleString()}`);
      }
      return lines.join("\n");
    },
  },
  {
    key: "successRate",
    label: "Success Rate %",
    colorClass: "text-teal",
    icon: Percent,
    suffix: "%",
    decimals: 1,
    frameValue: (frame) =>
      frame.targetTotal > 0 ? (frame.tracked / frame.targetTotal) * 100 : 0,
    hint: (_m, frame) =>
      frame
        ? `${frame.tracked.toLocaleString()} / ${frame.targetTotal.toLocaleString()}`
        : "Loading…",
  },
];

export function TrackingKpis({
  metrics,
  loading,
  districtFilter = "all",
  cohortFilter = "all",
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
  districtFilter?: string;
  cohortFilter?: "all" | TrackingCohort;
}) {
  const { data: gaps } = useQuery({
    queryKey: [...TRACKING_GAPS_QUERY_KEY],
    queryFn: fetchTrackingGaps,
    staleTime: QUERY_STALE_MS,
  });

  const frame = assignmentFrameCounts(gaps, {
    district: districtFilter,
    cohort: cohortFilter,
  });

  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCardSkeleton count={8} />
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
      {kpiConfig.map((kpi, i) => {
        const value =
          kpi.frameValue && frame
            ? kpi.frameValue(frame)
            : (metrics[kpi.key] as number);

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
            hint={kpi.hint?.(metrics, frame)}
          />
        );
      })}
    </div>
  );
}
