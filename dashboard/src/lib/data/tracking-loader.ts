import fs from "fs";
import path from "path";
import Papa from "papaparse";
import {
  applyTrackingFilters,
  computeTrackingMetrics,
  createDefaultTrackingFilters,
  inferTrackingSession,
  type TrackingCohort,
  type TrackingRow,
} from "./tracking-metrics";
import { DEFAULT_TRACKING_TARGETS } from "./protocol";
import { FIELD_PERIOD_START } from "./field-period";
import { filesSignature, getCached } from "./survey-cache";

export {
  mergeTrackingExportLists,
  stripTrackingExportLists,
} from "./tracking-serialization";

const DATA_ROOT = path.join(process.cwd(), "..");

const TRACKING_SOURCES: { file: string; cohort: TrackingCohort }[] = [
  { file: "Tracking_Survey_Baseline.csv", cohort: "baseline" },
  { file: "Tracking_Survey_NewSample.csv", cohort: "new-sample" },
];

/** Fields needed for dashboard metrics, filters, and Excel exports. */
const CLIENT_ROW_FIELDS = [
  "KEY",
  "SubmissionDate",
  "district",
  "district_label",
  "village",
  "village_label",
  "village_id",
  "enumerator_id",
  "enumerator_name",
  "girl",
  "girl_id",
  "girl_1",
  "girl_2",
  "girlname_label",
  "new_name",
  "girl_name",
  "girl_fathername",
  "name",
  "girl_label",
  "school_label",
  "new_school_label",
  "school",
  "house_found",
  "house_found_1",
  "girl_found",
  "girl_found_other",
  "girl_found_confirm_enrolled",
  "girl_found_confirm_dropped",
  "consent",
  "survey_status",
  "survey_status_othr",
  "survey_comments",
  "visit_num",
  "enrollstat_label",
  "formdef_version",
  "cohort",
  "session",
  "batch",
  "family_whereabouts",
  "family_moveadd_samevill",
  "moved_familyaddress",
  "check_villageelder",
  "name_villageelder",
  "number_villageelder",
  "check_lhw",
  "name_lhw",
  "number_lhw",
  "check_neighbour",
  "name_neighbour",
  "number_neighbour",
  "visit_comments",
  "check_villageelder_1",
  "name_villageelder_1",
  "number_villageelder_1",
  "check_lhw_1",
  "name_lhw_1",
  "number_lhw_1",
  "check_neighbour_1",
  "name_neighbour_1",
  "number_neighbour_1",
  "visit_comments_1",
] as const;

function trackingFilePaths(): string[] {
  return [
    ...TRACKING_SOURCES.map((s) => path.join(DATA_ROOT, "Surveys", s.file)),
    path.join(DATA_ROOT, "Surveys", "Tracking_Survey.csv"),
  ];
}

function slimTrackingRow(row: TrackingRow): TrackingRow {
  const slim: Record<string, string | undefined> = {
    KEY: "",
    SubmissionDate: "",
    district: "",
  };
  for (const field of CLIENT_ROW_FIELDS) {
    const value = row[field];
    if (value !== undefined && value !== "") {
      slim[field] = value;
    }
  }
  return slim as TrackingRow;
}

function parseTrackingFile(
  filePath: string,
  cohort: TrackingCohort
): TrackingRow[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.map((row) => {
    const enriched = { ...row, cohort } as TrackingRow;
    const session = inferTrackingSession(enriched);
    return slimTrackingRow(session ? { ...enriched, session } : enriched);
  });
}

function readTrackingSurvey(): TrackingRow[] {
  const rows: TrackingRow[] = [];

  for (const source of TRACKING_SOURCES) {
    const filePath = path.join(DATA_ROOT, "Surveys", source.file);
    rows.push(...parseTrackingFile(filePath, source.cohort));
  }

  if (rows.length === 0) {
    const legacyPath = path.join(DATA_ROOT, "Surveys", "Tracking_Survey.csv");
    rows.push(...parseTrackingFile(legacyPath, "baseline"));
  }

  return rows;
}

export function loadTrackingSurvey(): TrackingRow[] {
  const signature = filesSignature(trackingFilePaths());
  return getCached("tracking-rows", signature, readTrackingSurvey);
}

/** Fast path for tracking UI — field-period aggregates, no Excel row arrays. */
export function loadTrackingMetricsForClient() {
  const signature = `v6-fp|${FIELD_PERIOD_START}|${filesSignature(trackingFilePaths())}`;
  return getCached("tracking-metrics-light-v6", signature, () => {
    const allRows = loadTrackingSurvey();
    const fieldPeriodRows = applyTrackingFilters(
      allRows,
      createDefaultTrackingFilters(FIELD_PERIOD_START)
    );
    const metrics = computeTrackingMetrics(
      fieldPeriodRows,
      DEFAULT_TRACKING_TARGETS,
      allRows,
      { includeExportLists: false }
    );

    // Date picker must span the full dataset (incl. March baseline), not only
    // the field-period window used for default KPI aggregates.
    const allDates = allRows
      .map((r) => {
        const d = new Date(r.SubmissionDate || "");
        return Number.isNaN(d.getTime()) ? null : d;
      })
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      ...metrics,
      // Full frame so clearing the date filter can include pre–field-period rows.
      allSubmissions: allRows,
      filterOptions: {
        ...metrics.filterOptions,
        dateRange: {
          start: allDates[0]?.toISOString().slice(0, 10) || "",
          end: allDates[allDates.length - 1]?.toISOString().slice(0, 10) || "",
        },
      },
    };
  });
}

/** Full metrics including Excel export lists (used by /api/tracking/exports). */
export function loadTrackingMetrics() {
  const signature = `v4-cross-in-gap|${filesSignature(trackingFilePaths())}`;
  return getCached("tracking-metrics-full-v4", signature, () =>
    computeTrackingMetrics(loadTrackingSurvey(), DEFAULT_TRACKING_TARGETS)
  );
}

export function loadTrackingExportPayload() {
  const metrics = loadTrackingMetrics();
  return {
    operationalKpiLists: metrics.operationalKpiLists,
    revisitLists: metrics.revisitDetail.lists,
    duplicateLists: metrics.duplicateDetail.lists,
  };
}
