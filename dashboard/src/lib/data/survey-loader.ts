import path from "path";
import {
  applyFilters,
  computeMetrics,
  createDefaultDashboardFilters,
  getFilterOptions,
  type SurveyRow,
  type TrackingFrame,
} from "./survey-metrics";
import { loadTrackingSurvey } from "./tracking-loader";
import { computeTrackingTargetGaps } from "./tracking-target-gaps";
import { trackingTargetsAvailable } from "./tracking-targets-loader";
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

const TARGET_FILES = [
  "Tracking_Survey_Baseline.xlsx",
  "Tracking_Survey_NewSample.xlsx",
];

function surveyFilePaths(): string[] {
  return [
    ...SURVEY_FILES.map((f) => path.join(DATA_ROOT, "Surveys", f)),
    ...TARGET_FILES.map((f) => path.join(DATA_ROOT, "Tracking_Targets", f)),
  ];
}

/** Assignment-list girls, so dashboard tracking KPIs match the Tracking page. */
function loadTrackingFrame(): TrackingFrame | undefined {
  if (!trackingTargetsAvailable()) return undefined;
  const gaps = computeTrackingTargetGaps(loadTrackingSurvey());
  const keys = new Set<string>();
  for (const g of [
    ...gaps.notAttemptedGirls,
    ...gaps.needsRevisitGirls,
    ...gaps.attemptedNotTrackedGirls,
    ...(gaps.trackedGirls ?? []),
  ]) {
    if (g.girlId) keys.add(g.girlId);
    if (g.surveyGirlKey) keys.add(g.surveyGirlKey);
  }
  return { girlKeys: [...keys] };
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
  const signature = `v3|${filesSignature(surveyFilePaths())}`;
  return getCached("dashboard-metrics-v4", signature, () =>
    computeMetrics(loadAllSurveys(), { trackingFrame: loadTrackingFrame() })
  );
}

/**
 * Client dashboard payload: aggregates for the default field period,
 * plus full-row arrays and full-span filter options for client filtering.
 */
export function loadDashboardMetricsForClient() {
  const signature = `v4-fp|${FIELD_PERIOD_START}|${filesSignature(surveyFilePaths())}`;
  return getCached("dashboard-metrics-client-v5", signature, () => {
    const allRows = loadAllSurveys();
    const fieldPeriodRows = applyFilters(
      allRows,
      createDefaultDashboardFilters(FIELD_PERIOD_START)
    );
    const metrics = computeMetrics(fieldPeriodRows, {
      allRows,
      trackingFrame: loadTrackingFrame(),
    });
    return {
      ...metrics,
      // Full calendar span so users can select March (and earlier) dates.
      filterOptions: getFilterOptions(allRows),
      allSubmissions: allRows,
    };
  });
}

