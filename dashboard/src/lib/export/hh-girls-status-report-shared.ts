import type {
  HhGirlsEnumeratorPerformance,
  HhGirlsMonitoringMetrics,
  HhGirlsMonitoringFilters,
} from "@/lib/data/hh-girls-monitoring";
import { formatDisplayDate, toIsoDateString } from "@/lib/utils";
import {
  num,
  pct,
  tierFor,
  type PerformanceTier,
  type ReportFormat,
} from "@/lib/export/monitoring-report-shared";

export type { ReportFormat, PerformanceTier };
export { num, pct, tierFor };

export interface HhGirlsStatusReportSection {
  districtLabel: string;
  metrics: HhGirlsMonitoringMetrics;
}

export interface HhGirlsStatusReportInput {
  scopeLabel: string;
  dateRangeLabel: string;
  generatedAt: Date;
  sections: HhGirlsStatusReportSection[];
}

export interface HhGirlsEnumeratorCategories {
  onOrNearTarget: HhGirlsEnumeratorPerformance[];
  belowTarget: HhGirlsEnumeratorPerformance[];
  critical: HhGirlsEnumeratorPerformance[];
}

export function formsWithUniqueGirls(metrics: HhGirlsMonitoringMetrics): string {
  return `${num(metrics.totalSubmissions)} forms (${num(metrics.uniqueGirls)} unique girls)`;
}

/** Categorize by forms-target attainment (9 forms/day). */
export function categorizeHhEnumerators(
  enumerators: HhGirlsEnumeratorPerformance[]
): HhGirlsEnumeratorCategories {
  const onOrNearTarget = enumerators
    .filter((e) => e.submissionTargetAttainment >= 70)
    .sort(
      (a, b) => b.submissionTargetAttainment - a.submissionTargetAttainment
    );
  const belowTarget = enumerators
    .filter(
      (e) =>
        e.submissionTargetAttainment > 50 && e.submissionTargetAttainment < 70
    )
    .sort(
      (a, b) => b.submissionTargetAttainment - a.submissionTargetAttainment
    );
  const critical = enumerators
    .filter((e) => e.submissionTargetAttainment <= 50)
    .sort(
      (a, b) => b.submissionTargetAttainment - a.submissionTargetAttainment
    );
  return { onOrNearTarget, belowTarget, critical };
}

export function buildHhStatusSummary(metrics: HhGirlsMonitoringMetrics): string {
  if (metrics.submissionTargetAchievement >= 100) {
    return "The field team has met or exceeded the daily forms target for this scope.";
  }
  if (metrics.submissionTargetAchievement >= 70) {
    return "The field team is near the daily forms target but has not fully met it yet.";
  }
  if (metrics.submissionTargetAchievement > 50) {
    return "The field team is below the daily forms target and requires closer monitoring.";
  }
  return "The field team is well below the daily forms target and needs immediate support.";
}

export function hhPerformanceAction(
  metrics: HhGirlsMonitoringMetrics,
  critical: number
): string {
  if (metrics.submissionTargetAchievement < 50 || critical > 0) {
    return "Immediate supervisory support is recommended for low-performing enumerators, with daily check-ins until form submission and completed-household rates improve.";
  }
  if (metrics.submissionTargetAchievement < 70) {
    return "Closer field monitoring and targeted coaching are recommended to bring form and household completion rates up to the daily protocol targets.";
  }
  if (metrics.submissionTargetAchievement < 100) {
    return "Maintain current momentum; focus support on medium and low performers to close the remaining gap to the daily targets.";
  }
  return "Field performance is on or above target; sustain current operations and share best practices from high performers across the team.";
}

