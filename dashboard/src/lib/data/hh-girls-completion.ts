import type { HhGirlsRow } from "./hh-girls-metrics";
import { isFatherRespondent, isMotherRespondent } from "./hh-girls-metrics";

/** Parent unavailable codes from HH survey `unavailable_reason` choices. */
export const PERMANENT_PARENT_UNAVAILABLE_CODES = new Set(["3", "4", "5"]);
export const TEMPORARY_PARENT_UNAVAILABLE_CODES = new Set(["1", "2"]);

/** Girl unavailable codes from girls survey `availability_reason` choices. */
export const PERMANENT_GIRL_UNAVAILABLE_CODES = new Set(["2", "3"]);
export const TEMPORARY_GIRL_UNAVAILABLE_CODES = new Set(["1", "4"]);

export function isPermanentParentUnavailable(code?: string): boolean {
  return PERMANENT_PARENT_UNAVAILABLE_CODES.has((code || "").trim());
}

export function isTemporaryParentUnavailable(code?: string): boolean {
  const c = (code || "").trim();
  if (!c) return false;
  return !isPermanentParentUnavailable(c);
}

export function isPermanentGirlUnavailable(reason?: string): boolean {
  return PERMANENT_GIRL_UNAVAILABLE_CODES.has((reason || "").trim());
}

export function isTemporaryGirlUnavailable(
  girlAvailable?: string,
  reason?: string
): boolean {
  if (girlAvailable !== "0") return false;
  const r = (reason || "").trim();
  if (!r) return true;
  return !isPermanentGirlUnavailable(r);
}

function isParentSlotComplete(row: HhGirlsRow, role: "father" | "mother"): boolean {
  if (row.survey_status !== "1") return false;
  if (role === "mother" && isMotherRespondent(row.respondent)) {
    return row.agree_consent_mother === "1";
  }
  if (role === "father" && isFatherRespondent(row.respondent)) {
    return row.agree_consent_father === "1";
  }
  return false;
}

export interface ParentSlotStatus {
  hasCompleteInterview: boolean;
  isPermanentlyUnavailable: boolean;
  hasPendingTemporaryUnavailable: boolean;
}

export function analyzeParentSlot(
  hhSubs: HhGirlsRow[],
  role: "father" | "mother"
): ParentSlotStatus {
  const isParent =
    role === "father" ? isFatherRespondent : isMotherRespondent;
  const field =
    role === "father" ? "father_unavailable1" : "mother_unavailable1";

  const parentSubs = hhSubs.filter((s) => isParent(s.respondent));
  const hasCompleteInterview = parentSubs.some((s) =>
    isParentSlotComplete(s, role)
  );

  let isPermanentlyUnavailable = false;
  let hasTemporaryUnavailable = false;
  for (const s of hhSubs) {
    const code = (s[field] || "").trim();
    if (isPermanentParentUnavailable(code)) isPermanentlyUnavailable = true;
    if (isTemporaryParentUnavailable(code)) hasTemporaryUnavailable = true;
  }

  const hasPendingTemporaryUnavailable =
    hasTemporaryUnavailable &&
    !hasCompleteInterview &&
    !isPermanentlyUnavailable;

  return {
    hasCompleteInterview,
    isPermanentlyUnavailable,
    hasPendingTemporaryUnavailable,
  };
}

function isGirlSurveyComplete(gsRow: HhGirlsRow | undefined): boolean {
  if (!gsRow) return false;
  return (
    gsRow.survey_status === "1" &&
    gsRow.girl_available === "1" &&
    gsRow.parental_consent_agree === "1" &&
    gsRow.child_consent_agree === "1"
  );
}

function isGirlSlotPending(gsRow: HhGirlsRow | undefined): boolean {
  if (!gsRow) return true;
  if (isGirlSurveyComplete(gsRow)) return false;
  if (gsRow.girl_available !== "0") return false;
  return isTemporaryGirlUnavailable(gsRow.girl_available, gsRow.girl_available_reason);
}

/**
 * A household is completed when:
 * - Girls survey is complete with both consents and the girl was available
 * - Each parent slot is either interviewed (complete + consent) or permanently unavailable
 * - At least one parent was interviewed
 * - No parent or girl slot has a pending temporary unavailability (revisit still needed)
 */
export function isCompletedHouseholdForGirl(
  hhSubs: HhGirlsRow[],
  gsRow: HhGirlsRow | undefined
): boolean {
  if (!isGirlSurveyComplete(gsRow)) {
    if (isGirlSlotPending(gsRow)) return false;
    return false;
  }

  const father = analyzeParentSlot(hhSubs, "father");
  const mother = analyzeParentSlot(hhSubs, "mother");

  if (father.hasPendingTemporaryUnavailable) return false;
  if (mother.hasPendingTemporaryUnavailable) return false;

  const fatherSatisfied =
    father.hasCompleteInterview || father.isPermanentlyUnavailable;
  const motherSatisfied =
    mother.hasCompleteInterview || mother.isPermanentlyUnavailable;
  const atLeastOneParentInterviewed =
    father.hasCompleteInterview || mother.hasCompleteInterview;

  return fatherSatisfied && motherSatisfied && atLeastOneParentInterviewed;
}
