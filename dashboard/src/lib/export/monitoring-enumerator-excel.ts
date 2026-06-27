import * as XLSX from "xlsx";
import type {
  EnumeratorPerformance,
  TrackingFilters,
} from "@/lib/data/tracking-metrics";
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

export function buildEnumeratorReportFilename(
  filters: TrackingFilters,
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

  return `${district}_Enumerator_Performance_${datePart}.xlsx`;
}

function toSheetRows(rows: EnumeratorPerformance[]) {
  return rows.map((e) => {
    const targetGirlsCount = e.expectedTracked;
    const girls = e.submissions;
    const girlsLeftFromTarget = targetGirlsCount - girls;

    return {
      "Enumerator ID": e.id,
      Enumerator: e.name,
      District: e.district,
      "Target Girls Count": targetGirlsCount,
      Girls: girls,
      Tracked: e.trackedGirls,
      "Girls Left from Target Girls": girlsLeftFromTarget,
      "Success %": Math.round(e.successRate),
      Days: e.activeDays,
      "Avg/Day (Tracked)": Math.round(e.avgTrackedPerDay),
      "Target % (Tracked)": Math.round(e.targetAttainment),
      "Status (Tracked)": statusLabel(e.targetAttainment),
      "Avg/Day (Subs)": Math.round(e.avgSubmissionsPerDay),
      "Target % (Subs)": Math.round(e.submissionTargetAttainment),
      "Status (Subs)": statusLabel(e.submissionTargetAttainment),
      "Daily Target": e.dailyTarget,
      "Days Meeting Target": e.daysMeetingTarget,
    };
  });
}

export function downloadEnumeratorReport(
  rows: EnumeratorPerformance[],
  filename: string
) {
  const sheet = XLSX.utils.json_to_sheet(toSheetRows(rows));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Enumerator Performance");
  XLSX.writeFile(workbook, filename);
}
