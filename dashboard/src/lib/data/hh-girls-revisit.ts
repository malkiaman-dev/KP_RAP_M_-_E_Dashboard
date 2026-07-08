import type { HhGirlsRow } from "./hh-girls-metrics";

export type HhGirlsSurveySlot = "father" | "mother" | "girls";

export interface HhGirlsExportRow {
  keyId: string;
  girlId: string;
  girlName: string;
  district: string;
  village: string;
  surveyType: string;
  respondent: string;
  attempt: string;
  availability: string;
  consent: string;
  consentLabel: string;
  surveyStatus: string;
  surveyStatusLabel: string;
  enumeratorId: string;
  enumeratorName: string;
  submissionDate: string;
  category: string;
  duplicateType?: string;
  exportReason?: string;
}

export type HhGirlsRevisitListKey =
  | "revisitsNeedToBeDone"
  | "revisitsNeed2nd"
  | "revisitsNeed3rd"
  | "girls2ndRevisited"
  | "girls3rdRevisited"
  | "slotsCompletedOn2ndRevisit"
  | "slotsCompletedOn3rdRevisit"
  | "slotsNotCompletedOn2ndRevisit"
  | "slotsNotCompletedOn3rdRevisit"
  | "totalRevisitedGirls";

export interface HhGirlsRevisitDetailMetrics {
  revisitsNeedToBeDone: number;
  revisitsNeed2nd: number;
  revisitsNeed3rd: number;
  totalRemainingRevisits: number;
  girls2ndRevisited: number;
  girls3rdRevisited: number;
  slotsCompletedOn2ndRevisit: number;
  slotsCompletedOn3rdRevisit: number;
  slotsNotCompletedOn2ndRevisit: number;
  slotsNotCompletedOn3rdRevisit: number;
  totalRevisitedGirls: number;
  revisitSubmissions: number;
}

export interface HhGirlsRevisitDetailData extends HhGirlsRevisitDetailMetrics {
  lists: Record<HhGirlsRevisitListKey, HhGirlsExportRow[]>;
}

function districtLabel(d: string): string {
  const map: Record<string, string> = {
    "1": "D.I. Khan",
    "2": "Hangu",
    "3": "Lakki Marwat",
    "4": "Torghar",
  };
  return map[d] || `District ${d}`;
}

function isMotherRespondent(respondent?: string): boolean {
  return respondent === "2" || respondent === "4";
}

function isFatherRespondent(respondent?: string): boolean {
  return respondent === "1" || respondent === "3";
}

function emptyRevisitLists(): Record<HhGirlsRevisitListKey, HhGirlsExportRow[]> {
  return {
    revisitsNeedToBeDone: [],
    revisitsNeed2nd: [],
    revisitsNeed3rd: [],
    girls2ndRevisited: [],
    girls3rdRevisited: [],
    slotsCompletedOn2ndRevisit: [],
    slotsCompletedOn3rdRevisit: [],
    slotsNotCompletedOn2ndRevisit: [],
    slotsNotCompletedOn3rdRevisit: [],
    totalRevisitedGirls: [],
  };
}

function cleanEnumeratorName(name?: string): string {
  if (!name) return "";
  return name.replace(/\(.*\)/, "").trim();
}

