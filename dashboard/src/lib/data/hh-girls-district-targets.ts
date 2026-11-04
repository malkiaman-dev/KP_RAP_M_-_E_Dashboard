import { isCompletedHouseholdForGirl, pickGirlsRow } from "./hh-girls-completion";
import { enumeratorIdentityKey } from "./enumerator-identity";
import type { HhGirlsRow } from "./hh-girls-metrics";
import type { HhGirlsProgressBasis } from "./hh-girls-progress-basis";
import { parseFlexibleDate, toIsoDateString } from "../utils";

/** Days counted back from the latest data day when measuring speed. */
export const DISTRICT_SPEED_WINDOW_DAYS = 14;

export interface DistrictTargetInput {
  district: string;
  label: string;
  /** Successfully tracked girls in the district = its HH / Girls target. */
  tracked: number;
}

export interface HhGirlsDistrictTargetRow {
  district: string;
  label: string;
  target: number;
  achieved: number;
  remaining: number;
  /** achieved / target × 100 */
  progress: number;
  /** Achieved in the speed window. */
  achievedInWindow: number;
  /** Days in the window with any HH / Girls form in this district. */
  fieldDaysInWindow: number;
  /** Achieved per field day over the window. */
  speedPerFieldDay: number;
  /** Distinct enumerators who submitted a form in this district in the window. */
  enumeratorsInWindow: number;
  /** remaining / speed, rounded up; null when there is no recent speed. */
  fieldDaysToTarget: number | null;
  /** Projected calendar date (ISO) at the current speed and field-day rhythm. */
  projectedDate: string | null;
  lastActivity: string | null;
}

export interface HhGirlsDistrictTargets {
  basis: HhGirlsProgressBasis;
  asOf: string | null;
  windowDays: number;
  rows: HhGirlsDistrictTargetRow[];
  total: HhGirlsDistrictTargetRow;
}

function formDay(row: HhGirlsRow): string | null {
  const d = parseFlexibleDate(row.starttime || "") ?? parseFlexibleDate(row.SubmissionDate || "");
  return d ? toIsoDateString(d) : null;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDateString(d);
}

function buildRow(
  district: string,
  label: string,
  target: number,
  achievedDays: string[],
  activeDays: Set<string>,
  enumeratorsInWindow: number,
  windowStart: string | null,
  asOf: string | null,
  windowDays: number
): HhGirlsDistrictTargetRow {
  const achieved = achievedDays.length;
  const remaining = Math.max(0, target - achieved);
  const inWindow = (day: string) => windowStart !== null && day >= windowStart;
  const achievedInWindow = achievedDays.filter(inWindow).length;
  const fieldDaysInWindow = [...activeDays].filter(inWindow).length;
  const speedPerFieldDay = fieldDaysInWindow > 0 ? achievedInWindow / fieldDaysInWindow : 0;

  let fieldDaysToTarget: number | null = null;
  let projectedDate: string | null = null;
  if (remaining === 0) {
    fieldDaysToTarget = 0;
    projectedDate = asOf;
  } else if (speedPerFieldDay > 0 && asOf) {
    fieldDaysToTarget = Math.ceil(remaining / speedPerFieldDay);
    // Calendar days per field day, from how often this district worked lately.
    const calendarPerFieldDay = windowDays / fieldDaysInWindow;
    projectedDate = addDays(asOf, Math.ceil(fieldDaysToTarget * calendarPerFieldDay));
  }

  const days = [...activeDays].sort();
  return {
    district,
    label,
    target,
    achieved,
    remaining,
    progress: target > 0 ? (achieved / target) * 100 : 0,
    achievedInWindow,
    fieldDaysInWindow,
    speedPerFieldDay,
    enumeratorsInWindow,
    fieldDaysToTarget,
    projectedDate,
    lastActivity: days[days.length - 1] ?? null,
  };
}

/**
 * Per-district HH / Girls target progress for the Monitoring page. Each
 * district's target is its successfully tracked girls. Achieved is completed
 * households (default) or attempted girls; an achievement is dated on the day
 * its last form came in (completed) or its first form (attempted). Speed is
 * achievements per field day over the last `windowDays` days of data, and the
 * time to target projects the remaining count at that speed.
 */
