import type { HhGirlsRow } from "./hh-girls-metrics";
import { toHhGirlsExportRow, type HhGirlsExportRow } from "./hh-girls-revisit";

function isMotherRespondent(respondent?: string): boolean {
  return respondent === "2" || respondent === "4";
}

function isFatherRespondent(respondent?: string): boolean {
  return respondent === "1" || respondent === "3";
}

export type HhGirlsDuplicateListKey =
  | "totalDuplicates"
  | "sameAttemptDuplicates"
  | "exactDuplicates"
  | "revisitDuplicates"
  | "differentEnumeratorDuplicates"
  | "supersededUnsuccessful"
  | "unnecessaryFollowUp";

export interface HhGirlsDuplicateDetailMetrics {
  totalUnnecessaryRows: number;
  sameAttemptDuplicateRows: number;
  extraDuplicates: number;
  uniqueAttemptSlots: number;
  exactDuplicates: number;
  revisitDuplicates: number;
  differentEnumeratorDuplicates: number;
  supersededUnsuccessful: number;
  unnecessaryFollowUp: number;
  duplicateGroups: number;
}

export interface HhGirlsDuplicateDetailData extends HhGirlsDuplicateDetailMetrics {
  lists: Record<HhGirlsDuplicateListKey, HhGirlsExportRow[]>;
}

const SUPERSEDED_TYPE = "Superseded failed attempt";
const UNNECESSARY_FOLLOWUP_TYPE = "Unnecessary follow-up";

function emptyDuplicateLists(): Record<HhGirlsDuplicateListKey, HhGirlsExportRow[]> {
  return {
    totalDuplicates: [],
    sameAttemptDuplicates: [],
    exactDuplicates: [],
    revisitDuplicates: [],
    differentEnumeratorDuplicates: [],
    supersededUnsuccessful: [],
    unnecessaryFollowUp: [],
  };
}

function duplicateGroupKey(row: HhGirlsRow): string {
  const girl = (row.girl || "").trim();
  const attempt = (row.attempt || "1").trim() || "1";
  if (row.survey_type === "girls") {
    return `${girl}|girls|${attempt}`;
  }
  const respondent = (row.respondent || "").trim();
  return `${girl}|hh|${respondent}|${attempt}`;
}

