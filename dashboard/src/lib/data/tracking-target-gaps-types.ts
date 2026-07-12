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

export interface TrackingTargetGaps {
  available: boolean;
  targetTotal: number;
  tracked: number;
  notAttempted: number;
  needsRevisit: number;
  attemptedNotTracked: number;
  actionable: number;
  byDistrict: TargetGapDistrictSummary[];
  /** Girls still outstanding for field teams (not attempted + revisit needed). */
  actionableGirls: TargetGapGirl[];
  notAttemptedGirls: TargetGapGirl[];
  needsRevisitGirls: TargetGapGirl[];
}
