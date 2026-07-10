import { DEFAULT_TRACKING_TARGETS } from "./protocol";
import { toIsoDateString } from "../utils";

export type TrackingCohort = "baseline" | "new-sample";

export type TrackingSessionId = "2022-2023" | "2023-2024";

export interface TrackingRow {
  KEY: string;
  SubmissionDate: string;
  district: string;
  district_label?: string;
  village?: string;
  village_label?: string;
  village_id?: string;
  enumerator_id?: string;
  enumerator_name?: string;
  girl?: string;
  girl_id?: string;
  girlname_label?: string;
  /** New-sample listing name */
  new_name?: string;
  /** Survey-captured girl name (both cohorts) */
  girl_name?: string;
  /** Identity-confirmed name during tracking survey */
  name?: string;
  /** Composite listing label, e.g. "Sofia | Father | phone" */
  girl_label?: string;
  school_label?: string;
  new_school_label?: string;
  school?: string;
  house_found?: string;
  girl_found?: string;
  girl_found_confirm_enrolled?: string;
  girl_found_confirm_dropped?: string;
  consent?: string;
  survey_status?: string;
  survey_status_othr?: string;
  survey_comments?: string;
  visit_num?: string;
  enrollstat_label?: string;
  formdef_version?: string;
  cohort?: TrackingCohort;
  /** Academic session - independent of baseline / new-sample group */
  session?: TrackingSessionId;
  /** Raw SurveyCTO batch field (1 = 2022-2023, 2 = 2023-2024) */
  batch?: string;
  [key: string]: string | undefined;
}

export interface TrackingTargets {
  assignmentPool: number;
  successTarget: number;
  baselineAssignment: number;
  newSampleAssignment: number;
  baselineSuccessTarget: number;
  newSampleSuccessTarget: number;
}

export interface CohortMetrics {
  cohort: TrackingCohort;
  label: string;
  assignmentTarget: number;
  successTarget: number;
  totalSubmissions: number;
  uniqueGirlsAttempted: number;
  totalTrackedGirls: number;
  remainingToSuccessTarget: number;
  successRate: number;
  assignmentCoverage: number;
  untrackedInData: number;
  untrackedBreakdown: UntrackedBreakdown;
  sessionsInData: TrackingSessionId[];
  districtBreakdown: {
    district: string;
    label: string;
    tracked: number;
    inData: number;
  }[];
}

export const TRACKING_GROUPS = [
  { value: "baseline", label: "Baseline Tracking" },
  { value: "new-sample", label: "New Sample Tracking" },
] as const;

export interface TrackingFilters {
  district: string;
  trackingGroup: string;
  session: string;
  enumerator: string;
  village: string;
  school: string;
  untrackedReason: string;
  enrollStatus: string;
  dateFrom: string;
  dateTo: string;
  /** When true, only submissions from today are included. */
  todayOnly: boolean;
  /** Filter to a single beneficiary (girl key). */
  girl: string;
  /** Display label for the active girl filter (from search). */
  girlLabel: string;
}

export const defaultTrackingFilters: TrackingFilters = {
  district: "all",
  trackingGroup: "all",
  session: "all",
  enumerator: "all",
  village: "all",
  school: "all",
  untrackedReason: "all",
  enrollStatus: "all",
  dateFrom: "",
  dateTo: "",
  todayOnly: false,
  girl: "all",
  girlLabel: "",
};

/** Shared filter defaults - Today toggle off. */
export function defaultMonitoringFilters(): TrackingFilters {
  return { ...defaultTrackingFilters };
}

export function trackingFiltersEqual(
  a: TrackingFilters,
  b: TrackingFilters
): boolean {
  return (
    (Object.keys(defaultTrackingFilters) as (keyof TrackingFilters)[]).every(
      (key) => a[key] === b[key]
    )
  );
}

export type UntrackedReasonKey = Exclude<
  keyof UntrackedBreakdown,
  "total"
>;

export const UNTRACKED_REASON_BY_LABEL: Record<string, UntrackedReasonKey> = {
  "Girl not found": "girlNotFound",
  "No consent": "noConsent",
  "House not located": "houseNotLocated",
  "House untraceable": "houseUntraceable",
  "Incomplete survey": "incomplete",
};

/** Toggle filter values from chart clicks - click again to clear. */
export function toggleTrackingFilters(
  current: TrackingFilters,
  patch: Partial<TrackingFilters>
): TrackingFilters {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch) as [
    keyof TrackingFilters,
    TrackingFilters[keyof TrackingFilters] | undefined,
  ][]) {
    if (value === undefined) continue;
    if (key === "todayOnly") {
      next.todayOnly = value as boolean;
      continue;
    }
    const strValue = value as string;
    const isDate = key === "dateFrom" || key === "dateTo";
    const empty = isDate ? "" : "all";
    if (!strValue || strValue === empty) continue;
    next[key] = current[key] === strValue ? empty : strValue;
  }
  return next;
}

