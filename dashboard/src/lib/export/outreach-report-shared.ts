import type { OutreachReportMetrics } from "@/lib/data/outreach-report-metrics";
import type { TrackingFilters } from "@/lib/data/tracking-metrics";
import { formatDisplayDate, toIsoDateString } from "@/lib/utils";
import {
  buildDateRangeLabel,
  num,
  pct,
  type ReportFormat,
} from "@/lib/export/monitoring-report-shared";

export type { ReportFormat };
export { buildDateRangeLabel };

export interface OutreachReportSection {
  districtLabel: string;
  metrics: OutreachReportMetrics;
}

export interface OutreachReportInput {
  scopeLabel: string;
  dateRangeLabel: string;
  generatedAt: Date;
  sections: OutreachReportSection[];
}

export interface ProgressKpiTile {
  label: string;
  value: string;
  accent: string;
  bg: string;
  sub?: string;
}

export function buildProgressKpiTiles(
  metrics: OutreachReportMetrics
): ProgressKpiTile[] {
  const successTier =
    metrics.trackingSuccessRate >= 85
      ? { fg: "#15803D", bg: "#DCFCE7" }
      : metrics.trackingSuccessRate >= 70
        ? { fg: "#B45309", bg: "#FEF3C7" }
        : { fg: "#B91C1C", bg: "#FEE2E2" };

  const consentTier =
    metrics.consentRate >= 85
      ? { fg: "#15803D", bg: "#DCFCE7" }
      : metrics.consentRate >= 70
        ? { fg: "#B45309", bg: "#FEF3C7" }
        : { fg: "#B91C1C", bg: "#FEE2E2" };

  return [
    {
      label: "Total Submissions",
      value: num(metrics.totalSubmissions),
      accent: "#0F766E",
      bg: "#F8FAFC",
    },
    {
      label: "Schools Covered",
      value: num(metrics.totalSchools),
      accent: "#0F172A",
      bg: "#F8FAFC",
    },
    {
      label: "Villages Covered",
      value: num(metrics.totalVillages),
      accent: "#0F172A",
      bg: "#F8FAFC",
    },
    {
      label: "Girls Attempted",
      value: num(metrics.totalAttemptedGirls),
      accent: "#0F172A",
      bg: "#F8FAFC",
    },
    {
      label: "Girls Successfully Tracked",
      value: num(metrics.totalTrackedGirls),
      accent: successTier.fg,
      bg: successTier.bg,
    },
    {
      label: "Girls Not Tracked",
      value: num(metrics.totalNotTrackedGirls),
      accent: "#B91C1C",
      bg: "#FEE2E2",
    },
    {
      label: "Tracking Success Rate",
      value: pct(metrics.trackingSuccessRate, 0),
      accent: successTier.fg,
      bg: successTier.bg,
    },
    {
      label: "Revisits Still Required",
      value: num(metrics.revisitsNeeded),
      accent: "#B45309",
      bg: "#FEF3C7",
    },
    {
      label: "Girls Revisited",
      value: num(metrics.totalRevisitedGirls),
      accent: "#0F766E",
      bg: "#CCFBF1",
    },
    {
      label: "Consent Refused",
      value: num(metrics.consentRefused),
      accent: "#B91C1C",
      bg: "#FEE2E2",
    },
    {
      label: "Consent Rate",
      value: pct(metrics.consentRate, 0),
      accent: consentTier.fg,
      bg: consentTier.bg,
    },
    {
      label: "Tracked Girls — Baseline",
      value: num(metrics.trackedGirlsBaseline),
      accent: "#134E4A",
      bg: "#F8FAFC",
    },
    {
      label: "Tracked Girls — New Sample",
      value: num(metrics.trackedGirlsNewSample),
      accent: "#134E4A",
      bg: "#F8FAFC",
    },
  ];
}

export function buildProgressSummaryBullets(
  districtLabel: string,
  metrics: OutreachReportMetrics
): string[] {
  const scope =
    districtLabel === "All Districts"
      ? "Across all districts"
      : `In ${districtLabel}`;

  return [
    `${scope}, field teams submitted ${num(metrics.totalSubmissions)} tracking forms covering ${num(metrics.totalVillages)} villages and ${num(metrics.totalSchools)} schools.`,
    `${num(metrics.totalAttemptedGirls)} girls were attempted; ${num(metrics.totalTrackedGirls)} were successfully tracked (${pct(metrics.trackingSuccessRate, 0)} success rate) and ${num(metrics.totalNotTrackedGirls)} remain not tracked.`,
    `Consent was obtained from ${pct(metrics.consentRate, 0)} of located households; ${num(metrics.consentRefused)} girls had consent refused.`,
    `${num(metrics.revisitsNeeded)} girls still require a revisit; ${num(metrics.totalRevisitedGirls)} girls have been revisited to date.`,
    `By tracking cohort: ${num(metrics.trackedGirlsBaseline)} baseline girls and ${num(metrics.trackedGirlsNewSample)} new-sample girls were successfully tracked.`,
  ];
}

function sanitizeFilenamePart(value: string): string {
  return value
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildOutreachReportFilename(
  scopeLabel: string,
  filters: TrackingFilters,
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
  return `KPRAP_Tracking_Progress_${district}_${datePart}.${ext}`;
}
