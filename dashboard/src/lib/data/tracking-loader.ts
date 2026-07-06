import fs from "fs";
import path from "path";
import Papa from "papaparse";
import {
  computeTrackingMetrics,
  inferTrackingSession,
  type TrackingCohort,
  type TrackingRow,
} from "./tracking-metrics";
import { DEFAULT_TRACKING_TARGETS } from "./protocol";
import { filesSignature, getCached } from "./survey-cache";
import { stripTrackingExportLists } from "./tracking-serialization";

export {
  mergeTrackingExportLists,
  stripTrackingExportLists,
} from "./tracking-serialization";

const DATA_ROOT = path.join(process.cwd(), "..");

const TRACKING_SOURCES: { file: string; cohort: TrackingCohort }[] = [
  { file: "Tracking_Survey_Baseline.csv", cohort: "baseline" },
  { file: "Tracking_Survey_NewSample.csv", cohort: "new-sample" },
];

function trackingFilePaths(): string[] {
  return [
    ...TRACKING_SOURCES.map((s) => path.join(DATA_ROOT, "Surveys", s.file)),
    path.join(DATA_ROOT, "Surveys", "Tracking_Survey.csv"),
  ];
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
    return session ? { ...enriched, session } : enriched;
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

export function loadTrackingMetrics() {
  const signature = filesSignature(trackingFilePaths());
  return getCached("tracking-metrics", signature, () =>
    computeTrackingMetrics(loadTrackingSurvey(), DEFAULT_TRACKING_TARGETS)
  );
}

export function loadTrackingMetricsForClient() {
  return stripTrackingExportLists(loadTrackingMetrics());
}

export function loadTrackingExportPayload() {
  const metrics = loadTrackingMetrics();
  return {
    operationalKpiLists: metrics.operationalKpiLists,
    revisitLists: metrics.revisitDetail.lists,
    duplicateLists: metrics.duplicateDetail.lists,
  };
}
