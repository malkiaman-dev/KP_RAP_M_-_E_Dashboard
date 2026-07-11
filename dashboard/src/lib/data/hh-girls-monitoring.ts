import { isCompletedHouseholdForGirl } from "./hh-girls-completion";
import {
  districtLabel,
  isFatherRespondent,
  isMotherRespondent,
  type HhGirlsFilters,
  type HhGirlsRow,
} from "./hh-girls-metrics";

export interface HhGirlsEnumeratorPerformance {
  id: string;
  name: string;
  district: string;
  submissions: number;
  motherForms: number;
  fatherForms: number;
  girlsForms: number;
  uniqueGirls: number;
  completedHouseholds: number;
  successRate: number;
  activeDays: number;
  avgCompletedPerDay: number;
  avgSubmissionsPerDay: number;
  dailyHhTarget: number;
  dailyFormsTarget: number;
  expectedCompleted: number;
  expectedSubmissions: number;
  /** Completed-HH attainment vs days × 3 */
  targetAttainment: number;
  /** Forms attainment vs days × 9 */
  submissionTargetAttainment: number;
  daysMeetingTarget: number;
  onTrack: boolean;
}

export interface HhGirlsDailyMonitoringPoint {
  date: string;
  submissions: number;
  completedHouseholds: number;
  activeEnumerators: number;
  expectedCompleted: number;
  expectedSubmissions: number;
  avgCompletedPerEnumerator: number;
  targetAttainment: number;
}

