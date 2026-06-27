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

const DATA_ROOT = path.join(process.cwd(), "..");

const TRACKING_SOURCES: { file: string; cohort: TrackingCohort }[] = [
  { file: "Tracking_Survey_Baseline.csv", cohort: "baseline" },
  { file: "Tracking_Survey_NewSample.csv", cohort: "new-sample" },
];

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

export function loadTrackingSurvey(): TrackingRow[] {
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

export function loadTrackingMetrics() {
  const rows = loadTrackingSurvey();
  return computeTrackingMetrics(rows, DEFAULT_TRACKING_TARGETS);
}
