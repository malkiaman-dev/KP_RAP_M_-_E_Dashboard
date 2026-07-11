import { PROTOCOL } from "./protocol";
import { isCompletedHouseholdForGirl } from "./hh-girls-completion";
import { computeHhGirlsCoreKpiLists } from "./hh-girls-core-kpi-lists";
import { computeHhGirlsDuplicateDetail } from "./hh-girls-duplicates";
import { computeHhGirlsRevisitDetail } from "./hh-girls-revisit";

export type HhGirlsSurveyType = "household" | "girls";

export interface HhGirlsRow {
  KEY: string;
  SubmissionDate: string;
  district: string;
  village?: string;
  village_label?: string;
  enumerator_id?: string;
  enumerator_name?: string;
  girl?: string;
  girlname_label?: string;
  attempt?: string;
  respondent?: string;
  survey_status?: string;
  available?: string;
  agree_consent_father?: string;
  agree_consent_mother?: string;
  father_unavailable1?: string;
  mother_unavailable1?: string;
  girl_available?: string;
  girl_available_reason?: string;
  parental_consent_agree?: string;
  child_consent_agree?: string;
  currently_studying?: string;
  enroll_24_25?: string;
  survey_type: HhGirlsSurveyType;
  [key: string]: string | undefined;
}

export interface HhGirlsFilterOptions {
  districts: { value: string; label: string }[];
  enumerators: { value: string; label: string }[];
  villages: { value: string; label: string }[];
  dateRange: { start: string; end: string };
}

export type HhGirlsSurveyFilter = "all" | "household" | "girls";

export interface HhGirlsFilters {
  surveyType: HhGirlsSurveyFilter;
  district: string;
  enumerator: string;
  village: string;
  dateFrom: string;
  dateTo: string;
}

export const defaultHhGirlsFilters: HhGirlsFilters = {
  surveyType: "all",
  district: "all",
  enumerator: "all",
  village: "all",
  dateFrom: "",
  dateTo: "",
};

export const HH_GIRLS_SURVEY_FILTER_OPTIONS: {
  value: HhGirlsSurveyFilter;
  label: string;
}[] = [
  { value: "all", label: "All surveys" },
  { value: "household", label: "Household (HH)" },
  { value: "girls", label: "Girls survey" },
];

