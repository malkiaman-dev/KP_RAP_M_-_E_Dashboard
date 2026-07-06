import fs from "fs";
import path from "path";
import Papa from "papaparse";
import {
  computeMetrics,
  type SurveyRow,
  type SurveyType,
} from "./survey-metrics";
import { filesSignature, getCached } from "./survey-cache";

export type {
  SurveyRow,
  SurveyType,
  DashboardMetrics,
  DashboardFilters,
  FilterOptions,
} from "./survey-metrics";
export { computeMetrics, applyFilters, getFilterOptions } from "./survey-metrics";

const DATA_ROOT = path.join(process.cwd(), "..");

const SURVEY_FILES: { file: string; type: SurveyType }[] = [
  { file: "Tracking_Survey_Baseline.csv", type: "tracking" },
  { file: "Tracking_Survey_NewSample.csv", type: "tracking" },
  { file: "Tracking_Survey.csv", type: "tracking" },
  { file: "Household_Survey.csv", type: "household" },
  { file: "Girls_Survey.csv", type: "girls" },
];

function surveyFilePaths(): string[] {
  return SURVEY_FILES.map((s) => path.join(DATA_ROOT, "Surveys", s.file));
}

function parseCsv(filePath: string, surveyType: SurveyType): SurveyRow[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.map((row) => ({
    ...row,
    survey_type: surveyType,
  })) as SurveyRow[];
}

function readAllSurveys(): SurveyRow[] {
  const trackingBaseline = parseCsv(
    path.join(DATA_ROOT, "Surveys", "Tracking_Survey_Baseline.csv"),
    "tracking"
  );
  const trackingNewSample = parseCsv(
    path.join(DATA_ROOT, "Surveys", "Tracking_Survey_NewSample.csv"),
    "tracking"
  );
  const tracking =
    trackingBaseline.length + trackingNewSample.length > 0
      ? [...trackingBaseline, ...trackingNewSample]
      : parseCsv(
          path.join(DATA_ROOT, "Surveys", "Tracking_Survey.csv"),
          "tracking"
        );
  const household = parseCsv(
    path.join(DATA_ROOT, "Surveys", "Household_Survey.csv"),
    "household"
  );
  const girls = parseCsv(
    path.join(DATA_ROOT, "Surveys", "Girls_Survey.csv"),
    "girls"
  );
  return [...tracking, ...household, ...girls];
}

export function loadAllSurveys(): SurveyRow[] {
  const signature = filesSignature(surveyFilePaths());
  return getCached("dashboard-rows", signature, readAllSurveys);
}

export function loadDashboardMetrics() {
  const signature = filesSignature(surveyFilePaths());
  return getCached("dashboard-metrics", signature, () =>
    computeMetrics(loadAllSurveys())
  );
}
