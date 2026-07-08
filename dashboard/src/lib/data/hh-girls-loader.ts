import fs from "fs";
import path from "path";
import Papa from "papaparse";
import {
  applyHhGirlsFilters,
  computeHhGirlsMetrics,
  type HhGirlsRow,
} from "./hh-girls-metrics";
import { filesSignature, getCached } from "./survey-cache";
import {
  mergeHhGirlsExportLists,
  stripHhGirlsExportLists,
} from "./hh-girls-serialization";

export {
  mergeHhGirlsExportLists,
  stripHhGirlsExportLists,
} from "./hh-girls-serialization";

export type {
  HhGirlsRow,
  HhGirlsMetrics,
  HhGirlsFilters,
  HhGirlsFilterOptions,
} from "./hh-girls-metrics";
export {
  applyHhGirlsFilters,
  applyHhGirlsDataFilters,
  computeHhGirlsMetrics,
  defaultHhGirlsFilters,
  getHhGirlsFilterOptions,
  hhGirlsFiltersEqual,
  hhGirlsSurveyFilterLabel,
  HH_GIRLS_SURVEY_FILTER_OPTIONS,
} from "./hh-girls-metrics";

const DATA_ROOT = path.join(process.cwd(), "..");

const HH_GIRLS_FILES = ["Household_Survey.csv", "Girls_Survey.csv"];

function hhGirlsFilePaths(): string[] {
  return HH_GIRLS_FILES.map((f) => path.join(DATA_ROOT, "Surveys", f));
}

function parseCsv(filePath: string, surveyType: "household" | "girls"): HhGirlsRow[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.map((row) => ({
    ...row,
    survey_type: surveyType,
  })) as HhGirlsRow[];
}

function readHhGirlsSurveys(): { household: HhGirlsRow[]; girls: HhGirlsRow[] } {
  return {
    household: parseCsv(
      path.join(DATA_ROOT, "Surveys", "Household_Survey.csv"),
      "household"
    ),
    girls: parseCsv(path.join(DATA_ROOT, "Surveys", "Girls_Survey.csv"), "girls"),
  };
}

export function loadHhGirlsSurveys() {
  const signature = filesSignature(hhGirlsFilePaths());
  return getCached("hh-girls-rows", signature, readHhGirlsSurveys);
}

export function loadHhGirlsMetrics() {
  const signature = filesSignature(hhGirlsFilePaths());
  return getCached("hh-girls-metrics", signature, () => {
    const { household, girls } = readHhGirlsSurveys();
    return computeHhGirlsMetrics(household, girls);
  });
}

export function loadHhGirlsMetricsForClient() {
  return stripHhGirlsExportLists(loadHhGirlsMetrics());
}

export function loadHhGirlsExportPayload() {
  const metrics = loadHhGirlsMetrics();
  return {
    revisitLists: metrics.revisitDetail.lists,
    duplicateLists: metrics.duplicateDetail.lists,
    coreKpiLists: metrics.coreKpiLists,
  };
}
