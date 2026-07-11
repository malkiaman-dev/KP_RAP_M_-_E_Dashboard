import { PROTOCOL } from "@/lib/data/protocol";
import { isCompletedHouseholdForGirl } from "@/lib/data/hh-girls-completion";
import type { HhGirlsMetrics, HhGirlsRow } from "@/lib/data/hh-girls-metrics";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";

export interface PaceInsight {
  /** Units gained in the trailing window. */
  recentGain: number;
  /** Window length in calendar days used for the rate. */
  windowDays: number;
  /** Average units gained per day over the window. */
  dailyRate: number;
  /** Estimated calendar days to hit the target at the current rate. */
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

function toIsoDate(raw: string): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = raw.split(" ")[0];
    return fallback || null;
  }
  return parsed.toISOString().slice(0, 10);
}

/** Derive trailing-window pace from a cumulative trend series. */
export function computePaceInsight(
  trend: { date: string; count: number }[],
  remainingToTarget: number,
  windowDays = 7
): PaceInsight {
  if (trend.length < 2) {
    return {
      recentGain: 0,
      windowDays,
      dailyRate: 0,
      daysToTarget: remainingToTarget > 0 ? null : 0,
      onTrack: remainingToTarget <= 0,
    };
  }

  const latest = trend[trend.length - 1];
  const latestDate = new Date(`${latest.date}T00:00:00`);
  const windowStart = new Date(latestDate);
  windowStart.setDate(windowStart.getDate() - (windowDays - 1));
  const startKey = windowStart.toISOString().slice(0, 10);

  let baseline = trend[0];
  for (const point of trend) {
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

/**
 * Cumulative completed-household trend for HH/Girls pace.
 * Completion date = latest submission date among forms for that girl.
 */
export function buildHhCompletionTrend(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): { date: string; count: number }[] {
  const hhByGirl = new Map<string, HhGirlsRow[]>();
  for (const row of household) {
    if (!row.girl) continue;
    if (!hhByGirl.has(row.girl)) hhByGirl.set(row.girl, []);
    hhByGirl.get(row.girl)!.push(row);
  }

  const gsByGirl = new Map<string, HhGirlsRow>();
  for (const row of girls) {
    if (row.girl) gsByGirl.set(row.girl, row);
  }

  const girlIds = new Set([...hhByGirl.keys(), ...gsByGirl.keys()]);
  const completionDates: string[] = [];

  for (const girl of girlIds) {
    const hhSubs = hhByGirl.get(girl) || [];
    const gsRow = gsByGirl.get(girl);
    if (!isCompletedHouseholdForGirl(hhSubs, gsRow)) continue;

    let latest: string | null = null;
    for (const row of [...hhSubs, ...(gsRow ? [gsRow] : [])]) {
      const date = toIsoDate(row.SubmissionDate || "");
      if (date && (!latest || date > latest)) latest = date;
    }
    if (latest) completionDates.push(latest);
  }

  completionDates.sort((a, b) => a.localeCompare(b));

  const trend: { date: string; count: number }[] = [];
  let cumulative = 0;
  for (const date of completionDates) {
    cumulative += 1;
    const last = trend[trend.length - 1];
    if (last && last.date === date) {
      last.count = cumulative;
    } else {
      trend.push({ date, count: cumulative });
    }
  }

  return trend;
}

/** Protocol progress across tracking + HH modules. */
export function computeProtocolProgress(
  dashboard: DashboardMetrics,
  tracking: TrackingMetrics,
  hhGirls?: Pick<
    HhGirlsMetrics["core"],
    | "completedHouseholds"
    | "hhTarget"
    | "remainingToTarget"
    | "progressToTarget"
  >
): ProtocolProgress {
  const trackingTracked = tracking.totalTrackedGirls;
  const trackingTarget = tracking.successTarget;
  const hhCompleted =
    hhGirls?.completedHouseholds ?? dashboard.household.bothParent;
  const hhTarget = hhGirls?.hhTarget ?? PROTOCOL.HH_SURVEY_TARGET;
  const hhRemaining =
    hhGirls?.remainingToTarget ?? Math.max(0, hhTarget - hhCompleted);
  const hhPct =
    hhGirls?.progressToTarget ??
    (hhTarget > 0 ? (hhCompleted / hhTarget) * 100 : 0);
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
    hhPct,
    hhRemaining,
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
