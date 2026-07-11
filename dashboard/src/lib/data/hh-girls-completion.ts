import type { HhGirlsRow } from "./hh-girls-metrics";
import { isFatherRespondent, isMotherRespondent } from "./hh-girls-metrics";

/**
 * Parent unavailable codes from HH survey `unavailable_reason` choices
 * (fields: father_unavailable1 / mother_unavailable1).
 *
 * 1 – Gone for work within the village  → revisit
 * 2 – Gone for work outside the village → revisit
 * 3 – Lives in another city             → permanent (no revisit)
 * 4 – Lives in another country          → permanent (no revisit)
 * 5 – Have passed away                  → permanent (no revisit)
 * 6 – Other (specify)                   → revisit
 */
export const PERMANENT_PARENT_UNAVAILABLE_CODES = new Set(["3", "4", "5"]);
export const TEMPORARY_PARENT_UNAVAILABLE_CODES = new Set(["1", "2", "6"]);

export const PARENT_UNAVAILABLE_LABELS: Record<string, string> = {
  "1": "Gone for work within the village",
  "2": "Gone for work outside the village",
  "3": "Lives in another city",
  "4": "Lives in another country",
  "5": "Have passed away",
  "6": "Other (specify)",
};

/** Girl unavailable codes from girls survey `availability_reason` choices. */
export const PERMANENT_GIRL_UNAVAILABLE_CODES = new Set(["2", "3"]);
export const TEMPORARY_GIRL_UNAVAILABLE_CODES = new Set(["1", "4"]);

export function parentUnavailableLabel(code?: string): string {
  const c = (code || "").trim();
  if (!c) return "";
  return PARENT_UNAVAILABLE_LABELS[c] || `Code ${c}`;
}

export function isPermanentParentUnavailable(code?: string): boolean {
  return PERMANENT_PARENT_UNAVAILABLE_CODES.has((code || "").trim());
}

export function isTemporaryParentUnavailable(code?: string): boolean {
  const c = (code || "").trim();
  if (!c) return false;
  return !isPermanentParentUnavailable(c);
}

export function latestParentUnavailableCode(
  hhSubs: HhGirlsRow[],
  role: "father" | "mother"
): string {
  const field =
    role === "father" ? "father_unavailable1" : "mother_unavailable1";
  for (let i = hhSubs.length - 1; i >= 0; i -= 1) {
    const code = (hhSubs[i]?.[field] || "").trim();
    if (code) return code;
  }
  return "";
}

export function latestParentUnavailableOther(
  hhSubs: HhGirlsRow[],
  role: "father" | "mother"
): string {
  const field =
    role === "father" ? "father_unavailable_other" : "mother_unavailable_other";
  for (let i = hhSubs.length - 1; i >= 0; i -= 1) {
    const value = (hhSubs[i]?.[field] || "").trim();
    if (value) return value;
  }
  return "";
}

/** True when any HH visit recorded an unavailable reason for this parent. */
export function isParentMarkedUnavailable(
  hhSubs: HhGirlsRow[],
  role: "father" | "mother"
): boolean {
  return Boolean(latestParentUnavailableCode(hhSubs, role));
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
  unavailableCode: string;
  unavailableOther: string;
  unavailableLabel: string;
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

  const unavailableCode = latestParentUnavailableCode(hhSubs, role);
  const unavailableOther = latestParentUnavailableOther(hhSubs, role);
  const unavailableLabel = parentUnavailableLabel(unavailableCode);

  const hasPendingTemporaryUnavailable =
    hasTemporaryUnavailable &&
    !hasCompleteInterview &&
    !isPermanentlyUnavailable;

  return {
    hasCompleteInterview,
    isPermanentlyUnavailable,
    hasPendingTemporaryUnavailable,
    unavailableCode,
    unavailableOther,
    unavailableLabel,
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
  return isTemporaryGirlUnavailable(
    gsRow.girl_available,
    gsRow.girl_available_reason
  );
}

/**
 * A household is completed when:
 * - Girls survey is complete with both consents and the girl was available
 * - Each parent slot is either interviewed (complete + consent) or permanently unavailable (3/4/5)
 * - At least one parent was interviewed
 * - No parent has a pending temporary unavailability (1/2/6 — revisit still needed)
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