export function computeHhGirlsDistrictTargets(
  household: HhGirlsRow[],
  girls: HhGirlsRow[],
  targets: DistrictTargetInput[],
  basis: HhGirlsProgressBasis = "completed",
  windowDays = DISTRICT_SPEED_WINDOW_DAYS
): HhGirlsDistrictTargets {
  const hhByGirl = new Map<string, HhGirlsRow[]>();
  const gsByGirl = new Map<string, HhGirlsRow[]>();
  const activeDays = new Map<string, Set<string>>();
  // district -> day -> enumerators who submitted that day
  const enumeratorsByDay = new Map<string, Map<string, Set<string>>>();
  let asOf: string | null = null;

  for (const [rows, byGirl] of [
    [household, hhByGirl],
    [girls, gsByGirl],
  ] as const) {
    for (const row of rows) {
      const girl = (row.girl || "").trim();
      const day = formDay(row);
      if (day) {
        if (!activeDays.has(row.district)) activeDays.set(row.district, new Set());
        activeDays.get(row.district)!.add(day);
        if (!enumeratorsByDay.has(row.district)) enumeratorsByDay.set(row.district, new Map());
        const byDay = enumeratorsByDay.get(row.district)!;
        if (!byDay.has(day)) byDay.set(day, new Set());
        byDay.get(day)!.add(enumeratorIdentityKey(row));
        if (!asOf || day > asOf) asOf = day;
      }
      if (!girl) continue;
      if (!byGirl.has(girl)) byGirl.set(girl, []);
      byGirl.get(girl)!.push(row);
    }
  }

  const achievedDays = new Map<string, string[]>();
  for (const girl of new Set([...hhByGirl.keys(), ...gsByGirl.keys()])) {
    const hhSubs = hhByGirl.get(girl) || [];
    const gsSubs = gsByGirl.get(girl) || [];
    const forms = [...hhSubs, ...gsSubs];
    const days = forms.map(formDay).filter((d): d is string => d !== null).sort();
    if (days.length === 0) continue;

    let day: string | null = null;
    if (basis === "attempted") {
      day = days[0]!;
    } else {
      const gsRow = gsSubs.reduce<HhGirlsRow | undefined>(pickGirlsRow, undefined);
      if (isCompletedHouseholdForGirl(hhSubs, gsRow)) day = days[days.length - 1]!;
    }
    if (!day) continue;
    const district = forms[0]!.district;
    if (!achievedDays.has(district)) achievedDays.set(district, []);
    achievedDays.get(district)!.push(day);
  }

  const windowStart = asOf ? addDays(asOf, -(windowDays - 1)) : null;
  const enumeratorsInWindow = (district: string) => {
    const found = new Set<string>();
    for (const [day, names] of enumeratorsByDay.get(district) || []) {
      if (windowStart && day >= windowStart) for (const n of names) found.add(n);
    }
    found.delete("unknown");
    return found.size;
  };
  const rows = targets
    .map((t) =>
      buildRow(
        t.district,
        t.label,
        t.tracked,
        achievedDays.get(t.district) || [],
        activeDays.get(t.district) || new Set(),
        enumeratorsInWindow(t.district),
        windowStart,
        asOf,
        windowDays
      )
    )
    .sort((a, b) => b.target - a.target);

  const allActive = new Set<string>();
  for (const days of activeDays.values()) for (const d of days) allActive.add(d);
  const total = buildRow(
    "all",
    "All districts",
    rows.reduce((s, r) => s + r.target, 0),
    targets.flatMap((t) => achievedDays.get(t.district) || []),
    allActive,
    targets.reduce((sum, t) => sum + enumeratorsInWindow(t.district), 0),
    windowStart,
    asOf,
    windowDays
  );

  return { basis, asOf, windowDays, rows, total };
}

export interface DistrictPlan {
  enumerators: number;
  /** Achievements per enumerator per field day. */
  perEnumerator: number;
  fieldDaysPerWeek: number;
}

/** The plan that reproduces the data: recent enumerators, speed and field-day rhythm. */
export function defaultDistrictPlan(
  row: HhGirlsDistrictTargetRow,
  windowDays: number,
  fallbackPerEnumerator: number
): DistrictPlan {
  const enumerators = row.enumeratorsInWindow;
  const perEnumerator =
    enumerators > 0 ? row.speedPerFieldDay / enumerators : fallbackPerEnumerator;
  // Plans use whole numbers; keep at least 1 when there is any output.
  return {
    enumerators,
    perEnumerator: perEnumerator > 0 ? Math.max(1, Math.round(perEnumerator)) : 0,
    // whole days; at least 1 so a working district always has a rhythm
    fieldDaysPerWeek:
      row.fieldDaysInWindow > 0
        ? Math.max(1, Math.round((row.fieldDaysInWindow / windowDays) * 7))
        : 6,
  };
}

/** Speed and time to target if the district works to `plan`. */
export function projectDistrictPlan(
  row: HhGirlsDistrictTargetRow,
  plan: DistrictPlan,
  asOf: string | null
): { speed: number; fieldDaysToTarget: number | null; projectedDate: string | null } {
  const speed = plan.enumerators * plan.perEnumerator;
  if (row.remaining === 0) return { speed, fieldDaysToTarget: 0, projectedDate: asOf };
  if (speed <= 0 || plan.fieldDaysPerWeek <= 0 || !asOf) {
    return { speed, fieldDaysToTarget: null, projectedDate: null };
  }
  const fieldDaysToTarget = Math.ceil(row.remaining / speed);
  const calendarDays = Math.ceil(fieldDaysToTarget * (7 / plan.fieldDaysPerWeek));
  return { speed, fieldDaysToTarget, projectedDate: addDays(asOf, calendarDays) };
}
