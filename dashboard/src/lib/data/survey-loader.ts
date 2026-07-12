import path from "path";
import {
  applyFilters,
  computeMetrics,
  createDefaultDashboardFilters,
  getFilterOptions,
  type SurveyRow,
} from "./survey-metrics";
import { loadTrackingSurvey } from "./tracking-loader";
import { loadHhGirlsSurveys } from "./hh-girls-loader";
import { FIELD_PERIOD_START } from "./field-period";
import { filesSignature, getCached } from "./survey-cache";

export type {
  SurveyRow,
  SurveyType,
  DashboardMetrics,
  DashboardFilters,
  FilterOptions,
} from "./survey-metrics";
export {
  computeMetrics,
  applyFilters,
  getFilterOptions,
  createDefaultDashboardFilters,
  dashboardFiltersEqual,
} from "./survey-metrics";

const DATA_ROOT = path.join(process.cwd(), "..");

const SURVEY_FILES = [
  "Tracking_Survey_Baseline.csv",
  "Tracking_Survey_NewSample.csv",
  "Tracking_Survey.csv",
  "Household_Survey.csv",
  "Girls_Survey.csv",
];

function surveyFilePaths(): string[] {
  return SURVEY_FILES.map((f) => path.join(DATA_ROOT, "Surveys", f));
}

/** Prefer shared tracking + HH caches so CSVs are not re-parsed per API. */
function readAllSurveys(): SurveyRow[] {
  const tracking = loadTrackingSurvey().map(
    (row) =>
      ({
        ...row,
        survey_type: "tracking",
      }) as SurveyRow
  );
  const { household, girls } = loadHhGirlsSurveys();
  return [
    ...tracking,
    ...(household as SurveyRow[]),
    ...(girls as SurveyRow[]),
  ];
}

export function loadAllSurveys(): SurveyRow[] {
  const signature = filesSignature(surveyFilePaths());
  return getCached("dashboard-rows-v2", signature, readAllSurveys);
}

/** Unfiltered full metrics (reports / legacy). */
export function loadDashboardMetrics() {
  const signature = `v2|${filesSignature(surveyFilePaths())}`;
  return getCached("dashboard-metrics-v2", signature, () =>
    computeMetrics(loadAllSurveys())
  );
}

/**
 * Client dashboard payload: aggregates for the default field period,
 * plus full-row arrays and full-span filter options for client filtering.
 */
export function loadDashboardMetricsForClient() {
  const signature = `v3-fp|${FIELD_PERIOD_START}|${filesSignature(surveyFilePaths())}`;
  return getCached("dashboard-metrics-client-v3", signature, () => {
    const allRows = loadAllSurveys();
    const fieldPeriodRows = applyFilters(
      allRows,
      createDefaultDashboardFilters(FIELD_PERIOD_START)
    );
    const metrics = computeMetrics(fieldPeriodRows, { allRows });
    return {
      ...metrics,
      // Full calendar span so users can select March (and earlier) dates.
      filterOptions: getFilterOptions(allRows),
      allSubmissions: allRows,
    };
  });
}

