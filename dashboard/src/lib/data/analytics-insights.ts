import { PROTOCOL } from "@/lib/data/protocol";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";

export interface PaceInsight {
  /** Girls tracked in the trailing window. */
  recentGain: number;
  /** Window length in calendar days used for the rate. */
  windowDays: number;
  /** Average girls tracked per day over the window. */
  dailyRate: number;
  /** Estimated calendar days to hit the success target at the current rate. */
  daysToTarget: number | null;
  /** Whether pace is enough to hit target within a reasonable field season (~90 days). */
  onTrack: boolean;
}

export interface ProtocolProgress {
  trackingTracked: number;
  trackingTarget: number;
  trackingPct: number;
  trackingRemaining: number;
  hhCompleted: number;
  hhTarget: number;
  hhPct: number;
  hhRemaining: number;
  girlsComplete: number;
  girlsTotal: number;
  girlsPct: number;
  coveragePct: number;
  assignmentPool: number;
  uniqueGirlsInData: number;
}

export interface ModuleHealthRow {
  module: string;
  submissions: number;
  rate: number;
  rateLabel: string;
}

/** Derive trailing-window tracking pace from the cumulative tracked trend. */
export function computePaceInsight(
  trackingTrend: { date: string; count: number }[],
  remainingToTarget: number,
  windowDays = 7
): PaceInsight {
  if (trackingTrend.length < 2) {
    return {
      recentGain: 0,
      windowDays,
      dailyRate: 0,
      daysToTarget: remainingToTarget > 0 ? null : 0,
      onTrack: remainingToTarget <= 0,
    };
  }

  const latest = trackingTrend[trackingTrend.length - 1];
  const latestDate = new Date(`${latest.date}T00:00:00`);
  const windowStart = new Date(latestDate);
  windowStart.setDate(windowStart.getDate() - (windowDays - 1));
  const startKey = windowStart.toISOString().slice(0, 10);

  let baseline = trackingTrend[0];
  for (const point of trackingTrend) {
    if (point.date <= startKey) baseline = point;
    else break;
  }

  const recentGain = Math.max(0, latest.count - baseline.count);
  const dailyRate = recentGain / windowDays;
  const daysToTarget =
    remainingToTarget <= 0
      ? 0
      : dailyRate > 0
        ? Math.ceil(remainingToTarget / dailyRate)
        : null;

  return {
    recentGain,
    windowDays,
    dailyRate,
    daysToTarget,
    onTrack:
      remainingToTarget <= 0 ||
      (daysToTarget != null && daysToTarget <= 90),
  };
}

/** Protocol progress across tracking + HH modules. */
export function computeProtocolProgress(
  dashboard: DashboardMetrics,
  tracking: TrackingMetrics
): ProtocolProgress {
  const trackingTracked = tracking.totalTrackedGirls;
  const trackingTarget = tracking.successTarget;
  const hhCompleted = dashboard.household.bothParent;
  const hhTarget = PROTOCOL.HH_SURVEY_TARGET;
  const girlsComplete = dashboard.girls.complete;
  const girlsTotal = dashboard.girls.total;
  const assignmentPool = tracking.assignmentPool;
  const uniqueGirlsInData = tracking.uniqueGirlsInData;

  return {
    trackingTracked,
    trackingTarget,
    trackingPct:
      trackingTarget > 0 ? (trackingTracked / trackingTarget) * 100 : 0,
    trackingRemaining: Math.max(0, trackingTarget - trackingTracked),
    hhCompleted,
    hhTarget,
    hhPct: hhTarget > 0 ? (hhCompleted / hhTarget) * 100 : 0,
    hhRemaining: Math.max(0, hhTarget - hhCompleted),
    girlsComplete,
    girlsTotal,
    girlsPct: girlsTotal > 0 ? (girlsComplete / girlsTotal) * 100 : 0,
    coveragePct:
      assignmentPool > 0 ? (uniqueGirlsInData / assignmentPool) * 100 : 0,
    assignmentPool,
    uniqueGirlsInData,
  };
}

/** Side-by-side module health for the comparison chart. */
export function computeModuleHealth(
  dashboard: DashboardMetrics
): ModuleHealthRow[] {
  return [
    {
      module: "Tracking",
      submissions: dashboard.tracking.total,
      rate: dashboard.trackingSuccessRate,
      rateLabel: "Success rate",
    },
    {
      module: "Household",
      submissions: dashboard.household.total,
      rate: dashboard.hhCompletionRate,
      rateLabel: "Both-parent rate",
    },
    {
      module: "Girls",
      submissions: dashboard.girls.total,
      rate: dashboard.girlsCompletionRate,
      rateLabel: "Completion rate",
    },
  ];
}

/** Build a cumulative tracked series annotated with the success target. */
export function buildTargetTrend(
  trackingTrend: { date: string; count: number }[],
  successTarget: number
) {
  return trackingTrend.map((point) => ({
    date: point.date,
    tracked: point.count,
    target: successTarget,
  }));
}
