import fs from "fs";
import path from "path";
import Papa from "papaparse";
import {
  applyHhGirlsDataFilters,
  applyHhGirlsFilters,
  computeHhGirlsMetrics,
  createDefaultHhGirlsFilters,
  type HhGirlsRow,
} from "./hh-girls-metrics";
import { FIELD_PERIOD_START } from "./field-period";
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
  createDefaultHhGirlsFilters,
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
  return getCached("hh-girls-rows-v2", signature, readHhGirlsSurveys);
}

export function loadHhGirlsMetrics() {
  const signature = `v9-fp|${filesSignature(hhGirlsFilePaths())}`;
  return getCached("hh-girls-metrics-v9", signature, () => {
    const { household, girls } = loadHhGirlsSurveys();
    return computeHhGirlsMetrics(household, girls);
  });
}

/**
 * Client payload: metrics scoped to the default field period, with full row
 * arrays retained for further filtering without a refetch.
 */
export function loadHhGirlsMetricsForClient() {
  const signature = `v9-fp-client|${FIELD_PERIOD_START}|${filesSignature(hhGirlsFilePaths())}`;
  return getCached("hh-girls-metrics-client-v9", signature, () => {
    const { household, girls } = loadHhGirlsSurveys();
    const filtered = applyHhGirlsDataFilters(
      household,
      girls,
      createDefaultHhGirlsFilters(FIELD_PERIOD_START)
    );
    const metrics = stripHhGirlsExportLists(
      computeHhGirlsMetrics(filtered.household, filtered.girls)
    );
    return {
      ...metrics,
      allHousehold: household,
      allGirls: girls,
    };
  });
}

export function loadHhGirlsExportPayload() {
  const metrics = loadHhGirlsMetrics();
  return {
    revisitLists: metrics.revisitDetail.lists,
    missingLists: metrics.missingDetail.lists,
    duplicateLists: metrics.duplicateDetail.lists,
    coreKpiLists: metrics.coreKpiLists,
  };
}
