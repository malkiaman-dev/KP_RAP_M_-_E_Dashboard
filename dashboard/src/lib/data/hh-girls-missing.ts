import {
  analyzeParentSlot,
  isCaretakerSurveyComplete,
} from "./hh-girls-completion";
import {
  isCaretakerRespondent,
  isFatherRespondent,
  isMotherRespondent,
  type HhGirlsRow,
} from "./hh-girls-metrics";
import {
  toHhGirlsExportRow,
  type HhGirlsExportRow,
} from "./hh-girls-revisit";
import { submissionTimestamp } from "../utils";

export type HhGirlsMissingListKey =
  | "missingFatherSurveys"
  | "missingMotherSurveys"
  | "missingGirlSurveys"
  | "missingCaretakerSurveys"
  | "missingBothParentsSurveys"
  | "totalMissingSurveys";

export interface HhGirlsMissingDetailMetrics {
  missingFatherSurveys: number;
  missingMotherSurveys: number;
  missingGirlSurveys: number;
  missingCaretakerSurveys: number;
  /** People (father + mother) missing because a girls survey has no HH form: 2 per household. */
  missingBothParentsSurveys: number;
  totalMissingSurveys: number;
  girlsWithAnyMissing: number;
}

export interface HhGirlsMissingDetailData extends HhGirlsMissingDetailMetrics {
  lists: Record<HhGirlsMissingListKey, HhGirlsExportRow[]>;
}

function emptyMissingLists(): Record<HhGirlsMissingListKey, HhGirlsExportRow[]> {
  return {
    missingFatherSurveys: [],
    missingMotherSurveys: [],
    missingGirlSurveys: [],
    missingCaretakerSurveys: [],
    missingBothParentsSurveys: [],
    totalMissingSurveys: [],
  };
}

function rowTimestamp(row: HhGirlsRow): number {
  return submissionTimestamp(row.SubmissionDate);
}

function latestRow(rows: HhGirlsRow[]): HhGirlsRow | undefined {
  if (rows.length === 0) return undefined;
  return [...rows].sort((a, b) => rowTimestamp(b) - rowTimestamp(a))[0];
}

function toMissingExportRow(
  row: HhGirlsRow,
  who: "Father" | "Mother" | "Girl" | "Caretaker",
  reason: string
): HhGirlsExportRow {
  return {
    ...toHhGirlsExportRow(row, `${who} survey missing · ${reason}`),
    surveyType: `Missing ${who} survey`,
    revisitFor: who,
    category: `Missing ${who} survey · ${reason}`,
  };
}

/** Latest HH form where this person was available and agreed consent. */
function latestAgreedRow(
  hhSubs: HhGirlsRow[],
  field: "agree_consent_father" | "agree_consent_mother" | "agree_consent_caregiver"
): HhGirlsRow | undefined {
  return latestRow(hhSubs.filter((s) => (s[field] || "").trim() === "1"));
}

/**
 * A survey is "missing" when the respondent was available and agreed consent
 * but their own form was never submitted. This differs from a revisit, where
 * the respondent was unavailable.
 *
 * - Father / mother / caretaker: consent agreed on an HH form (e.g. both
 *   parents available and agreed) but no form with them as respondent.
 * - No HH form at all but a girls survey exists: father and mother both
 *   missing, one row per person (2 per household) in their own list.
 *
 * All counts are people (one missing survey each), not households.
 * - Girl: the HH side is done (each parent interviewed, permanently
 *   unavailable or refused, with at least one interviewed; or the caretaker
 *   interviewed when both parents are permanently away) but no girls survey
 *   was submitted.
 */
export function computeHhGirlsMissingDetail(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): HhGirlsMissingDetailData {
  const lists = emptyMissingLists();
  const hhByGirl = new Map<string, HhGirlsRow[]>();
  const latestGirlsRow = new Map<string, HhGirlsRow>();

  for (const row of household) {
    if (!row.girl) continue;
    if (!hhByGirl.has(row.girl)) hhByGirl.set(row.girl, []);
    hhByGirl.get(row.girl)!.push(row);
  }
  for (const row of girls) {
    if (!row.girl) continue;
    const prev = latestGirlsRow.get(row.girl);
    latestGirlsRow.set(row.girl, latestRow(prev ? [prev, row] : [row])!);
  }

  const girlsWithMissing = new Set<string>();
  const add = (
    key: Exclude<HhGirlsMissingListKey, "totalMissingSurveys">,
    exportRow: HhGirlsExportRow,
    girl: string
  ) => {
    lists[key].push(exportRow);
    lists.totalMissingSurveys.push(exportRow);
    girlsWithMissing.add(girl);
  };

  for (const [girl, hhSubs] of hhByGirl) {
    const fatherAgreed = latestAgreedRow(hhSubs, "agree_consent_father");
    if (fatherAgreed && !hhSubs.some((s) => isFatherRespondent(s.respondent))) {
      add(
        "missingFatherSurveys",
        toMissingExportRow(fatherAgreed, "Father", "Father agreed consent but his form was not submitted"),
        girl
      );
    }

    const motherAgreed = latestAgreedRow(hhSubs, "agree_consent_mother");
    if (motherAgreed && !hhSubs.some((s) => isMotherRespondent(s.respondent))) {
      add(
        "missingMotherSurveys",
        toMissingExportRow(motherAgreed, "Mother", "Mother agreed consent but her form was not submitted"),
        girl
      );
    }

    const caretakerAgreed = latestAgreedRow(hhSubs, "agree_consent_caregiver");
    if (caretakerAgreed && !hhSubs.some((s) => isCaretakerRespondent(s))) {
      add(
        "missingCaretakerSurveys",
        toMissingExportRow(caretakerAgreed, "Caretaker", "Caretaker agreed consent but the form was not submitted"),
        girl
      );
    }

    if (!latestGirlsRow.has(girl)) {
      const father = analyzeParentSlot(hhSubs, "father");
      const mother = analyzeParentSlot(hhSubs, "mother");
      const hhDone =
        father.isPermanentlyUnavailable && mother.isPermanentlyUnavailable
          ? isCaretakerSurveyComplete(hhSubs)
          : (father.hasCompleteInterview ||
              father.isPermanentlyUnavailable ||
              father.hasRefusedConsent) &&
            (mother.hasCompleteInterview ||
              mother.isPermanentlyUnavailable ||
              mother.hasRefusedConsent) &&
            (father.hasCompleteInterview || mother.hasCompleteInterview);
      if (hhDone) {
        add(
          "missingGirlSurveys",
          toMissingExportRow(latestRow(hhSubs)!, "Girl", "HH survey done but girls survey not submitted"),
          girl
        );
      }
    }
  }

  for (const [girl, gsRow] of latestGirlsRow) {
    if (hhByGirl.has(girl)) continue;
    const reason = "Girls survey submitted but no HH survey";
    add("missingBothParentsSurveys", toMissingExportRow(gsRow, "Father", reason), girl);
    add("missingBothParentsSurveys", toMissingExportRow(gsRow, "Mother", reason), girl);
  }

  return {
    missingFatherSurveys: lists.missingFatherSurveys.length,
    missingMotherSurveys: lists.missingMotherSurveys.length,
    missingGirlSurveys: lists.missingGirlSurveys.length,
    missingCaretakerSurveys: lists.missingCaretakerSurveys.length,
    missingBothParentsSurveys: lists.missingBothParentsSurveys.length,
    totalMissingSurveys: lists.totalMissingSurveys.length,
    girlsWithAnyMissing: girlsWithMissing.size,
    lists,
  };
}
