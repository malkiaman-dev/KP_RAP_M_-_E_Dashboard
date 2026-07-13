import type { ErrorFilters, ErrorMetrics } from "@/lib/data/error-metrics";
import { formatDisplayDate, toIsoDateString } from "@/lib/utils";

export type ReportFormat = "docx" | "pdf";

export interface ErrorReportSection {
  districtLabel: string;
  metrics: ErrorMetrics;
}

export interface ErrorReportInput {
  scopeLabel: string;
  dateRangeLabel: string;
  generatedAt: Date;
  sections: ErrorReportSection[];
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function num(n: number): string {
  return n.toLocaleString();
}

export function buildErrorDateRangeLabel(filters: ErrorFilters): string {
  if (filters.todayOnly) {
    return `Today (${formatDisplayDate(toIsoDateString(new Date()))})`;
  }
  if (filters.dateFrom && filters.dateTo) {
    if (filters.dateFrom === filters.dateTo) {
      return formatDisplayDate(filters.dateFrom) || filters.dateFrom;
    }
    return `${formatDisplayDate(filters.dateFrom) || filters.dateFrom} to ${formatDisplayDate(filters.dateTo) || filters.dateTo}`;
  }
  if (filters.dateFrom) {
    return `From ${formatDisplayDate(filters.dateFrom) || filters.dateFrom}`;
  }
  if (filters.dateTo) {
    return `Up to ${formatDisplayDate(filters.dateTo) || filters.dateTo}`;
  }
  return "All dates";
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildErrorReportFilename(
  scopeLabel: string,
  filters: ErrorFilters,
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
  return `${district}_Error_Quality_Report_${datePart}.${ext}`;
}

export function buildErrorExecutiveSummary(
  districtLabel: string,
  metrics: ErrorMetrics
): string[] {
  const topCritical = metrics.topCriticalRules[0];
  const topQuality = metrics.topQualityRules[0];
  const weakest = metrics.enumeratorQuality[0];

  const bullets = [
    `Scope: ${districtLabel} — ${num(metrics.totalErrors)} data-quality issues (${num(metrics.criticalErrors)} critical, ${num(metrics.flagErrors)} quality flags).`,
    `Critical rate: ${pct(metrics.criticalRate)} of all issues. ${num(metrics.affectedEnumerators)} enumerators and ${num(metrics.ruleTypes)} distinct validation rules are involved.`,
    `Survey mix: ${metrics.bySurvey
      .map((s) => `${s.survey} ${num(s.total)}`)
      .join(" · ") || "no survey breakdown available"}.`,
  ];

  if (topCritical) {
    bullets.push(
      `Top critical rule: ${topCritical.title} (${topCritical.ruleId}) — ${num(topCritical.count)} cases.`
    );
  }
  if (topQuality) {
    bullets.push(
      `Top quality flag: ${topQuality.title} (${topQuality.ruleId}) — ${num(topQuality.count)} cases.`
    );
  }
  if (weakest) {
    bullets.push(
      `Enumerator needing most attention: ${weakest.name} (quality score ${weakest.score}; ${num(weakest.critical)} critical, ${num(weakest.flag)} quality).`
    );
  }

  if (metrics.criticalErrors > 0) {
    bullets.push(
      "Immediate follow-up is recommended on critical issues before they cascade into tracking or household integrity gaps."
    );
  } else if (metrics.flagErrors > 0) {
    bullets.push(
      "No critical issues in this scope; continue coaching on quality flags to prevent escalation."
    );
  } else {
    bullets.push(
      "No open errors in this scope for the selected period — sustain current field quality checks."
    );
  }

  return bullets;
}

export function buildErrorRecapBullets(
  districtLabel: string,
  metrics: ErrorMetrics
): string[] {
  const bullets = [
    `${districtLabel}: ${num(metrics.totalErrors)} errors · ${pct(metrics.criticalRate)} critical · ${num(metrics.affectedEnumerators)} enumerators · ${num(metrics.ruleTypes)} rules.`,
  ];

  const topRules = [
    ...metrics.topCriticalRules.slice(0, 2),
    ...metrics.topQualityRules.slice(0, 1),
  ];
  if (topRules.length > 0) {
    bullets.push(
      `Priority rules: ${topRules
        .map((r) => `${r.title} (${num(r.count)})`)
        .join("; ")}.`
    );
  }

  const coach = metrics.enumeratorQuality.slice(0, 3);
  if (coach.length > 0) {
    bullets.push(
      `Coaching priorities: ${coach
        .map((e) => `${e.name} (score ${e.score})`)
        .join(", ")}.`
    );
  }

  return bullets;
}
