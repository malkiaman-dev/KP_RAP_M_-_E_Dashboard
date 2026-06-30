import type {
  EnumeratorPerformance,
  MonitoringMetrics,
  TrackingFilters,
} from "@/lib/data/tracking-metrics";
import { formatDisplayDate, toIsoDateString } from "@/lib/utils";

export type ReportFormat = "docx" | "pdf";

export interface MonitoringReportSection {
  districtLabel: string;
  metrics: MonitoringMetrics;
}

export interface MonitoringStatusReportInput {
  scopeLabel: string;
  dateRangeLabel: string;
  generatedAt: Date;
  sections: MonitoringReportSection[];
}

export interface PerformanceTier {
  fg: string;
  bg: string;
  label: string;
}

export interface EnumeratorCategories {
  onOrNearTarget: EnumeratorPerformance[];
  belowTarget: EnumeratorPerformance[];
  critical: EnumeratorPerformance[];
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function num(n: number): string {
  return n.toLocaleString();
}

export function tierFor(value: number, high = 70, med = 50): PerformanceTier {
  if (value >= high) return { fg: "#15803D", bg: "#DCFCE7", label: "On Track" };
  if (value > med) return { fg: "#B45309", bg: "#FEF3C7", label: "Below" };
  return { fg: "#B91C1C", bg: "#FEE2E2", label: "Critical" };
}

export function categorizeEnumerators(
  enumerators: EnumeratorPerformance[]
): EnumeratorCategories {
  const onOrNearTarget = enumerators
    .filter((e) => e.submissionTargetAttainment >= 70)
    .sort((a, b) => b.submissionTargetAttainment - a.submissionTargetAttainment);
  const belowTarget = enumerators
    .filter(
      (e) => e.submissionTargetAttainment > 50 && e.submissionTargetAttainment < 70
    )
    .sort((a, b) => b.submissionTargetAttainment - a.submissionTargetAttainment);
  const critical = enumerators
    .filter((e) => e.submissionTargetAttainment <= 50)
    .sort((a, b) => b.submissionTargetAttainment - a.submissionTargetAttainment);
  return { onOrNearTarget, belowTarget, critical };
}

export function buildStatusSummary(metrics: MonitoringMetrics): string {
  if (metrics.submissionTargetAchievement >= 100) {
    return "The field team has met or exceeded the daily submission target for this scope.";
  }
  if (metrics.submissionTargetAchievement >= 70) {
    return "The field team is near the daily submission target but has not fully met it yet.";
  }
  if (metrics.submissionTargetAchievement > 50) {
    return "The field team is below the daily submission target and requires closer monitoring.";
  }
  return "The field team is well below the daily submission target and needs immediate support.";
}

export function performanceAction(
  metrics: MonitoringMetrics,
  critical: number
): string {
  if (metrics.submissionTargetAchievement < 50 || critical > 0) {
    return "Immediate supervisory support is recommended for low-performing enumerators, with daily check-ins until submission rates improve.";
  }
  if (metrics.submissionTargetAchievement < 70) {
    return "Closer field monitoring and targeted coaching are recommended to bring submission rates up to the daily protocol target.";
  }
  if (metrics.submissionTargetAchievement < 100) {
    return "Maintain current momentum; focus support on medium and low performers to close the remaining gap to the daily target.";
  }
  return "Field performance is on or above target; sustain current operations and share best practices from high performers across the team.";
}

export function buildExecutiveSummaryBullets(
  districtLabel: string,
  metrics: MonitoringMetrics,
  categories: EnumeratorCategories
): string[] {
  const subTier = tierFor(metrics.submissionTargetAchievement);
  const high = categories.onOrNearTarget.length;
  const med = categories.belowTarget.length;
  const low = categories.critical.length;
  const top = metrics.topPerformer;

  return [
    `Scope: ${districtLabel} — ${num(metrics.activeEnumerators)} active enumerators across ${num(metrics.enumeratorDays)} enumerator-days (${num(metrics.activeFieldDays)} actual field days).`,
    `Daily target achievement (submissions): ${pct(metrics.submissionTargetAchievement)} — ${subTier.label}. ${num(metrics.totalSubmissions)} of ${num(metrics.expectedSubmissions)} expected submissions at ${metrics.dailyTarget} girls per enumerator per working day.`,
    `Tracking outcome: ${num(metrics.totalTracked)} girls successfully tracked from ${num(metrics.uniqueGirls)} attempted (${pct(metrics.trackingSuccessRate, 0)} success rate). Tracked-based target: ${pct(metrics.targetAchievement)}.`,
    `Enumerator performance: ${high} high (≥70%), ${med} medium (>50%–<70%), ${low} low (≤50%). ${num(metrics.enumeratorsOnTrack)} of ${num(metrics.activeEnumerators)} enumerators averaging ≥${metrics.dailyTarget} tracked girls per day.`,
    top
      ? `Top performer: ${top.name} with ${num(top.value)} girls tracked.`
      : "Top performer: not available for this reporting period.",
    performanceAction(metrics, low),
  ];
}

export function buildReportSummaryBullets(
  districtLabel: string,
  metrics: MonitoringMetrics,
  categories: EnumeratorCategories
): string[] {
  const subTier = tierFor(metrics.submissionTargetAchievement);
  const high = categories.onOrNearTarget.length;
  const med = categories.belowTarget.length;
  const low = categories.critical.length;
  const avgSubsPerDay =
    metrics.enumeratorDays > 0
      ? metrics.totalSubmissions / metrics.enumeratorDays
      : 0;

  const recapBullets = [
    `${districtLabel}: ${num(metrics.totalSubmissions)} submissions, ${num(metrics.totalTracked)} girls tracked, ${pct(metrics.submissionTargetAchievement)} of daily submission target achieved (${subTier.label}).`,
    `Field coverage: ${num(metrics.activeEnumerators)} enumerators · ${num(metrics.enumeratorDays)} enumerator-days · ${num(metrics.activeFieldDays)} actual field days · ${pct(metrics.pctDaysMeetingTarget, 0)} of enumerator-days met the tracked target.`,
    `Productivity averages: ${avgSubsPerDay.toFixed(1)} submissions and ${metrics.avgTrackedPerEnumeratorPerDay.toFixed(1)} tracked girls per enumerator per day (target: ${metrics.dailyTarget}).`,
    `Performance distribution: ${high} high performer${high === 1 ? "" : "s"}, ${med} medium performer${med === 1 ? "" : "s"}, ${low} low performer${low === 1 ? "" : "s"} (submission-based target %).`,
  ];

  if (low > 0) {
    const names = categories.critical
      .slice(0, 5)
      .map((e) => e.name)
      .join(", ");
    recapBullets.push(
      `Priority follow-up (${low} low performer${low === 1 ? "" : "s"}): ${names}${low > 5 ? ", and others" : ""}.`
    );
  }

  recapBullets.push(performanceAction(metrics, low));
  return recapBullets;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildMonitoringStatusReportFilename(
  scopeLabel: string,
  filters: TrackingFilters,
  format: ReportFormat = "docx"
): string {
  const district =
    scopeLabel === "All_Districts"
      ? "All_Districts"
      : sanitizeFilenamePart(scopeLabel);

  const fmt = (iso: string) => formatDisplayDate(iso) || iso;

  let datePart: string;
  if (filters.todayOnly) {
    datePart = fmt(toIsoDateString(new Date()));
  } else if (filters.dateFrom && filters.dateTo) {
    datePart =
      filters.dateFrom === filters.dateTo
        ? fmt(filters.dateFrom)
        : `${fmt(filters.dateFrom)}_to_${fmt(filters.dateTo)}`;
  } else if (filters.dateFrom) {
    datePart = fmt(filters.dateFrom);
  } else if (filters.dateTo) {
    datePart = fmt(filters.dateTo);
  } else {
    datePart = "All_Dates";
  }

  const ext = format === "pdf" ? "pdf" : "docx";
  return `${district}_Tracking_Status_Report_${datePart}.${ext}`;
}

export function buildDateRangeLabel(filters: TrackingFilters): string {
  if (filters.todayOnly) {
    return `Today (${formatDisplayDate(toIsoDateString(new Date()))})`;
  }
  if (filters.dateFrom && filters.dateTo) {
    if (filters.dateFrom === filters.dateTo) {
      return formatDisplayDate(filters.dateFrom);
    }
    return `${formatDisplayDate(filters.dateFrom)} to ${formatDisplayDate(filters.dateTo)}`;
  }
  if (filters.dateFrom) {
    return `From ${formatDisplayDate(filters.dateFrom)}`;
  }
  if (filters.dateTo) {
    return `Up to ${formatDisplayDate(filters.dateTo)}`;
  }
  return "All dates";
}
