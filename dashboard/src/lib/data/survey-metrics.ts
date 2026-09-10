import {
  girlKey,
  isGirlTrackedForMetrics,
  isTrackedSubmission,
  type TrackingRow,
} from "./tracking-metrics";
import { isCompletedHouseholdForGirl } from "./hh-girls-completion";
import type { HhGirlsRow } from "./hh-girls-metrics";
import { PROTOCOL } from "./protocol";
import {
  parseFlexibleDate,
  submissionTimestamp,
  toIsoDateString,
} from "../utils";
import {
  buildEnumeratorFilterOptions,
  enumeratorIdentityKey,
  matchesEnumeratorFilter,
} from "./enumerator-identity";
export type SurveyType = "tracking" | "household" | "girls";

export const DASHBOARD_SURVEY_TYPES: SurveyType[] = [
  "tracking",
  "household",
  "girls",
];

export interface SurveyRow {
  KEY: string;
  SubmissionDate: string;
  district: string;
  village?: string;
  village_label?: string;
  enumerator_name?: string;
  enumerator_id?: string;
  girl?: string;
  girl_id?: string;
  girlname_label?: string;
  school_label?: string;
  survey_status?: string;
  visit_num?: string;
  attempt?: string;
  respondent?: string;
  house_found?: string;
  girl_found?: string;
  consent?: string;
  survey_type: SurveyType;
  [key: string]: string | undefined;
}

export interface FilterOptions {
  districts: { value: string; label: string }[];
  enumerators: { value: string; label: string }[];
  dateRange: { start: string; end: string };
}

