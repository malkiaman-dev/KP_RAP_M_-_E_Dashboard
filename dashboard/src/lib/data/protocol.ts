/** KPRAP protocol targets — district baseline / endline tracking targets. */
export const PROTOCOL = {
  /** Completed household survey target (N) */
  HH_SURVEY_TARGET: 4038,
  /**
   * District successful-tracking targets (Baseline = 2022-23 cohort,
   * Endline = 2023-24 new-sample cohort).
   * Keys match SurveyCTO district codes.
   */
  DISTRICT_TRACKING_TARGETS: {
    "1": { label: "D.I. Khan", baseline: 638, endline: 1532 },
    "2": { label: "Hangu", baseline: 148, endline: 364 },
    "3": { label: "Lakki Marwat", baseline: 441, endline: 1060 },
    "4": { label: "Torghar", baseline: 7, endline: 140 },
  },
  /** Baseline successful-tracking target (sum of district baseline) */
  BASELINE_SUCCESS_TARGET: 1234,
  /** Endline / new-sample successful-tracking target */
  ENDLINE_SUCCESS_TARGET: 3096,
  /** Primary outcome target — successfully tracked girls */
  SUCCESSFUL_TRACKING_TARGET: 4330,
  /** Baseline listed / assignment pool (aligned to baseline success target) */
  BASELINE_GIRLS_TO_TRACK: 1234,
  /** New sample listed / assignment pool (aligned to endline success target) */
  NEW_SAMPLE_GIRLS_TO_TRACK: 3096,
  /** Total girls in the tracking assignment pool */
  GIRLS_TO_TRACK: 4330,
  TRACKING_BUFFER_PERCENT: 100,
  /** Per-enumerator daily tracking target (girls to track per working day) */
  DAILY_TRACKING_TARGET_PER_ENUMERATOR: 10,
  /**
   * Per-enumerator daily HH survey target (completed households per working day).
   * Implies 3 mother + 3 father + 3 girls forms = 9 forms/day.
   */
  DAILY_HH_TARGET_PER_ENUMERATOR: 3,
  /** Per-enumerator daily form target for HH+Girls surveys (3 HH × 3 forms). */
  DAILY_HH_FORMS_TARGET_PER_ENUMERATOR: 9,
} as const;

export type DistrictCode = keyof typeof PROTOCOL.DISTRICT_TRACKING_TARGETS;

/** Per-enumerator daily tracking target - girls to track per working day */
export const DAILY_TRACKING_TARGET_PER_ENUMERATOR =
  PROTOCOL.DAILY_TRACKING_TARGET_PER_ENUMERATOR;

/** Completed households per enumerator per working day */
export const DAILY_HH_TARGET_PER_ENUMERATOR =
  PROTOCOL.DAILY_HH_TARGET_PER_ENUMERATOR;

/** HH + Girls forms per enumerator per working day (3×3) */
export const DAILY_HH_FORMS_TARGET_PER_ENUMERATOR =
  PROTOCOL.DAILY_HH_FORMS_TARGET_PER_ENUMERATOR;

/** Baseline cohort successful-tracking target */
export function baselineSuccessTarget(): number {
  return PROTOCOL.BASELINE_SUCCESS_TARGET;
}

/** Endline / new-sample cohort successful-tracking target */
export function newSampleSuccessTarget(): number {
  return PROTOCOL.ENDLINE_SUCCESS_TARGET;
}

export function districtTrackingTarget(district: string): {
  baseline: number;
  endline: number;
  total: number;
  label: string;
} | null {
  const entry =
    PROTOCOL.DISTRICT_TRACKING_TARGETS[
      district as DistrictCode
    ];
  if (!entry) return null;
  return {
    baseline: entry.baseline,
    endline: entry.endline,
    total: entry.baseline + entry.endline,
    label: entry.label,
  };
}

/** Resolve success / assignment targets for the active district + cohort filters. */
export function resolveTrackingTargets(options?: {
  district?: string;
  cohort?: "all" | "baseline" | "new-sample";
}): {
  assignmentPool: number;
  successTarget: number;
  baselineAssignment: number;
  newSampleAssignment: number;
  baselineSuccessTarget: number;
  newSampleSuccessTarget: number;
} {
  const cohort = options?.cohort ?? "all";
  const district = options?.district && options.district !== "all"
    ? districtTrackingTarget(options.district)
    : null;

  const baselineSuccess = district?.baseline ?? PROTOCOL.BASELINE_SUCCESS_TARGET;
  const endlineSuccess = district?.endline ?? PROTOCOL.ENDLINE_SUCCESS_TARGET;
  const baselineAssignment = baselineSuccess;
  const newSampleAssignment = endlineSuccess;

  if (cohort === "baseline") {
    return {
      assignmentPool: baselineAssignment,
      successTarget: baselineSuccess,
      baselineAssignment,
      newSampleAssignment,
      baselineSuccessTarget: baselineSuccess,
      newSampleSuccessTarget: endlineSuccess,
    };
  }

  if (cohort === "new-sample") {
    return {
      assignmentPool: newSampleAssignment,
      successTarget: endlineSuccess,
      baselineAssignment,
      newSampleAssignment,
      baselineSuccessTarget: baselineSuccess,
      newSampleSuccessTarget: endlineSuccess,
    };
  }

  return {
    assignmentPool: baselineAssignment + newSampleAssignment,
    successTarget: baselineSuccess + endlineSuccess,
    baselineAssignment,
    newSampleAssignment,
    baselineSuccessTarget: baselineSuccess,
    newSampleSuccessTarget: endlineSuccess,
  };
}

export const DEFAULT_TRACKING_TARGETS = resolveTrackingTargets();
