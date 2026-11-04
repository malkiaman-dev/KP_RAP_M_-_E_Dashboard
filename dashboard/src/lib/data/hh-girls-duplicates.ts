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
  | "sameGirlTwoIds"
  | "girlsWithDuplicates";

export type DuplicateFormType = "Father" | "Mother" | "Caretaker" | "Girls" | "No respondent";

export interface HhGirlsDuplicateDetailMetrics {
  /** Extra submissions to void (the original is not counted). */
  totalDuplicates: number;
  sameEnumeratorDuplicates: number;
  differentEnumeratorDuplicates: number;
  /** Forms of a girl surveyed again under a second girl ID (included in the total). */
  sameGirlTwoIds: number;
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
    sameGirlTwoIds: [],
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

function letters(x?: string): string {
  return (x || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/(bibi|bb)$/, "");
}

/** 1 − Levenshtein distance / longer length. */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const up = prev[j]!;
      prev[j] = Math.min(up + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return 1 - prev[b.length]! / Math.max(a.length, b.length);
}

const similar = (a: string, b: string) => similarity(a, b) >= 0.8;

function realPhone(x?: string): string {
  const digits = (x || "").replace(/\D/g, "").slice(-10);
  if (digits.length < 10 || new Set(digits.slice(1)).size <= 1) return "";
  if (digits === "3123456789" || digits === "1234567890") return "";
  return digits;
}

interface GirlIdentity {
  id: string;
  girl: string;
  father: string;
  district: string;
  phones: Set<string>;
  roster: Set<string>;
  forms: HhGirlsRow[];
}

/** Both girls found in this household roster as two different members -> sisters. */
function listsBothGirls(home: GirlIdentity, other: GirlIdentity): boolean {
  const best = (name: string) => {
    let top = "";
    let score = 0;
    for (const m of home.roster) {
      const s = similarity(name, m);
      if (s > score) [top, score] = [m, s];
    }
    return score >= 0.8 ? top : "";
  };
  const a = best(home.girl);
  const b = best(other.girl);
  return Boolean(a && b && a !== b);
}

/**
 * The same girl surveyed under two girl IDs. Strict, so sisters are not
 * flagged: same district, same real phone, girl and father names >= 80%
 * similar, and neither household roster lists both girls as separate
 * members. Matches the DQA rule HH_CR_SAME_GIRL_TWO_IDS. Returns each form
 * of the ID with fewer forms, mapped to a form of the kept ID.
 */
function sameGirlTwoIdDuplicates(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): Map<HhGirlsRow, HhGirlsRow> {
  const ids = new Map<string, GirlIdentity>();
  for (const row of household) {
    const id = (row.girl || "").trim();
    if (!id) continue;
    if (!ids.has(id)) {
      ids.set(id, { id, girl: "", father: "", district: "", phones: new Set(), roster: new Set(), forms: [] });
    }
    const ent = ids.get(id)!;
    ent.forms.push(row);
    ent.girl ||= letters(row.girlname_label);
    ent.father ||= letters(row.fathername_label);
    ent.district ||= (row.district || "").trim();
    const phone = realPhone(row.phonenumber);
    if (phone) ent.phones.add(phone);
    for (const [col, value] of Object.entries(row)) {
      if (/^name_(sibling_)?\d+$/.test(col) && letters(value)) ent.roster.add(letters(value));
    }
  }
  for (const row of girls) {
    const ent = ids.get((row.girl || "").trim());
    if (ent) ent.forms.push(row);
  }

  const byPhone = new Map<string, GirlIdentity[]>();
  for (const ent of ids.values()) {
    for (const phone of ent.phones) {
      const key = `${ent.district}|${phone}`;
      if (!byPhone.has(key)) byPhone.set(key, []);
      byPhone.get(key)!.push(ent);
    }
  }

  const result = new Map<HhGirlsRow, HhGirlsRow>();
  const seen = new Set<string>();
  for (const group of byPhone.values()) {
    for (let x = 0; x < group.length; x += 1) {
      for (let y = x + 1; y < group.length; y += 1) {
        const [a, b] = [group[x]!, group[y]!];
        const pair = [a.id, b.id].sort().join("|");
        if (seen.has(pair)) continue;
        seen.add(pair);
        if (!similar(a.girl, b.girl) || !similar(a.father, b.father)) continue;
        if (listsBothGirls(a, b) || listsBothGirls(b, a)) continue;
        const [keep, dup] = a.forms.length >= b.forms.length ? [a, b] : [b, a];
        for (const row of dup.forms) {
          const sameType = keep.forms.filter((k) => formType(k) === formType(row));
          const match =
            sameType.find((k) => enumeratorKey(k) === enumeratorKey(row)) ??
            sameType[0] ??
            keep.forms[0]!;
          result.set(row, match);
        }
      }
    }
  }
  return result;
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
 * - The same girl surveyed again under a second girl ID (see
 *   `sameGirlTwoIdDuplicates`).
 *
 * Earlier unsuccessful attempts followed by a revisit are revisit history,
 * not duplicates; neither is a new attempt after a refusal. Father and mother forms for the same girl are separate
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
  const recorded = new Set<HhGirlsRow>();

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

    record(duplicateOf, false);
  }
  record(sameGirlTwoIdDuplicates(household, girls), true);

  function record(duplicateOf: Map<HhGirlsRow, HhGirlsRow>, otherId: boolean) {
    for (const [row, of] of duplicateOf) {
      // a form is counted once, even if it is also a same-slot duplicate
      if (recorded.has(row)) continue;
      recorded.add(row);
      const sameEnumerator = enumeratorKey(row) === enumeratorKey(of);
      const type = sameEnumerator ? "Same enumerator" : "Different enumerator";
      const exportRow: HhGirlsExportRow = {
        ...toHhGirlsExportRow(row, `Duplicate ${formType(row)} survey`),
        duplicateType: otherId ? `Same girl, two IDs · ${type}` : type,
        exportReason: otherId
          ? `Same girl as ID ${of.girl} (${of.girlname_label || ""}): same father and phone. Duplicate of ${of.KEY} (${cleanName(of.enumerator_name)})`
          : `Duplicate of ${of.KEY} (${cleanName(of.enumerator_name)}, attempt ${parseAttempt(of)})`,
      };
      if (otherId) lists.sameGirlTwoIds.push(exportRow);
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
    sameGirlTwoIds: lists.sameGirlTwoIds.length,
    girlsWithDuplicates: lists.girlsWithDuplicates.length,
    byFormType,
    lists,
  };
}
