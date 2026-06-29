/** KPRAP protocol targets - KPRAP_Survey_Protocol.docx */
export const PROTOCOL = {
  /** Completed household survey target (N) */
  HH_SURVEY_TARGET: 4038,
  /** Total girls assigned for tracking (~120% buffer over HH target) */
  GIRLS_TO_TRACK: 4860,
  /** Baseline listed girls (2022-2023 cohort) */
  BASELINE_GIRLS_TO_TRACK: 1235,
  /** New sample girls (2023-2024 cohort) */
  NEW_SAMPLE_GIRLS_TO_TRACK: 3625,
  /** Primary outcome target - successfully tracked girls */
  SUCCESSFUL_TRACKING_TARGET: 4250,
  TRACKING_BUFFER_PERCENT: 120,
  /** Per-enumerator daily tracking target (girls to track per working day) */
  DAILY_TRACKING_TARGET_PER_ENUMERATOR: 10,
} as const;

/** Per-enumerator daily tracking target - girls to track per working day */
export const DAILY_TRACKING_TARGET_PER_ENUMERATOR =
  PROTOCOL.DAILY_TRACKING_TARGET_PER_ENUMERATOR;

/** Proportional share of the 4,250 success target for baseline */
export function baselineSuccessTarget(): number {
  return Math.round(
    PROTOCOL.SUCCESSFUL_TRACKING_TARGET *
      (PROTOCOL.BASELINE_GIRLS_TO_TRACK / PROTOCOL.GIRLS_TO_TRACK)
  );
}

/** Proportional share of the 4,250 success target for new sample */
export function newSampleSuccessTarget(): number {
  return PROTOCOL.SUCCESSFUL_TRACKING_TARGET - baselineSuccessTarget();
}

export const DEFAULT_TRACKING_TARGETS = {
  assignmentPool: PROTOCOL.GIRLS_TO_TRACK,
  successTarget: PROTOCOL.SUCCESSFUL_TRACKING_TARGET,
  baselineAssignment: PROTOCOL.BASELINE_GIRLS_TO_TRACK,
  newSampleAssignment: PROTOCOL.NEW_SAMPLE_GIRLS_TO_TRACK,
  baselineSuccessTarget: baselineSuccessTarget(),
  newSampleSuccessTarget: newSampleSuccessTarget(),
} as const;