export function hhGirlsSurveyFilterLabel(value: HhGirlsSurveyFilter): string {
  return (
    HH_GIRLS_SURVEY_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
}

export function hhGirlsFiltersEqual(a: HhGirlsFilters, b: HhGirlsFilters): boolean {
  return (Object.keys(defaultHhGirlsFilters) as (keyof HhGirlsFilters)[]).every(
    (key) => a[key] === b[key]
  );
}

function parseSubmissionDate(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function districtLabel(d: string): string {
  const map: Record<string, string> = {
    "1": "D.I. Khan",
    "2": "Hangu",
    "3": "Lakki Marwat",
    "4": "Torghar",
  };
  return map[d] || `District ${d}`;
}

function cleanEnumeratorName(name?: string): string {
  if (!name) return "";
  return name.replace(/\(.*\)/, "").trim();
}

function resolveVillage(row: HhGirlsRow): string {
  return (row.village_label || row.village || "").trim();
}

function enumeratorKey(row: HhGirlsRow): string {
  return row.enumerator_id || row.enumerator_name || "";
}

export function isMotherRespondent(respondent?: string): boolean {
  return respondent === "2" || respondent === "4";
}

export function isFatherRespondent(respondent?: string): boolean {
  return respondent === "1" || respondent === "3";
}

function isComplete(row: HhGirlsRow): boolean {
  return row.survey_status === "1";
}

function buildTrend(rows: HhGirlsRow[]) {
  const trendMap = new Map<string, number>();
  for (const r of rows) {
    const parsed = parseSubmissionDate(r.SubmissionDate || "");
    const date = parsed
      ? parsed.toISOString().slice(0, 10)
      : (r.SubmissionDate || "").split(" ")[0];
    if (!date) continue;
    trendMap.set(date, (trendMap.get(date) || 0) + 1);
  }
  return [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export function getHhGirlsFilterOptions(
  hhRows: HhGirlsRow[],
  girlsRows: HhGirlsRow[]
): HhGirlsFilterOptions {
  const rows = [...hhRows, ...girlsRows];
  const districtSet = new Set(rows.map((r) => r.district).filter(Boolean));
  const villageMap = new Map<string, string>();
  const enumeratorMap = new Map<string, string>();

  for (const r of rows) {
    const village = resolveVillage(r);
    if (village) villageMap.set(village, village);
    const enumKey = enumeratorKey(r);
    if (!enumKey) continue;
    enumeratorMap.set(enumKey, cleanEnumeratorName(r.enumerator_name) || enumKey);
  }

  const dates = rows
    .map((r) => parseSubmissionDate(r.SubmissionDate || ""))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    districts: [...districtSet].map((d) => ({
      value: d,
      label: districtLabel(d),
    })),
    enumerators: [...enumeratorMap.entries()].map(([value, label]) => ({
      value,
      label,
    })),
    villages: [...villageMap.entries()].map(([value, label]) => ({
      value,
      label,
    })),
    dateRange: {
      start: dates[0]?.toISOString().slice(0, 10) || "",
      end: dates[dates.length - 1]?.toISOString().slice(0, 10) || "",
    },
  };
}

export function applyHhGirlsFilters(
  rows: HhGirlsRow[],
  filters: HhGirlsFilters
): HhGirlsRow[] {
  return rows.filter((r) => {
    if (filters.district !== "all" && r.district !== filters.district)
      return false;
    if (
      filters.enumerator !== "all" &&
      enumeratorKey(r) !== filters.enumerator &&
      r.enumerator_name !== filters.enumerator
    )
      return false;
    if (filters.village !== "all" && resolveVillage(r) !== filters.village)
      return false;
    const subDate = parseSubmissionDate(r.SubmissionDate || "");
    if (filters.dateFrom && subDate) {
      const from = new Date(filters.dateFrom);
      if (subDate < from) return false;
    }
    if (filters.dateTo && subDate) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      if (subDate > to) return false;
    }
    return true;
  });
}

export function applyHhGirlsDataFilters(
  household: HhGirlsRow[],
  girls: HhGirlsRow[],
  filters: HhGirlsFilters
): { household: HhGirlsRow[]; girls: HhGirlsRow[] } {
  let hh = applyHhGirlsFilters(household, filters);
  let gs = applyHhGirlsFilters(girls, filters);

  if (filters.surveyType === "household") {
    gs = [];
  } else if (filters.surveyType === "girls") {
    hh = [];
  }

  return { household: hh, girls: gs };
}

interface GirlUnifiedStatus {
  girl: string;
  district: string;
  hasFatherSurvey: boolean;
  hasMotherSurvey: boolean;
  hasGirlSurvey: boolean;
  fatherNotAvailable: boolean;
  motherNotAvailable: boolean;
  girlNotAvailable: boolean;
  isCompletedHousehold: boolean;
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

function analyzeUnifiedGirls(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
): GirlUnifiedStatus[] {
  const girlIds = new Set<string>();
  for (const r of household) {
    if (r.girl) girlIds.add(r.girl);
  }
  for (const r of girls) {
    if (r.girl) girlIds.add(r.girl);
  }

  const hhByGirl = new Map<string, HhGirlsRow[]>();
  for (const r of household) {
    if (!r.girl) continue;
    if (!hhByGirl.has(r.girl)) hhByGirl.set(r.girl, []);
    hhByGirl.get(r.girl)!.push(r);
  }

  const gsByGirl = new Map<string, HhGirlsRow>();
  for (const r of girls) {
    if (r.girl) gsByGirl.set(r.girl, r);
  }

  return [...girlIds].map((girl) => {
    const hhSubs = hhByGirl.get(girl) || [];
    const gsRow = gsByGirl.get(girl);
    const hasFatherSurvey = hhSubs.some((s) => isFatherRespondent(s.respondent));
    const hasMotherSurvey = hhSubs.some((s) => isMotherRespondent(s.respondent));
    const hasGirlSurvey = Boolean(gsRow);

    const fatherNotAvailable =
      hhSubs.length > 0 && !hasFatherSurvey;
    const motherNotAvailable =
      hhSubs.length > 0 && !hasMotherSurvey;
    const girlNotAvailable = hasGirlSurvey && gsRow?.girl_available === "0";

    const isCompletedHousehold = isCompletedHouseholdForGirl(hhSubs, gsRow);

    return {
      girl,
      district: hhSubs[0]?.district || gsRow?.district || "unknown",
      hasFatherSurvey,
      hasMotherSurvey,
      hasGirlSurvey,
      fatherNotAvailable,
      motherNotAvailable,
      girlNotAvailable,
      isCompletedHousehold,
    };
  });
}

function buildCombinedTrend(household: HhGirlsRow[], girls: HhGirlsRow[]) {
  const trendMap = new Map<
    string,
    { date: string; father: number; mother: number; girls: number; total: number }
  >();

  const add = (
    row: HhGirlsRow,
    field: "father" | "mother" | "girls"
  ) => {
    const parsed = parseSubmissionDate(row.SubmissionDate || "");
    const date = parsed
      ? parsed.toISOString().slice(0, 10)
      : (row.SubmissionDate || "").split(" ")[0];
    if (!date) return;
    if (!trendMap.has(date)) {
      trendMap.set(date, { date, father: 0, mother: 0, girls: 0, total: 0 });
    }
    const entry = trendMap.get(date)!;
    entry[field] += 1;
    entry.total += 1;
  };

  for (const r of household) {
    if (isFatherRespondent(r.respondent)) add(r, "father");
    else if (isMotherRespondent(r.respondent)) add(r, "mother");
  }
  for (const r of girls) add(r, "girls");

  return [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

interface GirlHhStatus {
  girl: string;
  hasMother: boolean;
  hasFather: boolean;
  motherAgreed: boolean;
  fatherAgreed: boolean;
  motherRefused: boolean;
  fatherRefused: boolean;
  bothComplete: boolean;
}

function analyzeHouseholdGirls(rows: HhGirlsRow[]): GirlHhStatus[] {
  const byGirl = new Map<string, HhGirlsRow[]>();
  for (const r of rows) {
    const g = r.girl;
    if (!g) continue;
    if (!byGirl.has(g)) byGirl.set(g, []);
    byGirl.get(g)!.push(r);
  }

  return [...byGirl.entries()].map(([girl, subs]) => {
    const motherSubs = subs.filter((s) => isMotherRespondent(s.respondent));
    const fatherSubs = subs.filter((s) => isFatherRespondent(s.respondent));
    const motherAgreed = motherSubs.some((s) => s.agree_consent_mother === "1");
    const fatherAgreed = fatherSubs.some((s) => s.agree_consent_father === "1");
    const motherRefused = motherSubs.some((s) => s.agree_consent_mother === "0");
    const fatherRefused = fatherSubs.some((s) => s.agree_consent_father === "0");
    const hasMother = motherSubs.length > 0;
    const hasFather = fatherSubs.length > 0;
    const bothComplete =
      hasMother &&
      hasFather &&
      motherSubs.some((s) => isComplete(s)) &&
      fatherSubs.some((s) => isComplete(s));

    return {
      girl,
      hasMother,
      hasFather,
      motherAgreed,
      fatherAgreed,
      motherRefused,
      fatherRefused,
      bothComplete,
    };
  });
}

function parentAvailabilityBreakdown(rows: HhGirlsRow[]) {
  const counts = {
    bothAvailable: 0,
    motherOnly: 0,
    fatherOnly: 0,
    none: 0,
  };
  for (const r of rows) {
    const a = (r.available || "").trim();
    if (a.includes("1") && a.includes("2")) counts.bothAvailable += 1;
    else if (a === "2" || a.startsWith("2 ")) counts.motherOnly += 1;
    else if (a === "1" || a.endsWith(" 1")) counts.fatherOnly += 1;
    else counts.none += 1;
  }
  return [
    { name: "Both Available", value: counts.bothAvailable, color: "#21A1AA" },
    { name: "Mother Only", value: counts.motherOnly, color: "#178891" },
    { name: "Father Only", value: counts.fatherOnly, color: "#EDCA5C" },
    { name: "None / Other", value: counts.none, color: "#94A3B8" },
  ].filter((x) => x.value > 0);
}

export function computeHhGirlsMetrics(
  household: HhGirlsRow[],
  girls: HhGirlsRow[]
) {
  const unifiedGirls = analyzeUnifiedGirls(household, girls);
  const girlStatuses = analyzeHouseholdGirls(household);
  const uniqueGirls = girlStatuses.length;
  const bothParent = girlStatuses.filter((g) => g.hasMother && g.hasFather).length;
  const singleParent = girlStatuses.filter(
    (g) => (g.hasMother || g.hasFather) && !(g.hasMother && g.hasFather)
  ).length;
  const bothAgreeMissingOne = girlStatuses.filter(
    (g) =>
      g.motherAgreed &&
      g.fatherAgreed &&
      !(g.hasMother && g.hasFather)
  ).length;
  const consentInconsistent = girlStatuses.filter(
    (g) =>
      (g.motherAgreed && g.fatherRefused) || (g.fatherAgreed && g.motherRefused)
  ).length;

  const motherForms = household.filter((r) => isMotherRespondent(r.respondent)).length;
  const fatherForms = household.filter((r) => isFatherRespondent(r.respondent)).length;
  const hhVillages = new Set(
    household.map((r) => resolveVillage(r)).filter(Boolean)
  ).size;
  const hhEnumerators = new Set(
    household.map((r) => enumeratorKey(r)).filter(Boolean)
  ).size;
  const completionRate =
    uniqueGirls > 0 ? (bothParent / uniqueGirls) * 100 : 0;
  const hhProgressToTarget =
    (bothParent / PROTOCOL.HH_SURVEY_TARGET) * 100;

  const fatherMotherByEnumerator = new Map<
    string,
    { label: string; father: number; mother: number; missing: number }
  >();
  for (const r of household) {
    const key = enumeratorKey(r) || "Unknown";
    const label = cleanEnumeratorName(r.enumerator_name) || key;
    if (!fatherMotherByEnumerator.has(key)) {
      fatherMotherByEnumerator.set(key, { label, father: 0, mother: 0, missing: 0 });
    }
    const entry = fatherMotherByEnumerator.get(key)!;
    if (isFatherRespondent(r.respondent)) entry.father += 1;
    if (isMotherRespondent(r.respondent)) entry.mother += 1;
  }
  for (const g of girlStatuses) {
    if (g.hasMother && !g.hasFather) {
      const subs = household.filter((r) => r.girl === g.girl);
      const key = enumeratorKey(subs[0]) || "Unknown";
      const entry = fatherMotherByEnumerator.get(key);
      if (entry) entry.missing += 1;
    } else if (g.hasFather && !g.hasMother) {
      const subs = household.filter((r) => r.girl === g.girl);
      const key = enumeratorKey(subs[0]) || "Unknown";
      const entry = fatherMotherByEnumerator.get(key);
      if (entry) entry.missing += 1;
    }
  }

  const missingParentByEnumerator = [...fatherMotherByEnumerator.values()]
    .map((e) => ({ name: e.label, missing: e.missing, father: e.father, mother: e.mother }))
    .filter((e) => e.missing > 0 || e.father > 0 || e.mother > 0)
    .sort((a, b) => b.missing - a.missing)
    .slice(0, 15);

  const parentFormsByEnumerator = [...fatherMotherByEnumerator.values()]
    .map((e) => ({
      name: e.label,
      father: e.father,
      mother: e.mother,
    }))
    .sort((a, b) => b.father + b.mother - (a.father + a.mother))
    .slice(0, 12);

  const hhByDistrict = new Map<string, { both: number; single: number; girls: number }>();
  for (const g of girlStatuses) {
    const subs = household.filter((r) => r.girl === g.girl);
    const d = subs[0]?.district || "unknown";
    if (!hhByDistrict.has(d)) hhByDistrict.set(d, { both: 0, single: 0, girls: 0 });
    const entry = hhByDistrict.get(d)!;
    entry.girls += 1;
    if (g.hasMother && g.hasFather) entry.both += 1;
    else if (g.hasMother || g.hasFather) entry.single += 1;
  }
  const householdCompletionByDistrict = [...hhByDistrict.entries()].map(
    ([district, stats]) => ({
      district,
      label: districtLabel(district),
      bothParents: stats.both,
      singleParent: stats.single,
      girls: stats.girls,
      completionRate: stats.girls > 0 ? (stats.both / stats.girls) * 100 : 0,
    })
  );

  const consentByEnumerator = new Map<string, { label: string; agreed: number; refused: number }>();
  for (const r of household) {
    const key = enumeratorKey(r) || "Unknown";
    const label = cleanEnumeratorName(r.enumerator_name) || key;
    if (!consentByEnumerator.has(key)) {
      consentByEnumerator.set(key, { label, agreed: 0, refused: 0 });
    }
    const entry = consentByEnumerator.get(key)!;
    const agreed =
      (isMotherRespondent(r.respondent) && r.agree_consent_mother === "1") ||
      (isFatherRespondent(r.respondent) && r.agree_consent_father === "1");
    const refused =
      (isMotherRespondent(r.respondent) && r.agree_consent_mother === "0") ||
      (isFatherRespondent(r.respondent) && r.agree_consent_father === "0");
    if (agreed) entry.agreed += 1;
    if (refused) entry.refused += 1;
  }
  const consentAgreedDisagreed = [...consentByEnumerator.values()]
    .map((e) => ({ name: e.label, agreed: e.agreed, refused: e.refused }))
    .filter((e) => e.agreed > 0 || e.refused > 0)
    .sort((a, b) => b.agreed + b.refused - (a.agreed + a.refused))
    .slice(0, 12);

  let hhConsentAgreed = 0;
  let hhConsentRefused = 0;
  let hhConsentPending = 0;
  for (const r of household) {
    const consentVal = isMotherRespondent(r.respondent)
      ? r.agree_consent_mother
      : isFatherRespondent(r.respondent)
        ? r.agree_consent_father
        : "";
    if (consentVal === "1") hhConsentAgreed += 1;
    else if (consentVal === "0") hhConsentRefused += 1;
    else hhConsentPending += 1;
  }
  const hhConsentOutcome = [
    { name: "Agreed", value: hhConsentAgreed, color: "#21A1AA" },
    { name: "Refused", value: hhConsentRefused, color: "#EF4444" },
    { name: "Not Recorded", value: hhConsentPending, color: "#94A3B8" },
  ].filter((x) => x.value > 0);

  // Girls survey metrics
  const uniqueGirlIds = new Set(girls.map((r) => r.girl).filter(Boolean));
  const girlsVillages = new Set(girls.map((r) => resolveVillage(r)).filter(Boolean)).size;
  const girlsEnumerators = new Set(girls.map((r) => enumeratorKey(r)).filter(Boolean)).size;
  const availableGirls = girls.filter((r) => r.girl_available === "1").length;
  const studyingGirls = girls.filter((r) => r.currently_studying === "1").length;
  const studyingEnrolled = girls.filter(
    (r) => r.currently_studying === "1" && r.enroll_24_25 === "1"
  ).length;
  const studyingRate =
    girls.length > 0 ? (studyingGirls / girls.length) * 100 : 0;
  const completeGirls = girls.filter((r) => isComplete(r)).length;
  const revisits = girls.filter((r) => Number(r.attempt) > 1).length;
  const parentalConsentRate =
    girls.length > 0
      ? (girls.filter((r) => r.parental_consent_agree === "1").length / girls.length) * 100
      : 0;
  const childConsentRate =
    girls.length > 0
      ? (girls.filter((r) => r.child_consent_agree === "1").length / girls.length) * 100
      : 0;
  const parentConsentRefused = girls.filter(
    (r) => r.parental_consent_agree === "0"
  ).length;
  const childConsentRefused = girls.filter((r) => r.child_consent_agree === "0").length;

  const gsConsentOutcome = [
    {
      name: "Both Consents",
      value: girls.filter(
        (r) => r.parental_consent_agree === "1" && r.child_consent_agree === "1"
      ).length,
      color: "#21A1AA",
    },
    {
      name: "Parent Refused",
      value: parentConsentRefused,
      color: "#EF4444",
    },
    {
      name: "Child Refused",
      value: childConsentRefused,
      color: "#F59E0B",
    },
    {
      name: "Incomplete",
      value: girls.filter((r) => !isComplete(r)).length,
      color: "#94A3B8",
    },
  ].filter((x) => x.value > 0);

  const educationByDistrict = new Map<string, { studying: number; notStudying: number }>();
  for (const r of girls) {
    const d = r.district || "unknown";
    if (!educationByDistrict.has(d)) {
      educationByDistrict.set(d, { studying: 0, notStudying: 0 });
    }
    const entry = educationByDistrict.get(d)!;
    if (r.currently_studying === "1") entry.studying += 1;
    else entry.notStudying += 1;
  }
  const educationStatusByDistrict = [...educationByDistrict.entries()].map(
    ([district, stats]) => ({
      district,
      label: districtLabel(district),
      studying: stats.studying,
      notStudying: stats.notStudying,
    })
  );

  const availabilityStatus = [
    {
      name: "Available",
      value: girls.filter((r) => r.girl_available === "1").length,
      color: "#21A1AA",
    },
    {
      name: "Not Available",
      value: girls.filter((r) => r.girl_available === "0").length,
      color: "#F59E0B",
    },
  ].filter((x) => x.value > 0);

  const girlsByEnumerator = new Map<string, { label: string; count: number }>();
  for (const r of girls) {
    const key = enumeratorKey(r) || "Unknown";
    const label = cleanEnumeratorName(r.enumerator_name) || key;
    if (!girlsByEnumerator.has(key)) girlsByEnumerator.set(key, { label, count: 0 });
    girlsByEnumerator.get(key)!.count += 1;
  }
  const girlsSurveyByEnumerator = [...girlsByEnumerator.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((e) => ({ name: e.label, count: e.count }));

  const girlsTrend = buildTrend(girls);
  const hhTrend = buildTrend(household);
  const combinedTrend = buildCombinedTrend(household, girls);

  const fatherSurveys = household.filter((r) =>
    isFatherRespondent(r.respondent)
  ).length;
  const motherSurveys = household.filter((r) =>
    isMotherRespondent(r.respondent)
  ).length;
  const girlsSurveys = girls.length;
  const totalSubmissions = household.length + girls.length;
  const uniqueGirlsRollout = unifiedGirls.length;
  const totalVillages = new Set(
    [...household, ...girls].map((r) => resolveVillage(r)).filter(Boolean)
  ).size;
  const totalEnumerators = new Set(
    [...household, ...girls].map((r) => enumeratorKey(r)).filter(Boolean)
  ).size;
  const fatherNotAvailable = unifiedGirls.filter(
    (g) => g.fatherNotAvailable
  ).length;
  const motherNotAvailable = unifiedGirls.filter(
    (g) => g.motherNotAvailable
  ).length;
  const girlNotAvailable = unifiedGirls.filter((g) => g.girlNotAvailable).length;
  const totalUnavailable = unifiedGirls.filter(
    (g) => g.fatherNotAvailable || g.motherNotAvailable || g.girlNotAvailable
  ).length;
  const consentRefused =
    household.filter(isConsentRefused).length + girls.filter(isConsentRefused).length;
  const completedHouseholds = unifiedGirls.filter(
    (g) => g.isCompletedHousehold
  ).length;
  const hhTarget = PROTOCOL.HH_SURVEY_TARGET;
  const remainingToTarget = Math.max(0, hhTarget - completedHouseholds);
  const progressToTarget =
    hhTarget > 0 ? (completedHouseholds / hhTarget) * 100 : 0;

  const completionByDistrict = new Map<
    string,
    { completed: number; partial: number; girls: number }
  >();
  for (const g of unifiedGirls) {
    const d = g.district || "unknown";
    if (!completionByDistrict.has(d)) {
      completionByDistrict.set(d, { completed: 0, partial: 0, girls: 0 });
    }
    const entry = completionByDistrict.get(d)!;
    entry.girls += 1;
    if (g.isCompletedHousehold) entry.completed += 1;
    else if (g.hasFatherSurvey || g.hasMotherSurvey || g.hasGirlSurvey) {
      entry.partial += 1;
    }
  }

  const coreCompletionByDistrict = [...completionByDistrict.entries()].map(
    ([district, stats]) => ({
      district,
      label: districtLabel(district),
      completed: stats.completed,
      partial: stats.partial,
      girls: stats.girls,
    })
  );

  const surveyMix = [
    { name: "Father surveys", value: fatherSurveys, color: "#EDCA5C" },
    { name: "Mother surveys", value: motherSurveys, color: "#21A1AA" },
    { name: "Girls surveys", value: girlsSurveys, color: "#3B82F6" },
  ].filter((x) => x.value > 0);

  const unavailabilityBreakdown = [
    { name: "Father not available", value: fatherNotAvailable, color: "#F59E0B" },
    { name: "Mother not available", value: motherNotAvailable, color: "#EF4444" },
    { name: "Girl not available", value: girlNotAvailable, color: "#94A3B8" },
  ].filter((x) => x.value > 0);

  let consentAgreed = 0;
  let consentRefusedCount = 0;
  let consentPending = 0;
  for (const r of household) {
    const val = isMotherRespondent(r.respondent)
      ? r.agree_consent_mother
      : isFatherRespondent(r.respondent)
        ? r.agree_consent_father
        : "";
    if (val === "1") consentAgreed += 1;
    else if (val === "0") consentRefusedCount += 1;
    else consentPending += 1;
  }
  for (const r of girls) {
    if (r.parental_consent_agree === "1" && r.child_consent_agree === "1") {
      consentAgreed += 1;
    } else if (
      r.parental_consent_agree === "0" ||
      r.child_consent_agree === "0"
    ) {
      consentRefusedCount += 1;
    } else {
      consentPending += 1;
    }
  }
  const unifiedConsentOutcome = [
    { name: "Consented", value: consentAgreed, color: "#21A1AA" },
    { name: "Refused", value: consentRefusedCount, color: "#EF4444" },
    { name: "Pending / Incomplete", value: consentPending, color: "#94A3B8" },
  ].filter((x) => x.value > 0);

  const surveysByEnumerator = new Map<
    string,
    { label: string; father: number; mother: number; girls: number }
  >();
  for (const r of household) {
    const key = enumeratorKey(r) || "Unknown";
    const label = cleanEnumeratorName(r.enumerator_name) || key;
    if (!surveysByEnumerator.has(key)) {
      surveysByEnumerator.set(key, { label, father: 0, mother: 0, girls: 0 });
    }
    const entry = surveysByEnumerator.get(key)!;
    if (isFatherRespondent(r.respondent)) entry.father += 1;
    if (isMotherRespondent(r.respondent)) entry.mother += 1;
  }
  for (const r of girls) {
    const key = enumeratorKey(r) || "Unknown";
    const label = cleanEnumeratorName(r.enumerator_name) || key;
    if (!surveysByEnumerator.has(key)) {
      surveysByEnumerator.set(key, { label, father: 0, mother: 0, girls: 0 });
    }
    surveysByEnumerator.get(key)!.girls += 1;
  }
  const surveyFormsByEnumerator = [...surveysByEnumerator.values()]
    .map((e) => ({
      name: e.label,
      father: e.father,
      mother: e.mother,
      girls: e.girls,
      total: e.father + e.mother + e.girls,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const filterOptions = getHhGirlsFilterOptions(household, girls);
  const revisitDetail = computeHhGirlsRevisitDetail(household, girls);
  const duplicateDetail = computeHhGirlsDuplicateDetail(household, girls);
  const coreKpiLists = computeHhGirlsCoreKpiLists(household, girls);

  return {
    targetN: hhTarget,
    core: {
      totalSubmissions,
      totalVillages,
      totalEnumerators,
      uniqueGirls: uniqueGirlsRollout,
      fatherSurveys,
      motherSurveys,
      girlsSurveys,
      totalUnavailable,
      fatherNotAvailable,
      motherNotAvailable,
      girlNotAvailable,
      consentRefused,
      completedHouseholds,
      hhTarget,
      remainingToTarget,
      progressToTarget,
      surveyMix,
      unavailabilityBreakdown,
      combinedTrend,
      completionByDistrict: coreCompletionByDistrict,
      consentOutcome: unifiedConsentOutcome,
      surveyFormsByEnumerator,
    },
    household: {
      totalSubmissions: household.length,
      totalVillages: hhVillages,
      uniqueGirls,
      bothParent,
      singleParent,
      bothAgreeMissingOne,
      consentInconsistent,
      motherForms,
      fatherForms,
      completionRate,
      progressToTarget: hhProgressToTarget,
      parentAvailability: parentAvailabilityBreakdown(household),
      parentFormsByEnumerator,
      missingParentByEnumerator,
      householdCompletionByDistrict,
      consentAgreedDisagreed,
      consentOutcome: hhConsentOutcome,
      submissionTrend: hhTrend,
    },
    girls: {
      totalSubmissions: girls.length,
      totalVillages: girlsVillages,
      totalEnumerators: girlsEnumerators,
      uniqueGirls: uniqueGirlIds.size,
      availableGirls,
      studyingGirls,
      studyingEnrolled,
      studyingRate,
      complete: completeGirls,
      revisits,
      parentalConsentRate,
      childConsentRate,
      parentConsentRefused,
      childConsentRefused,
      consentOutcome: gsConsentOutcome,
      educationStatusByDistrict,
      availabilityStatus,
      girlsSurveyByEnumerator,
      submissionTrend: girlsTrend,
      consentRefusalByEnumerator: [...girlsByEnumerator.entries()].map(
        ([key, e]) => {
          const subs = girls.filter((r) => enumeratorKey(r) === key);
          return {
            name: e.label,
            parentRefused: subs.filter((r) => r.parental_consent_agree === "0").length,
            childRefused: subs.filter((r) => r.child_consent_agree === "0").length,
          };
        }
      ).filter((e) => e.parentRefused > 0 || e.childRefused > 0),
    },
    filterOptions,
    revisitDetail,
    duplicateDetail,
    coreKpiLists,
    allHousehold: household,
    allGirls: girls,
  };
}

export type HhGirlsMetrics = ReturnType<typeof computeHhGirlsMetrics>;
