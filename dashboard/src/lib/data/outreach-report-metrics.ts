import { DEFAULT_TRACKING_TARGETS } from "@/lib/data/protocol";
import {
  computeTrackingMetrics,
  girlKey,
  inferTrackingCohort,
  inferTrackingSession,
  isTrackedSubmission,
  type TrackingCohort,
  type TrackingRow,
} from "@/lib/data/tracking-metrics";

export interface OutreachReportMetrics {
  totalSubmissions: number;
  totalSchools: number;
  totalVillages: number;
  totalAttemptedGirls: number;
  totalTrackedGirls: number;
  totalNotTrackedGirls: number;
  revisitsNeeded: number;
  totalRevisitedGirls: number;
  consentRefused: number;
  consentRate: number;
  /** Successfully tracked girls from the baseline listing cohort */
  trackedGirlsBaseline: number;
  /** Successfully tracked girls from the new-sample listing cohort */
  trackedGirlsNewSample: number;
  /** Successfully tracked girls from 2022-2023 listing (includes all baseline girls) */
  trackedGirls2023: number;
  /** Successfully tracked girls from 2023-2024 listing */
  trackedGirls2024: number;
  trackingSuccessRate: number;
}

function groupRowsByGirl(rows: TrackingRow[]): Map<string, TrackingRow[]> {
  const byGirl = new Map<string, TrackingRow[]>();
  for (const row of rows) {
    const key = girlKey(row);
    if (!byGirl.has(key)) byGirl.set(key, []);
    byGirl.get(key)!.push(row);
  }
  return byGirl;
}

function inferGirlCohort(subs: TrackingRow[]): TrackingCohort {
  if (subs.some((r) => inferTrackingCohort(r) === "baseline")) return "baseline";
  return "new-sample";
}

function isSuccessfullyTrackedGirl(subs: TrackingRow[]): boolean {
  return subs.some(isTrackedSubmission);
}

function is2024ListingGirl(subs: TrackingRow[]): boolean {
  return subs.some((r) => inferTrackingSession(r) === "2023-2024");
}

function computeTrackedGirlBreakdown(rows: TrackingRow[]) {
  let trackedGirlsBaseline = 0;
  let trackedGirlsNewSample = 0;
  let trackedGirls2023 = 0;
  let trackedGirls2024 = 0;

  for (const subs of groupRowsByGirl(rows).values()) {
    if (!isSuccessfullyTrackedGirl(subs)) continue;

    const cohort = inferGirlCohort(subs);
    if (cohort === "baseline") trackedGirlsBaseline += 1;
    else trackedGirlsNewSample += 1;

    if (is2024ListingGirl(subs)) trackedGirls2024 += 1;
    else trackedGirls2023 += 1;
  }

  return {
    trackedGirlsBaseline,
    trackedGirlsNewSample,
    trackedGirls2023,
    trackedGirls2024,
  };
}

export function computeOutreachReportMetrics(
  rows: TrackingRow[],
  allRows: TrackingRow[] = rows
): OutreachReportMetrics {
  const metrics = computeTrackingMetrics(
    rows,
    DEFAULT_TRACKING_TARGETS,
    allRows
  );
  const attempted = metrics.uniqueGirlsInData;
  const tracked = metrics.totalTrackedGirls;
  const trackedBreakdown = computeTrackedGirlBreakdown(rows);

  return {
    totalSubmissions: metrics.totalSubmissions,
    totalSchools: metrics.totalSchools,
    totalVillages: metrics.totalVillages,
    totalAttemptedGirls: attempted,
    totalTrackedGirls: tracked,
    totalNotTrackedGirls: metrics.untrackedInData,
    revisitsNeeded: metrics.revisitDetail.revisitsNeedToBeDone,
    totalRevisitedGirls: metrics.revisitDetail.totalRevisitedGirls,
    consentRefused: metrics.secondaryKpis.noConsentGirls,
    consentRate: metrics.secondaryKpis.consentRate,
    ...trackedBreakdown,
    trackingSuccessRate: attempted > 0 ? (tracked / attempted) * 100 : 0,
  };
}
