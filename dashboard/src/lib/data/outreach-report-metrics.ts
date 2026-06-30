import { DEFAULT_TRACKING_TARGETS } from "@/lib/data/protocol";
import {
  computeTrackingMetrics,
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
  trackedGirlsBaseline: number;
  trackedGirlsNewSample: number;
  trackingSuccessRate: number;
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
    trackedGirlsBaseline: metrics.cohorts.baseline.totalTrackedGirls,
    trackedGirlsNewSample: metrics.cohorts.newSample.totalTrackedGirls,
    trackingSuccessRate: attempted > 0 ? (tracked / attempted) * 100 : 0,
  };
}
