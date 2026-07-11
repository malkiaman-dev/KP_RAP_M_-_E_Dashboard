import type { HhGirlsRow } from "./hh-girls-metrics";
import {
  isCaretakerRespondent,
  isFatherRespondent,
  isMotherRespondent,
} from "./hh-girls-metrics";

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

/**
 * Required revisits when temporarily unavailable (after the first visit).
 * Father: 1 revisit (max attempt 2)
 * Mother / girl / caretaker: 3 revisits (max attempt 4)
 */
export const REQUIRED_REVISITS_BY_SLOT = {
  father: 1,
  mother: 3,
  girls: 3,
  caretaker: 3,
} as const;

export type HhGirlsRevisitSlot = keyof typeof REQUIRED_REVISITS_BY_SLOT;

export function maxAttemptForSlot(slot: HhGirlsRevisitSlot): number {
  return 1 + REQUIRED_REVISITS_BY_SLOT[slot];
}

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

function parseAttempt(row: HhGirlsRow): number {
  const n = Number(row.attempt);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function maxAttemptAmong(rows: HhGirlsRow[]): number {
  if (rows.length === 0) return 0;
  return Math.max(...rows.map(parseAttempt));
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
  /** Temporary unavailable and required revisits not yet exhausted. */
  hasPendingTemporaryUnavailable: boolean;
  /** Temporary unavailable and all required revisits already filed (still not interviewed). */
  temporaryRevisitsExhausted: boolean;
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

  const attemptRows =
    parentSubs.length > 0
      ? parentSubs
      : hhSubs.filter((s) => isTemporaryParentUnavailable(s[field]));
  const attemptsUsed = maxAttemptAmong(attemptRows);
  const revisitsExhausted =
    attemptsUsed >= maxAttemptForSlot(role) && hasTemporaryUnavailable;

  const hasPendingTemporaryUnavailable =
    hasTemporaryUnavailable &&
    !hasCompleteInterview &&
    !isPermanentlyUnavailable &&
    !revisitsExhausted;

  return {
    hasCompleteInterview,
    isPermanentlyUnavailable,
    hasPendingTemporaryUnavailable,
    temporaryRevisitsExhausted:
      revisitsExhausted && !hasCompleteInterview && !isPermanentlyUnavailable,
    unavailableCode,
    unavailableOther,
    unavailableLabel,
  };
}

export function isCaretakerSurveyComplete(hhSubs: HhGirlsRow[]): boolean {
  return hhSubs.some(
    (s) =>
      isCaretakerRespondent(s) &&
      s.survey_status === "1" &&
      s.agree_consent_caregiver === "1"
  );
}

/** Caretaker marked unavailable on any visit (available_caretaker = 0). */
export function isCaretakerMarkedUnavailable(hhSubs: HhGirlsRow[]): boolean {
  return hhSubs.some((s) => (s.available_caretaker || "").trim() === "0");
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

/**
 * A household is completed when the girls survey is complete with consents, and
 * one of these HH respondent paths is satisfied:
 *
 * - Mother permanently unavailable (3/4/5) → father interview + girl survey
 * - Father permanently unavailable (3/4/5) → mother interview + girl survey
 * - Both permanently unavailable → caretaker interview + girl survey
 * - Both parents interviewed → + girl survey
 *
 * Temporary unavailability (father/mother 1/2/6, or girl temporary) blocks
 * completion until the required revisits are done AND the slot is successfully
 * interviewed (or coded permanent). Exhausted revisits without an interview
 * still leave the household incomplete.
 */
export function isCompletedHouseholdForGirl(
  hhSubs: HhGirlsRow[],
  gsRow: HhGirlsRow | undefined
): boolean {
  if (!gsRow) return false;

  // Girl must be successfully surveyed — missing or temp-unavailable girl = incomplete
  if (!isGirlSurveyComplete(gsRow)) {
    return false;
  }

  const father = analyzeParentSlot(hhSubs, "father");
  const mother = analyzeParentSlot(hhSubs, "mother");

  // Required revisits still outstanding for a temporary parent → incomplete
  if (father.hasPendingTemporaryUnavailable) return false;
  if (mother.hasPendingTemporaryUnavailable) return false;

  const bothParentsPermanent =
    father.isPermanentlyUnavailable && mother.isPermanentlyUnavailable;

  if (bothParentsPermanent) {
    if (isCaretakerMarkedUnavailable(hhSubs) && !isCaretakerSurveyComplete(hhSubs)) {
      return false;
    }
    return isCaretakerSurveyComplete(hhSubs);
  }

  // Mother permanent → father + girl; father permanent → mother + girl;
  // otherwise both parent slots must be interviewed or permanent, with ≥1 interview.
  const fatherSatisfied =
    father.hasCompleteInterview || father.isPermanentlyUnavailable;
  const motherSatisfied =
    mother.hasCompleteInterview || mother.isPermanentlyUnavailable;
  const atLeastOneParentInterviewed =
    father.hasCompleteInterview || mother.hasCompleteInterview;

  return fatherSatisfied && motherSatisfied && atLeastOneParentInterviewed;
}
