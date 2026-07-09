import { isTrackedSubmission, type TrackingRow } from "./tracking-metrics";

export type SurveyType = "tracking" | "household" | "girls";

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
  district: string;
  surveyType: string;
  enumerator: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export const defaultDashboardFilters: DashboardFilters = {
  district: "all",
  surveyType: "all",
  enumerator: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

/** Toggle filter values from chart clicks - click again to clear. */
export function toggleDashboardFilters(
  current: DashboardFilters,
  patch: Partial<DashboardFilters>
): DashboardFilters {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch) as [
    keyof DashboardFilters,
    string | undefined,
  ][]) {
    if (value === undefined) continue;
    const isDate = key === "dateFrom" || key === "dateTo";
    const empty = isDate ? "" : "all";
    if (!value || value === empty) continue;
    next[key] = current[key] === value ? empty : value;
  }
  return next;
}

function parseSubmissionDate(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
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

function cleanEnumeratorName(name?: string): string {
  if (!name) return "";
  return name.replace(/\(.*\)/, "").trim();
}

function buildSubmissionTrend(rows: SurveyRow[]) {
  const trendMap = new Map<string, number>();
  for (const r of rows) {
    const parsed = parseSubmissionDate(r.SubmissionDate || "");
    const date = parsed
      ? parsed.toISOString().slice(0, 10)
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
  const enumeratorMap = new Map<string, string>();

  for (const r of rows) {
    const id = r.enumerator_id || r.enumerator_name || "";
    if (!id) continue;
    const label = cleanEnumeratorName(r.enumerator_name) || id;
    enumeratorMap.set(id, label);
  }

  const dates = rows
    .map((r) => parseSubmissionDate(r.SubmissionDate || ""))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    districts: [...districtSet].map((d) => ({
      value: d,
      label: districtLabel(d),
    })),
    enumerators: [...enumeratorMap.entries()].map(([value, label]) => ({
      value,
      label,
    })),
    dateRange: {
      start: dates[0]?.toISOString().slice(0, 10) || "",
      end: dates[dates.length - 1]?.toISOString().slice(0, 10) || "",
    },
  };
}

export function applyFilters(
  rows: SurveyRow[],
  filters: DashboardFilters
): SurveyRow[] {
  return rows.filter((r) => {
    if (filters.district !== "all" && r.district !== filters.district)
      return false;
    if (filters.surveyType !== "all" && r.survey_type !== filters.surveyType)
      return false;
    if (
      filters.enumerator !== "all" &&
      r.enumerator_id !== filters.enumerator &&
      r.enumerator_name !== filters.enumerator
    )
      return false;
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

export function computeMetrics(rows: SurveyRow[]) {
  const tracking = rows.filter((r) => r.survey_type === "tracking");
  const household = rows.filter((r) => r.survey_type === "household");
  const girls = rows.filter((r) => r.survey_type === "girls");

  const uniqueTrackingGirls = new Set(
    tracking.map((r) => r.girl_id || r.girl).filter(Boolean)
  );
  const trackedGirlIds = new Set(
    tracking
      .filter((r) => isTrackedSubmission(r as TrackingRow))
      .map((r) => r.girl_id || r.girl)
      .filter(Boolean)
  );

  const trackingSuccessRate =
    uniqueTrackingGirls.size > 0
      ? (trackedGirlIds.size / uniqueTrackingGirls.size) * 100
      : 0;

  const uniqueHHGirls = new Set(household.map((r) => r.girl).filter(Boolean));
  const motherForms = household.filter((r) => r.respondent === "2");
  const fatherForms = household.filter((r) => r.respondent === "1");
  const bothParentGirls = [...uniqueHHGirls].filter((g) => {
    const subs = household.filter((r) => r.girl === g);
    const respondents = new Set(subs.map((s) => s.respondent));
    return respondents.has("1") && respondents.has("2");
  });

  const hhCompletionRate =
    uniqueHHGirls.size > 0
      ? (bothParentGirls.length / uniqueHHGirls.size) * 100
      : 0;

  const girlsComplete = girls.filter((r) => r.survey_status === "1");
  const girlsCompletionRate =
    girls.length > 0 ? (girlsComplete.length / girls.length) * 100 : 0;

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
    rows.map((r) => r.enumerator_id || r.enumerator_name).filter(Boolean)
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
    { name: "Household", value: household.length, color: "#178891" },
    { name: "Girls", value: girls.length, color: "#EDCA5C" },
  ];

  const dates = rows
    .map((r) => parseSubmissionDate(r.SubmissionDate || ""))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  const filterOptions = getFilterOptions(rows);

  return {
    totalSubmissions: rows.length,
    girlsTracked: trackedGirlIds.size,
    totalEnumerators: enumerators.size,
    totalVillages: villages.size,
    totalSchools: schools.size,
    activeDistricts: districts.size,
    surveyCompletionRate,
    trackingSuccessRate,
    hhCompletionRate,
    girlsCompletionRate,
    totalRevisits: revisits,
    tracking: {
      total: tracking.length,
      tracked: trackedGirlIds.size,
      uniqueGirls: uniqueTrackingGirls.size,
      revisits: tracking.filter((r) => Number(r.visit_num) > 1).length,
      untracked: uniqueTrackingGirls.size - trackedGirlIds.size,
    },
    household: {
      total: household.length,
      uniqueGirls: uniqueHHGirls.size,
      motherForms: motherForms.length,
      fatherForms: fatherForms.length,
      bothParent: bothParentGirls.length,
      completionRate: hhCompletionRate,
    },
    girls: {
      total: girls.length,
      complete: girlsComplete.length,
      revisits: girls.filter((r) => Number(r.attempt) > 1).length,
    },
    districtPerformance,
    trackingTrend,
    allSubmissionsTrend,
    submissionSparkline,
    surveyDistribution,
    reportingPeriod: {
      start: filterOptions.dateRange.start,
      end: filterOptions.dateRange.end,
    },
    lastSubmissionDate: dates[dates.length - 1]?.toISOString() || "",
    filterOptions,
    allSubmissions: rows
      .slice()
      .sort(
        (a, b) =>
          new Date(b.SubmissionDate || 0).getTime() -
          new Date(a.SubmissionDate || 0).getTime()
      ),
  };
}

export type DashboardMetrics = ReturnType<typeof computeMetrics>;
