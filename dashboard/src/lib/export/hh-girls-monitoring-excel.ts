import * as XLSX from "xlsx";
import type { HhGirlsEnumeratorPerformance } from "@/lib/data/hh-girls-monitoring";
import type { HhGirlsMonitoringFilters } from "@/lib/data/hh-girls-monitoring";
import { formatDisplayDate, toIsoDateString } from "@/lib/utils";

function statusLabel(value: number): string {
  if (value >= 100) return "On track";
  if (value >= 70) return "Near target";
  return "Below";
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildHhGirlsEnumeratorReportFilename(
  filters: HhGirlsMonitoringFilters,
  districtOptions?: { value: string; label: string }[]
): string {
  const district =
    filters.district === "all"
      ? "All_Districts"
      : sanitizeFilenamePart(
          districtOptions?.find((d) => d.value === filters.district)?.label ||
            filters.district
        );

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

  return `${district}_HH_Enumerator_Performance_${datePart}.xlsx`;
}

function toSheetRows(rows: HhGirlsEnumeratorPerformance[]) {
  return rows.map((e) => ({
    "Enumerator ID": e.id,
    Enumerator: e.name,
    District: e.district,
    "Target HH Count": e.expectedCompleted,
    Forms: e.submissions,
    "Mother Forms": e.motherForms,
    "Father Forms": e.fatherForms,
    "Girls Forms": e.girlsForms,
    "Completed HH": e.completedHouseholds,
    "HH Left from Target": Math.max(
      0,
      e.expectedCompleted - e.completedHouseholds
    ),
    "Success %": Math.round(e.successRate),
    Days: e.activeDays,
    "Avg/Day (HH)": Math.round(e.avgCompletedPerDay),
    "Target % (HH)": Math.round(e.targetAttainment),
    "Status (HH)": statusLabel(e.targetAttainment),
    "Avg/Day (Forms)": Math.round(e.avgSubmissionsPerDay),
    "Target % (Forms)": Math.round(e.submissionTargetAttainment),
    "Status (Forms)": statusLabel(e.submissionTargetAttainment),
    "Daily HH Target": e.dailyHhTarget,
    "Daily Forms Target": e.dailyFormsTarget,
    "Days Meeting HH Target": e.daysMeetingTarget,
  }));
}

export function downloadHhGirlsEnumeratorReport(
  rows: HhGirlsEnumeratorPerformance[],
  filename: string
) {
  const ws = XLSX.utils.json_to_sheet(toSheetRows(rows));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Enumerator Performance");
  XLSX.writeFile(wb, filename);
}
