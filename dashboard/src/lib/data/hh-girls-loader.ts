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
  return getCached("hh-girls-metrics-v10", signature, () => {
    const { household, girls } = loadHhGirlsSurveys();
    return computeHhGirlsMetrics(household, girls);
  });
}

/**
 * Columns the browser-side HH / Girls code reads (filters, metrics, monitoring,
 * reports). The CSVs have ~2,100 columns; sending only these keeps the
 * /api/hh-girls payload small. A new field read on the client must be added here.
 */
const CLIENT_ROW_COLUMNS = new Set([
  "survey_type", "KEY", "instanceID", "SubmissionDate", "starttime", "endtime", "duration",
  "formdef_version", "enumerator", "enumerator_id", "enumerator_name",
  "district", "district_label", "village", "village_label", "Address", "landmark",
  "girl", "girlname_label", "fathername_label", "phonenumber", "name", "age",
  "attempt", "available", "available_caretaker", "respondent", "respondent_selection",
  "agree_consent_father", "agree_consent_mother", "agree_consent_caregiver",
  "father_unavailable1", "father_unavailable_other", "mother_unavailable1", "mother_unavailable_other",
  "girl_available", "girl_available_reason", "girl_available_reason_other",
  "parental_consent_agree", "child_consent_agree",
  "survey_status", "survey_status_othr", "survey_comments",
  "currently_studying", "enroll_24_25", "days_school", "school", "girls_school",
  "ay2425schoolname", "middleschool_label",
  "schoollist_22_23_label_1", "schoollist_23_24_label_1", "schoollist_24_25_label_1",
  "married", "max_fee", "mode_transport", "transport", "how_far", "months",
  "alone", "children", "common", "concern", "concerns", "family", "finish", "follows",
  "help", "incorrect", "last_word", "other", "reason", "share", "work",
]);
/** Household roster names, read by the same-girl-two-IDs duplicate check. */
const CLIENT_ROW_COLUMN_PATTERN = /^name_(sibling_)?\d+$/;

function slimRows(rows: HhGirlsRow[]): HhGirlsRow[] {
  return rows.map((row) => {
    const out: Record<string, string | undefined> = {};
    for (const key in row) {
      if (CLIENT_ROW_COLUMNS.has(key) || CLIENT_ROW_COLUMN_PATTERN.test(key)) {
        out[key] = row[key];
      }
    }
    return out as HhGirlsRow;
  });
}

/**
 * Client payload: metrics scoped to the default field period, with the row
 * arrays (client columns only) retained for further filtering without a refetch.
 */
export function loadHhGirlsMetricsForClient() {
  const signature = `v9-fp-client|${FIELD_PERIOD_START}|${filesSignature(hhGirlsFilePaths())}`;
  return getCached("hh-girls-metrics-client-v11-slim", signature, () => {
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
      allHousehold: slimRows(household),
      allGirls: slimRows(girls),
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
