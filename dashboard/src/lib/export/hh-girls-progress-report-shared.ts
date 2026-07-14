import type { HhGirlsProgressReportMetrics } from "@/lib/data/hh-girls-progress-report-metrics";
import type { HhGirlsMonitoringFilters } from "@/lib/data/hh-girls-monitoring";
import { formatDisplayDate, toIsoDateString } from "@/lib/utils";
import {
  buildHhDateRangeLabel,
  num,
  pct,
  type ReportFormat,
} from "@/lib/export/hh-girls-status-report-shared";

export type { ReportFormat };
export { buildHhDateRangeLabel as buildDateRangeLabel, num, pct };

export interface HhGirlsProgressReportSection {
  districtLabel: string;
  metrics: HhGirlsProgressReportMetrics;
}

export interface HhGirlsProgressReportInput {
  scopeLabel: string;
  dateRangeLabel: string;
  generatedAt: Date;
  sections: HhGirlsProgressReportSection[];
}

export interface ProgressKpiTile {
  label: string;
  value: string;
  accent: string;
  bg: string;
  sub?: string;
}

export function buildHhProgressKpiTiles(
  metrics: HhGirlsProgressReportMetrics
): ProgressKpiTile[] {
  const progressTier =
    metrics.progressToTarget >= 85
      ? { fg: "#15803D", bg: "#DCFCE7" }
      : metrics.progressToTarget >= 70
        ? { fg: "#B45309", bg: "#FEF3C7" }
        : { fg: "#B91C1C", bg: "#FEE2E2" };

  const completionTier =
    metrics.completionRate >= 85
      ? { fg: "#15803D", bg: "#DCFCE7" }
      : metrics.completionRate >= 70
        ? { fg: "#B45309", bg: "#FEF3C7" }
        : { fg: "#B91C1C", bg: "#FEE2E2" };

  return [
    {
      label: "Total Forms",
      value: num(metrics.totalSubmissions),
      accent: "#0F766E",
      bg: "#F8FAFC",
      sub: `M ${num(metrics.motherForms)} · F ${num(metrics.fatherForms)} · G ${num(metrics.girlsForms)}`,
    },
    {
      label: "Villages Covered",
      value: num(metrics.totalVillages),
      accent: "#0F172A",
      bg: "#F8FAFC",
    },
    {
      label: "Active Enumerators",
      value: num(metrics.totalEnumerators),
      accent: "#0F172A",
      bg: "#F8FAFC",
    },
    {
      label: "Girls Attempted",
      value: num(metrics.uniqueGirls),
      accent: "#0F172A",
      bg: "#F8FAFC",
    },
    {
      label: "Completed Households",
      value: num(metrics.completedHouseholds),
      accent: completionTier.fg,
      bg: completionTier.bg,
    },
    {
      label: "HH Completion Rate",
      value: pct(metrics.completionRate, 0),
      accent: completionTier.fg,
      bg: completionTier.bg,
    },
    {
      label: "Progress to Target N",
      value: pct(metrics.progressToTarget, 1),
      accent: progressTier.fg,
      bg: progressTier.bg,
      sub: `${num(metrics.completedHouseholds)} of ${num(metrics.hhTarget)}`,
    },
    {
      label: "Remaining to Target",
      value: num(metrics.remainingToTarget),
      accent: "#B45309",
      bg: "#FEF3C7",
    },
    {
      label: "Revisits Still Needed",
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
      label: "Missing Surveys",
      value: num(metrics.missingSurveys),
      accent: "#B91C1C",
      bg: "#FEE2E2",
    },
    {
      label: "Consent Refused",
      value: num(metrics.consentRefused),
      accent: "#B91C1C",
      bg: "#FEE2E2",
    },
    {
      label: "Parental Consent Rate",
      value: pct(metrics.parentalConsentRate, 0),
      accent: "#0F766E",
      bg: "#F8FAFC",
    },
    {
      label: "Child Consent Rate",
      value: pct(metrics.childConsentRate, 0),
      accent: "#0F766E",
      bg: "#F8FAFC",
    },
  ];
}

export function buildHhProgressExecutiveSummaryBullets(
  districtLabel: string,
  metrics: HhGirlsProgressReportMetrics
): string[] {
  const scope =
    districtLabel === "All Districts"
      ? "Across all districts"
      : `In ${districtLabel}`;

  return [
    `${scope}, field teams submitted ${num(metrics.totalSubmissions)} HH/Girls forms (${num(metrics.motherForms)} mother · ${num(metrics.fatherForms)} father · ${num(metrics.girlsForms)} girls) covering ${num(metrics.totalVillages)} villages.`,
    `${num(metrics.uniqueGirls)} girls were attempted; ${num(metrics.completedHouseholds)} households are completed per protocol (${pct(metrics.completionRate, 0)} of attempted girls).`,
    `Progress toward the sample target of ${num(metrics.hhTarget)} completed households stands at ${pct(metrics.progressToTarget, 1)}, with ${num(metrics.remainingToTarget)} still remaining.`,
    `${num(metrics.revisitsNeeded)} survey slots still need a revisit; ${num(metrics.totalRevisitedGirls)} girls have been revisited. ${num(metrics.missingSurveys)} required surveys are still missing.`,
    `Unavailability: father ${num(metrics.fatherNotAvailable)}, mother ${num(metrics.motherNotAvailable)}, girl ${num(metrics.girlNotAvailable)}. Consent refused on ${num(metrics.consentRefused)} forms.`,
    `Girls survey consent: parental ${pct(metrics.parentalConsentRate, 0)} · child ${pct(metrics.childConsentRate, 0)}.`,
  ];
}

export function buildHhProgressConclusionBullets(
  districtLabel: string,
  metrics: HhGirlsProgressReportMetrics
): string[] {
  const scope =
    districtLabel === "All Districts" ? "Overall" : districtLabel;

  const bullets = [
    `${scope}: ${num(metrics.completedHouseholds)} completed households (${pct(metrics.progressToTarget, 1)} of target N ${num(metrics.hhTarget)}).`,
    `Operational backlog: ${num(metrics.revisitsNeeded)} revisits still needed · ${num(metrics.missingSurveys)} missing surveys · ${num(metrics.consentRefused)} consent refusals.`,
  ];

  if (metrics.progressToTarget < 70) {
    bullets.push(
      "Priority: accelerate completed-household throughput and clear temporary-unavailability revisits to close the gap to target N."
    );
  } else if (metrics.progressToTarget < 100) {
    bullets.push(
      "Maintain field momentum; focus remaining effort on incomplete households and pending revisits."
    );
  } else {
    bullets.push(
      "Sample target has been met or exceeded for this scope; sustain quality checks and document replacement needs if any."
    );
  }

  return bullets;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildHhGirlsProgressReportFilename(
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
  return `${district}_HH_Girls_Progress_Report_${datePart}.${ext}`;
}