export interface DashboardFilters {
  /** Selected district values. Empty array means "all districts". */
  district: string[];
  /** Selected survey types. Every value selected (the default) means "all". */
  surveyType: SurveyType[];
  enumerator: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export const defaultDashboardFilters: DashboardFilters = {
  district: [],
  surveyType: [...DASHBOARD_SURVEY_TYPES],
  enumerator: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

export function createDefaultDashboardFilters(
  dateFrom = ""
): DashboardFilters {
  return { ...defaultDashboardFilters, dateFrom };
}

function sameValues(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const bSet = new Set(b);
  return a.every((v) => bSet.has(v));
}

export function dashboardFiltersEqual(
  a: DashboardFilters,
  b: DashboardFilters
): boolean {
  if (!sameValues(a.district, b.district)) return false;
  if (a.surveyType.length !== b.surveyType.length) return false;
  const bTypes = new Set(b.surveyType);
  if (!a.surveyType.every((t) => bTypes.has(t))) return false;

  return (
    a.enumerator === b.enumerator &&
    a.status === b.status &&
    a.dateFrom === b.dateFrom &&
    a.dateTo === b.dateTo
  );
}

/**
 * Toggle a single survey type within the multi-select surveyType filter --
 * narrows to just that type, or restores the full set if it's already the
 * only one selected. Chart tiles/bars call this instead of
 * toggleDashboardFilters (which skips surveyType, since it's an array).
 */
export function toggleDashboardSurveyType(
  filters: DashboardFilters,
  type: SurveyType
): DashboardFilters {
  const isOnlySelected =
    filters.surveyType.length === 1 && filters.surveyType[0] === type;
  return {
    ...filters,
    surveyType: isOnlySelected ? [...DASHBOARD_SURVEY_TYPES] : [type],
  };
}

/**
 * Toggle a single district within the multi-select district filter -- narrows
 * to just that district, or restores "all districts" (empty array) if it's
 * already the only one selected. Chart tiles/bars call this instead of
 * toggleDashboardFilters (which skips district, since it's an array).
 */
export function toggleDashboardDistrict(
  filters: DashboardFilters,
  district: string
): DashboardFilters {
  const isOnlySelected =
    filters.district.length === 1 && filters.district[0] === district;
  return {
    ...filters,
    district: isOnlySelected ? [] : [district],
  };
}

/** Toggle filter values from chart clicks - click again to clear. */
export function toggleDashboardFilters(
  current: DashboardFilters,
  patch: Partial<DashboardFilters>
): DashboardFilters {
  const next = { ...current };
  // surveyType and district are multi-select (arrays) -- handled separately
  // by toggleDashboardSurveyType / toggleDashboardDistrict in the chart
  // components, not by this single-value toggle.
  const keys = (Object.keys(patch) as (keyof DashboardFilters)[]).filter(
    (key) => key !== "surveyType" && key !== "district"
  );
  for (const key of keys) {
    const value = patch[key];
    if (value === undefined) continue;
    if (typeof value !== "string") continue;
    const isDate = key === "dateFrom" || key === "dateTo";
    const empty = isDate ? "" : "all";
    if (!value || value === empty) continue;
    const currentValue = current[key];
    if (typeof currentValue !== "string") continue;
    next[key] = currentValue === value ? empty : value;
  }
  return next;
}

function parseSubmissionDate(raw: string): Date | null {
  return parseFlexibleDate(raw);
}

function districtLabel(d: string): string {
  const map: Record<string, string> = {
    "1": "D.I. Khan",
    "2": "Hangu",
    "3": "Lakki Marwat",
    "4": "Torghar",
  };
  return map[d] || `District ${d}`;
}

function buildSubmissionTrend(rows: SurveyRow[]) {
  const trendMap = new Map<string, number>();
  for (const r of rows) {
    const parsed = parseSubmissionDate(r.SubmissionDate || "");
    const date = parsed
      ? toIsoDateString(parsed)
      : (r.SubmissionDate || "").split(" ")[0];
    if (!date) continue;
    trendMap.set(date, (trendMap.get(date) || 0) + 1);
  }
  return [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function buildCumulativeSparkline(trend: { date: string; count: number }[]) {
  let cumulative = 0;
  return trend.map((t) => {
    cumulative += t.count;
    return { date: t.date, value: cumulative };
  });
}

export function getFilterOptions(rows: SurveyRow[]): FilterOptions {
  const districtSet = new Set(rows.map((r) => r.district).filter(Boolean));

  const dates = rows
    .map((r) => parseSubmissionDate(r.SubmissionDate || ""))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    districts: [...districtSet].map((d) => ({
      value: d,
      label: districtLabel(d),
    })),
    enumerators: buildEnumeratorFilterOptions(rows),
    dateRange: {
      start: dates[0] ? toIsoDateString(dates[0]) : "",
      end: dates[dates.length - 1]
        ? toIsoDateString(dates[dates.length - 1]!)
        : "",
    },
  };
}

export function applyFilters(
  rows: SurveyRow[],
  filters: DashboardFilters
): SurveyRow[] {
  return rows.filter((r) => {
    if (filters.district.length > 0 && !filters.district.includes(r.district))
      return false;
    if (!filters.surveyType.includes(r.survey_type)) return false;
    if (!matchesEnumeratorFilter(r, filters.enumerator)) return false;
    if (filters.status === "complete" && r.survey_status !== "1") return false;
    if (filters.status === "incomplete" && r.survey_status === "1")
      return false;
    if (filters.status === "revisit") {
      const isRevisit = Number(r.visit_num) > 1 || Number(r.attempt) > 1;
      if (!isRevisit) return false;
    }
    const subDate = parseSubmissionDate(r.SubmissionDate || "");
    if (filters.dateFrom && subDate) {
      const from = new Date(filters.dateFrom);
      if (subDate < from) return false;
    }
    if (filters.dateTo && subDate) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      if (subDate > to) return false;
    }
    return true;
  });
}

function countCompletedHouseholds(
  household: SurveyRow[],
  girls: SurveyRow[]
): number {
  const hhByGirl = new Map<string, SurveyRow[]>();
  for (const row of household) {
    if (!row.girl) continue;
    if (!hhByGirl.has(row.girl)) hhByGirl.set(row.girl, []);
    hhByGirl.get(row.girl)!.push(row);
  }

  const gsByGirl = new Map<string, SurveyRow>();
  for (const row of girls) {
    if (row.girl) gsByGirl.set(row.girl, row);
  }

  let completed = 0;
  for (const girl of new Set([...hhByGirl.keys(), ...gsByGirl.keys()])) {
    const hhSubs = (hhByGirl.get(girl) || []) as HhGirlsRow[];
    const gsRow = gsByGirl.get(girl) as HhGirlsRow | undefined;
    if (isCompletedHouseholdForGirl(hhSubs, gsRow)) completed += 1;
  }
  return completed;
}

/** Match Tracking operational metrics: unique girls + tracked across all attempts. */
function countOperationalTrackingGirls(
  trackingInView: TrackingRow[],
  allTracking: TrackingRow[]
): { uniqueGirls: number; trackedGirls: number } {
  const attemptedKeys = new Set(
    trackingInView.map((r) => girlKey(r)).filter((k) => k.length > 0)
  );

  const allByGirl = new Map<string, TrackingRow[]>();
  for (const row of allTracking) {
    const key = girlKey(row);
    if (!key) continue;
    if (!allByGirl.has(key)) allByGirl.set(key, []);
    allByGirl.get(key)!.push(row);
  }

  let trackedGirls = 0;
  for (const key of attemptedKeys) {
    const subs = allByGirl.get(key) || [];
    if (subs.some(isGirlTrackedForMetrics)) trackedGirls += 1;
  }

  return { uniqueGirls: attemptedKeys.size, trackedGirls };
}

export function computeMetrics(
  rows: SurveyRow[],
  options?: { allRows?: SurveyRow[] }
) {
  const allRows = options?.allRows ?? rows;
  const tracking = rows.filter((r) => r.survey_type === "tracking");
  const household = rows.filter((r) => r.survey_type === "household");
  const girls = rows.filter((r) => r.survey_type === "girls");
  const allTracking = allRows.filter(
    (r) => r.survey_type === "tracking"
  ) as TrackingRow[];

  const { uniqueGirls: uniqueTrackingGirls, trackedGirls } =
    countOperationalTrackingGirls(tracking as TrackingRow[], allTracking);

  const trackingSuccessRate =
    uniqueTrackingGirls > 0 ? (trackedGirls / uniqueTrackingGirls) * 100 : 0;
  const trackingTargetProgress =
    PROTOCOL.SUCCESSFUL_TRACKING_TARGET > 0
      ? (trackedGirls / PROTOCOL.SUCCESSFUL_TRACKING_TARGET) * 100
      : 0;

  const uniqueHHGirls = new Set(household.map((r) => r.girl).filter(Boolean));
  const motherForms = household.filter((r) => r.respondent === "2");
  const fatherForms = household.filter((r) => r.respondent === "1");
  const bothParentGirls = [...uniqueHHGirls].filter((g) => {
    const subs = household.filter((r) => r.girl === g);
    const respondents = new Set(subs.map((s) => s.respondent));
    return respondents.has("1") && respondents.has("2");
  });
  const completedHouseholds = countCompletedHouseholds(household, girls);
  const hhTargetProgress =
    PROTOCOL.HH_SURVEY_TARGET > 0
      ? (completedHouseholds / PROTOCOL.HH_SURVEY_TARGET) * 100
      : 0;

  const hhCompletionRate =
    uniqueHHGirls.size > 0
      ? (bothParentGirls.length / uniqueHHGirls.size) * 100
      : 0;

  const girlsComplete = girls.filter((r) => r.survey_status === "1");
  const girlsCompletionRate =
    girls.length > 0 ? (girlsComplete.length / girls.length) * 100 : 0;
  const uniqueGirlsCompleted = new Set(
    girlsComplete.map((r) => r.girl).filter(Boolean)
  ).size;
  const girlsTargetProgress =
    PROTOCOL.HH_SURVEY_TARGET > 0
      ? (uniqueGirlsCompleted / PROTOCOL.HH_SURVEY_TARGET) * 100
      : 0;

  const completedSubmissions = rows.filter((r) => r.survey_status === "1").length;
  const surveyCompletionRate =
    rows.length > 0 ? (completedSubmissions / rows.length) * 100 : 0;

  const revisits =
    tracking.filter((r) => Number(r.visit_num) > 1).length +
    household.filter((r) => Number(r.attempt) > 1).length +
    girls.filter((r) => Number(r.attempt) > 1).length;

  const villages = new Set(
    rows.map((r) => r.village || r.village_label).filter(Boolean)
  );
  const schools = new Set(
    tracking.map((r) => r.school_label).filter(Boolean)
  );
  const enumerators = new Set(
    rows
      .map((r) => enumeratorIdentityKey(r))
      .filter((id) => id && id !== "unknown")
  );
  const districts = new Set(rows.map((r) => r.district).filter(Boolean));

  const districtPerformance = [...districts].map((d) => {
    const dTracking = tracking.filter((r) => r.district === d);
    const dHH = household.filter((r) => r.district === d);
    const dGirls = girls.filter((r) => r.district === d);
    const dTracked = dTracking.filter((r) =>
      isTrackedSubmission(r as TrackingRow)
    );
    return {
      district: d,
      label: districtLabel(d),
      trackingRate:
        dTracking.length > 0 ? (dTracked.length / dTracking.length) * 100 : 0,
      hhCompletion:
        dHH.length > 0
          ? (dHH.filter((r) => r.survey_status === "1").length / dHH.length) *
            100
          : 0,
      girlsCompletion:
        dGirls.length > 0
          ? (dGirls.filter((r) => r.survey_status === "1").length /
              dGirls.length) *
            100
          : 0,
      submissions: dTracking.length + dHH.length + dGirls.length,
    };
  });

  const trackingTrend = buildSubmissionTrend(tracking);
  const allSubmissionsTrend = buildSubmissionTrend(rows);
  const submissionSparkline = buildCumulativeSparkline(allSubmissionsTrend);

  const surveyDistribution = [
    { name: "Tracking", value: tracking.length, color: "#21A1AA" },
    // Unique households started — not parent form rows (mother+father inflate the count).
    { name: "Household", value: uniqueHHGirls.size, color: "#178891" },
    { name: "Girls", value: girls.length, color: "#EDCA5C" },
  ];
  const surveyMixTotal = surveyDistribution.reduce((sum, d) => sum + d.value, 0);

  const dates = rows
    .map((r) => parseSubmissionDate(r.SubmissionDate || ""))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  const filterOptions = getFilterOptions(rows);

  return {
    totalSubmissions: rows.length,
    girlsTracked: trackedGirls,
    totalEnumerators: enumerators.size,
    totalVillages: villages.size,
    totalSchools: schools.size,
    activeDistricts: districts.size,
    surveyCompletionRate,
    trackingSuccessRate,
    trackingTargetProgress,
    hhCompletionRate,
    girlsCompletionRate,
    girlsTargetProgress,
    uniqueGirlsCompleted,
    completedHouseholds,
    hhTargetProgress,
    totalRevisits: revisits,
    tracking: {
      total: tracking.length,
      tracked: trackedGirls,
      uniqueGirls: uniqueTrackingGirls,
      revisits: tracking.filter((r) => Number(r.visit_num) > 1).length,
      untracked: Math.max(0, uniqueTrackingGirls - trackedGirls),
    },
    household: {
      total: household.length,
      uniqueGirls: uniqueHHGirls.size,
      motherForms: motherForms.length,
      fatherForms: fatherForms.length,
      bothParent: bothParentGirls.length,
      completedHouseholds,
      completionRate: hhCompletionRate,
    },
    girls: {
      total: girls.length,
      complete: girlsComplete.length,
      uniqueCompleted: uniqueGirlsCompleted,
      revisits: girls.filter((r) => Number(r.attempt) > 1).length,
    },
    districtPerformance,
    trackingTrend,
    allSubmissionsTrend,
    submissionSparkline,
    surveyDistribution,
    surveyMixTotal,
    reportingPeriod: {
      start: filterOptions.dateRange.start,
      end: filterOptions.dateRange.end,
    },
    lastSubmissionDate: dates.length
      ? toIsoDateString(dates[dates.length - 1]!)
      : "",
    filterOptions,
    allSubmissions: rows
      .slice()
      .sort(
        (a, b) =>
          submissionTimestamp(b.SubmissionDate) -
          submissionTimestamp(a.SubmissionDate)
      ),
  };
}

export type DashboardMetrics = ReturnType<typeof computeMetrics>;
