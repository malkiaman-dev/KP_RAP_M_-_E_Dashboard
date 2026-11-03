import {
  consentRefusedPeople,
  isCompletedHouseholdForGirl,
  isGirlMarkedUnavailable,
  isParentMarkedUnavailable,
  latestParentUnavailableCode,
  latestParentUnavailableOther,
  girlUnavailableLabel,
  isTemporaryGirlUnavailable,
  parentUnavailableLabel,
} from "./hh-girls-completion";
import {
  isCaretakerRespondent,
  isFatherRespondent,
  isMotherRespondent,
  type HhGirlsRow,
} from "./hh-girls-metrics";
import {
  toCompletedHouseholdExportRow,
  toHhGirlsExportRow,
  type HhGirlsExportRow,
} from "./hh-girls-revisit";
import { submissionTimestamp } from "../utils";

export type HhGirlsCoreKpiKey =
  | "totalSubmissions"
  | "uniqueGirls"
  | "fatherSurveys"
  | "motherSurveys"
  | "caretakerSurveys"
  | "girlsSurveys"
  | "totalUnavailable"
  | "fatherNotAvailable"
  | "motherNotAvailable"
  | "girlNotAvailable"
  | "consentRefused"
  | "completedHouseholds"
  | "incompleteHouseholds"
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
    caretakerSurveys: [],
    girlsSurveys: [],
    totalUnavailable: [],
    fatherNotAvailable: [],
    motherNotAvailable: [],
    girlNotAvailable: [],
    consentRefused: [],
    completedHouseholds: [],
    incompleteHouseholds: [],
    hhTarget: [],
    remainingToTarget: [],
    progressToTarget: [],
  };
}

function rowTimestamp(row: HhGirlsRow): number {
  return submissionTimestamp(row.SubmissionDate);
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

  // Respondent survey lists hold one row per girl (latest form), matching the
  // unique-girl counts on the KPI cards.
  const fatherByGirl = new Map<string, HhGirlsRow>();
  const motherByGirl = new Map<string, HhGirlsRow>();
  const caretakerByGirl = new Map<string, HhGirlsRow>();

  for (const row of household) {
    lists.totalSubmissions.push(
      toHhGirlsExportRow(row, "Total submission")
    );
    if (row.girl && isFatherRespondent(row.respondent)) {
      fatherByGirl.set(row.girl, row);
    }
    if (row.girl && isMotherRespondent(row.respondent)) {
      motherByGirl.set(row.girl, row);
    }
    if (row.girl && isCaretakerRespondent(row)) {
      caretakerByGirl.set(row.girl, row);
    }
  }

  // Girl not available: one row per girl (latest unavailable visit), cleared
  // once a complete girls form exists.
  const gsSubsByGirl = new Map<string, HhGirlsRow[]>();
  const girlUnavailableByGirl = new Map<string, HhGirlsRow>();

  for (const row of girls) {
    if (row.girl) {
      if (!gsSubsByGirl.has(row.girl)) gsSubsByGirl.set(row.girl, []);
      gsSubsByGirl.get(row.girl)!.push(row);
    }
    lists.totalSubmissions.push(
      toHhGirlsExportRow(row, "Total submission")
    );
    if (row.girl && row.girl_available === "0") {
      girlUnavailableByGirl.set(row.girl, row);
    }
  }

  for (const [girl, row] of girlUnavailableByGirl) {
    if (!isGirlMarkedUnavailable(gsSubsByGirl.get(girl) || [])) continue;
    const code = (row.girl_available_reason || "").trim();
    const other = (row.girl_available_reason_other || "").trim();
    const reason = girlUnavailableLabel(code);
    const needsRevisit = isTemporaryGirlUnavailable(
      row.girl_available,
      row.girl_available_reason
    );
    lists.girlNotAvailable.push({
      ...toHhGirlsExportRow(row, "Girl not available"),
      unavailableCode: code,
      unavailableReason: reason,
      unavailableOther: other,
      exportReason: [
        reason || "Not available",
        needsRevisit ? "Revisit required (up to 3 attempts)" : "No revisit — incomplete",
        other,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  const refusedLabel: Record<string, string> = {
    father: "Consent refused (father)",
    mother: "Consent refused (mother)",
    caretaker: "Consent refused (caretaker)",
    girl: "Consent refused (girl)",
  };
  for (const { person, row } of consentRefusedPeople([...household, ...girls]).values()) {
    lists.consentRefused.push(toHhGirlsExportRow(row, refusedLabel[person]));
  }

  for (const row of fatherByGirl.values()) {
    lists.fatherSurveys.push(toHhGirlsExportRow(row, "Father survey"));
  }
  for (const row of motherByGirl.values()) {
    lists.motherSurveys.push(toHhGirlsExportRow(row, "Mother survey"));
  }
  for (const row of caretakerByGirl.values()) {
    lists.caretakerSurveys.push(toHhGirlsExportRow(row, "Caretaker survey"));
  }
  for (const row of gsByGirl.values()) {
    lists.girlsSurveys.push(toHhGirlsExportRow(row, "Girls survey"));
  }

  for (const girl of girlIds) {
    const hhSubs = hhByGirl.get(girl) || [];
    const gsRow = gsByGirl.get(girl);
    const rep = representativeRow(girl, hhByGirl, gsByGirl);
    if (!rep) continue;

    lists.uniqueGirls.push(toHhGirlsExportRow(rep, "Unique girl"));

    const fatherNotAvailable = isParentMarkedUnavailable(hhSubs, "father");
    const motherNotAvailable = isParentMarkedUnavailable(hhSubs, "mother");
    const girlNotAvailable = isGirlMarkedUnavailable(
      gsSubsByGirl.get(girl) || []
    );
    // One row per unavailable person, so a girl can appear more than once.
    if (fatherNotAvailable) {
      lists.totalUnavailable.push(
        toHhGirlsExportRow(rep, "Unavailable (father)")
      );
    }
    if (motherNotAvailable) {
      lists.totalUnavailable.push(
        toHhGirlsExportRow(rep, "Unavailable (mother)")
      );
    }
    if (girlNotAvailable) {
      lists.totalUnavailable.push(
        toHhGirlsExportRow(rep, "Unavailable (girl)")
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
    } else {
      lists.incompleteHouseholds.push({
        ...toCompletedHouseholdExportRow(hhSubs, gsRow),
        surveyType: "Incomplete household",
        category: "Incomplete household",
      });
    }
  }

  return lists;
}