function parseAttempt(row: HhGirlsRow): number {
  const n = Number(row.attempt);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function surveySlot(row: HhGirlsRow): HhGirlsSurveySlot | null {
  if (row.survey_type === "girls") return "girls";
  if (isFatherRespondent(row.respondent)) return "father";
  if (isMotherRespondent(row.respondent)) return "mother";
  return null;
}

function slotLabel(slot: HhGirlsSurveySlot): string {
  if (slot === "father") return "HH Father";
  if (slot === "mother") return "HH Mother";
  return "Girls Survey";
}

function consentLabel(row: HhGirlsRow): string {
  if (row.survey_type === "girls") {
    if (row.parental_consent_agree === "0" || row.child_consent_agree === "0") {
      return "Consent refused";
    }
    if (row.parental_consent_agree === "1" && row.child_consent_agree === "1") {
      return "Both consents";
    }
    return "";
  }
  if (isMotherRespondent(row.respondent)) {
    if (row.agree_consent_mother === "1") return "Mother agreed";
    if (row.agree_consent_mother === "0") return "Mother refused";
  }
  if (isFatherRespondent(row.respondent)) {
    if (row.agree_consent_father === "1") return "Father agreed";
    if (row.agree_consent_father === "0") return "Father refused";
  }
  return "";
}

function surveyStatusLabel(v?: string): string {
  if (v === "1") return "Complete";
  if (v === "2") return "Incomplete";
  return v?.trim() || "";
}

function availabilityLabel(row: HhGirlsRow): string {
  if (row.survey_type === "girls") {
    if (row.girl_available === "1") return "Girl available";
    if (row.girl_available === "0") return "Girl not available";
    return "";
  }
  const a = (row.available || "").trim();
  if (!a) return "";
  if (a.includes("1") && a.includes("2")) return "Both parents available";
  if (a === "2" || a.startsWith("2 ")) return "Mother only";
  if (a === "1" || a.endsWith(" 1")) return "Father only";
  return a;
}

export function toHhGirlsExportRow(
  row: HhGirlsRow,
  category: string
): HhGirlsExportRow {
  const slot = surveySlot(row);
  return {
    keyId: (row.KEY || "").trim(),
    girlId: (row.girl || "").trim(),
    girlName: (row.girlname_label || "").trim(),
    district: districtLabel(row.district || ""),
    village: (row.village_label || row.village || "").trim(),
    surveyType: slot ? slotLabel(slot) : row.survey_type,
    respondent: (row.respondent || "").trim(),
    attempt: String(parseAttempt(row)),
    availability: availabilityLabel(row),
    consent:
      row.survey_type === "girls"
        ? `${row.parental_consent_agree || ""}/${row.child_consent_agree || ""}`
        : isMotherRespondent(row.respondent)
          ? row.agree_consent_mother || ""
          : row.agree_consent_father || "",
    consentLabel: consentLabel(row),
    surveyStatus: row.survey_status?.trim() || "",
    surveyStatusLabel: surveyStatusLabel(row.survey_status),
    enumeratorId: (row.enumerator_id || "").trim(),
    enumeratorName: cleanEnumeratorName(row.enumerator_name),
    submissionDate: (row.SubmissionDate || "").trim(),
    category,
  };
}

function priorAttemptRequiresRevisit(row: HhGirlsRow): boolean {
  if (row.survey_type === "girls") {
    if (row.girl_available !== "0") return false;
    const reason = (row.girl_available_reason || "").trim();
    return reason === "1" || reason === "4" || reason === "";
  }
  if (isMotherRespondent(row.respondent)) {
    return Boolean((row.mother_unavailable1 || "").trim());
  }
  if (isFatherRespondent(row.respondent)) {
    return Boolean((row.father_unavailable1 || "").trim());
  }
  return false;
}

function isSlotComplete(row: HhGirlsRow): boolean {
  if (row.survey_status !== "1") return false;
  if (row.survey_type === "girls") {
    return (
      row.girl_available === "1" &&
      row.parental_consent_agree === "1" &&
      row.child_consent_agree === "1"
    );
  }
  if (isMotherRespondent(row.respondent)) {
    return row.agree_consent_mother === "1";
  }
  if (isFatherRespondent(row.respondent)) {
    return row.agree_consent_father === "1";
  }
  return true;
}

function slotKey(girl: string, slot: HhGirlsSurveySlot): string {
  return `${girl}|${slot}`;
}

function groupSlotSubmissions(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): Map<string, HhGirlsRow[]> {
  const groups = new Map<string, HhGirlsRow[]>();
  const all = [...household, ...girls];

  for (const row of all) {
    const girl = row.girl;
    const slot = surveySlot(row);
    if (!girl || !slot) continue;
    const key = slotKey(girl, slot);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  for (const subs of groups.values()) {
    subs.sort(
      (a, b) =>
        parseAttempt(a) - parseAttempt(b) ||
        new Date(a.SubmissionDate || 0).getTime() -
          new Date(b.SubmissionDate || 0).getTime()
    );
  }

  return groups;
}

function latestSubmissionForAttempt(
  subs: HhGirlsRow[],
  attempt: number
): HhGirlsRow | undefined {
  const matches = subs.filter((s) => parseAttempt(s) === attempt);
  return matches[matches.length - 1];
}

function slotIsComplete(subs: HhGirlsRow[]): boolean {
  return subs.some(isSlotComplete);
}

function slotPendingRevisit(subs: HhGirlsRow[]): "2nd" | "3rd" | null {
  if (slotIsComplete(subs)) return null;
  const attempts = [...new Set(subs.map(parseAttempt))].sort((a, b) => a - b);
  const maxAttempt = attempts[attempts.length - 1] || 1;
  const latest = latestSubmissionForAttempt(subs, maxAttempt);
  if (!latest) return null;

  if (maxAttempt >= 3) return null;
  if (maxAttempt === 1 && priorAttemptRequiresRevisit(latest)) return "2nd";
  if (maxAttempt === 2 && priorAttemptRequiresRevisit(latest)) return "3rd";
  return null;
}

export function computeHhGirlsRevisitDetail(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): HhGirlsRevisitDetailData {
  const lists = emptyRevisitLists();
  const slotGroups = groupSlotSubmissions(household, girls);
  const revisitedGirls = new Map<string, HhGirlsExportRow>();

  let revisitsNeed2nd = 0;
  let revisitsNeed3rd = 0;
  let girls2ndRevisited = 0;
  let girls3rdRevisited = 0;
  let slotsCompletedOn2ndRevisit = 0;
  let slotsCompletedOn3rdRevisit = 0;
  let slotsNotCompletedOn2ndRevisit = 0;
  let slotsNotCompletedOn3rdRevisit = 0;

  const revisitSubmissions = [...household, ...girls].filter(
    (r) => parseAttempt(r) > 1
  ).length;

  for (const [, subs] of slotGroups.entries()) {
    const girl = subs[0]?.girl || "";
    const pending = slotPendingRevisit(subs);
    const slot = surveySlot(subs[0]!)!;
    const slotName = slotLabel(slot);

    if (pending === "2nd") {
      revisitsNeed2nd += 1;
      const row = subs[0]!;
      const exportRow = toHhGirlsExportRow(
        row,
        `${slotName} · 2nd attempt still needed`
      );
      lists.revisitsNeed2nd.push(exportRow);
      lists.revisitsNeedToBeDone.push(exportRow);
    } else if (pending === "3rd") {
      revisitsNeed3rd += 1;
      const row = latestSubmissionForAttempt(subs, 2) || subs[subs.length - 1]!;
      const exportRow = toHhGirlsExportRow(
        row,
        `${slotName} · 3rd attempt still needed`
      );
      lists.revisitsNeed3rd.push(exportRow);
      lists.revisitsNeedToBeDone.push(exportRow);
    }

    const second = latestSubmissionForAttempt(subs, 2);
    if (second) {
      girls2ndRevisited += 1;
      const exportRow = toHhGirlsExportRow(second, `${slotName} · 2nd revisit`);
      lists.girls2ndRevisited.push(exportRow);
      if (girl) revisitedGirls.set(girl, exportRow);
      if (isSlotComplete(second)) {
        slotsCompletedOn2ndRevisit += 1;
        lists.slotsCompletedOn2ndRevisit.push(exportRow);
      } else {
        slotsNotCompletedOn2ndRevisit += 1;
        lists.slotsNotCompletedOn2ndRevisit.push(exportRow);
      }
    }

    const third = latestSubmissionForAttempt(subs, 3);
    if (third) {
      girls3rdRevisited += 1;
      const exportRow = toHhGirlsExportRow(third, `${slotName} · 3rd revisit`);
      lists.girls3rdRevisited.push(exportRow);
      if (girl) revisitedGirls.set(girl, exportRow);
      if (isSlotComplete(third)) {
        slotsCompletedOn3rdRevisit += 1;
        lists.slotsCompletedOn3rdRevisit.push(exportRow);
      } else {
        slotsNotCompletedOn3rdRevisit += 1;
        lists.slotsNotCompletedOn3rdRevisit.push(exportRow);
      }
    }
  }

  lists.totalRevisitedGirls = [...revisitedGirls.values()];

  const revisitsNeedToBeDone = revisitsNeed2nd + revisitsNeed3rd;
  const concludedViaRevisit =
    slotsCompletedOn2ndRevisit +
    slotsCompletedOn3rdRevisit +
    slotsNotCompletedOn3rdRevisit;

  return {
    revisitsNeedToBeDone,
    revisitsNeed2nd,
    revisitsNeed3rd,
    totalRemainingRevisits: Math.max(0, revisitsNeedToBeDone - concludedViaRevisit),
    girls2ndRevisited,
    girls3rdRevisited,
    slotsCompletedOn2ndRevisit,
    slotsCompletedOn3rdRevisit,
    slotsNotCompletedOn2ndRevisit,
    slotsNotCompletedOn3rdRevisit,
    totalRevisitedGirls: revisitedGirls.size,
    revisitSubmissions,
    lists,
  };
}
