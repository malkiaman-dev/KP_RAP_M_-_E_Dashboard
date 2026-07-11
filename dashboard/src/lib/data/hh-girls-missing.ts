import {
  analyzeParentSlot,
  isCaretakerMarkedUnavailable,
  isCaretakerSurveyComplete,
  isCompletedHouseholdForGirl,
  isTemporaryGirlUnavailable,
} from "./hh-girls-completion";
import type { HhGirlsRow } from "./hh-girls-metrics";
import {
  toHhGirlsExportRow,
  type HhGirlsExportRow,
} from "./hh-girls-revisit";

export type HhGirlsMissingListKey =
  | "missingFatherSurveys"
  | "missingMotherSurveys"
  | "missingGirlSurveys"
  | "missingCaretakerSurveys"
  | "totalMissingSurveys";

export interface HhGirlsMissingDetailMetrics {
  missingFatherSurveys: number;
  missingMotherSurveys: number;
  missingGirlSurveys: number;
  missingCaretakerSurveys: number;
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
    totalMissingSurveys: [],
  };
}

function rowTimestamp(row: HhGirlsRow): number {
  return new Date(row.SubmissionDate || 0).getTime();
}

function latestRow(rows: HhGirlsRow[]): HhGirlsRow | undefined {
  if (rows.length === 0) return undefined;
  return [...rows].sort((a, b) => rowTimestamp(b) - rowTimestamp(a))[0];
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

/**
 * A survey is "missing" when it is still required for HH completion,
 * was not permanently waived, is not in an active temporary-revisit queue,
 * and has not been successfully interviewed yet.
 *
 * Example: mother + girl done, father available / not coded unavailable,
 * but no father form → missing father survey.
 */
export function computeHhGirlsMissingDetail(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): HhGirlsMissingDetailData {
  const lists = emptyMissingLists();
  const hhByGirl = new Map<string, HhGirlsRow[]>();
  const gsByGirl = new Map<string, HhGirlsRow>();
  const girlIds = new Set<string>();

  for (const row of household) {
    if (!row.girl) continue;
    girlIds.add(row.girl);
    if (!hhByGirl.has(row.girl)) hhByGirl.set(row.girl, []);
    hhByGirl.get(row.girl)!.push(row);
  }
  for (const row of girls) {
    if (!row.girl) continue;
    girlIds.add(row.girl);
    gsByGirl.set(row.girl, row);
  }

  const girlsWithMissing = new Set<string>();

  for (const girl of girlIds) {
    const hhSubs = hhByGirl.get(girl) || [];
    const gsRow = gsByGirl.get(girl);
    const rep = latestRow(gsRow ? [...hhSubs, gsRow] : hhSubs);
    if (!rep) continue;

    // Already complete households have nothing missing
    if (isCompletedHouseholdForGirl(hhSubs, gsRow)) continue;

    const father = analyzeParentSlot(hhSubs, "father");
    const mother = analyzeParentSlot(hhSubs, "mother");
    const bothParentsPermanent =
      father.isPermanentlyUnavailable && mother.isPermanentlyUnavailable;

    // --- Father ---
    // Required unless permanently unavailable or both-parents-permanent (caretaker path)
    if (
      !bothParentsPermanent &&
      !father.isPermanentlyUnavailable &&
      !father.hasCompleteInterview &&
      !father.hasPendingTemporaryUnavailable
    ) {
      const exportRow = toMissingExportRow(
        rep,
        "Father",
        "Required father interview not filed"
      );
      lists.missingFatherSurveys.push(exportRow);
      lists.totalMissingSurveys.push(exportRow);
      girlsWithMissing.add(girl);
    }

    // --- Mother ---
    if (
      !bothParentsPermanent &&
      !mother.isPermanentlyUnavailable &&
      !mother.hasCompleteInterview &&
      !mother.hasPendingTemporaryUnavailable
    ) {
      const exportRow = toMissingExportRow(
        rep,
        "Mother",
        "Required mother interview not filed"
      );
      lists.missingMotherSurveys.push(exportRow);
      lists.totalMissingSurveys.push(exportRow);
      girlsWithMissing.add(girl);
    }

    // --- Girl ---
    const girlTempPending =
      Boolean(gsRow) &&
      isTemporaryGirlUnavailable(
        gsRow!.girl_available,
        gsRow!.girl_available_reason
      ) &&
      !isGirlSurveyComplete(gsRow);

    if (!isGirlSurveyComplete(gsRow) && !girlTempPending) {
      // Permanent girl unavailability still leaves HH incomplete, but that is
      // "not available" rather than a skipped available interview — only flag
      // when there is no permanent unavailability reason, or no girls form yet.
      const permanentlyUnavailableGirl =
        gsRow?.girl_available === "0" &&
        !isTemporaryGirlUnavailable(
          gsRow.girl_available,
          gsRow.girl_available_reason
        );

      if (!permanentlyUnavailableGirl) {
        const exportRow = toMissingExportRow(
          rep,
          "Girl",
          gsRow
            ? "Girls survey not completed"
            : "Girls survey not filed"
        );
        lists.missingGirlSurveys.push(exportRow);
        lists.totalMissingSurveys.push(exportRow);
        girlsWithMissing.add(girl);
      }
    }

    // --- Caretaker ---
    // Required only when both parents are permanently unavailable
    if (
      bothParentsPermanent &&
      !isCaretakerSurveyComplete(hhSubs) &&
      !isCaretakerMarkedUnavailable(hhSubs)
    ) {
      const exportRow = toMissingExportRow(
        rep,
        "Caretaker",
        "Both parents permanently unavailable — caretaker interview not filed"
      );
      lists.missingCaretakerSurveys.push(exportRow);
      lists.totalMissingSurveys.push(exportRow);
      girlsWithMissing.add(girl);
    }
  }

  return {
    missingFatherSurveys: lists.missingFatherSurveys.length,
    missingMotherSurveys: lists.missingMotherSurveys.length,
    missingGirlSurveys: lists.missingGirlSurveys.length,
    missingCaretakerSurveys: lists.missingCaretakerSurveys.length,
    totalMissingSurveys: lists.totalMissingSurveys.length,
    girlsWithAnyMissing: girlsWithMissing.size,
    lists,
  };
}