export function buildHhExecutiveSummaryBullets(
  districtLabel: string,
  metrics: HhGirlsMonitoringMetrics,
  categories: HhGirlsEnumeratorCategories
): string[] {
  const formsTier = tierFor(metrics.submissionTargetAchievement);
  const high = categories.onOrNearTarget.length;
  const med = categories.belowTarget.length;
  const low = categories.critical.length;
  const top = metrics.topPerformer;

  return [
    `Scope: ${districtLabel} — ${num(metrics.activeEnumerators)} active enumerators across ${num(metrics.enumeratorDays)} enumerator-days (${num(metrics.activeFieldDays)} actual field days).`,
    `Daily forms target achievement: ${pct(metrics.submissionTargetAchievement)} — ${formsTier.label}. ${formsWithUniqueGirls(metrics)} of ${num(metrics.expectedSubmissions)} expected forms at ${metrics.dailyFormsTarget} forms per enumerator per working day (3 mother + 3 father + 3 girls).`,
    `Completed households: ${num(metrics.totalCompleted)} of ${num(metrics.uniqueGirls)} girls attempted (${pct(metrics.completionRate, 0)} completion rate). HH-based target: ${pct(metrics.targetAchievement)} (${num(metrics.expectedCompleted)} expected at ${metrics.dailyHhTarget} HH/day).`,
    `Form mix: ${num(metrics.motherForms)} mother · ${num(metrics.fatherForms)} father · ${num(metrics.girlsForms)} girls forms.`,
    `Enumerator performance (forms target %): ${high} high (≥70%), ${med} medium (>50%–<70%), ${low} low (≤50%). ${num(metrics.enumeratorsOnTrack)} of ${num(metrics.activeEnumerators)} averaging ≥${metrics.dailyHhTarget} completed HH per day.`,
    top
      ? `Top performer: ${top.name} with ${num(top.value)} completed households.`
      : "Top performer: not available for this reporting period.",
    hhPerformanceAction(metrics, low),
  ];
}

export function buildHhReportSummaryBullets(
  districtLabel: string,
  metrics: HhGirlsMonitoringMetrics,
  categories: HhGirlsEnumeratorCategories
): string[] {
  const formsTier = tierFor(metrics.submissionTargetAchievement);
  const high = categories.onOrNearTarget.length;
  const med = categories.belowTarget.length;
  const low = categories.critical.length;
  const avgForms =
    metrics.enumeratorDays > 0
      ? metrics.totalSubmissions / metrics.enumeratorDays
      : 0;

  const bullets = [
    `${districtLabel}: ${formsWithUniqueGirls(metrics)}, ${num(metrics.totalCompleted)} completed households, ${pct(metrics.submissionTargetAchievement)} of daily forms target (${formsTier.label}).`,
    `Field coverage: ${num(metrics.activeEnumerators)} enumerators · ${num(metrics.enumeratorDays)} enumerator-days · ${num(metrics.activeFieldDays)} actual field days · ${pct(metrics.pctDaysMeetingTarget, 0)} of enumerator-days met the ${metrics.dailyHhTarget} HH target.`,
    `Productivity averages: ${Math.round(avgForms)} forms and ${Math.round(metrics.avgCompletedPerEnumeratorPerDay)} completed HH per enumerator per day (targets: ${metrics.dailyFormsTarget} forms · ${metrics.dailyHhTarget} HH).`,
    `Performance distribution: ${high} high, ${med} medium, ${low} low (forms-based target %).`,
  ];

  if (low > 0) {
    const names = categories.critical
      .slice(0, 5)
      .map((e) => e.name)
      .join(", ");
    bullets.push(
      `Priority follow-up (${low} low performer${low === 1 ? "" : "s"}): ${names}${low > 5 ? ", and others" : ""}.`
    );
  }

  bullets.push(hhPerformanceAction(metrics, low));
  return bullets;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildHhGirlsStatusReportFilename(
  scopeLabel: string,
  filters: HhGirlsMonitoringFilters,
  format: ReportFormat = "pdf"
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
  return `${district}_HH_Girls_Status_Report_${datePart}.${ext}`;
}

export function buildHhDateRangeLabel(
  filters: HhGirlsMonitoringFilters
): string {
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
