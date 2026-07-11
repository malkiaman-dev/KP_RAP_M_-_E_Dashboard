import { PROTOCOL } from "@/lib/data/protocol";
import {
  computeHhGirlsMetrics,
  type HhGirlsRow,
} from "@/lib/data/hh-girls-metrics";

/** Programme progress metrics for HH + Girls combined reports. */
export interface HhGirlsProgressReportMetrics {
  totalSubmissions: number;
  motherForms: number;
  fatherForms: number;
  girlsForms: number;
  totalVillages: number;
  totalEnumerators: number;
  uniqueGirls: number;
  completedHouseholds: number;
  remainingToTarget: number;
  progressToTarget: number;
  hhTarget: number;
  completionRate: number;
  consentRefused: number;
  fatherNotAvailable: number;
  motherNotAvailable: number;
  girlNotAvailable: number;
  revisitsNeeded: number;
  totalRevisitedGirls: number;
  missingSurveys: number;
  parentalConsentRate: number;
  childConsentRate: number;
  availableGirls: number;
  studyingGirls: number;
  completionByDistrict: { district: string; completed: number; total: number; rate: number }[];
}

export function computeHhGirlsProgressReportMetrics(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): HhGirlsProgressReportMetrics {
  const m = computeHhGirlsMetrics(household, girls);
  const uniqueGirls = m.core.uniqueGirls;
  const completed = m.core.completedHouseholds;

  return {
    totalSubmissions: m.core.totalSubmissions,
    motherForms: m.core.motherSurveys,
    fatherForms: m.core.fatherSurveys,
    girlsForms: m.core.girlsSurveys,
    totalVillages: m.core.totalVillages,
    totalEnumerators: m.core.totalEnumerators,
    uniqueGirls,
    completedHouseholds: completed,
    remainingToTarget: m.core.remainingToTarget,
    progressToTarget: m.core.progressToTarget,
    hhTarget: m.core.hhTarget || PROTOCOL.HH_SURVEY_TARGET,
    completionRate: uniqueGirls > 0 ? (completed / uniqueGirls) * 100 : 0,
    consentRefused: m.core.consentRefused,
    fatherNotAvailable: m.core.fatherNotAvailable,
    motherNotAvailable: m.core.motherNotAvailable,
    girlNotAvailable: m.core.girlNotAvailable,
    revisitsNeeded: m.revisitDetail.revisitsNeedToBeDone,
    totalRevisitedGirls: m.revisitDetail.totalRevisitedGirls,
    missingSurveys: m.missingDetail.totalMissingSurveys,
    parentalConsentRate: m.girls.parentalConsentRate,
    childConsentRate: m.girls.childConsentRate,
    availableGirls: m.girls.availableGirls,
    studyingGirls: m.girls.studyingGirls,
    completionByDistrict: m.core.completionByDistrict.map((d) => ({
      district: d.label || d.district,
      completed: d.completed,
      total: d.girls,
      rate: d.girls > 0 ? (d.completed / d.girls) * 100 : 0,
    })),
  };
}
