import type { HhGirlsRow } from "./hh-girls-metrics";
import {
  analyzeParentSlot,
  isCaretakerMarkedUnavailable,
  isCaretakerSurveyComplete,
  isPermanentParentUnavailable,
  isTemporaryGirlUnavailable,
  isTemporaryParentUnavailable,
  parentUnavailableLabel,
} from "./hh-girls-completion";
import {
  isCaretakerRespondent,
  isFatherRespondent,
  isMotherRespondent,
} from "./hh-girls-metrics";

export type HhGirlsSurveySlot = "father" | "mother" | "caretaker" | "girls";

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
  fatherSlotStatus?: string;
  motherSlotStatus?: string;
  caretakerSlotStatus?: string;
  girlsSurveyDone?: string;
  girlsSurveyStatus?: string;
  girlsSurveyStatusLabel?: string;
  girlAvailable?: string;
  parentalConsent?: string;
  childConsent?: string;
  girlsSurveyKeyId?: string;
  girlsSurveyDate?: string;
  unavailableCode?: string;
  unavailableReason?: string;
  unavailableOther?: string;
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
  if (isCaretakerRespondent(row)) return "caretaker";
  if (isFatherRespondent(row.respondent)) return "father";
  if (isMotherRespondent(row.respondent)) return "mother";
  return null;
}