function parseAttempt(row: HhGirlsRow): number {
  const n = Number(row.attempt);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function enumeratorKey(row: HhGirlsRow): string {
  return (row.enumerator_id || row.enumerator_name || "").trim();
}

function classifyDuplicateGroup(subs: HhGirlsRow[]): string {
  const types: string[] = [];
  const enumerators = new Set(subs.map(enumeratorKey).filter(Boolean));
  const attempts = subs.map(parseAttempt);
  if (enumerators.size <= 1 && subs.length > 1) {
    types.push("Exact duplicate");
  }
  if (enumerators.size > 1) {
    types.push("Different enumerator duplicate");
  }
  if (attempts.some((a) => a > 1)) {
    types.push("Revisit duplicate");
  }
  return types.length > 0 ? types.join(" · ") : "Same-attempt duplicate";
}

function isSlotSuccessful(row: HhGirlsRow): boolean {
  if (row.survey_status !== "1") return false;
  if (row.survey_type === "girls") {
    return row.girl_available === "1";
  }
  if (isMotherRespondent(row.respondent)) {
    return row.agree_consent_mother === "1";
  }
  if (isFatherRespondent(row.respondent)) {
    return row.agree_consent_father === "1";
  }
  return true;
}

function mergeDuplicateExportRows(
  ...groups: HhGirlsExportRow[][]
): HhGirlsExportRow[] {
  const map = new Map<string, HhGirlsExportRow>();
  for (const rows of groups) {
    for (const row of rows) {
      const existing = map.get(row.keyId);
      if (!existing) {
        map.set(row.keyId, row);
        continue;
      }
      const types = new Set(
        `${existing.duplicateType || ""} · ${row.duplicateType || ""}`
          .split(" · ")
          .map((t) => t.trim())
          .filter(Boolean)
      );
      map.set(row.keyId, {
        ...existing,
        duplicateType: [...types].join(" · "),
        category: existing.category || row.category,
      });
    }
  }
  return [...map.values()];
}

function computeSequentialDuplicateIssues(rows: HhGirlsRow[]) {
  const groups = new Map<string, HhGirlsRow[]>();

  for (const row of rows) {
    const slotKey =
      row.survey_type === "girls"
        ? `${row.girl}|girls`
        : `${row.girl}|hh|${row.respondent}`;
    if (!groups.has(slotKey)) groups.set(slotKey, []);
    groups.get(slotKey)!.push(row);
  }

  const supersededUnsuccessful: HhGirlsExportRow[] = [];
  const unnecessaryFollowUp: HhGirlsExportRow[] = [];

  for (const subs of groups.values()) {
    const sorted = [...subs].sort(
      (a, b) =>
        parseAttempt(a) - parseAttempt(b) ||
        new Date(a.SubmissionDate || 0).getTime() -
          new Date(b.SubmissionDate || 0).getTime()
    );

    let sawSuccess = false;

    for (const row of sorted) {
      const attempt = parseAttempt(row);
      const success = isSlotSuccessful(row);

      if (sawSuccess && attempt > 1) {
        unnecessaryFollowUp.push({
          ...toHhGirlsExportRow(row, UNNECESSARY_FOLLOWUP_TYPE),
          duplicateType: UNNECESSARY_FOLLOWUP_TYPE,
        });
        continue;
      }

      if (!success && attempt < sorted.length) {
        supersededUnsuccessful.push({
          ...toHhGirlsExportRow(row, SUPERSEDED_TYPE),
          duplicateType: SUPERSEDED_TYPE,
        });
      }

      if (success) sawSuccess = true;
    }
  }

  return { supersededUnsuccessful, unnecessaryFollowUp };
}

export function computeHhGirlsDuplicateDetail(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): HhGirlsDuplicateDetailData {
  const rows = [...household, ...girls];
  const attemptGroups = new Map<string, HhGirlsRow[]>();

  for (const row of rows) {
    const key = duplicateGroupKey(row);
    if (!attemptGroups.has(key)) attemptGroups.set(key, []);
    attemptGroups.get(key)!.push(row);
  }

  const lists = emptyDuplicateLists();
  let duplicateGroups = 0;

  for (const subs of attemptGroups.values()) {
    if (subs.length <= 1) continue;
    duplicateGroups += 1;

    const duplicateType = classifyDuplicateGroup(subs);
    const isExact = duplicateType.includes("Exact duplicate");
    const isRevisit = duplicateType.includes("Revisit duplicate");
    const isDiffEnum = duplicateType.includes("Different enumerator duplicate");

    for (const row of subs) {
      const exportRow: HhGirlsExportRow = {
        ...toHhGirlsExportRow(row, duplicateType),
        duplicateType,
      };
      lists.sameAttemptDuplicates.push(exportRow);
      if (isExact) lists.exactDuplicates.push(exportRow);
      if (isRevisit) lists.revisitDuplicates.push(exportRow);
      if (isDiffEnum) lists.differentEnumeratorDuplicates.push(exportRow);
    }
  }

  const sequential = computeSequentialDuplicateIssues(rows);
  lists.supersededUnsuccessful = sequential.supersededUnsuccessful;
  lists.unnecessaryFollowUp = sequential.unnecessaryFollowUp;

  lists.totalDuplicates = mergeDuplicateExportRows(
    lists.sameAttemptDuplicates,
    lists.supersededUnsuccessful,
    lists.unnecessaryFollowUp
  );

  const sortByDate = (a: HhGirlsExportRow, b: HhGirlsExportRow) =>
    new Date(b.submissionDate || 0).getTime() -
    new Date(a.submissionDate || 0).getTime();

  for (const key of Object.keys(lists) as HhGirlsDuplicateListKey[]) {
    lists[key].sort(sortByDate);
  }

  const sameAttemptDuplicateRows = lists.sameAttemptDuplicates.length;
  const extraDuplicates = sameAttemptDuplicateRows - duplicateGroups;

  return {
    totalUnnecessaryRows: lists.totalDuplicates.length,
    sameAttemptDuplicateRows,
    extraDuplicates,
    uniqueAttemptSlots: attemptGroups.size,
    exactDuplicates: lists.exactDuplicates.length,
    revisitDuplicates: lists.revisitDuplicates.length,
    differentEnumeratorDuplicates: lists.differentEnumeratorDuplicates.length,
    supersededUnsuccessful: lists.supersededUnsuccessful.length,
    unnecessaryFollowUp: lists.unnecessaryFollowUp.length,
    duplicateGroups,
    lists,
  };
}