function parseSubmissionDate(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function submissionDateKey(r: HhGirlsRow): string {
  const date = parseSubmissionDate(r.SubmissionDate || "");
  return date
    ? date.toISOString().slice(0, 10)
    : (r.SubmissionDate || "").slice(0, 10);
}

function enumeratorIdentityKey(r: HhGirlsRow): string {
  return (r.enumerator_id || r.enumerator_name || "").trim() || "unknown";
}

function cleanEnumeratorName(name?: string): string {
  if (!name) return "";
  return name.replace(/\(.*\)/, "").trim();
}

function displayEnumeratorName(subs: HhGirlsRow[]): string {
  for (const s of subs) {
    const cleaned = cleanEnumeratorName(s.enumerator_name);
    if (cleaned) return cleaned;
  }
  return enumeratorIdentityKey(subs[0]!);
}

function girlKey(r: HhGirlsRow): string {
  return (r.girl || "").trim();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type HhGirlsMonitoringFilters = HhGirlsFilters & {
  todayOnly: boolean;
};

/** Apply filters including optional today-only (monitoring). */
export function applyHhGirlsMonitoringFilters(
  household: HhGirlsRow[],
  girls: HhGirlsRow[],
  filters: HhGirlsMonitoringFilters
): { household: HhGirlsRow[]; girls: HhGirlsRow[] } {
  const effective: HhGirlsFilters = { ...filters };
  if (filters.todayOnly) {
    const today = todayIso();
    effective.dateFrom = today;
    effective.dateTo = today;
  }

  const match = (r: HhGirlsRow) => {
    if (effective.district !== "all" && r.district !== effective.district)
      return false;
    if (
      effective.enumerator !== "all" &&
      enumeratorIdentityKey(r) !== effective.enumerator &&
      r.enumerator_name !== effective.enumerator
    )
      return false;
    if (
      effective.village !== "all" &&
      (r.village_label || r.village || "").trim() !== effective.village
    )
      return false;
    const subDate = parseSubmissionDate(r.SubmissionDate || "");
    if (effective.dateFrom && subDate) {
      const from = new Date(effective.dateFrom);
      if (subDate < from) return false;
    }
    if (effective.dateTo && subDate) {
      const to = new Date(effective.dateTo);
      to.setHours(23, 59, 59, 999);
      if (subDate > to) return false;
    }
    return true;
  };

  let hh = household.filter(match);
  let gs = girls.filter(match);

  if (effective.surveyType === "household") gs = [];
  else if (effective.surveyType === "girls") hh = [];

  return { household: hh, girls: gs };
}

export function defaultHhGirlsMonitoringFilters(): HhGirlsMonitoringFilters {
  return {
    surveyType: "all",
    district: "all",
    enumerator: "all",
    village: "all",
    dateFrom: "",
    dateTo: "",
    todayOnly: false,
  };
}

export function toggleHhGirlsMonitoringFilters(
  filters: HhGirlsMonitoringFilters,
  patch: Partial<HhGirlsMonitoringFilters>
): HhGirlsMonitoringFilters {
  const next: HhGirlsMonitoringFilters = {
    ...filters,
    ...patch,
    todayOnly: patch.todayOnly ?? filters.todayOnly,
  };
  if ("enumerator" in patch && patch.enumerator !== undefined) {
    next.enumerator =
      filters.enumerator === patch.enumerator ? "all" : patch.enumerator;
  }
  if ("district" in patch && patch.district !== undefined) {
    next.district =
      filters.district === patch.district ? "all" : patch.district;
  }
  if ("village" in patch && patch.village !== undefined) {
    next.village = filters.village === patch.village ? "all" : patch.village;
  }
  if (patch.todayOnly === true) {
    next.dateFrom = "";
    next.dateTo = "";
  }
  return next;
}

function buildCompletedGirlSet(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): Set<string> {
  const girlIds = new Set<string>();
  for (const r of [...household, ...girls]) {
    const g = girlKey(r);
    if (g) girlIds.add(g);
  }

  const completed = new Set<string>();
  for (const girl of girlIds) {
    const hhSubs = household.filter((r) => girlKey(r) === girl);
    const gsSubs = girls.filter((r) => girlKey(r) === girl);
    const gsRow = gsSubs[gsSubs.length - 1];
    if (isCompletedHouseholdForGirl(hhSubs, gsRow)) {
      completed.add(girl);
    }
  }
  return completed;
}

/**
 * Enumerator productivity for HH/Girls surveys.
 * Daily HH target = completed households (default 3).
 * Daily forms target = mother+father+girl forms (default 9 = 3×3).
 */
export function computeHhGirlsMonitoringMetrics(
  household: HhGirlsRow[],
  girls: HhGirlsRow[],
  dailyHhTarget = 3,
  dailyFormsTarget = 9
) {
  const hhTarget = dailyHhTarget > 0 ? dailyHhTarget : 3;
  const formsTarget = dailyFormsTarget > 0 ? dailyFormsTarget : 9;
  const rows = [...household, ...girls];
  const completedGirls = buildCompletedGirlSet(household, girls);

  const byEnumerator = new Map<string, HhGirlsRow[]>();
  for (const r of rows) {
    const id = enumeratorIdentityKey(r);
    if (!byEnumerator.has(id)) byEnumerator.set(id, []);
    byEnumerator.get(id)!.push(r);
  }

  let enumeratorDays = 0;
  let enumeratorDaysMeetingTarget = 0;

  const enumeratorPerformance: HhGirlsEnumeratorPerformance[] = [
    ...byEnumerator.entries(),
  ]
    .map(([identityKey, subs]) => {
      const uniqueGirlIds = new Set(
        subs.map(girlKey).filter(Boolean)
      );
      const completedHouseholds = [...uniqueGirlIds].filter((g) =>
        completedGirls.has(g)
      ).length;

      const completedByDay = new Map<string, Set<string>>();
      const allDays = new Set<string>();
      for (const r of subs) {
        const day = submissionDateKey(r);
        if (!day) continue;
        allDays.add(day);
        const g = girlKey(r);
        if (g && completedGirls.has(g)) {
          if (!completedByDay.has(day)) completedByDay.set(day, new Set());
          completedByDay.get(day)!.add(g);
        }
      }
      const activeDays = allDays.size || 1;
      const daysMeetingTarget = [...completedByDay.values()].filter(
        (set) => set.size >= hhTarget
      ).length;

      enumeratorDays += allDays.size;
      enumeratorDaysMeetingTarget += daysMeetingTarget;

      const motherForms = subs.filter(
        (r) =>
          r.survey_type === "household" && isMotherRespondent(r.respondent)
      ).length;
      const fatherForms = subs.filter(
        (r) =>
          r.survey_type === "household" && isFatherRespondent(r.respondent)
      ).length;
      const girlsForms = subs.filter((r) => r.survey_type === "girls").length;

      const avgCompletedPerDay = completedHouseholds / activeDays;
      const avgSubmissionsPerDay = subs.length / activeDays;
      const expectedCompleted = allDays.size * hhTarget;
      const expectedSubmissions = allDays.size * formsTarget;

      return {
        id: identityKey,
        name: displayEnumeratorName(subs),
        district: districtLabel(subs[0]?.district || ""),
        submissions: subs.length,
        motherForms,
        fatherForms,
        girlsForms,
        uniqueGirls: uniqueGirlIds.size,
        completedHouseholds,
        successRate:
          uniqueGirlIds.size > 0
            ? (completedHouseholds / uniqueGirlIds.size) * 100
            : 0,
        activeDays: allDays.size,
        avgCompletedPerDay,
        avgSubmissionsPerDay,
        dailyHhTarget: hhTarget,
        dailyFormsTarget: formsTarget,
        expectedCompleted,
        expectedSubmissions,
        targetAttainment:
          expectedCompleted > 0
            ? (completedHouseholds / expectedCompleted) * 100
            : 0,
        submissionTargetAttainment:
          expectedSubmissions > 0
            ? (subs.length / expectedSubmissions) * 100
            : 0,
        daysMeetingTarget,
        onTrack: avgCompletedPerDay >= hhTarget,
      };
    })
    .sort((a, b) => b.completedHouseholds - a.completedHouseholds);

  const byDay = new Map<string, HhGirlsRow[]>();
  for (const r of rows) {
    const day = submissionDateKey(r);
    if (!day) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(r);
  }

  const dailyTrend: HhGirlsDailyMonitoringPoint[] = [...byDay.entries()]
    .map(([date, subs]) => {
      const activeEnumerators = new Set(
        subs.map((r) => enumeratorIdentityKey(r))
      ).size;
      const completedHouseholds = new Set(
        subs.map(girlKey).filter((g) => g && completedGirls.has(g))
      ).size;
      const expectedCompleted = activeEnumerators * hhTarget;
      const expectedSubmissions = activeEnumerators * formsTarget;
      return {
        date,
        submissions: subs.length,
        completedHouseholds,
        activeEnumerators,
        expectedCompleted,
        expectedSubmissions,
        avgCompletedPerEnumerator:
          activeEnumerators > 0
            ? completedHouseholds / activeEnumerators
            : 0,
        targetAttainment:
          expectedCompleted > 0
            ? (completedHouseholds / expectedCompleted) * 100
            : 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalCompleted = completedGirls.size;
  const uniqueGirls = new Set(rows.map(girlKey).filter(Boolean)).size;
  const activeEnumerators = byEnumerator.size;
  const activeFieldDays = byDay.size;
  const expectedCompleted = enumeratorDays * hhTarget;
  const expectedSubmissions = enumeratorDays * formsTarget;

  const topPerformer = enumeratorPerformance[0];
  const lowPerformer = [...enumeratorPerformance]
    .filter((e) => e.activeDays > 0)
    .sort((a, b) => a.avgCompletedPerDay - b.avgCompletedPerDay)[0];

  return {
    dailyHhTarget: hhTarget,
    dailyFormsTarget: formsTarget,
    totalSubmissions: rows.length,
    motherForms: household.filter((r) => isMotherRespondent(r.respondent))
      .length,
    fatherForms: household.filter((r) => isFatherRespondent(r.respondent))
      .length,
    girlsForms: girls.length,
    uniqueGirls,
    totalCompleted,
    completionRate:
      uniqueGirls > 0 ? (totalCompleted / uniqueGirls) * 100 : 0,
    activeEnumerators,
    activeFieldDays,
    enumeratorDays,
    expectedCompleted,
    expectedSubmissions,
    targetAchievement:
      expectedCompleted > 0
        ? (totalCompleted / expectedCompleted) * 100
        : 0,
    submissionTargetAchievement:
      expectedSubmissions > 0
        ? (rows.length / expectedSubmissions) * 100
        : 0,
    avgCompletedPerEnumeratorPerDay:
      enumeratorDays > 0 ? totalCompleted / enumeratorDays : 0,
    avgSubmissionsPerEnumeratorPerDay:
      enumeratorDays > 0 ? rows.length / enumeratorDays : 0,
    enumeratorDaysMeetingTarget,
    pctDaysMeetingTarget:
      enumeratorDays > 0
        ? (enumeratorDaysMeetingTarget / enumeratorDays) * 100
        : 0,
    enumeratorsOnTrack: enumeratorPerformance.filter((e) => e.onTrack).length,
    topPerformer: topPerformer
      ? { name: topPerformer.name, value: topPerformer.completedHouseholds }
      : null,
    lowPerformer: lowPerformer
      ? { name: lowPerformer.name, value: lowPerformer.avgCompletedPerDay }
      : null,
    enumeratorPerformance,
    dailyTrend,
  };
}

export type HhGirlsMonitoringMetrics = ReturnType<
  typeof computeHhGirlsMonitoringMetrics
>;