function untrackedGirlKeysForReason(
  rows: TrackingRow[],
  reason: UntrackedReasonKey,
  allRows: TrackingRow[] = rows
): Set<string> {
  const map = new Map<string, TrackingRow[]>();
  for (const r of rows) {
    const key = girlKey(r);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  const result = new Set<string>();
  for (const [key] of map) {
    if (girlIsTrackedAcrossAttempts(allRows, key)) continue;
    const allSubs = chronologicalGirlSubmissions(allRows, key);
    if (classifyUntrackedGirl(allSubs) === reason) result.add(key);
  }
  return result;
}

/** Keys of successfully tracked girls whose enrollment status matches. */
function trackedGirlKeysForEnrollStatus(
  rows: TrackingRow[],
  status: string
): Set<string> {
  const result = new Set<string>();
  for (const g of summarizeByGirl(rows)) {
    if (g.tracked && g.enrollstat === status) result.add(g.key);
  }
  return result;
}

export function resolveActiveCohort(
  filters: Pick<TrackingFilters, "trackingGroup">
): TrackingCohort | "all" {
  if (filters.trackingGroup !== "all") {
    return filters.trackingGroup as TrackingCohort;
  }
  return "all";
}

function parseDate(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function districtLabel(d: string, label?: string): string {
  const map: Record<string, string> = {
    "1": "D.I. Khan",
    "2": "Hangu",
    "3": "Lakki Marwat",
    "4": "Torghar",
  };
  return label || map[d] || `District ${d}`;
}

function cleanEnumeratorName(name?: string): string {
  if (!name) return "Unknown";
  return name.replace(/\(.*\)/, "").trim();
}

/**
 * Same field worker, different spelling or ID in the raw data (district-scoped).
 * Keys are normalized slugs; values are the canonical slug used in identity keys.
 */
const ENUMERATOR_NAME_ALIASES: Record<string, Record<string, string>> = {
  "1": {
    javairia: "javeria",
    jaweria: "javeria",
    javeria: "javeria",
    naureen: "naureen khan",
    "naureen khan": "naureen khan",
  },
};

function normalizeEnumeratorNameSlug(name: string, district: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, " ").trim();
  return ENUMERATOR_NAME_ALIASES[district]?.[slug] ?? slug;
}

/** Preferred display label for a merged enumerator identity. */
const CANONICAL_ENUMERATOR_LABELS: Record<string, string> = {
  "1::javeria": "Javeria",
  "1::naureen khan": "Naureen Khan",
};

function displayEnumeratorName(subs: TrackingRow[]): string {
  const key = enumeratorIdentityKey(subs[0]!);
  return CANONICAL_ENUMERATOR_LABELS[key] ?? preferredEnumeratorName(subs);
}

/**
 * Canonical identity for an enumerator.
 *
 * The raw data sometimes assigns the *same* field worker two different
 * `enumerator_id` values (and the name casing/spacing varies between forms),
 * which previously caused the same person to appear as two separate rows in the
 * monitoring report (e.g. "Lati khan" and "Lati Khan"). Keying on a normalized
 * name scoped to the district merges those records back into one enumerator.
 */
export function enumeratorIdentityKey(row: TrackingRow): string {
  const district = (row.district || "").trim();
  const name = normalizeEnumeratorNameSlug(
    cleanEnumeratorName(row.enumerator_name)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
    district
  );
  if (name && name !== "unknown") return `${district}::${name}`;
  return row.enumerator_id || row.enumerator_name || "unknown";
}

function enumeratorIdentityFromSummary(
  g: Pick<GirlSummary, "enumeratorId" | "enumeratorName" | "district">
): string {
  const district = (g.district || "").trim();
  const name = normalizeEnumeratorNameSlug(
    cleanEnumeratorName(g.enumeratorName)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
    district
  );
  if (name && name !== "unknown") return `${district}::${name}`;
  return g.enumeratorId || g.enumeratorName || "unknown";
}

/** Pick the most frequently submitted name variant for display. */
function preferredEnumeratorName(subs: TrackingRow[]): string {
  const counts = new Map<string, number>();
  for (const r of subs) {
    const name = cleanEnumeratorName(r.enumerator_name);
    if (!name || name === "Unknown") continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  if (counts.size === 0) {
    return cleanEnumeratorName(subs[0]?.enumerator_name) || "Unknown";
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

function buildEnumeratorOptions(rows: TrackingRow[]) {
  const groups = new Map<string, TrackingRow[]>();
  for (const r of rows) {
    const key = enumeratorIdentityKey(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return [...groups.entries()]
    .filter(([key]) => key && key !== "unknown")
    .map(([value, subs]) => ({
      value,
      label: displayEnumeratorName(subs),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function resolveSchoolLabel(row: TrackingRow): string | undefined {
  const label = row.school_label || row.new_school_label;
  if (label?.trim()) return label.trim();
  const school = String(row.school || "").trim();
  if (school && !/^\d+$/.test(school)) return school;
  return undefined;
}

/** Baseline listing uses `girlname_label`; new sample uses `new_name`, with survey fallbacks. */
export function resolveGirlName(row: TrackingRow): string {
  for (const field of [
    row.girlname_label,
    row.new_name,
    row.girl_name,
    row.name,
  ]) {
    const value = String(field || "").trim();
    if (value) return value;
  }

  const label = String(row.girl_label || "").trim();
  if (label) {
    const first = label.split("|")[0]?.trim();
    if (first) return first;
  }

  return "";
}

/**
 * Unified village identifier (the village name).
 *
 * Baseline exports put a numeric code in `village` and the name in
 * `village_label`; the new-sample export has no `village` column at all, only
 * `village_label`. So the only field present in both is the name - use it as the
 * single village key for filters, summaries and the village chart.
 */
export function resolveVillageLabel(row: TrackingRow): string | undefined {
  const label =
    row.village_label ||
    row.village_label_1 ||
    row.village_label_b1 ||
    row.village_label_b2;
  if (label?.trim()) return label.trim();
  const village = String(row.village || "").trim();
  if (village && !/^\d+$/.test(village)) return village;
  return undefined;
}

/**
 * Enrollment status at tracking for successfully tracked girls.
 *
 * Baseline exports use `enrollstat_label`. New-sample exports omit that field
 * but record the same outcome via `girl_found_confirm_enrolled` /
 * `girl_found_confirm_dropped`.
 */
function resolveEnrollStatus(
  row: TrackingRow
): "Enrolled" | "Dropped Out" | "" {
  const label = (row.enrollstat_label || "").trim();
  if (label === "Enrolled" || label === "Dropped Out") return label;

  if (row.girl_found_confirm_dropped === "1") return "Dropped Out";
  if (row.girl_found_confirm_enrolled === "1") return "Enrolled";
  if (row.girl_found_confirm_enrolled === "2") return "Dropped Out";

  return "";
}

export function girlKey(r: TrackingRow): string {
  const newSampleGirl = r.girl_1 || r.girl_2;
  return String(r.girl_id || r.girl || newSampleGirl || r.KEY);
}

export interface UntrackedBreakdown {
  total: number;
  girlNotFound: number;
  noConsent: number;
  houseUntraceable: number;
  houseNotLocated: number;
  incomplete: number;
}

function isHouseLocatedAtAddress(row: TrackingRow): boolean {
  return row.house_found === "1";
}

function codeIn(value: string | undefined, codes: string[]): boolean {
  const v = value?.trim();
  return !!v && codes.includes(v);
}

/**
 * Case 5 success path: family moved, still in village, new address known,
 * and the household was found at that new address (`house_found_1 = 1`).
 */
function isCase5NewAddressLocated(row: TrackingRow): boolean {
  return (
    row.house_found === "2" &&
    row.family_whereabouts?.trim() === "1" &&
    row.family_moveadd_samevill?.trim() === "1" &&
    row.house_found_1?.trim() === "1"
  );
}

/** Household effectively located for tracking (original address or Case 5). */
function isHouseholdEffectivelyLocated(row: TrackingRow): boolean {
  return isHouseLocatedAtAddress(row) || isCase5NewAddressLocated(row);
}

/**
 * Case 2 terminal: enrollment confirm is No (2) or Refused (999).
 * Don't Know (888) is not terminal — form may still complete.
 */
function isEnrollmentConfirmTerminal(row: TrackingRow): boolean {
  return codeIn(row.girl_found_confirm_enrolled, ["2", "999"]);
}

/**
 * Protocol Cases 1–6: terminal incomplete outcomes (no revisit).
 *
 * Case 1: house_found=1 + girl_found 4/99/999
 * Case 2: house_found=1 + girl_found 1/2/3 + confirm_enrolled 2/999
 * Case 3: house_found=2 + family_whereabouts = 2 (No — not in village)
 *          Note: whereabouts 888/999 need a revisit (not terminal)
 * Case 4: house_found=2 + whereabouts=1 + moveadd 2/888/999 → revisit (not terminal)
 * Case 5 dead-end: new address entered but new house not located (or nested move)
 * Case 6: house_found=3 AND at least one of elder/LHW/neighbour was asked
 *          If house_found=3 with no verification asked → revisit (not terminal)
 */
function isProtocolTerminalIncomplete(row: TrackingRow): boolean {
  const house = row.house_found?.trim();

  // Case 6: untraceable only closes when verification was attempted
  if (house === "3") {
    return hasUntraceableVerificationAsked(row);
  }

  // Case 1
  if (house === "1" && isGirlExplicitlyNotFound(row)) return true;

  // Case 2
  if (
    house === "1" &&
    isGirlFoundPositive(row) &&
    isEnrollmentConfirmTerminal(row)
  ) {
    return true;
  }

  if (house === "2") {
    const whereabouts = row.family_whereabouts?.trim();
    const moveadd = row.family_moveadd_samevill?.trim();

    // Case 3 terminal: family moved and confirmed NOT still in village
    if (whereabouts === "2") return true;
    // whereabouts 888/999 → revisit needed (handled in priorAttemptRequiresRevisit)

    // Case 4: in village but no usable new address (2/888/999) → revisit, not terminal

    // Case 5: new address entered — re-check location / girl logics
    if (whereabouts === "1" && moveadd === "1") {
      const house1 = row.house_found_1?.trim();
      if (house1 === "3") {
        // Same rule at new address: verified via *_1 checks → terminal
        return hasUntraceableVerificationAskedAtNewAddress(row);
      }
      if (house1 === "2") return true; // nested move with no further usable path
      if (house1 === "1") {
        if (isGirlExplicitlyNotFound(row)) return true;
        if (isGirlFoundPositive(row) && isEnrollmentConfirmTerminal(row)) {
          return true;
        }
      }
      if (!house1) return true;
    }

    // Moved away but whereabouts / address path not usable
    // (blank whereabouts stays terminal; 888/999 and Case 4 are revisit, not terminal)
    if (!whereabouts || (whereabouts === "1" && !moveadd)) return true;
  }

  return false;
}

/** At least one local source was asked when house could not be traced. */
function hasUntraceableVerificationAsked(row: TrackingRow): boolean {
  return (
    row.check_villageelder?.trim() === "1" ||
    row.check_lhw?.trim() === "1" ||
    row.check_neighbour?.trim() === "1"
  );
}

/** Same verification rule for the new-address path (Case 5 → house_found_1). */
function hasUntraceableVerificationAskedAtNewAddress(row: TrackingRow): boolean {
  return (
    row.check_villageelder_1?.trim() === "1" ||
    row.check_lhw_1?.trim() === "1" ||
    row.check_neighbour_1?.trim() === "1"
  );
}

/** Case 6 without verification — needs follow-up visit. */
function isUntraceableRevisitNeeded(row: TrackingRow): boolean {
  return (
    row.house_found?.trim() === "3" && !hasUntraceableVerificationAsked(row)
  );
}

/** Case 5→6 without verification at new address — needs follow-up visit. */
function isNewAddressUntraceableRevisitNeeded(row: TrackingRow): boolean {
  return (
    row.house_found?.trim() === "2" &&
    row.family_whereabouts?.trim() === "1" &&
    row.family_moveadd_samevill?.trim() === "1" &&
    row.house_found_1?.trim() === "3" &&
    !hasUntraceableVerificationAskedAtNewAddress(row)
  );
}

/** Family moved; whereabouts Don't Know / Refused — needs follow-up visit. */
function isFamilyWhereaboutsRevisitNeeded(row: TrackingRow): boolean {
  return (
    row.house_found?.trim() === "2" &&
    codeIn(row.family_whereabouts, ["888", "999"])
  );
}

/**
 * Case 4: family still in village but new address unknown / refused / No —
 * needs follow-up visit.
 */
function isFamilyMoveAddressRevisitNeeded(row: TrackingRow): boolean {
  return (
    row.house_found?.trim() === "2" &&
    row.family_whereabouts?.trim() === "1" &&
    codeIn(row.family_moveadd_samevill, ["2", "888", "999"])
  );
}

/** Human-readable protocol case label for exports / filtering. */
function protocolCaseLabel(row: TrackingRow): string {
  const house = row.house_found?.trim();

  if (house === "3") {
    return hasUntraceableVerificationAsked(row)
      ? "Case 6 — House untraceable (verified, no revisit)"
      : "Case 6 — House untraceable (no elder/LHW/neighbour asked — revisit needed)";
  }

  if (house === "1" && isGirlExplicitlyNotFound(row)) {
    return "Case 1 — Girl permanently not found";
  }

  if (
    house === "1" &&
    isGirlFoundPositive(row) &&
    isEnrollmentConfirmTerminal(row)
  ) {
    return "Case 2 — Enrollment confirm No/Refused";
  }

  if (house === "2") {
    const whereabouts = row.family_whereabouts?.trim();
    const moveadd = row.family_moveadd_samevill?.trim();

    if (whereabouts === "2") {
      return "Case 3 — Family moved, not in village (no revisit)";
    }
    if (codeIn(whereabouts, ["888", "999"])) {
      return "Case 3 — Family moved, whereabouts Don't Know/Refused (revisit needed)";
    }
    if (whereabouts === "1" && codeIn(moveadd, ["2", "888", "999"])) {
      return "Case 4 — Family in village but no new address (revisit needed)";
    }
    if (whereabouts === "1" && moveadd === "1") {
      const house1 = row.house_found_1?.trim();
      if (house1 === "1" && isGirlExplicitlyNotFound(row)) {
        return "Case 5→1 — New address located, girl permanently not found";
      }
      if (
        house1 === "1" &&
        isGirlFoundPositive(row) &&
        isEnrollmentConfirmTerminal(row)
      ) {
        return "Case 5→2 — New address located, enrollment confirm No/Refused";
      }
      if (house1 === "1") return "Case 5 — New address located (continue)";
      if (house1 === "2") return "Case 5 — Moved again from new address";
      if (house1 === "3") {
        return hasUntraceableVerificationAskedAtNewAddress(row)
          ? "Case 5→6 — New address untraceable (verified, no revisit)"
          : "Case 5→6 — New address untraceable (no verification asked — revisit needed)";
      }
      return "Case 5 — New address entered, house not re-checked";
    }
    return "Case — Family moved (path incomplete)";
  }

  if (house === "1" && isGirlFoundPositive(row) && !isEnrollmentConfirmTerminal(row)) {
    return "House located — girl found path";
  }
  if (house === "1") return "House located — girl temporarily unavailable";

  return "";
}

function isConsentStepReached(row: TrackingRow): boolean {
  if (!isGirlFoundPositive(row)) return false;
  if (isEnrollmentConfirmTerminal(row)) return false;
  if (row.girl_found_confirm_enrolled === "1") return true;
  if (row.girl_found_confirm_enrolled === "888") return true;
  if (row.girl_found_confirm_dropped === "1") return true;
  if (row.girl_found_confirm_dropped === "2") return false;
  if (!row.girl_found_confirm_enrolled && !row.girl_found_confirm_dropped) {
    return true;
  }
  return false;
}

function classifyUntrackedGirl(
  subs: TrackingRow[]
): Exclude<keyof UntrackedBreakdown, "total"> {
  // Case 6
  if (subs.some((r) => r.house_found === "3")) return "houseUntraceable";

  const hasEffectivelyLocated = subs.some(isHouseholdEffectivelyLocated);
  const hasHouseAtAddress = subs.some(isHouseLocatedAtAddress);

  // Cases 3–4 / closed move paths, or never located
  if (!hasEffectivelyLocated) return "houseNotLocated";

  // Case 1 (and Case 5→1): permanent girl not found at a located household
  const girlExplicitlyNotFoundAtLocated = subs.some(
    (r) => isHouseholdEffectivelyLocated(r) && isGirlExplicitlyNotFound(r)
  );
  if (girlExplicitlyNotFoundAtLocated) return "girlNotFound";

  // Case 2 (and Case 5→2): enrollment confirm No/Refused
  const enrollmentTerminal = subs.some(
    (r) =>
      isHouseholdEffectivelyLocated(r) &&
      isGirlFoundPositive(r) &&
      isEnrollmentConfirmTerminal(r)
  );
  if (enrollmentTerminal) return "incomplete";

  const consentStepReached = subs.some(
    (r) => isHouseholdEffectivelyLocated(r) && isConsentStepReached(r)
  );
  if (!consentStepReached) {
    // Keep prior nuance: house at address but girl never found positively
    if (
      hasHouseAtAddress &&
      !subs.some((r) => isHouseLocatedAtAddress(r) && isGirlFoundPositive(r))
    ) {
      return "girlNotFound";
    }
    return "incomplete";
  }

  const consentRefused = subs.some(
    (r) =>
      isConsentStepReached(r) &&
      (r.consent === "2" || r.consent === "0")
  );
  if (consentRefused) return "noConsent";

  const consentGiven = subs.some(
    (r) => isConsentStepReached(r) && r.consent === "1"
  );
  if (!consentGiven) return "incomplete";

  return "incomplete";
}

const UNTRACKED_REASON_LABELS: Record<UntrackedReasonKey, string> = {
  girlNotFound: "Girl not found",
  noConsent: "No consent",
  houseNotLocated: "House not located",
  houseUntraceable: "House untraceable",
  incomplete: "Incomplete survey",
};

function describeTrackingGaps(row: TrackingRow): string[] {
  const gaps: string[] = [];

  if (isProtocolTerminalIncomplete(row)) {
    const label = protocolCaseLabel(row);
    if (label) gaps.push(label);
  }

  if (row.house_found === "3") {
    gaps.push("house untraceable");
  } else if (!isHouseholdEffectivelyLocated(row)) {
    gaps.push("house not located");
  }

  if (isHouseholdEffectivelyLocated(row) && isGirlExplicitlyNotFound(row)) {
    gaps.push("girl not found");
  }

  if (
    isHouseholdEffectivelyLocated(row) &&
    isGirlFoundPositive(row) &&
    isEnrollmentConfirmTerminal(row)
  ) {
    gaps.push("enrollment confirm No/Refused");
  }

  if (isHouseholdEffectivelyLocated(row) && isGirlFoundPositive(row)) {
    if (row.consent === "0" || row.consent === "2") {
      gaps.push("consent refused");
    } else if (row.consent !== "1") {
      gaps.push("consent not obtained");
    }
  }

  if (row.survey_status === "2") {
    gaps.push("survey marked incomplete");
  } else if (row.survey_status === "99") {
    gaps.push("survey other status");
  } else if (row.survey_status !== "1") {
    gaps.push("survey not complete");
  }

  return gaps;
}

function describeGirlNotFoundReason(subs: TrackingRow[]): string {
  const located = subs.filter(isHouseholdEffectivelyLocated);
  const row = latestGirlSubmission(located.length > 0 ? located : subs);

  if (row.girl_found === "4") {
    return "girl_found = 4 (No, she married and moved away)";
  }
  if (row.girl_found === "99") {
    const other = row.girl_found_other?.trim();
    return other
      ? `girl_found = 99 (Other): ${other}`
      : "girl_found = 99 (Other — specify)";
  }
  if (row.girl_found === "999") {
    return "girl_found = 999 (Refused to answer)";
  }

  const code = row.girl_found?.trim();
  return code
    ? `girl_found = ${code} (${girlFoundLabel(code) || "not found"})`
    : "girl_found blank — girl not found on visit";
}

/** Exact field criteria that made this submission incomplete / closed. */
function describeProtocolCriteria(row: TrackingRow): string {
  const house = row.house_found?.trim() || "(blank)";
  const girl = row.girl_found?.trim() || "(blank)";
  const confirm = row.girl_found_confirm_enrolled?.trim() || "(blank)";
  const whereabouts = row.family_whereabouts?.trim() || "(blank)";
  const moveadd = row.family_moveadd_samevill?.trim() || "(blank)";
  const house1 = row.house_found_1?.trim() || "(blank)";
  const status = row.survey_status?.trim() || "(blank)";
  const consent = row.consent?.trim() || "(blank)";

  const parts: string[] = [];

  // Case 6
  if (row.house_found?.trim() === "3") {
    parts.push("Case 6: house_found = 3 (could not trace family)");
    parts.push(
      `Asked elder=${yesNoAskedLabel(row.check_villageelder) || "(blank)"}, LHW=${yesNoAskedLabel(row.check_lhw) || "(blank)"}, neighbour=${yesNoAskedLabel(row.check_neighbour) || "(blank)"}`
    );
    if (hasUntraceableVerificationAsked(row)) {
      parts.push("At least one source asked — Incomplete, no revisit");
    } else {
      parts.push("No elder/LHW/neighbour asked — Revisit needed");
    }
    if (row.visit_comments?.trim()) {
      parts.push(`visit_comments: ${row.visit_comments.trim()}`);
    }
    return parts.join(" | ");
  }

  // Case 1
  if (row.house_found?.trim() === "1" && isGirlExplicitlyNotFound(row)) {
    parts.push(`Case 1: house_found = 1 + ${describeGirlNotFoundReason([row])}`);
    parts.push("Incomplete, no revisit");
    if (row.girl_found_other?.trim()) {
      parts.push(`girl_found_other: ${row.girl_found_other.trim()}`);
    }
    return parts.join(" | ");
  }

  // Case 2
  if (
    row.house_found?.trim() === "1" &&
    isGirlFoundPositive(row) &&
    isEnrollmentConfirmTerminal(row)
  ) {
    parts.push(
      `Case 2: house_found = 1, girl_found = ${girl} (${girlFoundLabel(girl)}), girl_found_confirm_enrolled = ${confirm} (${enrollmentConfirmLabel(confirm)})`
    );
    parts.push("Incomplete, no revisit");
    return parts.join(" | ");
  }

  if (row.house_found?.trim() === "2") {
    // Case 3 — No (not in village): terminal. Don't Know / Refused: revisit.
    if (row.family_whereabouts?.trim() === "2") {
      parts.push(
        `Case 3: house_found = 2 (family moved), family_whereabouts = 2 (No)`
      );
      parts.push("Incomplete, no revisit");
      return parts.join(" | ");
    }
    if (codeIn(row.family_whereabouts, ["888", "999"])) {
      parts.push(
        `Case 3: house_found = 2 (family moved), family_whereabouts = ${whereabouts} (${yesNoDkRefuseLabel(row.family_whereabouts)})`
      );
      parts.push("Revisit needed");
      return parts.join(" | ");
    }

    // Case 4
    if (
      row.family_whereabouts?.trim() === "1" &&
      codeIn(row.family_moveadd_samevill, ["2", "888", "999"])
    ) {
      parts.push(
        `Case 4: house_found = 2, family_whereabouts = 1 (Yes), family_moveadd_samevill = ${moveadd} (${yesNoDkRefuseLabel(row.family_moveadd_samevill)})`
      );
      parts.push("Revisit needed");
      return parts.join(" | ");
    }

    // Case 5 paths
    if (
      row.family_whereabouts?.trim() === "1" &&
      row.family_moveadd_samevill?.trim() === "1"
    ) {
      parts.push(
        `Case 5: house_found = 2, family_whereabouts = 1, family_moveadd_samevill = 1, house_found_1 = ${house1} (${houseFoundLabel(row.house_found_1) || "blank"})`
      );
      if (row.moved_familyaddress?.trim()) {
        parts.push(`new address: ${row.moved_familyaddress.trim()}`);
      }
      if (house1 === "3") {
        if (hasUntraceableVerificationAskedAtNewAddress(row)) {
          parts.push(
            "Case 5→6: new address untraceable with verification — Incomplete, no revisit"
          );
        } else {
          parts.push(
            "Case 5→6: new address untraceable, no elder/LHW/neighbour asked — Revisit needed"
          );
        }
      } else if (house1 === "2") {
        parts.push("Moved again from new address — Incomplete, no revisit");
      } else if (house1 === "1" && isGirlExplicitlyNotFound(row)) {
        parts.push(`Case 5→1: ${describeGirlNotFoundReason([row])} — Incomplete, no revisit`);
      } else if (
        house1 === "1" &&
        isGirlFoundPositive(row) &&
        isEnrollmentConfirmTerminal(row)
      ) {
        parts.push(
          `Case 5→2: girl_found_confirm_enrolled = ${confirm} (${enrollmentConfirmLabel(confirm)}) — Incomplete, no revisit`
        );
      } else if (!row.house_found_1?.trim()) {
        parts.push("New address entered but house_found_1 blank — Incomplete, no revisit");
      } else {
        parts.push(
          `girl_found = ${girl}, confirm = ${confirm}, consent = ${consent}, survey_status = ${status}`
        );
      }
      return parts.join(" | ");
    }

    parts.push(
      `Family moved path incomplete: house_found = 2, family_whereabouts = ${whereabouts}, family_moveadd_samevill = ${moveadd}`
    );
    parts.push("Incomplete, no revisit");
    return parts.join(" | ");
  }

  // Non-terminal incomplete (e.g. temporary unavailability, consent gap)
  parts.push(`house_found = ${house} (${houseFoundLabel(row.house_found) || "blank"})`);
  parts.push(`girl_found = ${girl} (${girlFoundLabel(girl) || "blank"})`);
  if (row.girl_found_confirm_enrolled?.trim()) {
    parts.push(
      `girl_found_confirm_enrolled = ${confirm} (${enrollmentConfirmLabel(confirm)})`
    );
  }
  parts.push(`consent = ${consent} (${consentLabel(row.consent) || "blank"})`);
  parts.push(
    `survey_status = ${status} (${surveyStatusLabel(row.survey_status) || "blank"})`
  );
  if (row.survey_status_othr?.trim()) {
    parts.push(`survey_status_othr: ${row.survey_status_othr.trim()}`);
  }
  if (row.survey_comments?.trim()) {
    parts.push(`survey_comments: ${row.survey_comments.trim()}`);
  }
  if (row.visit_comments?.trim()) {
    parts.push(`visit_comments: ${row.visit_comments.trim()}`);
  }
  if (priorAttemptRequiresRevisit(row)) {
    parts.push("Revisit needed (girl temporarily unavailable)");
  }

  return parts.join(" | ");
}

function describeNotTrackedReason(subs: TrackingRow[]): string {
  const reason = classifyUntrackedGirl(subs);
  const primary = UNTRACKED_REASON_LABELS[reason];

  // Prefer the latest terminal / most informative submission for criteria text
  const terminal = [...subs].reverse().find(isProtocolTerminalIncomplete);
  const located = [...subs].reverse().find(isHouseholdEffectivelyLocated);
  const row = terminal || located || latestGirlSubmission(subs);
  const criteria = describeProtocolCriteria(row);

  if (reason === "girlNotFound") {
    return `${primary} — ${criteria}`;
  }

  if (reason === "noConsent") {
    const refused = subs.some(
      (r) =>
        isConsentStepReached(r) &&
        (r.consent === "0" || r.consent === "2")
    );
    const head = refused
      ? `${primary} — consent explicitly refused`
      : `${primary} — consent not recorded as given`;
    return `${head} | ${criteria}`;
  }

  if (reason === "houseUntraceable") {
    return `${primary} — ${criteria}`;
  }

  if (reason === "houseNotLocated") {
    return `${primary} — ${criteria}`;
  }

  // Incomplete survey — always include exact criteria (never bare "Incomplete survey")
  return `${primary} — ${criteria}`;
}

function computeUntrackedBreakdown(
  rows: TrackingRow[],
  allRows: TrackingRow[] = rows
): UntrackedBreakdown {
  const map = new Map<string, TrackingRow[]>();
  for (const r of rows) {
    const key = girlKey(r);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const breakdown: UntrackedBreakdown = {
    total: 0,
    girlNotFound: 0,
    noConsent: 0,
    houseUntraceable: 0,
    houseNotLocated: 0,
    incomplete: 0,
  };

  for (const [girl] of map) {
    if (girlIsTrackedAcrossAttempts(allRows, girl)) continue;
    breakdown.total += 1;
    breakdown[classifyUntrackedGirl(chronologicalGirlSubmissions(allRows, girl))] +=
      1;
  }

  return breakdown;
}

/**
 * Successfully tracked (strict): household effectively located, girl found,
 * consent given, form complete, and not a protocol terminal incomplete case.
 *
 * `house_found = 2` alone is not enough — only Case 5 with a located new
 * address (`house_found_1 = 1`) counts as located.
 */
export function isTrackedSubmission(r: TrackingRow): boolean {
  if (isProtocolTerminalIncomplete(r)) return false;
  return (
    isHouseholdEffectivelyLocated(r) &&
    isGirlFoundPositive(r) &&
    !isEnrollmentConfirmTerminal(r) &&
    r.consent === "1" &&
    r.survey_status === "1"
  );
}

/**
 * Operational tracking success: household effectively located, girl found
 * (including name/father mismatch codes 2 and 3), and consent given.
 */
export function isGirlTrackedForMetrics(row: TrackingRow): boolean {
  if (isProtocolTerminalIncomplete(row)) return false;
  if (isTrackedSubmission(row)) return true;
  return (
    isHouseholdEffectivelyLocated(row) &&
    isGirlFoundPositive(row) &&
    !isEnrollmentConfirmTerminal(row) &&
    row.consent === "1"
  );
}

function parseVisitNum(row: TrackingRow): number {
  const n = Number(row.visit_num);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Per-array index of chronological submissions by girl. Avoids O(n) rescans
 * inside hot paths (revisit, untracked, summarize) that previously made
 * computeTrackingMetrics O(n²) on ~3k rows.
 */
const girlSubmissionsIndexCache = new WeakMap<
  TrackingRow[],
  Map<string, TrackingRow[]>
>();

function girlSubmissionsIndex(
  allRows: TrackingRow[]
): Map<string, TrackingRow[]> {
  const cached = girlSubmissionsIndexCache.get(allRows);
  if (cached) return cached;

  const index = new Map<string, TrackingRow[]>();
  for (const r of allRows) {
    const key = girlKey(r);
    const list = index.get(key);
    if (list) list.push(r);
    else index.set(key, [r]);
  }
  for (const subs of index.values()) {
    subs.sort((a, b) => {
      const da = parseDate(a.SubmissionDate || "")?.getTime() ?? 0;
      const db = parseDate(b.SubmissionDate || "")?.getTime() ?? 0;
      if (da !== db) return da - db;
      return parseVisitNum(a) - parseVisitNum(b);
    });
  }
  girlSubmissionsIndexCache.set(allRows, index);
  return index;
}

function chronologicalGirlSubmissions(
  allRows: TrackingRow[],
  girl: string
): TrackingRow[] {
  return girlSubmissionsIndex(allRows).get(girl) ?? [];
}

/** True if the girl meets tracking success on any chronological attempt. */
function girlIsTrackedAcrossAttempts(
  allRows: TrackingRow[],
  girl: string
): boolean {
  return chronologicalGirlSubmissions(allRows, girl).some(
    isGirlTrackedForMetrics
  );
}

/**
 * Chronological attempt order for a girl. Form `visit_num` may be wrong or
 * skipped (e.g. visit 3 filed with no visit 1/2) — that submission is attempt 1.
 */
interface GirlAttempt {
  row: TrackingRow;
  attemptNumber: number;
  formVisitNum: number;
}

function girlAttemptSequence(
  allRows: TrackingRow[],
  girl: string
): GirlAttempt[] {
  return chronologicalGirlSubmissions(allRows, girl).map((row, i) => ({
    row,
    attemptNumber: i + 1,
    formVisitNum: parseVisitNum(row),
  }));
}

function attemptNumberForRow(
  allRows: TrackingRow[],
  row: TrackingRow
): number {
  return (
    girlAttemptSequence(allRows, girlKey(row)).find((a) => a.row.KEY === row.KEY)
      ?.attemptNumber ?? 1
  );
}

function firstAttemptSubmission(
  allRows: TrackingRow[],
  girl: string
): TrackingRow | undefined {
  return girlAttemptSequence(allRows, girl)[0]?.row;
}

/**
 * Tracking-stage revisit rule (protocol Cases 1–6).
 *
 * A revisit is required when:
 *   - house_found = 1 and girl temporarily unavailable; OR
 *   - house_found = 2 and family_whereabouts = 888/999 (Don't Know / Refused); OR
 *   - house_found = 2 and family_whereabouts = 1 and family_moveadd_samevill
 *     ∈ {2, 888, 999} (Case 4 — no usable new address); OR
 *   - house_found = 3 with no elder/LHW/neighbour asked (Case 6 unverified)
 *
 * No revisit for protocol terminal incomplete cases, consent refusal,
 * family-moved confirmed not in village (whereabouts = 2), verified
 * untraceable (Case 6 with at least one check asked), or already tracked.
 *
 * Maximum of three chronological attempts is enforced by the callers.
 */
function priorAttemptRequiresRevisit(row: TrackingRow): boolean {
  if (isTrackedSubmission(row)) return false;
  if (isProtocolTerminalIncomplete(row)) return false;

  // Case 6 without verification → revisit.
  if (isUntraceableRevisitNeeded(row)) return true;

  // Case 5→6 without verification at new address → revisit.
  if (isNewAddressUntraceableRevisitNeeded(row)) return true;

  // Family moved; whereabouts Don't Know / Refused → revisit.
  if (isFamilyWhereaboutsRevisitNeeded(row)) return true;

  // Case 4: in village but new address No / Don't Know / Refused → revisit.
  if (isFamilyMoveAddressRevisitNeeded(row)) return true;

  // Only original listed address can trigger a temporary-unavailability revisit.
  if (row.house_found !== "1") return false;
  if (row.consent === "0" || row.consent === "2") return false;
  if (isGirlFoundPositive(row)) return false;
  // Structure located but girl temporarily unavailable -> revisit.
  return true;
}

/**
 * Actual follow-up attempt: chronological attempt 2 or 3 after a prior failed
 * attempt when revisit was required. Form visit_num is ignored for ordering.
 */
export function isActualRevisitSubmission(
  submission: TrackingRow,
  allRows: TrackingRow[]
): boolean {
  const girl = girlKey(submission);
  const attempts = girlAttemptSequence(allRows, girl);
  const idx = attempts.findIndex((a) => a.row.KEY === submission.KEY);
  if (idx <= 0) return false;

  const attemptNumber = attempts[idx]!.attemptNumber;
  if (attemptNumber < 2 || attemptNumber > 3) return false;

  const before = attempts.slice(0, idx).map((a) => a.row);
  if (before.some(isTrackedSubmission)) return false;

  const lastPrior = before[before.length - 1]!;
  return priorAttemptRequiresRevisit(lastPrior);
}

export interface RevisitMetrics {
  revisitSubmissions: number;
  revisitGirls: number;
  revisit2ndSubmissions: number;
  revisit3rdSubmissions: number;
  girls2ndRevisit: number;
  girls3rdRevisit: number;
}

export function computeRevisitMetrics(
  filteredRows: TrackingRow[],
  allRows: TrackingRow[] = filteredRows
): RevisitMetrics {
  const secondKeys = new Set<string>();
  const thirdKeys = new Set<string>();
  let revisitSubmissions = 0;
  let revisit2ndSubmissions = 0;
  let revisit3rdSubmissions = 0;
  const revisitGirls = new Set<string>();

  for (const r of filteredRows) {
    if (!isActualRevisitSubmission(r, allRows)) continue;
    const girl = girlKey(r);
    const attempt = attemptNumberForRow(allRows, r);
    revisitSubmissions += 1;
    revisitGirls.add(girl);
    if (attempt === 2) {
      revisit2ndSubmissions += 1;
      secondKeys.add(girl);
    } else if (attempt === 3) {
      revisit3rdSubmissions += 1;
      thirdKeys.add(girl);
    }
  }

  return {
    revisitSubmissions,
    revisitGirls: revisitGirls.size,
    revisit2ndSubmissions,
    revisit3rdSubmissions,
    girls2ndRevisit: secondKeys.size,
    girls3rdRevisit: thirdKeys.size,
  };
}

export interface RevisitDetailMetrics {
  /** Girls still needing a 2nd or 3rd attempt (mutually exclusive per girl) */
  revisitsNeedToBeDone: number;
  /** 1st visit failed (temporarily not located); 2nd visit not yet done */
  revisitsNeed2nd: number;
  /** 2nd visit done but still not located; 3rd visit not yet done */
  revisitsNeed3rd: number;
  /** Revisits still needed minus girls concluded via revisit (tracked on 2nd/3rd, or 3rd done) */
  totalRemainingRevisits: number;
  girls2ndRevisited: number;
  girls3rdRevisited: number;
  girlsTrackedOn2ndRevisit: number;
  girlsTrackedOn3rdRevisit: number;
  girlsNotTrackedOn2ndRevisit: number;
  girlsNotTrackedOn3rdRevisit: number;
  totalRevisitedGirls: number;
}

export type RevisitDetailMetricKey = keyof RevisitDetailMetrics;

export type RevisitDetailListKey = Exclude<
  RevisitDetailMetricKey,
  "totalRemainingRevisits"
>;

export interface RevisitGirlExportRow {
  keyId: string;
  girlId: string;
  girlName: string;
  district: string;
  village: string;
  school: string;
  enumeratorId: string;
  enumeratorName: string;
  trackingGroup: string;
  session: string;
  submissionDate: string;
  visitNum: string;
  houseFoundCode: string;
  houseFound: string;
  girlFoundCode: string;
  girlFound: string;
  girlFoundOther: string;
  girlFoundConfirmEnrolled: string;
  girlFoundConfirmEnrolledLabel: string;
  familyWhereabouts: string;
  familyWhereaboutsLabel: string;
  familyMoveaddSamevill: string;
  familyMoveaddSamevillLabel: string;
  movedFamilyAddress: string;
  houseFound1Code: string;
  houseFound1Label: string;
  checkVillageElder: string;
  checkVillageElderLabel: string;
  nameVillageElder: string;
  numberVillageElder: string;
  checkLhw: string;
  checkLhwLabel: string;
  nameLhw: string;
  numberLhw: string;
  checkNeighbour: string;
  checkNeighbourLabel: string;
  nameNeighbour: string;
  numberNeighbour: string;
  visitComments: string;
  checkVillageElder1: string;
  checkVillageElder1Label: string;
  nameVillageElder1: string;
  numberVillageElder1: string;
  checkLhw1: string;
  checkLhw1Label: string;
  nameLhw1: string;
  numberLhw1: string;
  checkNeighbour1: string;
  checkNeighbour1Label: string;
  nameNeighbour1: string;
  numberNeighbour1: string;
  visitComments1: string;
  protocolCase: string;
  outcomeStatus: string;
  revisitNeeded: string;
  consent: string;
  consentLabel: string;
  surveyStatus: string;
  surveyStatusLabel: string;
  surveyStatusOthr: string;
  surveyComments: string;
  revisitCategory: string;
  /** Set on duplicate exports — may combine multiple labels, e.g. "Exact duplicate · Revisit duplicate" */
  duplicateType?: string;
  /** Human-readable reason for not tracked / girl not found exports */
  exportReason?: string;
}

export interface RevisitDetailData extends RevisitDetailMetrics {
  lists: Record<RevisitDetailListKey, RevisitGirlExportRow[]>;
}

function emptyRevisitLists(): Record<
  RevisitDetailListKey,
  RevisitGirlExportRow[]
> {
  return {
    revisitsNeedToBeDone: [],
    revisitsNeed2nd: [],
    revisitsNeed3rd: [],
    girls2ndRevisited: [],
    girls3rdRevisited: [],
    girlsTrackedOn2ndRevisit: [],
    girlsTrackedOn3rdRevisit: [],
    girlsNotTrackedOn2ndRevisit: [],
    girlsNotTrackedOn3rdRevisit: [],
    totalRevisitedGirls: [],
  };
}

function houseFoundLabel(v?: string): string {
  if (v === "1") return "Yes — found the household/family";
  if (v === "2") return "No — the family has moved away";
  if (v === "3") return "No — could not trace family";
  return v?.trim() || "";
}

function girlFoundLabel(v?: string): string {
  if (v === "1") return "Yes";
  if (v === "2") return "Yes, girl name not correct";
  if (v === "3") return "Yes, father name not correct";
  if (v === "4") return "No, she married and moved away";
  if (v === "99") return "Other (specify)";
  if (v === "999") return "Refused to answer";
  return v?.trim() || "";
}

function yesNoDkRefuseLabel(v?: string): string {
  if (v === "1") return "Yes";
  if (v === "2") return "No";
  if (v === "888") return "Don't Know";
  if (v === "999") return "Refused to answer";
  return v?.trim() || "";
}

function yesNoAskedLabel(v?: string): string {
  if (v === "1") return "Yes — asked";
  if (v === "2") return "No — not asked / not available";
  return v?.trim() || "";
}

function enrollmentConfirmLabel(v?: string): string {
  if (v === "1") return "Yes";
  if (v === "2") return "No";
  if (v === "888") return "Don't Know";
  if (v === "999") return "Refused to answer";
  return v?.trim() || "";
}

function outcomeStatusLabel(row: TrackingRow): string {
  if (isTrackedSubmission(row) || isGirlTrackedForMetrics(row)) {
    return "Tracked / Complete";
  }
  if (isProtocolTerminalIncomplete(row)) {
    return "Incomplete — no revisit";
  }
  if (priorAttemptRequiresRevisit(row)) {
    return "Incomplete — revisit needed";
  }
  if (row.survey_status === "1") return "Complete (form status)";
  if (row.survey_status === "2") return "Incomplete";
  if (row.survey_status === "99") return "Other";
  return "Incomplete";
}

/** Survey codes 1, 2, 3 — girl was located at the household. */
function isGirlFoundPositive(row: TrackingRow): boolean {
  const v = row.girl_found?.trim();
  return v === "1" || v === "2" || v === "3";
}

/**
 * Survey codes 4, 99, 999 — permanent not-found outcomes.
 * Girl is not found, survey is incomplete, and no revisit is needed.
 * (SurveyCTO choice list name: `girlfound`; export column: `girl_found`.)
 */
function isGirlExplicitlyNotFound(row: TrackingRow): boolean {
  const v = row.girl_found?.trim();
  return v === "4" || v === "99" || v === "999";
}

/**
 * Form completion for KPIs: survey_status=1 and not a protocol terminal
 * incomplete case (Cases 1–6). Export `survey_status` may still say 1 when
 * enumerators closed a terminal path incorrectly.
 */
function isSurveyCompleteSubmission(row: TrackingRow): boolean {
  return row.survey_status === "1" && !isProtocolTerminalIncomplete(row);
}

/** Incomplete / other status, or protocol terminal incomplete (Cases 1–6). */
function isIncompleteSubmission(row: TrackingRow): boolean {
  return (
    isProtocolTerminalIncomplete(row) ||
    row.survey_status === "2" ||
    row.survey_status === "99"
  );
}

function consentLabel(v?: string): string {
  if (v === "1") return "Consent given";
  if (v === "0" || v === "2") return "Consent refused";
  return v?.trim() || "";
}

function surveyStatusLabel(v?: string): string {
  if (v === "1") return "Complete";
  if (v === "2") return "Incomplete";
  if (v === "99") return "Other";
  return v?.trim() || "";
}

function toGirlExportRow(
  row: TrackingRow,
  category: string
): RevisitGirlExportRow {
  const cohort = inferTrackingCohort(row);
  const session = inferTrackingSession(row);
  const protocolCase = protocolCaseLabel(row);
  const outcome = outcomeStatusLabel(row);
  const revisitNeeded =
    !isTrackedSubmission(row) &&
    !isProtocolTerminalIncomplete(row) &&
    priorAttemptRequiresRevisit(row)
      ? "Yes"
      : "No";

  return {
    keyId: (row.KEY || "").trim(),
    girlId: girlKey(row),
    girlName: resolveGirlName(row),
    district: districtLabel(row.district, row.district_label),
    village: resolveVillageLabel(row) || "",
    school: resolveSchoolLabel(row) || "",
    enumeratorId: (row.enumerator_id || "").trim(),
    enumeratorName: cleanEnumeratorName(row.enumerator_name),
    trackingGroup: cohort === "baseline" ? "Baseline" : "New Sample",
    session: session || "",
    submissionDate: (row.SubmissionDate || "").trim(),
    visitNum: String(parseVisitNum(row)),
    houseFoundCode: row.house_found?.trim() || "",
    houseFound: houseFoundLabel(row.house_found),
    girlFoundCode: row.girl_found?.trim() || "",
    girlFound: girlFoundLabel(row.girl_found),
    girlFoundOther: row.girl_found_other?.trim() || "",
    girlFoundConfirmEnrolled: row.girl_found_confirm_enrolled?.trim() || "",
    girlFoundConfirmEnrolledLabel: enrollmentConfirmLabel(
      row.girl_found_confirm_enrolled
    ),
    familyWhereabouts: row.family_whereabouts?.trim() || "",
    familyWhereaboutsLabel: yesNoDkRefuseLabel(row.family_whereabouts),
    familyMoveaddSamevill: row.family_moveadd_samevill?.trim() || "",
    familyMoveaddSamevillLabel: yesNoDkRefuseLabel(row.family_moveadd_samevill),
    movedFamilyAddress: row.moved_familyaddress?.trim() || "",
    houseFound1Code: row.house_found_1?.trim() || "",
    houseFound1Label: houseFoundLabel(row.house_found_1),
    checkVillageElder: row.check_villageelder?.trim() || "",
    checkVillageElderLabel: yesNoAskedLabel(row.check_villageelder),
    nameVillageElder: row.name_villageelder?.trim() || "",
    numberVillageElder: row.number_villageelder?.trim() || "",
    checkLhw: row.check_lhw?.trim() || "",
    checkLhwLabel: yesNoAskedLabel(row.check_lhw),
    nameLhw: row.name_lhw?.trim() || "",
    numberLhw: row.number_lhw?.trim() || "",
    checkNeighbour: row.check_neighbour?.trim() || "",
    checkNeighbourLabel: yesNoAskedLabel(row.check_neighbour),
    nameNeighbour: row.name_neighbour?.trim() || "",
    numberNeighbour: row.number_neighbour?.trim() || "",
    visitComments: row.visit_comments?.trim() || "",
    checkVillageElder1: row.check_villageelder_1?.trim() || "",
    checkVillageElder1Label: yesNoAskedLabel(row.check_villageelder_1),
    nameVillageElder1: row.name_villageelder_1?.trim() || "",
    numberVillageElder1: row.number_villageelder_1?.trim() || "",
    checkLhw1: row.check_lhw_1?.trim() || "",
    checkLhw1Label: yesNoAskedLabel(row.check_lhw_1),
    nameLhw1: row.name_lhw_1?.trim() || "",
    numberLhw1: row.number_lhw_1?.trim() || "",
    checkNeighbour1: row.check_neighbour_1?.trim() || "",
    checkNeighbour1Label: yesNoAskedLabel(row.check_neighbour_1),
    nameNeighbour1: row.name_neighbour_1?.trim() || "",
    numberNeighbour1: row.number_neighbour_1?.trim() || "",
    visitComments1: row.visit_comments_1?.trim() || "",
    protocolCase,
    outcomeStatus: outcome,
    revisitNeeded,
    consent: row.consent?.trim() || "",
    consentLabel: consentLabel(row.consent),
    surveyStatus: row.survey_status?.trim() || "",
    surveyStatusLabel: surveyStatusLabel(row.survey_status),
    surveyStatusOthr: row.survey_status_othr?.trim() || "",
    surveyComments: row.survey_comments?.trim() || "",
    revisitCategory: category,
  };
}

function toRevisitExportRow(
  row: TrackingRow,
  revisitCategory: string
): RevisitGirlExportRow {
  return toGirlExportRow(row, revisitCategory);
}

function latestActualRevisitSubmission(
  subs: TrackingRow[],
  allRows: TrackingRow[],
  attemptNumber: 2 | 3
): TrackingRow | undefined {
  const girl = girlKey(subs[0]!);
  const matches = girlAttemptSequence(allRows, girl).filter(
    (a) =>
      a.attemptNumber === attemptNumber &&
      isActualRevisitSubmission(a.row, allRows)
  );
  return matches[matches.length - 1]?.row;
}

function girlStillNeeds2nd(subs: TrackingRow[], allRows: TrackingRow[]): boolean {
  const girl = girlKey(subs[0]!);
  if (girlIsTrackedAcrossAttempts(allRows, girl)) return false;
  const attempts = girlAttemptSequence(allRows, girl);
  if (attempts.length >= 2) return false;
  const first = attempts[0];
  if (!first) return false;
  return priorAttemptRequiresRevisit(first.row);
}

function girlStillNeeds3rd(subs: TrackingRow[], allRows: TrackingRow[]): boolean {
  const girl = girlKey(subs[0]!);
  if (girlIsTrackedAcrossAttempts(allRows, girl)) return false;
  const attempts = girlAttemptSequence(allRows, girl);
  if (attempts.length >= 3) return false;
  if (attempts.length < 2) return false;
  return priorAttemptRequiresRevisit(attempts[1]!.row);
}

/** Next follow-up still outstanding: 3rd takes priority over 2nd (mutually exclusive per girl). */
function girlPendingRevisit(
  subs: TrackingRow[],
  allRows: TrackingRow[]
): "2nd" | "3rd" | null {
  if (girlStillNeeds3rd(subs, allRows)) return "3rd";
  if (girlStillNeeds2nd(subs, allRows)) return "2nd";
  return null;
}

export function computeRevisitDetailMetrics(
  filteredRows: TrackingRow[],
  allRows: TrackingRow[] = filteredRows,
  options: { includeLists?: boolean } = {}
): RevisitDetailData {
  const includeLists = options.includeLists !== false;
  const attemptedGirls = [...new Set(filteredRows.map(girlKey))];
  const lists = emptyRevisitLists();
  const revisitedGirlRows = new Map<string, RevisitGirlExportRow>();
  const filteredKeys = new Set(filteredRows.map((r) => r.KEY));

  let revisitsNeed2nd = 0;
  let revisitsNeed3rd = 0;
  let girls2ndRevisited = 0;
  let girls3rdRevisited = 0;
  let girlsTrackedOn2ndRevisit = 0;
  let girlsTrackedOn3rdRevisit = 0;
  let girlsNotTrackedOn2ndRevisit = 0;
  let girlsNotTrackedOn3rdRevisit = 0;
  let totalRevisitedGirls = 0;

  for (const girl of attemptedGirls) {
    const subs = chronologicalGirlSubmissions(allRows, girl);

    const pending = girlPendingRevisit(subs, allRows);
    if (pending === "2nd") {
      revisitsNeed2nd += 1;
      if (includeLists) {
        const row =
          firstAttemptSubmission(allRows, girl) ?? subs[subs.length - 1]!;
        const exportRow = toRevisitExportRow(row, "2nd attempt still needed");
        lists.revisitsNeed2nd.push(exportRow);
        lists.revisitsNeedToBeDone.push(exportRow);
      }
    } else if (pending === "3rd") {
      revisitsNeed3rd += 1;
      if (includeLists) {
        const second = latestActualRevisitSubmission(subs, allRows, 2)!;
        const exportRow = toRevisitExportRow(second, "3rd attempt still needed");
        lists.revisitsNeed3rd.push(exportRow);
        lists.revisitsNeedToBeDone.push(exportRow);
      }
    }

    const second = latestActualRevisitSubmission(subs, allRows, 2);
    const third = latestActualRevisitSubmission(subs, allRows, 3);
    const hasSecondInFilter = second ? filteredKeys.has(second.KEY) : false;
    const hasThirdInFilter = third ? filteredKeys.has(third.KEY) : false;

    // Girl-level outcome: if any attempt eventually succeeds, prior failed
    // revisits must not remain in "not tracked" counts or exports.
    const eventuallyTracked = girlIsTrackedAcrossAttempts(allRows, girl);

    if (hasSecondInFilter) {
      girls2ndRevisited += 1;
      if (includeLists) {
        const exportRow = toRevisitExportRow(second!, "2nd revisit");
        lists.girls2ndRevisited.push(exportRow);
        if (isTrackedSubmission(second!) || isGirlTrackedForMetrics(second!)) {
          girlsTrackedOn2ndRevisit += 1;
          lists.girlsTrackedOn2ndRevisit.push(exportRow);
        } else if (!eventuallyTracked) {
          girlsNotTrackedOn2ndRevisit += 1;
          lists.girlsNotTrackedOn2ndRevisit.push(exportRow);
        }
        revisitedGirlRows.set(girl, exportRow);
      } else if (isTrackedSubmission(second!) || isGirlTrackedForMetrics(second!)) {
        girlsTrackedOn2ndRevisit += 1;
      } else if (!eventuallyTracked) {
        girlsNotTrackedOn2ndRevisit += 1;
      }
    }

    if (hasThirdInFilter) {
      girls3rdRevisited += 1;
      if (includeLists) {
        const exportRow = toRevisitExportRow(third!, "3rd revisit");
        lists.girls3rdRevisited.push(exportRow);
        if (isTrackedSubmission(third!) || isGirlTrackedForMetrics(third!)) {
          girlsTrackedOn3rdRevisit += 1;
          lists.girlsTrackedOn3rdRevisit.push(exportRow);
        } else if (!eventuallyTracked) {
          girlsNotTrackedOn3rdRevisit += 1;
          lists.girlsNotTrackedOn3rdRevisit.push(exportRow);
        }
        revisitedGirlRows.set(girl, exportRow);
      } else if (isTrackedSubmission(third!) || isGirlTrackedForMetrics(third!)) {
        girlsTrackedOn3rdRevisit += 1;
      } else if (!eventuallyTracked) {
        girlsNotTrackedOn3rdRevisit += 1;
      }
    }

    if (hasSecondInFilter || hasThirdInFilter) totalRevisitedGirls += 1;
  }

  if (includeLists) {
    lists.totalRevisitedGirls = [...revisitedGirlRows.values()];
  }

  return {
    revisitsNeedToBeDone: revisitsNeed2nd + revisitsNeed3rd,
    revisitsNeed2nd,
    revisitsNeed3rd,
    totalRemainingRevisits: Math.max(
      0,
      revisitsNeed2nd +
        revisitsNeed3rd -
        (girlsTrackedOn2ndRevisit +
          girlsTrackedOn3rdRevisit +
          girlsNotTrackedOn3rdRevisit)
    ),
    girls2ndRevisited,
    girls3rdRevisited,
    girlsTrackedOn2ndRevisit,
    girlsTrackedOn3rdRevisit,
    girlsNotTrackedOn2ndRevisit,
    girlsNotTrackedOn3rdRevisit,
    totalRevisitedGirls,
    lists,
  };
}

export type DuplicateDetailListKey =
  | "totalDuplicates"
  | "exactDuplicates"
  | "crossCohortDuplicates"
  | "revisitDuplicates"
  | "otherExtras";

export interface DuplicateDetailMetrics {
  /**
   * Extra submissions beyond one per girl:
   * `totalSubmissions − uniqueGirlsAttempted`.
   * Category cards below are mutually exclusive and sum to this total.
   */
  totalDuplicates: number;
  /** @deprecated Use totalDuplicates */
  totalUnnecessaryRows: number;
  /** Extra forms with identical survey answers to another form (KEY/date may differ) */
  exactDuplicates: number;
  /**
   * Extra forms that are also in a Baseline↔New Sample tracked pair.
   * (Full cross-cohort flag count is `crossCohortAllForms` — most pairs use
   * different listing IDs so they count as two attempted girls, not gap extras.)
   */
  crossCohortDuplicates: number;
  /**
   * Extra forms filed after a failed prior attempt (revisit path), before any
   * successful track on an earlier attempt.
   */
  revisitDuplicates: number;
  /**
   * Remaining extras: follow-up after already tracked, same-visit resubmit with
   * different answers, and any other additional submission.
   */
  otherExtras: number;
  /** Follow-up after already tracked (subset of otherExtras) */
  followUpAfterTracked: number;
  /** Same visit # resubmitted with different answers (subset of otherExtras) */
  sameVisitDifferentAnswers: number;
  /** Distinct exact-content fingerprint groups with more than one submission */
  exactDuplicateGroups: number;
  /** Distinct person identities tracked in both cohorts */
  crossCohortGirls: number;
  /** All tracked forms flagged in Baseline↔New Sample pairs (not limited to gap) */
  crossCohortAllForms: number;
  /** Unique girls attempted in the filtered rows (for gap identity check) */
  uniqueGirlsInScope: number;
  /** Total submissions in scope */
  submissionsInScope: number;
}

export interface DuplicateDetailData extends DuplicateDetailMetrics {
  lists: Record<DuplicateDetailListKey, RevisitGirlExportRow[]>;
}

function emptyDuplicateLists(): Record<
  DuplicateDetailListKey,
  RevisitGirlExportRow[]
> {
  return {
    totalDuplicates: [],
    exactDuplicates: [],
    crossCohortDuplicates: [],
    revisitDuplicates: [],
    otherExtras: [],
  };
}

const EXACT_DUPLICATE_TYPE = "Exact duplicate";
const CROSS_COHORT_DUPLICATE_TYPE =
  "Tracked in Baseline and New Sample";
const REVISIT_DUPLICATE_TYPE = "Revisit duplicate form";
const FOLLOWUP_AFTER_TRACKED_TYPE = "Follow-up after already tracked";
const SAME_VISIT_DIFFERENT_TYPE = "Same-visit resubmit (different answers)";
const OTHER_EXTRA_TYPE = "Other extra submission";

/** Fields that may differ on otherwise identical form resubmits. */
const EXACT_DUP_EXCLUDE = new Set([
  "KEY",
  "SubmissionDate",
  "formdef_version",
  "cohort",
  "session",
]);

function exactDuplicateFingerprint(row: TrackingRow): string {
  return Object.keys(row)
    .filter((key) => !EXACT_DUP_EXCLUDE.has(key))
    .sort()
    .map((key) => `${key}=${String(row[key] ?? "").trim()}`)
    .join("\u0001");
}

function normalizePersonToken(value: string | undefined): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function resolveFatherName(row: TrackingRow): string {
  const direct = String(row.girl_fathername || "").trim();
  if (direct) return direct;
  const parts = String(row.girl_label || "")
    .split("|")
    .map((p) => p.trim());
  return parts[1] || "";
}

/**
 * Cross-cohort person key. Listing IDs differ between Baseline and New Sample,
 * so match on district + village + girl name + father name.
 */
function crossCohortPersonKey(row: TrackingRow): string {
  const name = normalizePersonToken(resolveGirlName(row));
  const father = normalizePersonToken(resolveFatherName(row));
  const district = String(row.district || "").trim();
  const village = normalizePersonToken(resolveVillageLabel(row) || "");
  if (!name || !father || !district) return "";
  return `${district}|${village}|${name}|${father}`;
}

function mergeDuplicateExportRows(
  ...groups: RevisitGirlExportRow[][]
): RevisitGirlExportRow[] {
  const byKey = new Map<string, RevisitGirlExportRow>();

  for (const group of groups) {
    for (const row of group) {
      const existing = byKey.get(row.keyId);
      if (!existing) {
        byKey.set(row.keyId, { ...row });
        continue;
      }

      const types = new Set(
        `${existing.duplicateType} · ${row.duplicateType}`
          .split(" · ")
          .map((t) => t.trim())
          .filter(Boolean)
      );
      const duplicateType = [...types].join(" · ");
      byKey.set(row.keyId, {
        ...existing,
        duplicateType,
        revisitCategory: duplicateType,
      });
    }
  }

  return [...byKey.values()];
}

function buildExactFingerprintIndex(rows: TrackingRow[]): {
  exactKeys: Set<string>;
  exactGroups: number;
} {
  const byFp = new Map<string, TrackingRow[]>();
  for (const row of rows) {
    const fp = exactDuplicateFingerprint(row);
    if (!fp) continue;
    const list = byFp.get(fp);
    if (list) list.push(row);
    else byFp.set(fp, [row]);
  }
  const exactKeys = new Set<string>();
  let exactGroups = 0;
  for (const subs of byFp.values()) {
    if (subs.length <= 1) continue;
    exactGroups += 1;
    for (const row of subs) exactKeys.add(row.KEY);
  }
  return { exactKeys, exactGroups };
}

function buildCrossCohortIndex(rows: TrackingRow[]): {
  crossKeys: Set<string>;
  crossCohortGirls: number;
} {
  const byPerson = new Map<
    string,
    { baseline: TrackingRow[]; newSample: TrackingRow[] }
  >();
  for (const row of rows) {
    if (!isGirlTrackedForMetrics(row)) continue;
    const person = crossCohortPersonKey(row);
    if (!person) continue;
    const cohort = inferTrackingCohort(row);
    let entry = byPerson.get(person);
    if (!entry) {
      entry = { baseline: [], newSample: [] };
      byPerson.set(person, entry);
    }
    if (cohort === "baseline") entry.baseline.push(row);
    else entry.newSample.push(row);
  }
  const crossKeys = new Set<string>();
  let crossCohortGirls = 0;
  for (const entry of byPerson.values()) {
    if (entry.baseline.length === 0 || entry.newSample.length === 0) continue;
    crossCohortGirls += 1;
    for (const row of [...entry.baseline, ...entry.newSample]) {
      crossKeys.add(row.KEY);
    }
  }
  return { crossKeys, crossCohortGirls };
}

type GapCategory =
  | "exact"
  | "crossCohort"
  | "revisit"
  | "followUpAfterTracked"
  | "sameVisitDifferent"
  | "other";

/**
 * Every submission beyond the first chronological attempt per girl is an
 * "extra" that creates the submissions − attempted gap. Classify each extra
 * into exactly one bucket so categories sum to the gap.
 */
function classifyGapExtras(rows: TrackingRow[]): {
  byCategory: Record<GapCategory, TrackingRow[]>;
  exactGroups: number;
  crossCohortGirls: number;
  crossCohortAllForms: number;
  uniqueGirls: number;
} {
  const { exactKeys, exactGroups } = buildExactFingerprintIndex(rows);
  const { crossKeys, crossCohortGirls } = buildCrossCohortIndex(rows);

  const byGirl = new Map<string, TrackingRow[]>();
  for (const row of rows) {
    const key = girlKey(row);
    const list = byGirl.get(key);
    if (list) list.push(row);
    else byGirl.set(key, [row]);
  }

  const byCategory: Record<GapCategory, TrackingRow[]> = {
    exact: [],
    crossCohort: [],
    revisit: [],
    followUpAfterTracked: [],
    sameVisitDifferent: [],
    other: [],
  };

  for (const [girl, subs] of byGirl) {
    if (subs.length <= 1) continue;
    const attempts = girlAttemptSequence(rows, girl);

    for (let i = 1; i < attempts.length; i++) {
      const row = attempts[i]!.row;
      const before = attempts.slice(0, i).map((a) => a.row);
      const priorTracked = before.some(isTrackedSubmission);
      const visit = row.visit_num || "1";
      const sameVisitCount = attempts.filter(
        (a) => (a.row.visit_num || "1") === visit
      ).length;

      let category: GapCategory;
      if (exactKeys.has(row.KEY)) category = "exact";
      else if (crossKeys.has(row.KEY)) category = "crossCohort";
      else if (priorTracked) category = "followUpAfterTracked";
      else if (isActualRevisitSubmission(row, rows)) category = "revisit";
      else if (sameVisitCount > 1) category = "sameVisitDifferent";
      else category = "revisit";

      byCategory[category].push(row);
    }
  }

  return {
    byCategory,
    exactGroups,
    crossCohortGirls,
    crossCohortAllForms: crossKeys.size,
    uniqueGirls: byGirl.size,
  };
}

export function computeDuplicateDetailMetrics(
  rows: TrackingRow[],
  options: { includeLists?: boolean } = {}
): DuplicateDetailData {
  const includeLists = options.includeLists !== false;
  const lists = emptyDuplicateLists();
  const gap = classifyGapExtras(rows);

  const exactRows = gap.byCategory.exact;
  const crossRows = gap.byCategory.crossCohort;
  const revisitRows = gap.byCategory.revisit;
  const otherRows = [
    ...gap.byCategory.followUpAfterTracked,
    ...gap.byCategory.sameVisitDifferent,
    ...gap.byCategory.other,
  ];

  const totalDuplicates =
    exactRows.length +
    crossRows.length +
    revisitRows.length +
    otherRows.length;

  if (includeLists) {
    const toExport = (row: TrackingRow, type: string): RevisitGirlExportRow => ({
      ...toGirlExportRow(row, type),
      duplicateType: type,
    });

    lists.exactDuplicates = exactRows.map((r) =>
      toExport(r, EXACT_DUPLICATE_TYPE)
    );
    lists.crossCohortDuplicates = crossRows.map((r) =>
      toExport(r, CROSS_COHORT_DUPLICATE_TYPE)
    );
    lists.revisitDuplicates = revisitRows.map((r) =>
      toExport(r, REVISIT_DUPLICATE_TYPE)
    );
    lists.otherExtras = [
      ...gap.byCategory.followUpAfterTracked.map((r) =>
        toExport(r, FOLLOWUP_AFTER_TRACKED_TYPE)
      ),
      ...gap.byCategory.sameVisitDifferent.map((r) =>
        toExport(r, SAME_VISIT_DIFFERENT_TYPE)
      ),
      ...gap.byCategory.other.map((r) => toExport(r, OTHER_EXTRA_TYPE)),
    ];
    lists.totalDuplicates = mergeDuplicateExportRows(
      lists.exactDuplicates,
      lists.crossCohortDuplicates,
      lists.revisitDuplicates,
      lists.otherExtras
    );

    const sortByDate = (
      a: RevisitGirlExportRow,
      b: RevisitGirlExportRow
    ) =>
      new Date(b.submissionDate || 0).getTime() -
      new Date(a.submissionDate || 0).getTime();

    for (const key of Object.keys(lists) as DuplicateDetailListKey[]) {
      lists[key].sort(sortByDate);
    }
  }

  return {
    totalDuplicates,
    totalUnnecessaryRows: totalDuplicates,
    exactDuplicates: exactRows.length,
    crossCohortDuplicates: crossRows.length,
    revisitDuplicates: revisitRows.length,
    otherExtras: otherRows.length,
    followUpAfterTracked: gap.byCategory.followUpAfterTracked.length,
    sameVisitDifferentAnswers: gap.byCategory.sameVisitDifferent.length,
    exactDuplicateGroups: gap.exactGroups,
    crossCohortGirls: gap.crossCohortGirls,
    crossCohortAllForms: gap.crossCohortAllForms,
    uniqueGirlsInScope: gap.uniqueGirls,
    submissionsInScope: rows.length,
    lists,
  };
}

export interface EnumeratorSummaryExportRow {
  enumeratorId: string;
  enumeratorName: string;
  district: string;
  uniqueGirls: number;
  trackedGirls: number;
  untrackedGirls: number;
  submissions: number;
}

export interface OperationalKpiExportData {
  rows: RevisitGirlExportRow[];
  enumeratorSummary?: EnumeratorSummaryExportRow[];
}

export interface SecondaryKpis {
  uniqueGirlsAttempted: number;
  trackedGirls: number;
  successRate: number;
  dataCoverageRate: number;
  revisitSubmissions: number;
  revisitGirls: number;
  revisit2ndSubmissions: number;
  revisit3rdSubmissions: number;
  girls2ndRevisit: number;
  girls3rdRevisit: number;
  girls2023: number;
  girls2024: number;
  houseUntraceableGirls: number;
  familyMovedGirls: number;
  consentRate: number;
  incompleteSubmissions: number;
  duplicateSubmissions: number;
  avgSubmissionsPerEnumerator: number;
  avgGirlsPerEnumerator: number;
  completionRate: number;
  girlNotFound: number;
  noConsentGirls: number;
  attemptedNotTracked: number;
  houseNotLocatedGirls: number;
  incompleteGirls: number;
  locatedGirls: number;
}

export type OperationalKpiKey = keyof SecondaryKpis;
export type OperationalKpiLists = Record<OperationalKpiKey, OperationalKpiExportData>;

function latestGirlSubmission(subs: TrackingRow[]): TrackingRow {
  return [...subs].sort(
    (a, b) =>
      new Date(b.SubmissionDate || 0).getTime() -
      new Date(a.SubmissionDate || 0).getTime()
  )[0]!;
}

function groupFilteredRowsByGirl(rows: TrackingRow[]): Map<string, TrackingRow[]> {
  const map = new Map<string, TrackingRow[]>();
  for (const row of rows) {
    const key = girlKey(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

function emptyOperationalKpiLists(): OperationalKpiLists {
  const empty: OperationalKpiExportData = { rows: [] };
  return {
    uniqueGirlsAttempted: { rows: [] },
    trackedGirls: { rows: [] },
    dataCoverageRate: { rows: [] },
    successRate: { rows: [] },
    attemptedNotTracked: { rows: [] },
    girlNotFound: { rows: [] },
    noConsentGirls: { rows: [] },
    revisitSubmissions: { rows: [] },
    revisitGirls: { rows: [] },
    girls2023: { rows: [] },
    girls2024: { rows: [] },
    houseUntraceableGirls: { rows: [] },
    familyMovedGirls: { rows: [] },
    consentRate: { rows: [] },
    completionRate: { rows: [] },
    incompleteSubmissions: { rows: [] },
    duplicateSubmissions: { rows: [] },
    avgGirlsPerEnumerator: { rows: [], enumeratorSummary: [] },
    revisit2ndSubmissions: empty,
    revisit3rdSubmissions: empty,
    girls2ndRevisit: empty,
    girls3rdRevisit: empty,
    houseNotLocatedGirls: empty,
    incompleteGirls: empty,
    locatedGirls: empty,
    avgSubmissionsPerEnumerator: empty,
  };
}

function computeOperationalKpiLists(
  rows: TrackingRow[],
  allRows: TrackingRow[],
  revisitDetail: RevisitDetailData,
  duplicateDetail: DuplicateDetailData
): OperationalKpiLists {
  const lists = emptyOperationalKpiLists();
  const byGirl = groupFilteredRowsByGirl(rows);
  const trackedGirlKeys = new Set(
    allRows.filter(isGirlTrackedForMetrics).map((r) => girlKey(r))
  );

  const pushGirl = (
    key: OperationalKpiKey,
    subs: TrackingRow[],
    category: string,
    exportReason?: string
  ) => {
    const row = toGirlExportRow(latestGirlSubmission(subs), category);
    if (!row.girlName) {
      for (const sub of subs) {
        const name = resolveGirlName(sub);
        if (name) {
          row.girlName = name;
          break;
        }
      }
    }
    if (exportReason) row.exportReason = exportReason;
    lists[key].rows.push(row);
  };

  const pushSubmission = (key: OperationalKpiKey, row: TrackingRow, category: string) => {
    lists[key].rows.push(toGirlExportRow(row, category));
  };

  for (const [girl, subs] of byGirl) {
    const allSubs = chronologicalGirlSubmissions(allRows, girl);
    const tracked = girlIsTrackedAcrossAttempts(allRows, girl);
    const session2024 = subs.some((r) => inferTrackingSession(r) === "2023-2024");

    pushGirl("uniqueGirlsAttempted", subs, "Attempted");
    pushGirl("dataCoverageRate", subs, "Attempted");

    if (tracked) {
      pushGirl("trackedGirls", subs, "Successfully tracked");
      pushGirl("successRate", subs, "Successfully tracked");
    } else {
      const reason = classifyUntrackedGirl(allSubs);
      const category = UNTRACKED_REASON_LABELS[reason];
      const detailedReason = describeNotTrackedReason(allSubs);
      pushGirl("attemptedNotTracked", allSubs, category, detailedReason);
      if (reason === "girlNotFound") {
        const notFoundSubs = allSubs.filter(
          (r) =>
            isHouseholdEffectivelyLocated(r) && isGirlExplicitlyNotFound(r)
        );
        pushGirl(
          "girlNotFound",
          notFoundSubs.length > 0
            ? notFoundSubs
            : allSubs.filter(isHouseholdEffectivelyLocated),
          category,
          detailedReason
        );
      } else if (reason === "noConsent")
        pushGirl("noConsentGirls", allSubs, category, detailedReason);
      else if (reason === "incomplete")
        pushGirl("incompleteGirls", allSubs, category, detailedReason);
      else if (reason === "houseNotLocated")
        pushGirl(
          "houseNotLocatedGirls",
          allSubs,
          category,
          detailedReason
        );
      else if (reason === "houseUntraceable")
        pushGirl(
          "houseUntraceableGirls",
          allSubs,
          category,
          detailedReason
        );
    }

    if (session2024) pushGirl("girls2024", subs, "2023-2024 listing");
    else pushGirl("girls2023", subs, "2022-2023 listing");

    if (subs.some((r) => r.house_found === "3") && !trackedGirlKeys.has(girl)) {
      if (!lists.houseUntraceableGirls.rows.some((r) => r.girlId === girl)) {
        pushGirl(
          "houseUntraceableGirls",
          subs,
          UNTRACKED_REASON_LABELS.houseUntraceable,
          describeNotTrackedReason(allSubs)
        );
      }
    }

    if (subs.some((r) => r.house_found === "2") && !trackedGirlKeys.has(girl)) {
      const movedReason = classifyUntrackedGirl(allSubs);
      pushGirl(
        "familyMovedGirls",
        subs,
        UNTRACKED_REASON_LABELS[movedReason],
        describeNotTrackedReason(allSubs)
      );
    }

    const locatedSubs = subs.filter(
      (r) => r.house_found === "1" || r.house_found === "2"
    );
    if (locatedSubs.length > 0) {
      const hasConsent = locatedSubs.some((r) => r.consent === "1");
      pushGirl(
        "consentRate",
        subs,
        hasConsent ? "Consent given" : "Consent not given"
      );
      pushGirl("locatedGirls", subs, "Located household");
    }
  }

  for (const row of rows) {
    const girl = girlKey(row);
    const eventuallyTracked = trackedGirlKeys.has(girl);

    if (isActualRevisitSubmission(row, allRows)) {
      pushSubmission("revisitSubmissions", row, "Follow-up attempt");
      const attemptNum = attemptNumberForRow(allRows, row);
      if (attemptNum === 2) {
        pushSubmission("revisit2ndSubmissions", row, "2nd follow-up");
      }
      if (attemptNum === 3) {
        pushSubmission("revisit3rdSubmissions", row, "3rd follow-up");
      }
    }

    const complete = isSurveyCompleteSubmission(row);
    pushSubmission(
      "completionRate",
      row,
      complete ? "Complete" : "Incomplete / other"
    );

    // Do not list failed/incomplete prior attempts once the girl is tracked.
    if (isIncompleteSubmission(row) && !eventuallyTracked) {
      pushSubmission("incompleteSubmissions", row, "Incomplete / other");
    }
  }

  lists.revisitGirls.rows = revisitDetail.lists.totalRevisitedGirls.map((r) => ({
    ...r,
    revisitCategory: "Follow-up visit",
  }));
  lists.girls2ndRevisit.rows = revisitDetail.lists.girls2ndRevisited.map((r) => ({
    ...r,
    revisitCategory: "2nd follow-up visit",
  }));
  lists.girls3rdRevisit.rows = revisitDetail.lists.girls3rdRevisited.map((r) => ({
    ...r,
    revisitCategory: "3rd follow-up visit",
  }));

  lists.duplicateSubmissions.rows = duplicateDetail.lists.totalDuplicates;

  const enumeratorStats = new Map<
    string,
    EnumeratorSummaryExportRow & { key: string }
  >();

  for (const row of rows) {
    const key = enumeratorIdentityKey(row);
    if (!enumeratorStats.has(key)) {
      enumeratorStats.set(key, {
        key,
        enumeratorId: (row.enumerator_id || "").trim(),
        enumeratorName: cleanEnumeratorName(row.enumerator_name),
        district: districtLabel(row.district, row.district_label),
        uniqueGirls: 0,
        trackedGirls: 0,
        untrackedGirls: 0,
        submissions: 0,
      });
    }
    enumeratorStats.get(key)!.submissions += 1;
  }

  const girlsByEnumerator = new Map<string, Set<string>>();
  const trackedByEnumerator = new Map<string, Set<string>>();
  for (const [girl, subs] of byGirl) {
    const enumKey = enumeratorIdentityKey(latestGirlSubmission(subs));
    if (!girlsByEnumerator.has(enumKey)) girlsByEnumerator.set(enumKey, new Set());
    girlsByEnumerator.get(enumKey)!.add(girl);
    if (girlIsTrackedAcrossAttempts(allRows, girl)) {
      if (!trackedByEnumerator.has(enumKey)) trackedByEnumerator.set(enumKey, new Set());
      trackedByEnumerator.get(enumKey)!.add(girl);
    }
  }

  lists.avgGirlsPerEnumerator.enumeratorSummary = [...enumeratorStats.values()]
    .map((stat) => {
      const girls = girlsByEnumerator.get(stat.key)?.size ?? 0;
      const tracked = trackedByEnumerator.get(stat.key)?.size ?? 0;
      return {
        enumeratorId: stat.enumeratorId,
        enumeratorName: stat.enumeratorName,
        district: stat.district,
        uniqueGirls: girls,
        trackedGirls: tracked,
        untrackedGirls: Math.max(0, girls - tracked),
        submissions: stat.submissions,
      };
    })
    .sort((a, b) => b.uniqueGirls - a.uniqueGirls);

  lists.avgSubmissionsPerEnumerator.enumeratorSummary =
    lists.avgGirlsPerEnumerator.enumeratorSummary;

  return lists;
}

/** @deprecated Use TrackingSessionId */
export type TrackingBatchId = TrackingSessionId;

export const TRACKING_SESSIONS = [
  { value: "2022-2023", label: "2022-2023" },
  { value: "2023-2024", label: "2023-2024" },
] as const;

/** @deprecated Use TRACKING_SESSIONS */
export const TRACKING_BATCHES = TRACKING_SESSIONS;

export function inferTrackingSession(row: TrackingRow): TrackingSessionId | null {
  if (row.session === "2022-2023" || row.session === "2023-2024") {
    return row.session;
  }

  const formBatch = String(row.batch || "").trim();
  if (formBatch === "1" || formBatch === "2022-2023") return "2022-2023";
  if (formBatch === "2" || formBatch === "2023-2024") return "2023-2024";

  const listingId = [row.girl_1, row.girl_2, row.girl_id, row.girl]
    .filter(Boolean)
    .map(String)
    .join(" ");
  if (/-23-/.test(listingId)) return "2022-2023";
  if (/-24-/.test(listingId)) return "2023-2024";

  // Baseline export carries no batch/year-coded listing ID, so treat the whole
  // baseline cohort as the 2022-2023 session. This keeps the Session filter
  // intuitive without affecting Girls 2023/2024 KPIs (baseline never resolves to
  // 2023-2024, so girls2024 is unchanged).
  if (row.cohort === "baseline") return "2022-2023";

  return null;
}

export function inferTrackingBatch(
  row: TrackingRow
): TrackingSessionId | null {
  return inferTrackingSession(row);
}

export function inferTrackingCohort(row: TrackingRow): TrackingCohort {
  if (row.cohort) return row.cohort;
  return "baseline";
}

export function applyTrackingFilters(
  rows: TrackingRow[],
  filters: TrackingFilters
): TrackingRow[] {
  const untrackedKeys =
    filters.untrackedReason !== "all"
      ? untrackedGirlKeysForReason(
          rows,
          filters.untrackedReason as UntrackedReasonKey
        )
      : null;

  const enrollKeys =
    filters.enrollStatus !== "all"
      ? trackedGirlKeysForEnrollStatus(rows, filters.enrollStatus)
      : null;

  return rows.filter((r) => {
    if (filters.district !== "all" && r.district !== filters.district)
      return false;
    if (filters.enumerator !== "all" && enumeratorIdentityKey(r) !== filters.enumerator)
      return false;
    if (filters.village !== "all" && resolveVillageLabel(r) !== filters.village)
      return false;
    if (filters.girl !== "all" && girlKey(r) !== filters.girl) return false;
    if (filters.school !== "all" && resolveSchoolLabel(r) !== filters.school)
      return false;
    if (
      filters.trackingGroup !== "all" &&
      inferTrackingCohort(r) !== filters.trackingGroup
    )
      return false;
    if (filters.session !== "all") {
      const session = inferTrackingSession(r);
      if (session !== filters.session) return false;
    }
    if (filters.untrackedReason !== "all" && untrackedKeys) {
      if (!untrackedKeys.has(girlKey(r))) return false;
    }
    if (filters.enrollStatus !== "all" && enrollKeys) {
      if (!enrollKeys.has(girlKey(r))) return false;
    }
    const subDate = parseDate(r.SubmissionDate || "");
    const today = toIsoDateString(new Date());
    const dateFrom = filters.todayOnly ? today : filters.dateFrom;
    const dateTo = filters.todayOnly ? today : filters.dateTo;
    if (dateFrom && subDate) {
      const from = new Date(dateFrom);
      if (subDate < from) return false;
    }
    if (dateTo && subDate) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (subDate > to) return false;
    }
    return true;
  });
}

interface GirlSummary {
  key: string;
  tracked: boolean;
  district: string;
  districtLabel: string;
  village: string;
  villageLabel: string;
  school: string;
  enumeratorId: string;
  enumeratorName: string;
  enrollstat: string;
  latestDate: string;
}

function summarizeByGirl(
  rows: TrackingRow[],
  allRows: TrackingRow[] = rows
): GirlSummary[] {
  const map = new Map<string, TrackingRow[]>();
  for (const r of rows) {
    const key = girlKey(r);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  return [...map.entries()].map(([key, subs]) => {
    const sorted = subs.sort(
      (a, b) =>
        new Date(b.SubmissionDate || 0).getTime() -
        new Date(a.SubmissionDate || 0).getTime()
    );
    const latest = sorted[0];
    return {
      key,
      tracked: girlIsTrackedAcrossAttempts(allRows, key),
      district: latest.district || "",
      districtLabel: districtLabel(
        latest.district || "",
        latest.district_label
      ),
      village: resolveVillageLabel(latest) || "",
      villageLabel: resolveVillageLabel(latest) || "Unknown",
      school: resolveSchoolLabel(latest) || "Unknown",
      enumeratorId: latest.enumerator_id || "",
      enumeratorName: cleanEnumeratorName(latest.enumerator_name),
      enrollstat: resolveEnrollStatus(latest),
      latestDate: latest.SubmissionDate || "",
    };
  });
}

function computeCohortMetrics(
  rows: TrackingRow[],
  cohort: TrackingCohort,
  label: string,
  assignmentTarget: number,
  successTarget: number,
  allRows: TrackingRow[] = rows
): CohortMetrics {
  const cohortRows = rows.filter((r) => inferTrackingCohort(r) === cohort);
  const cohortAllRows = allRows.filter(
    (r) => inferTrackingCohort(r) === cohort
  );
  const girls = summarizeByGirl(cohortRows, cohortAllRows);
  const trackedGirls = girls.filter((g) => g.tracked);
  const untrackedGirls = girls.filter((g) => !g.tracked);
  const totalTracked = trackedGirls.length;
  const untrackedBreakdown = computeUntrackedBreakdown(
    cohortRows,
    cohortAllRows
  );
  const sessionsInData = [
    ...new Set(
      cohortRows
        .map(inferTrackingSession)
        .filter((s): s is TrackingSessionId => s !== null)
    ),
  ].sort();

  const cohortDistrictIds = [
    ...new Set(girls.map((g) => g.district).filter(Boolean)),
  ];
  const districtBreakdown = cohortDistrictIds.map((d) => {
    const districtGirls = girls.filter((g) => g.district === d);
    return {
      district: d,
      label: districtLabel(d, districtGirls[0]?.districtLabel),
      tracked: districtGirls.filter((g) => g.tracked).length,
      inData: districtGirls.length,
    };
  });

  return {
    cohort,
    label,
    assignmentTarget,
    successTarget,
    totalSubmissions: cohortRows.length,
    uniqueGirlsAttempted: girls.length,
    totalTrackedGirls: totalTracked,
    remainingToSuccessTarget: Math.max(0, successTarget - totalTracked),
    successRate: successTarget > 0 ? (totalTracked / successTarget) * 100 : 0,
    assignmentCoverage:
      assignmentTarget > 0 ? (girls.length / assignmentTarget) * 100 : 0,
    untrackedInData: untrackedGirls.length,
    untrackedBreakdown,
    sessionsInData,
    districtBreakdown,
  };
}

export interface ComputeTrackingOptions {
  /**
   * When false, skip building Excel export row arrays (counts still computed).
   * Use on the client during filter changes to keep the UI responsive.
   */
  includeExportLists?: boolean;
}

export function computeTrackingMetrics(
  rows: TrackingRow[],
  targets: TrackingTargets = DEFAULT_TRACKING_TARGETS,
  allRows: TrackingRow[] = rows,
  options: ComputeTrackingOptions = {}
) {
  const includeExportLists = options.includeExportLists !== false;
  const girls = summarizeByGirl(rows, allRows);
  const trackedGirls = girls.filter((g) => g.tracked);
  const untrackedGirls = girls.filter((g) => !g.tracked);

  const totalTracked = trackedGirls.length;
  const remainingToSuccessTarget = Math.max(
    0,
    targets.successTarget - totalTracked
  );
  const successRate =
    targets.successTarget > 0
      ? (totalTracked / targets.successTarget) * 100
      : 0;

  const cohorts = {
    baseline: computeCohortMetrics(
      rows,
      "baseline",
      "Baseline Tracking",
      targets.baselineAssignment,
      targets.baselineSuccessTarget,
      allRows
    ),
    newSample: computeCohortMetrics(
      rows,
      "new-sample",
      "New Sample Tracking",
      targets.newSampleAssignment,
      targets.newSampleSuccessTarget,
      allRows
    ),
  };

  const villages = new Set(
    rows.map((r) => resolveVillageLabel(r)).filter(Boolean)
  );
  const schools = new Set(
    rows.map((r) => resolveSchoolLabel(r)).filter(Boolean)
  );
  const enumerators = new Set(
    rows.map((r) => enumeratorIdentityKey(r)).filter((id) => id !== "unknown")
  );

  const districtIds = [...new Set(girls.map((g) => g.district).filter(Boolean))];
  const districtShare = (d: string) => {
    const inDistrict = girls.filter((g) => g.district === d).length;
    return girls.length > 0 ? inDistrict / girls.length : 0;
  };

  const trackedByDistrict = districtIds.map((d) => {
    const districtGirls = girls.filter((g) => g.district === d);
    const tracked = districtGirls.filter((g) => g.tracked).length;
    // Proportional slice of the protocol pool - informational reference only.
    const target = Math.round(targets.assignmentPool * districtShare(d));
    return {
      district: d,
      label: districtLabel(d, districtGirls[0]?.districtLabel),
      tracked,
      // Actual untracked girls present in the (filtered) data, NOT the protocol
      // gap. Using the protocol gap collapsed the whole 4,860 pool onto a single
      // district whenever a village/enumerator filter was active.
      untracked: Math.max(0, districtGirls.length - tracked),
      target,
      inData: districtGirls.length,
      totalSubmissions: rows.filter((r) => r.district === d).length,
    };
  });

  const villageUntracked = new Map<
    string,
    { count: number; villageId: string; districtLabel: string }
  >();
  for (const g of untrackedGirls) {
    const label = g.villageLabel;
    const existing = villageUntracked.get(label);
    villageUntracked.set(label, {
      count: (existing?.count || 0) + 1,
      villageId: g.village || existing?.villageId || label,
      districtLabel: g.districtLabel,
    });
  }
  const topVillagesUntracked = [...villageUntracked.entries()]
    .map(([village, v]) => ({
      village,
      villageId: v.villageId,
      districtLabel: v.districtLabel,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const enumeratorStats = new Map<
    string,
    { id: string; name: string; district: string; total: number; untracked: number }
  >();
  for (const g of girls) {
    const id = enumeratorIdentityFromSummary(g);
    if (!enumeratorStats.has(id)) {
      enumeratorStats.set(id, {
        id,
        name: g.enumeratorName,
        district: g.districtLabel,
        total: 0,
        untracked: 0,
      });
    }
    const stat = enumeratorStats.get(id)!;
    stat.total += 1;
    if (!g.tracked) stat.untracked += 1;
  }
  const enumeratorUntrackedRate = [...enumeratorStats.values()]
    .map((e) => ({
      id: e.id,
      name: e.name,
      district: e.district,
      rate: e.total > 0 ? (e.untracked / e.total) * 100 : 0,
      untracked: e.untracked,
      total: e.total,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 15);

  const trendMap = new Map<string, Set<string>>();
  const sortedRows = [...rows].sort(
    (a, b) =>
      new Date(a.SubmissionDate || 0).getTime() -
      new Date(b.SubmissionDate || 0).getTime()
  );
  const cumulativeTracked = new Set<string>();
  const trackingTrend: { date: string; count: number }[] = [];

  for (const r of sortedRows) {
    const date = parseDate(r.SubmissionDate || "");
    const dateKey = date
      ? date.toISOString().slice(0, 10)
      : (r.SubmissionDate || "").slice(0, 10);
    if (!dateKey) continue;
    if (isTrackedSubmission(r)) cumulativeTracked.add(girlKey(r));
    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, new Set(cumulativeTracked));
      trackingTrend.push({ date: dateKey, count: cumulativeTracked.size });
    } else {
      const last = trackingTrend[trackingTrend.length - 1];
      if (last.date === dateKey) {
        last.count = cumulativeTracked.size;
      } else {
        trackingTrend.push({ date: dateKey, count: cumulativeTracked.size });
      }
    }
  }

  const dedupedTrend = [...new Map(trackingTrend.map((t) => [t.date, t])).values()];

  const enrolledTracked = trackedGirls.filter(
    (g) => g.enrollstat === "Enrolled"
  ).length;
  const droppedTracked = trackedGirls.filter(
    (g) => g.enrollstat === "Dropped Out"
  ).length;

  const sessionsInData = [
    ...new Set(
      rows
        .map(inferTrackingSession)
        .filter((s): s is TrackingSessionId => s !== null)
    ),
  ].sort();
  const sessions = TRACKING_SESSIONS.filter((s) =>
    sessionsInData.includes(s.value)
  ).map((s) => ({ value: s.value, label: s.label }));

  const dates = rows
    .map((r) => parseDate(r.SubmissionDate || ""))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  const revisit = computeRevisitMetrics(rows, allRows);
  const revisitDetail = computeRevisitDetailMetrics(rows, allRows, {
    includeLists: includeExportLists,
  });
  const duplicateDetail = computeDuplicateDetailMetrics(rows, {
    includeLists: includeExportLists,
  });
  const operationalKpiLists = includeExportLists
    ? computeOperationalKpiLists(
        rows,
        allRows,
        revisitDetail,
        duplicateDetail
      )
    : emptyOperationalKpiLists();

  const districts = districtIds.map((d) => ({
    value: d,
    label: districtLabel(d),
  }));
  const villageOptions = [
    ...new Set(rows.map((r) => resolveVillageLabel(r)).filter(Boolean)),
  ]
    .sort((a, b) => a!.localeCompare(b!))
    .map((v) => ({ value: v!, label: v! }));
  const schoolOptions = [
    ...new Set(rows.map((r) => resolveSchoolLabel(r)).filter(Boolean)),
  ].map((s) => ({ value: s!, label: s! }));
  const enumeratorOptions = buildEnumeratorOptions(rows);

  // Partition every attempted girl into one of two listing years so the two
  // buckets always sum to uniqueGirlsAttempted. A girl is counted as "2024" if
  // any of her submissions resolve to the 2023-2024 session; every other
  // attempted girl (baseline + 2022-2023 new sample) counts as "2023".
  const girls2024 = new Set(
    rows.filter((r) => inferTrackingSession(r) === "2023-2024").map(girlKey)
  ).size;
  const girls2023 = Math.max(0, girls.length - girls2024);

  // A girl counts as untraceable only if her household was never located AND she
  // was never successfully tracked. Girls who were untraceable on one visit but
  // tracked on a revisit are not untraceable, so exclude any girl with a tracked
  // submission. This keeps the KPI consistent with the untracked breakdown.
  const trackedGirlKeys = new Set(
    allRows.filter(isGirlTrackedForMetrics).map(girlKey)
  );
  const houseUntraceableGirls = new Set(
    rows
      .filter((r) => r.house_found === "3" && !trackedGirlKeys.has(girlKey(r)))
      .map(girlKey)
  ).size;
  // Girls whose household had moved (house_found = 2) and who were never
  // successfully tracked. A moved household means the girl is no longer there,
  // so `girl_found`/`consent` are blank - requiring isTrackedSubmission here
  // made this KPI structurally always 0. Mirror the Untraceable HH logic: count
  // moved-household girls unless they were tracked on another visit.
  const familyMovedGirls = new Set(
    rows
      .filter(
        (r) => r.house_found === "2" && !trackedGirlKeys.has(girlKey(r))
      )
      .map(girlKey)
  ).size;

  const locatedRows = rows.filter(
    (r) => r.house_found === "1" || r.house_found === "2"
  );
  const locatedGirlKeys = new Set(locatedRows.map(girlKey));
  const withConsent = new Set(
    locatedRows.filter((r) => r.consent === "1").map(girlKey)
  ).size;
  const consentRate =
    locatedGirlKeys.size > 0 ? (withConsent / locatedGirlKeys.size) * 100 : 0;

  // Incomplete count is girl-outcome aware: once a girl is tracked on any
  // attempt, her earlier incomplete forms are excluded from this KPI.
  const incompleteSubmissions = rows.filter(
    (r) => isIncompleteSubmission(r) && !trackedGirlKeys.has(girlKey(r))
  ).length;

  const duplicateSubmissions = duplicateDetail.totalDuplicates;

  const dataCoverageRate =
    targets.assignmentPool > 0
      ? (girls.length / targets.assignmentPool) * 100
      : 0;
  const avgSubmissionsPerEnumerator =
    enumerators.size > 0 ? rows.length / enumerators.size : 0;
  const avgGirlsPerEnumerator =
    enumerators.size > 0 ? girls.length / enumerators.size : 0;
  const completionRate =
    rows.length > 0
      ? (rows.filter(isSurveyCompleteSubmission).length / rows.length) * 100
      : 0;

  const untrackedBreakdown = computeUntrackedBreakdown(rows, allRows);

  const untrackedReasons = [
    { reason: "Girl not found", count: untrackedBreakdown.girlNotFound },
    { reason: "No consent", count: untrackedBreakdown.noConsent },
    { reason: "House not located", count: untrackedBreakdown.houseNotLocated },
    { reason: "House untraceable", count: untrackedBreakdown.houseUntraceable },
    { reason: "Incomplete survey", count: untrackedBreakdown.incomplete },
  ].filter((r) => r.count > 0);

  const cohortProgress = [
    {
      cohort: "Baseline",
      trackingGroup: "baseline" as TrackingCohort,
      tracked: cohorts.baseline.totalTrackedGirls,
      remaining: cohorts.baseline.remainingToSuccessTarget,
      target: cohorts.baseline.successTarget,
      totalSubmissions: cohorts.baseline.totalSubmissions,
    },
    {
      cohort: "New Sample",
      trackingGroup: "new-sample" as TrackingCohort,
      tracked: cohorts.newSample.totalTrackedGirls,
      remaining: cohorts.newSample.remainingToSuccessTarget,
      target: cohorts.newSample.successTarget,
      totalSubmissions: cohorts.newSample.totalSubmissions,
    },
  ];

  return {
    assignmentPool: targets.assignmentPool,
    successTarget: targets.successTarget,
    girlsToTrack: targets.assignmentPool,
    totalSubmissions: rows.length,
    totalSchools: schools.size,
    totalVillages: villages.size,
    totalEnumerators: enumerators.size,
    totalTrackedGirls: totalTracked,
    remainingToSuccessTarget,
    totalUntrackedGirls: remainingToSuccessTarget,
    untrackedInData: untrackedGirls.length,
    uniqueGirlsInData: girls.length,
    untrackedBreakdown,
    successRate,
    trackingRate: successRate,
    cohorts,
    trackedByDistrict,
    topVillagesUntracked,
    trackingTrend: dedupedTrend,
    primaryAlternate: {
      enrolled: enrolledTracked,
      droppedOut: droppedTracked,
      note: "Enrollment status from listing labels (baseline) or confirmation fields (new sample).",
    },
    enumeratorUntrackedRate,
    untrackedReasons,
    cohortProgress,
    secondaryKpis: {
      uniqueGirlsAttempted: girls.length,
      trackedGirls: totalTracked,
      successRate,
      dataCoverageRate,
      revisitSubmissions: revisit.revisitSubmissions,
      revisitGirls: revisit.revisitGirls,
      revisit2ndSubmissions: revisit.revisit2ndSubmissions,
      revisit3rdSubmissions: revisit.revisit3rdSubmissions,
      girls2ndRevisit: revisit.girls2ndRevisit,
      girls3rdRevisit: revisit.girls3rdRevisit,
      girls2023,
      girls2024,
      houseUntraceableGirls,
      familyMovedGirls,
      consentRate,
      incompleteSubmissions,
      duplicateSubmissions,
      avgSubmissionsPerEnumerator,
      avgGirlsPerEnumerator,
      completionRate,
      girlNotFound: untrackedBreakdown.girlNotFound,
      noConsentGirls: untrackedBreakdown.noConsent,
      attemptedNotTracked: untrackedBreakdown.total,
      houseNotLocatedGirls: untrackedBreakdown.houseNotLocated,
      incompleteGirls: untrackedBreakdown.incomplete,
      locatedGirls: locatedGirlKeys.size,
    },
    revisitDetail,
    duplicateDetail,
    operationalKpiLists,
    filterOptions: {
      districts,
      villages: villageOptions,
      schools: schoolOptions,
      enumerators: enumeratorOptions,
      sessions,
      sessionsUnassigned: rows.filter((r) => !inferTrackingSession(r)).length,
      trackingGroups: TRACKING_GROUPS.map((g) => ({
        value: g.value,
        label: g.label,
      })),
      dateRange: {
        start: dates[0]?.toISOString().slice(0, 10) || "",
        end: dates[dates.length - 1]?.toISOString().slice(0, 10) || "",
      },
    },
    allSubmissions: includeExportLists
      ? rows
          .slice()
          .sort(
            (a, b) =>
              new Date(b.SubmissionDate || 0).getTime() -
              new Date(a.SubmissionDate || 0).getTime()
          )
      : rows,
  };
}

export type TrackingMetrics = ReturnType<typeof computeTrackingMetrics>;

/* -------------------------------------------------------------------------- */
/*  Monitoring module - enumerator performance against daily tracking target  */
/* -------------------------------------------------------------------------- */

export interface EnumeratorPerformance {
  id: string;
  name: string;
  district: string;
  submissions: number;
  uniqueGirls: number;
  trackedGirls: number;
  successRate: number;
  activeDays: number;
  avgGirlsPerDay: number;
  avgTrackedPerDay: number;
  avgSubmissionsPerDay: number;
  dailyTarget: number;
  expectedTracked: number;
  expectedSubmissions: number;
  targetAttainment: number;
  submissionTargetAttainment: number;
  daysMeetingTarget: number;
  onTrack: boolean;
}

export interface DailyMonitoringPoint {
  date: string;
  submissions: number;
  trackedGirls: number;
  activeEnumerators: number;
  expectedTracked: number;
  avgTrackedPerEnumerator: number;
  targetAttainment: number;
}

function submissionDateKey(r: TrackingRow): string {
  const date = parseDate(r.SubmissionDate || "");
  return date
    ? date.toISOString().slice(0, 10)
    : (r.SubmissionDate || "").slice(0, 10);
}

export function computeMonitoringMetrics(
  rows: TrackingRow[],
  dailyTarget = 10
) {
  const target = dailyTarget > 0 ? dailyTarget : 10;

  // ---- Per-enumerator aggregation ----
  const byEnumerator = new Map<string, TrackingRow[]>();
  for (const r of rows) {
    const id = enumeratorIdentityKey(r);
    if (!byEnumerator.has(id)) byEnumerator.set(id, []);
    byEnumerator.get(id)!.push(r);
  }

  let enumeratorDays = 0;
  let enumeratorDaysMeetingTarget = 0;

  const enumeratorPerformance: EnumeratorPerformance[] = [...byEnumerator.entries()]
    .map(([identityKey, subs]) => {
      const uniqueGirls = new Set(subs.map(girlKey)).size;
      const trackedGirls = new Set(
        subs.filter(isTrackedSubmission).map(girlKey)
      ).size;

      // distinct working days, plus tracked girls per day for "meeting target"
      const trackedByDay = new Map<string, Set<string>>();
      const allDays = new Set<string>();
      for (const r of subs) {
        const day = submissionDateKey(r);
        if (!day) continue;
        allDays.add(day);
        if (isTrackedSubmission(r)) {
          if (!trackedByDay.has(day)) trackedByDay.set(day, new Set());
          trackedByDay.get(day)!.add(girlKey(r));
        }
      }
      const activeDays = allDays.size || 1;
      const daysMeetingTarget = [...trackedByDay.values()].filter(
        (set) => set.size >= target
      ).length;

      enumeratorDays += allDays.size;
      enumeratorDaysMeetingTarget += daysMeetingTarget;

      const avgTrackedPerDay = trackedGirls / activeDays;
      const avgSubmissionsPerDay = subs.length / activeDays;
      const expectedTracked = allDays.size * target;
      const expectedSubmissions = allDays.size * target;

      return {
        id: identityKey,
        name: displayEnumeratorName(subs),
        district: districtLabel(
          subs[0]?.district || "",
          subs[0]?.district_label
        ),
        submissions: subs.length,
        uniqueGirls,
        trackedGirls,
        successRate: uniqueGirls > 0 ? (trackedGirls / uniqueGirls) * 100 : 0,
        activeDays: allDays.size,
        avgGirlsPerDay: uniqueGirls / activeDays,
        avgTrackedPerDay,
        avgSubmissionsPerDay,
        dailyTarget: target,
        expectedTracked,
        expectedSubmissions,
        targetAttainment:
          expectedTracked > 0 ? (trackedGirls / expectedTracked) * 100 : 0,
        submissionTargetAttainment:
          expectedSubmissions > 0
            ? (subs.length / expectedSubmissions) * 100
            : 0,
        daysMeetingTarget,
        onTrack: avgTrackedPerDay >= target,
      };
    })
    .sort((a, b) => b.trackedGirls - a.trackedGirls);

  // ---- Daily aggregation ----
  const byDay = new Map<string, TrackingRow[]>();
  for (const r of rows) {
    const day = submissionDateKey(r);
    if (!day) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(r);
  }

  const dailyTrend: DailyMonitoringPoint[] = [...byDay.entries()]
    .map(([date, subs]) => {
      const activeEnumerators = new Set(
        subs.map((r) => enumeratorIdentityKey(r))
      ).size;
      const trackedGirls = new Set(
        subs.filter(isTrackedSubmission).map(girlKey)
      ).size;
      const expectedTracked = activeEnumerators * target;
      return {
        date,
        submissions: subs.length,
        trackedGirls,
        activeEnumerators,
        expectedTracked,
        avgTrackedPerEnumerator:
          activeEnumerators > 0 ? trackedGirls / activeEnumerators : 0,
        targetAttainment:
          expectedTracked > 0 ? (trackedGirls / expectedTracked) * 100 : 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // ---- Headline KPIs ----
  const girls = summarizeByGirl(rows);
  const totalTracked = girls.filter((g) => g.tracked).length;
  const uniqueGirls = girls.length;
  const activeEnumerators = byEnumerator.size;
  const activeFieldDays = byDay.size;
  const expectedTracked = enumeratorDays * target;
  const expectedSubmissions = enumeratorDays * target;

  const topPerformer = enumeratorPerformance[0];
  const lowPerformer = [...enumeratorPerformance]
    .filter((e) => e.activeDays > 0)
    .sort((a, b) => a.avgTrackedPerDay - b.avgTrackedPerDay)[0];

  return {
    dailyTarget: target,
    totalSubmissions: rows.length,
    uniqueGirls,
    totalTracked,
    trackingSuccessRate: uniqueGirls > 0 ? (totalTracked / uniqueGirls) * 100 : 0,
    activeEnumerators,
    activeFieldDays,
    enumeratorDays,
    expectedTracked,
    expectedSubmissions,
    targetAchievement:
      expectedTracked > 0 ? (totalTracked / expectedTracked) * 100 : 0,
    submissionTargetAchievement:
      expectedSubmissions > 0
        ? (rows.length / expectedSubmissions) * 100
        : 0,
    avgGirlsPerEnumeratorPerDay:
      enumeratorDays > 0 ? uniqueGirls / enumeratorDays : 0,
    avgTrackedPerEnumeratorPerDay:
      enumeratorDays > 0 ? totalTracked / enumeratorDays : 0,
    enumeratorDaysMeetingTarget,
    pctDaysMeetingTarget:
      enumeratorDays > 0
        ? (enumeratorDaysMeetingTarget / enumeratorDays) * 100
        : 0,
    enumeratorsOnTrack: enumeratorPerformance.filter((e) => e.onTrack).length,
    topPerformer: topPerformer
      ? { name: topPerformer.name, value: topPerformer.trackedGirls }
      : null,
    lowPerformer: lowPerformer
      ? { name: lowPerformer.name, value: lowPerformer.avgTrackedPerDay }
      : null,
    enumeratorPerformance,
    dailyTrend,
  };
}

export type MonitoringMetrics = ReturnType<typeof computeMonitoringMetrics>;
