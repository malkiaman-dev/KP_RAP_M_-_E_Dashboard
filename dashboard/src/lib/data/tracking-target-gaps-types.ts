import type { TrackingCohort } from "./tracking-metrics";

export type TargetGapStatus =
  | "tracked"
  | "not_attempted"
  | "needs_revisit_2nd"
  | "needs_revisit_3rd"
  | "attempted_not_tracked";

export interface TargetGapGirl {
  girlId: string;
  girlName: string;
  fatherName: string;
  district: string;
  districtLabel: string;
  village: string;
  school: string;
  contact: string;
  address: string;
  landmark: string;
  cohort: TrackingCohort;
  batch: string;
  status: TargetGapStatus;
  statusLabel: string;
  reason: string;
  attempts: number;
}

export interface TargetGapDistrictSummary {
  district: string;
  districtLabel: string;
  targetTotal: number;
  tracked: number;
  notAttempted: number;
  needsRevisit: number;
  attemptedNotTracked: number;
  actionable: number;
}

/** Pre-aggregated district × cohort tallies for fast client filters (no girl arrays). */
export interface TargetGapCohortDistrictSummary extends TargetGapDistrictSummary {
  cohort: TrackingCohort;
}

export interface TrackingTargetGaps {
  available: boolean;
  targetTotal: number;
  tracked: number;
  notAttempted: number;
  needsRevisit: number;
  attemptedNotTracked: number;
  actionable: number;
  byDistrict: TargetGapDistrictSummary[];
  byCohortDistrict: TargetGapCohortDistrictSummary[];
  /** Girls still outstanding for field teams (not attempted + revisit needed). */
  actionableGirls: TargetGapGirl[];
  notAttemptedGirls: TargetGapGirl[];
  needsRevisitGirls: TargetGapGirl[];
  attemptedNotTrackedGirls: TargetGapGirl[];
  /**
   * Optional — omitted from the API payload (use byCohortDistrict for counts).
   * Kept for scripts / full in-memory compute.
   */
  trackedGirls?: TargetGapGirl[];
}
