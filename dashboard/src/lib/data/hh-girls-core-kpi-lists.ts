import {
  isCompletedHouseholdForGirl,
  isParentMarkedUnavailable,
  latestParentUnavailableCode,
  latestParentUnavailableOther,
  parentUnavailableLabel,
} from "./hh-girls-completion";
import type { HhGirlsRow } from "./hh-girls-metrics";
import {
  toCompletedHouseholdExportRow,
  toHhGirlsExportRow,
  type HhGirlsExportRow,
} from "./hh-girls-revisit";

export type HhGirlsCoreKpiKey =
  | "totalSubmissions"
  | "uniqueGirls"
  | "fatherSurveys"
  | "motherSurveys"
  | "girlsSurveys"
  | "totalUnavailable"
  | "fatherNotAvailable"
  | "motherNotAvailable"
  | "girlNotAvailable"
  | "consentRefused"
  | "completedHouseholds"
  | "hhTarget"
  | "remainingToTarget"
  | "progressToTarget";

export type HhGirlsCoreKpiLists = Record<HhGirlsCoreKpiKey, HhGirlsExportRow[]>;

function emptyCoreKpiLists(): HhGirlsCoreKpiLists {
  return {
    totalSubmissions: [],
    uniqueGirls: [],
    fatherSurveys: [],
    motherSurveys: [],
    girlsSurveys: [],
    totalUnavailable: [],
    fatherNotAvailable: [],
    motherNotAvailable: [],
    girlNotAvailable: [],
    consentRefused: [],
    completedHouseholds: [],
    hhTarget: [],
    remainingToTarget: [],
    progressToTarget: [],
  };
}

function isMotherRespondent(respondent?: string): boolean {
  return respondent === "2" || respondent === "4";
}

function isFatherRespondent(respondent?: string): boolean {
  return respondent === "1" || respondent === "3";
}

function isConsentRefused(row: HhGirlsRow): boolean {
  if (row.survey_type === "girls") {
    return (
      row.parental_consent_agree === "0" || row.child_consent_agree === "0"
    );
  }
  if (isMotherRespondent(row.respondent)) {
    return row.agree_consent_mother === "0";
  }
  if (isFatherRespondent(row.respondent)) {
    return row.agree_consent_father === "0";
  }
  return false;
}

function rowTimestamp(row: HhGirlsRow): number {
  return new Date(row.SubmissionDate || 0).getTime();
}

function latestRow(rows: HhGirlsRow[]): HhGirlsRow | undefined {
  if (rows.length === 0) return undefined;
  return [...rows].sort((a, b) => rowTimestamp(b) - rowTimestamp(a))[0];
}

function representativeRow(
  girl: string,
  hhByGirl: Map<string, HhGirlsRow[]>,
  gsByGirl: Map<string, HhGirlsRow>
): HhGirlsRow | undefined {
  const hh = hhByGirl.get(girl) || [];
  const gs = gsByGirl.get(girl);
  return latestRow(gs ? [...hh, gs] : hh);
}

export function computeHhGirlsCoreKpiLists(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): HhGirlsCoreKpiLists {
  const lists = emptyCoreKpiLists();
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

  for (const row of household) {
    lists.totalSubmissions.push(
      toHhGirlsExportRow(row, "Total submission")
    );
    if (isFatherRespondent(row.respondent)) {
      lists.fatherSurveys.push(toHhGirlsExportRow(row, "Father survey"));
    }
    if (isMotherRespondent(row.respondent)) {
      lists.motherSurveys.push(toHhGirlsExportRow(row, "Mother survey"));
    }
    if (isConsentRefused(row)) {
      lists.consentRefused.push(toHhGirlsExportRow(row, "Consent refused"));
    }
  }

  for (const row of girls) {
    lists.totalSubmissions.push(
      toHhGirlsExportRow(row, "Total submission")
    );
    lists.girlsSurveys.push(toHhGirlsExportRow(row, "Girls survey"));
    if (isConsentRefused(row)) {
      lists.consentRefused.push(toHhGirlsExportRow(row, "Consent refused"));
    }
    if (row.girl_available === "0") {
      lists.girlNotAvailable.push(
        toHhGirlsExportRow(row, "Girl not available")
      );
    }
  }

  for (const girl of girlIds) {
    const hhSubs = hhByGirl.get(girl) || [];
    const gsRow = gsByGirl.get(girl);
    const rep = representativeRow(girl, hhByGirl, gsByGirl);
    if (!rep) continue;

    lists.uniqueGirls.push(toHhGirlsExportRow(rep, "Unique girl"));

    const fatherNotAvailable = isParentMarkedUnavailable(hhSubs, "father");
    const motherNotAvailable = isParentMarkedUnavailable(hhSubs, "mother");
    const girlNotAvailable = Boolean(gsRow && gsRow.girl_available === "0");
    const unavailable =
      fatherNotAvailable || motherNotAvailable || girlNotAvailable;

    if (unavailable) {
      lists.totalUnavailable.push(
        toHhGirlsExportRow(rep, "Unavailable (any reason)")
      );
    }
    if (fatherNotAvailable) {
      const code = latestParentUnavailableCode(hhSubs, "father");
      const other = latestParentUnavailableOther(hhSubs, "father");
      lists.fatherNotAvailable.push({
        ...toHhGirlsExportRow(rep, "Father not available"),
        unavailableCode: code,
        unavailableReason: parentUnavailableLabel(code),
        unavailableOther: other,
        exportReason: other
          ? `${parentUnavailableLabel(code)} — ${other}`
          : parentUnavailableLabel(code),
      });
    }
    if (motherNotAvailable) {
      const code = latestParentUnavailableCode(hhSubs, "mother");
      const other = latestParentUnavailableOther(hhSubs, "mother");
      lists.motherNotAvailable.push({
        ...toHhGirlsExportRow(rep, "Mother not available"),
        unavailableCode: code,
        unavailableReason: parentUnavailableLabel(code),
        unavailableOther: other,
        exportReason: other
          ? `${parentUnavailableLabel(code)} — ${other}`
          : parentUnavailableLabel(code),
      });
    }
    if (isCompletedHouseholdForGirl(hhSubs, gsRow)) {
      const completedRow = toCompletedHouseholdExportRow(hhSubs, gsRow);
      lists.completedHouseholds.push(completedRow);
      lists.progressToTarget.push(completedRow);
    }
  }

  return lists;
}