function slotLabel(slot: HhGirlsSurveySlot): string {
  if (slot === "father") return "HH Father";
  if (slot === "mother") return "HH Mother";
  if (slot === "caretaker") return "HH Caretaker";
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
  if (isCaretakerRespondent(row)) {
    if (row.agree_consent_caregiver === "1") return "Caretaker agreed";
    if (row.agree_consent_caregiver === "0") return "Caretaker refused";
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

function caretakerSlotStatusLabel(hhSubs: HhGirlsRow[]): string {
  if (isCaretakerSurveyComplete(hhSubs)) return "Interviewed (complete)";
  if (isCaretakerMarkedUnavailable(hhSubs)) {
    return "Not available — revisit pending";
  }
  const father = analyzeParentSlot(hhSubs, "father");
  const mother = analyzeParentSlot(hhSubs, "mother");
  if (father.isPermanentlyUnavailable && mother.isPermanentlyUnavailable) {
    return "Required (both parents permanently unavailable)";
  }
  return "";
}

function parentSlotStatusLabel(
  hhSubs: HhGirlsRow[],
  role: "father" | "mother"
): string {
  const status = analyzeParentSlot(hhSubs, role);
  const field =
    role === "father" ? "father_unavailable1" : "mother_unavailable1";

  if (status.hasCompleteInterview) return "Interviewed (complete)";

  if (status.isPermanentlyUnavailable) {
    const reason =
      status.unavailableLabel ||
      parentUnavailableLabel(
        hhSubs
          .map((s) => (s[field] || "").trim())
          .find((c) => isPermanentParentUnavailable(c))
      );
    return reason
      ? `Permanently unavailable — ${reason}`
      : "Permanently unavailable";
  }

  if (status.hasPendingTemporaryUnavailable) {
    const reason = status.unavailableLabel;
    return reason
      ? `Revisit pending — ${reason}`
      : "Revisit pending";
  }

  return "Not interviewed";
}

function consentOutcomeLabel(value?: string): string {
  if (value === "1") return "Agreed";
  if (value === "0") return "Refused";
  return value?.trim() || "Not recorded";
}

export function toCompletedHouseholdExportRow(
  hhSubs: HhGirlsRow[],
  gsRow: HhGirlsRow | undefined
): HhGirlsExportRow {
  const anchor = gsRow || hhSubs[0];
  const girlsDone = gsRow?.survey_status === "1";

  return {
    keyId: (anchor?.KEY || "").trim(),
    girlId: (anchor?.girl || hhSubs[0]?.girl || "").trim(),
    girlName: (anchor?.girlname_label || hhSubs[0]?.girlname_label || "").trim(),
    district: districtLabel(anchor?.district || hhSubs[0]?.district || ""),
    village: (
      anchor?.village_label ||
      anchor?.village ||
      hhSubs[0]?.village_label ||
      hhSubs[0]?.village ||
      ""
    ).trim(),
    surveyType: "Completed household",
    respondent: "",
    attempt: gsRow ? String(parseAttempt(gsRow)) : "",
    availability: gsRow ? availabilityLabel(gsRow) : "",
    consent: gsRow
      ? `${gsRow.parental_consent_agree || ""}/${gsRow.child_consent_agree || ""}`
      : "",
    consentLabel: gsRow ? consentLabel(gsRow) : "",
    surveyStatus: gsRow?.survey_status?.trim() || "",
    surveyStatusLabel: gsRow
      ? surveyStatusLabel(gsRow.survey_status)
      : "No girls survey",
    enumeratorId: (gsRow?.enumerator_id || anchor?.enumerator_id || "").trim(),
    enumeratorName: cleanEnumeratorName(
      gsRow?.enumerator_name || anchor?.enumerator_name
    ),
    submissionDate: (gsRow?.SubmissionDate || anchor?.SubmissionDate || "").trim(),
    category: "Completed household",
    fatherSlotStatus: parentSlotStatusLabel(hhSubs, "father"),
    motherSlotStatus: parentSlotStatusLabel(hhSubs, "mother"),
    caretakerSlotStatus: caretakerSlotStatusLabel(hhSubs),
    girlsSurveyDone: girlsDone ? "Yes" : "No",
    girlsSurveyStatus: gsRow?.survey_status?.trim() || "",
    girlsSurveyStatusLabel: gsRow
      ? surveyStatusLabel(gsRow.survey_status)
      : "No girls survey",
    girlAvailable: !gsRow
      ? "No survey"
      : gsRow.girl_available === "1"
        ? "Yes"
        : "No",
    parentalConsent: gsRow
      ? consentOutcomeLabel(gsRow.parental_consent_agree)
      : "No survey",
    childConsent: gsRow
      ? consentOutcomeLabel(gsRow.child_consent_agree)
      : "No survey",
    girlsSurveyKeyId: (gsRow?.KEY || "").trim(),
    girlsSurveyDate: (gsRow?.SubmissionDate || "").trim(),
  };
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
        : isCaretakerRespondent(row)
          ? row.agree_consent_caregiver || ""
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

function priorAttemptRequiresRevisit(
  row: HhGirlsRow,
  slot: HhGirlsSurveySlot
): boolean {
  if (slot === "girls") {
    return isTemporaryGirlUnavailable(
      row.girl_available,
      row.girl_available_reason
    );
  }
  if (slot === "father") {
    return isTemporaryParentUnavailable(row.father_unavailable1);
  }
  if (slot === "mother") {
    return isTemporaryParentUnavailable(row.mother_unavailable1);
  }
  if (slot === "caretaker") {
    return (row.available_caretaker || "").trim() === "0";
  }
  return false;
}

function isSlotComplete(row: HhGirlsRow, slot: HhGirlsSurveySlot): boolean {
  if (row.survey_status !== "1") return false;
  if (slot === "girls") {
    return (
      row.girl_available === "1" &&
      row.parental_consent_agree === "1" &&
      row.child_consent_agree === "1"
    );
  }
  if (slot === "mother") {
    return (
      isMotherRespondent(row.respondent) && row.agree_consent_mother === "1"
    );
  }
  if (slot === "father") {
    return (
      isFatherRespondent(row.respondent) && row.agree_consent_father === "1"
    );
  }
  if (slot === "caretaker") {
    return (
      isCaretakerRespondent(row) && row.agree_consent_caregiver === "1"
    );
  }
  return false;
}

function slotKey(girl: string, slot: HhGirlsSurveySlot): string {
  return `${girl}|${slot}`;
}

function groupSlotSubmissions(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): Map<string, HhGirlsRow[]> {
  const groups = new Map<string, HhGirlsRow[]>();
  const girlIds = new Set<string>();

  for (const row of [...household, ...girls]) {
    if (row.girl) girlIds.add(row.girl);
  }

  for (const girl of girlIds) {
    const hhRows = household.filter((r) => r.girl === girl);
    const gsRows = girls.filter((r) => r.girl === girl);

    const fatherRows = hhRows.filter((r) => isFatherRespondent(r.respondent));
    const fatherProxyRows = hhRows.filter(
      (r) =>
        !isFatherRespondent(r.respondent) &&
        isTemporaryParentUnavailable(r.father_unavailable1)
    );
    const fatherSlot = fatherRows.length > 0 ? fatherRows : fatherProxyRows;
    if (fatherSlot.length > 0) {
      groups.set(slotKey(girl, "father"), fatherSlot);
    }

    const motherRows = hhRows.filter((r) => isMotherRespondent(r.respondent));
    const motherProxyRows = hhRows.filter(
      (r) =>
        !isMotherRespondent(r.respondent) &&
        isTemporaryParentUnavailable(r.mother_unavailable1)
    );
    const motherSlot = motherRows.length > 0 ? motherRows : motherProxyRows;
    if (motherSlot.length > 0) {
      groups.set(slotKey(girl, "mother"), motherSlot);
    }

    const caretakerRows = hhRows.filter((r) => isCaretakerRespondent(r));
    const fatherStatus = analyzeParentSlot(hhRows, "father");
    const motherStatus = analyzeParentSlot(hhRows, "mother");
    const bothParentsPermanent =
      fatherStatus.isPermanentlyUnavailable &&
      motherStatus.isPermanentlyUnavailable;
    const caretakerProxyRows = hhRows.filter(
      (r) => (r.available_caretaker || "").trim() === "0"
    );
    if (caretakerRows.length > 0) {
      groups.set(slotKey(girl, "caretaker"), caretakerRows);
    } else if (
      bothParentsPermanent &&
      !isCaretakerSurveyComplete(hhRows) &&
      (caretakerProxyRows.length > 0 || hhRows.length > 0)
    ) {
      groups.set(
        slotKey(girl, "caretaker"),
        caretakerProxyRows.length > 0
          ? caretakerProxyRows
          : [hhRows[hhRows.length - 1]!]
      );
    }

    if (gsRows.length > 0) {
      groups.set(slotKey(girl, "girls"), gsRows);
    }
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

function slotIsComplete(
  subs: HhGirlsRow[],
  slot: HhGirlsSurveySlot
): boolean {
  return subs.some((row) => isSlotComplete(row, slot));
}

function slotPendingRevisit(
  subs: HhGirlsRow[],
  slot: HhGirlsSurveySlot
): "2nd" | "3rd" | null {
  if (slotIsComplete(subs, slot)) return null;
  const attempts = [...new Set(subs.map(parseAttempt))].sort((a, b) => a - b);
  const maxAttempt = attempts[attempts.length - 1] || 1;
  const latest = latestSubmissionForAttempt(subs, maxAttempt);
  if (!latest) return null;

  if (maxAttempt >= 3) return null;
  if (maxAttempt === 1 && priorAttemptRequiresRevisit(latest, slot)) return "2nd";
  if (maxAttempt === 2 && priorAttemptRequiresRevisit(latest, slot)) return "3rd";
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

  for (const [key, subs] of slotGroups.entries()) {
    const girl = subs[0]?.girl || "";
    const slot = key.split("|")[1] as HhGirlsSurveySlot;
    const pending = slotPendingRevisit(subs, slot);
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
      if (isSlotComplete(second, slot)) {
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
      if (isSlotComplete(third, slot)) {
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
