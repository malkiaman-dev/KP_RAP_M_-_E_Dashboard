import { isHhGirlsFormComplete } from "./hh-girls-completion";
import {
  isCaretakerRespondent,
  isFatherRespondent,
  isMotherRespondent,
  type HhGirlsRow,
} from "./hh-girls-metrics";
import { toHhGirlsExportRow, type HhGirlsExportRow } from "./hh-girls-revisit";
import { submissionTimestamp } from "../utils";

export type HhGirlsDuplicateListKey =
  | "totalDuplicates"
  | "sameEnumeratorDuplicates"
  | "differentEnumeratorDuplicates"
  | "girlsWithDuplicates";

export type DuplicateFormType = "Father" | "Mother" | "Caretaker" | "Girls" | "No respondent";

export interface HhGirlsDuplicateDetailMetrics {
  /** Extra submissions to void (the original is not counted). */
  totalDuplicates: number;
  sameEnumeratorDuplicates: number;
  differentEnumeratorDuplicates: number;
  /** Unique girls with at least one duplicate submission. */
  girlsWithDuplicates: number;
  byFormType: Record<DuplicateFormType, number>;
}

export interface HhGirlsDuplicateDetailData extends HhGirlsDuplicateDetailMetrics {
  lists: Record<HhGirlsDuplicateListKey, HhGirlsExportRow[]>;
}

function emptyDuplicateLists(): Record<HhGirlsDuplicateListKey, HhGirlsExportRow[]> {
  return {
    totalDuplicates: [],
    sameEnumeratorDuplicates: [],
    differentEnumeratorDuplicates: [],
    girlsWithDuplicates: [],
  };
}

function formType(row: HhGirlsRow): DuplicateFormType {
  if (row.survey_type === "girls") return "Girls";
  if (isCaretakerRespondent(row)) return "Caretaker";
  if (isFatherRespondent(row.respondent)) return "Father";
  if (isMotherRespondent(row.respondent)) return "Mother";
  return "No respondent";
}

function parseAttempt(row: HhGirlsRow): number {
  const n = Number(row.attempt);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function enumeratorKey(row: HhGirlsRow): string {
  return (row.enumerator_id || row.enumerator_name || "").trim();
}

function formTime(row: HhGirlsRow): number {
  return submissionTimestamp(row.starttime) || submissionTimestamp(row.SubmissionDate);
}

function cleanName(name?: string): string {
  return (name || "").replace(/\(.*\)/, "").trim() || "unknown enumerator";
}

/**
 * Real duplicate submissions: the same survey slot (girl + father / mother /
 * caretaker, or the girl's girls survey) submitted again, by the same or a
 * different enumerator.
 *
 * - Once the slot is complete, every later form for it is a duplicate
 *   (whatever attempt number it carries).
 * - Copies of the same attempt are duplicates; the complete copy is kept,
 *   else the latest.
 *
 * Earlier unsuccessful attempts followed by a revisit are revisit history,
 * not duplicates. Father and mother forms for the same girl are separate
 * slots and never duplicates of each other.
 */
export function computeHhGirlsDuplicateDetail(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): HhGirlsDuplicateDetailData {
  const slots = new Map<string, HhGirlsRow[]>();
  for (const row of [...household, ...girls]) {
    const girl = (row.girl || "").trim();
    if (!girl) continue;
    const key = `${girl}|${formType(row)}`;
    if (!slots.has(key)) slots.set(key, []);
    slots.get(key)!.push(row);
  }

  const lists = emptyDuplicateLists();
  const byFormType: Record<DuplicateFormType, number> = {
    Father: 0,
    Mother: 0,
    Caretaker: 0,
    Girls: 0,
    "No respondent": 0,
  };
  const girlsWithDuplicates = new Map<string, HhGirlsExportRow>();

  for (const subs of slots.values()) {
    if (subs.length < 2) continue;
    const sorted = [...subs].sort((a, b) => formTime(a) - formTime(b));
    const original = sorted.find((r) => isHhGirlsFormComplete(r));

    // duplicate row -> the form it duplicates
    const duplicateOf = new Map<HhGirlsRow, HhGirlsRow>();
    if (original) {
      for (const row of sorted) {
        if (row !== original && formTime(row) >= formTime(original)) {
          duplicateOf.set(row, original);
        }
      }
    }

    const byAttempt = new Map<number, HhGirlsRow[]>();
    for (const row of sorted) {
      if (duplicateOf.has(row)) continue;
      const a = parseAttempt(row);
      if (!byAttempt.has(a)) byAttempt.set(a, []);
      byAttempt.get(a)!.push(row);
    }
    for (const copies of byAttempt.values()) {
      if (copies.length < 2) continue;
      const kept =
        original && copies.includes(original)
          ? original
          : [...copies].reverse().find((r) => isHhGirlsFormComplete(r)) ??
            copies[copies.length - 1]!;
      for (const row of copies) {
        if (row !== kept) duplicateOf.set(row, kept);
      }
    }

    for (const [row, of] of duplicateOf) {
      const sameEnumerator = enumeratorKey(row) === enumeratorKey(of);
      const type = sameEnumerator ? "Same enumerator" : "Different enumerator";
      const exportRow: HhGirlsExportRow = {
        ...toHhGirlsExportRow(row, `Duplicate ${formType(row)} survey`),
        duplicateType: type,
        exportReason: `Duplicate of ${of.KEY} (${cleanName(of.enumerator_name)}, attempt ${parseAttempt(of)})`,
      };
      lists.totalDuplicates.push(exportRow);
      (sameEnumerator
        ? lists.sameEnumeratorDuplicates
        : lists.differentEnumeratorDuplicates
      ).push(exportRow);
      byFormType[formType(row)] += 1;
      girlsWithDuplicates.set(exportRow.girlId, exportRow);
    }
  }

  lists.girlsWithDuplicates = [...girlsWithDuplicates.values()];

  const sortByDate = (a: HhGirlsExportRow, b: HhGirlsExportRow) =>
    submissionTimestamp(b.submissionDate) - submissionTimestamp(a.submissionDate);
  for (const key of Object.keys(lists) as HhGirlsDuplicateListKey[]) {
    lists[key].sort(sortByDate);
  }

  return {
    totalDuplicates: lists.totalDuplicates.length,
    sameEnumeratorDuplicates: lists.sameEnumeratorDuplicates.length,
    differentEnumeratorDuplicates: lists.differentEnumeratorDuplicates.length,
    girlsWithDuplicates: lists.girlsWithDuplicates.length,
    byFormType,
    lists,
  };
}
