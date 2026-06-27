import { DEFAULT_TRACKING_TARGETS } from "./protocol";

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
  school_label?: string;
  new_school_label?: string;
  school?: string;
  house_found?: string;
  girl_found?: string;
  girl_found_confirm_enrolled?: string;
  girl_found_confirm_dropped?: string;
  consent?: string;
  survey_status?: string;
  visit_num?: string;
  enrollstat_label?: string;
  formdef_version?: string;
  cohort?: TrackingCohort;
  /** Academic session — independent of baseline / new-sample group */
  session?: TrackingSessionId;
  /** Raw SurveyCTO batch field (1 = 2022–2023, 2 = 2023–2024) */
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
};

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

/** Toggle filter values from chart clicks — click again to clear. */
export function toggleTrackingFilters(
  current: TrackingFilters,
  patch: Partial<TrackingFilters>
): TrackingFilters {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch) as [
    keyof TrackingFilters,
    string | undefined,
  ][]) {
    if (value === undefined) continue;
    const isDate = key === "dateFrom" || key === "dateTo";
    const empty = isDate ? "" : "all";
    if (!value || value === empty) continue;
    next[key] = current[key] === value ? empty : value;
  }
  return next;
}

function untrackedGirlKeysForReason(
  rows: TrackingRow[],
  reason: UntrackedReasonKey
): Set<string> {
  const map = new Map<string, TrackingRow[]>();
  for (const r of rows) {
    const key = girlKey(r);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  const result = new Set<string>();
  for (const [key, subs] of map) {
    if (subs.some(isTrackedSubmission)) continue;
    if (classifyUntrackedGirl(subs) === reason) result.add(key);
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

function resolveSchoolLabel(row: TrackingRow): string | undefined {
  const label = row.school_label || row.new_school_label;
  if (label?.trim()) return label.trim();
  const school = String(row.school || "").trim();
  if (school && !/^\d+$/.test(school)) return school;
  return undefined;
}

/**
 * Unified village identifier (the village name).
 *
 * Baseline exports put a numeric code in `village` and the name in
 * `village_label`; the new-sample export has no `village` column at all, only
 * `village_label`. So the only field present in both is the name — use it as the
 * single village key for filters, summaries and the village chart.
 */
function resolveVillageLabel(row: TrackingRow): string | undefined {
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

function girlKey(r: TrackingRow): string {
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

function isConsentStepReached(row: TrackingRow): boolean {
  if (row.girl_found !== "1") return false;
  if (row.girl_found_confirm_enrolled === "1") return true;
  if (row.girl_found_confirm_enrolled === "2") return false;
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
  if (subs.some((r) => r.house_found === "3")) return "houseUntraceable";

  const hasLocated = subs.some(
    (r) => r.house_found === "1" || r.house_found === "2"
  );
  if (!hasLocated) return "houseNotLocated";

  const girlFound = subs.some(
    (r) =>
      (r.house_found === "1" || r.house_found === "2") && r.girl_found === "1"
  );
  if (!girlFound) return "girlNotFound";

  const consentStepReached = subs.some(
    (r) =>
      (r.house_found === "1" || r.house_found === "2") &&
      isConsentStepReached(r)
  );
  if (!consentStepReached) return "incomplete";

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

function computeUntrackedBreakdown(rows: TrackingRow[]): UntrackedBreakdown {
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

  for (const [, subs] of map) {
    if (subs.some(isTrackedSubmission)) continue;
    breakdown.total += 1;
    breakdown[classifyUntrackedGirl(subs)] += 1;
  }

  return breakdown;
}

export function isTrackedSubmission(r: TrackingRow): boolean {
  return (
    (r.house_found === "1" || r.house_found === "2") &&
    r.girl_found === "1" &&
    r.consent === "1" &&
    r.survey_status === "1"
  );
}

function parseVisitNum(row: TrackingRow): number {
  const n = Number(row.visit_num);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function chronologicalGirlSubmissions(
  allRows: TrackingRow[],
  girl: string
): TrackingRow[] {
  return allRows
    .filter((r) => girlKey(r) === girl)
    .sort((a, b) => {
      const da = parseDate(a.SubmissionDate || "")?.getTime() ?? 0;
      const db = parseDate(b.SubmissionDate || "")?.getTime() ?? 0;
      if (da !== db) return da - db;
      return parseVisitNum(a) - parseVisitNum(b);
    });
}

/**
 * Tracking-stage revisit rule (KPRAP Tracking Survey Field Protocol §2 & §3).
 *
 * A revisit is required ONLY when:
 *   - the household structure was successfully located (`house_found = 1`); AND
 *   - the respondent was temporarily unavailable (`girl_found !== 1`); AND
 *   - the case is not already completed and consent was not refused.
 *
 * No revisit is required for (each marked Incomplete by the protocol):
 *   - structure not found (`house_found = 3`)            -> Case 3
 *   - family permanently moved (`house_found = 2`)       -> Case 5
 *   - consent refused (`consent = 0` or `2`)             -> Case 4
 *   - case already completed                             -> Case 1
 *
 * Maximum of two revisits (visit_num 2 and 3) is enforced by the callers.
 */
function priorAttemptRequiresRevisit(row: TrackingRow): boolean {
  // Case 1: completed survey -> no revisit.
  if (isTrackedSubmission(row)) return false;
  // Case 3 & 5: structure not located (not found = 3) or moved (= 2) -> no revisit.
  if (row.house_found !== "1") return false;
  // Case 4: respondent refused consent -> Incomplete, no revisit.
  if (row.consent === "0" || row.consent === "2") return false;
  // Case 2: structure located but respondent temporarily unavailable -> revisit.
  return row.girl_found !== "1";
}

/**
 * Actual follow-up attempt: visit_num 2 or 3 after a prior visit when the girl
 * was not yet tracked and the household was not closed as untraceable.
 */
export function isActualRevisitSubmission(
  submission: TrackingRow,
  allRows: TrackingRow[]
): boolean {
  const visit = parseVisitNum(submission);
  if (visit !== 2 && visit !== 3) return false;

  const subs = chronologicalGirlSubmissions(allRows, girlKey(submission));
  const idx = subs.findIndex((r) => r.KEY === submission.KEY);
  if (idx <= 0) return false;

  const before = subs.slice(0, idx);
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
  const actual = filteredRows.filter((r) =>
    isActualRevisitSubmission(r, allRows)
  );
  const second = actual.filter((r) => parseVisitNum(r) === 2);
  const third = actual.filter((r) => parseVisitNum(r) === 3);

  return {
    revisitSubmissions: actual.length,
    revisitGirls: new Set(actual.map(girlKey)).size,
    revisit2ndSubmissions: second.length,
    revisit3rdSubmissions: third.length,
    girls2ndRevisit: new Set(second.map(girlKey)).size,
    girls3rdRevisit: new Set(third.map(girlKey)).size,
  };
}

export interface RevisitDetailMetrics {
  /** Girls still needing a 2nd or 3rd attempt (mutually exclusive per girl) */
  revisitsNeedToBeDone: number;
  /** 1st visit failed (temporarily not located); 2nd visit not yet done */
  revisitsNeed2nd: number;
  /** 2nd visit done but still not located; 3rd visit not yet done */
  revisitsNeed3rd: number;
  girls2ndRevisited: number;
  girls3rdRevisited: number;
  girlsTrackedOn2ndRevisit: number;
  girlsTrackedOn3rdRevisit: number;
  girlsNotTrackedOn2ndRevisit: number;
  girlsNotTrackedOn3rdRevisit: number;
  totalRevisitedGirls: number;
}

export type RevisitDetailMetricKey = keyof RevisitDetailMetrics;

export interface RevisitGirlExportRow {
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
  houseFound: string;
  girlFound: string;
  consent: string;
  surveyStatus: string;
  revisitCategory: string;
}

export interface RevisitDetailData extends RevisitDetailMetrics {
  lists: Record<RevisitDetailMetricKey, RevisitGirlExportRow[]>;
}

function emptyRevisitLists(): Record<
  RevisitDetailMetricKey,
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
  if (v === "1") return "Located";
  if (v === "2") return "Family moved";
  if (v === "3") return "Untraceable";
  return v?.trim() || "";
}

function girlFoundLabel(v?: string): string {
  if (v === "1") return "Found";
  if (v === "0") return "Not found";
  return v?.trim() || "";
}

function toRevisitExportRow(
  row: TrackingRow,
  revisitCategory: string
): RevisitGirlExportRow {
  const cohort = inferTrackingCohort(row);
  const session = inferTrackingSession(row);
  return {
    girlId: girlKey(row),
    girlName: (row.girlname_label || "").trim(),
    district: districtLabel(row.district, row.district_label),
    village: resolveVillageLabel(row) || "",
    school: resolveSchoolLabel(row) || "",
    enumeratorId: (row.enumerator_id || "").trim(),
    enumeratorName: cleanEnumeratorName(row.enumerator_name),
    trackingGroup: cohort === "baseline" ? "Baseline" : "New Sample",
    session: session || "",
    submissionDate: (row.SubmissionDate || "").trim(),
    visitNum: String(parseVisitNum(row)),
    houseFound: houseFoundLabel(row.house_found),
    girlFound: girlFoundLabel(row.girl_found),
    consent: row.consent?.trim() || "",
    surveyStatus: row.survey_status?.trim() || "",
    revisitCategory,
  };
}

function girlEverTracked(subs: TrackingRow[]): boolean {
  return subs.some(isTrackedSubmission);
}

function latestActualRevisitSubmission(
  subs: TrackingRow[],
  allRows: TrackingRow[],
  visit: 2 | 3
): TrackingRow | undefined {
  const matches = subs.filter(
    (r) => parseVisitNum(r) === visit && isActualRevisitSubmission(r, allRows)
  );
  return matches[matches.length - 1];
}

function firstVisitSubmission(subs: TrackingRow[]): TrackingRow | undefined {
  const firstAttempts = subs.filter((r) => parseVisitNum(r) === 1);
  return firstAttempts[0] ?? subs[0];
}

function girlStillNeeds2nd(subs: TrackingRow[], allRows: TrackingRow[]): boolean {
  if (girlEverTracked(subs)) return false;
  if (latestActualRevisitSubmission(subs, allRows, 2)) return false;
  const first = firstVisitSubmission(subs);
  if (!first) return false;
  return priorAttemptRequiresRevisit(first);
}

function girlStillNeeds3rd(subs: TrackingRow[], allRows: TrackingRow[]): boolean {
  if (girlEverTracked(subs)) return false;
  if (latestActualRevisitSubmission(subs, allRows, 3)) return false;
  const second = latestActualRevisitSubmission(subs, allRows, 2);
  if (!second) return false;
  return priorAttemptRequiresRevisit(second);
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
  allRows: TrackingRow[] = filteredRows
): RevisitDetailData {
  const attemptedGirls = [...new Set(filteredRows.map(girlKey))];
  const lists = emptyRevisitLists();
  const revisitedGirlRows = new Map<string, RevisitGirlExportRow>();

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
    const inFilter = filteredRows.some((r) => girlKey(r) === girl);

    if (!inFilter) continue;

    const pending = girlPendingRevisit(subs, allRows);
    if (pending === "2nd") {
      revisitsNeed2nd += 1;
      const row = firstVisitSubmission(subs) ?? subs[subs.length - 1]!;
      const exportRow = toRevisitExportRow(row, "2nd attempt still needed");
      lists.revisitsNeed2nd.push(exportRow);
      lists.revisitsNeedToBeDone.push(exportRow);
    } else if (pending === "3rd") {
      revisitsNeed3rd += 1;
      const second = latestActualRevisitSubmission(subs, allRows, 2)!;
      const exportRow = toRevisitExportRow(second, "3rd attempt still needed");
      lists.revisitsNeed3rd.push(exportRow);
      lists.revisitsNeedToBeDone.push(exportRow);
    }

    const second = latestActualRevisitSubmission(subs, allRows, 2);
    const third = latestActualRevisitSubmission(subs, allRows, 3);
    const hasSecondInFilter =
      second && filteredRows.some((r) => r.KEY === second.KEY);
    const hasThirdInFilter =
      third && filteredRows.some((r) => r.KEY === third.KEY);

    if (hasSecondInFilter) {
      girls2ndRevisited += 1;
      const exportRow = toRevisitExportRow(second!, "2nd revisit");
      lists.girls2ndRevisited.push(exportRow);
      if (isTrackedSubmission(second!)) {
        girlsTrackedOn2ndRevisit += 1;
        lists.girlsTrackedOn2ndRevisit.push(exportRow);
      } else {
        girlsNotTrackedOn2ndRevisit += 1;
        lists.girlsNotTrackedOn2ndRevisit.push(exportRow);
      }
      revisitedGirlRows.set(girl, exportRow);
    }

    if (hasThirdInFilter) {
      girls3rdRevisited += 1;
      const exportRow = toRevisitExportRow(third!, "3rd revisit");
      lists.girls3rdRevisited.push(exportRow);
      if (isTrackedSubmission(third!)) {
        girlsTrackedOn3rdRevisit += 1;
        lists.girlsTrackedOn3rdRevisit.push(exportRow);
      } else {
        girlsNotTrackedOn3rdRevisit += 1;
        lists.girlsNotTrackedOn3rdRevisit.push(exportRow);
      }
      revisitedGirlRows.set(girl, exportRow);
    }

    if (hasSecondInFilter || hasThirdInFilter) totalRevisitedGirls += 1;
  }

  lists.totalRevisitedGirls = [...revisitedGirlRows.values()];

  return {
    revisitsNeedToBeDone: revisitsNeed2nd + revisitsNeed3rd,
    revisitsNeed2nd,
    revisitsNeed3rd,
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

/** @deprecated Use TrackingSessionId */
export type TrackingBatchId = TrackingSessionId;

export const TRACKING_SESSIONS = [
  { value: "2022-2023", label: "2022–2023" },
  { value: "2023-2024", label: "2023–2024" },
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
    if (filters.enumerator !== "all" && r.enumerator_id !== filters.enumerator)
      return false;
    if (filters.village !== "all" && resolveVillageLabel(r) !== filters.village)
      return false;
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

function summarizeByGirl(rows: TrackingRow[]): GirlSummary[] {
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
      tracked: subs.some(isTrackedSubmission),
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
  successTarget: number
): CohortMetrics {
  const cohortRows = rows.filter((r) => inferTrackingCohort(r) === cohort);
  const girls = summarizeByGirl(cohortRows);
  const trackedGirls = girls.filter((g) => g.tracked);
  const untrackedGirls = girls.filter((g) => !g.tracked);
  const totalTracked = trackedGirls.length;
  const untrackedBreakdown = computeUntrackedBreakdown(cohortRows);
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

export function computeTrackingMetrics(
  rows: TrackingRow[],
  targets: TrackingTargets = DEFAULT_TRACKING_TARGETS,
  allRows: TrackingRow[] = rows
) {
  const girls = summarizeByGirl(rows);
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
      targets.baselineSuccessTarget
    ),
    newSample: computeCohortMetrics(
      rows,
      "new-sample",
      "New Sample Tracking",
      targets.newSampleAssignment,
      targets.newSampleSuccessTarget
    ),
  };

  const villages = new Set(
    rows.map((r) => resolveVillageLabel(r)).filter(Boolean)
  );
  const schools = new Set(
    rows.map((r) => resolveSchoolLabel(r)).filter(Boolean)
  );
  const enumerators = new Set(
    rows.map((r) => r.enumerator_id).filter(Boolean)
  );

  const districtIds = [...new Set(girls.map((g) => g.district).filter(Boolean))];
  const districtShare = (d: string) => {
    const inDistrict = girls.filter((g) => g.district === d).length;
    return girls.length > 0 ? inDistrict / girls.length : 0;
  };

  const trackedByDistrict = districtIds.map((d) => {
    const districtGirls = girls.filter((g) => g.district === d);
    const tracked = districtGirls.filter((g) => g.tracked).length;
    // Proportional slice of the protocol pool — informational reference only.
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
    };
  });

  const villageUntracked = new Map<
    string,
    { count: number; villageId: string }
  >();
  for (const g of untrackedGirls) {
    const label = g.villageLabel;
    const existing = villageUntracked.get(label);
    villageUntracked.set(label, {
      count: (existing?.count || 0) + 1,
      villageId: g.village || existing?.villageId || label,
    });
  }
  const topVillagesUntracked = [...villageUntracked.entries()]
    .map(([village, v]) => ({
      village,
      villageId: v.villageId,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const enumeratorStats = new Map<
    string,
    { id: string; name: string; district: string; total: number; untracked: number }
  >();
  for (const g of girls) {
    const id = g.enumeratorId || g.enumeratorName;
    if (!enumeratorStats.has(id)) {
      enumeratorStats.set(id, {
        id: g.enumeratorId || id,
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
  const revisitDetail = computeRevisitDetailMetrics(rows, allRows);

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
  const enumeratorOptions = [
    ...new Map(
      rows.map((r) => [
        r.enumerator_id || "",
        {
          value: r.enumerator_id || "",
          label: cleanEnumeratorName(r.enumerator_name),
        },
      ])
    ).values(),
  ].filter((e) => e.value);

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
    rows.filter(isTrackedSubmission).map(girlKey)
  );
  const houseUntraceableGirls = new Set(
    rows
      .filter((r) => r.house_found === "3" && !trackedGirlKeys.has(girlKey(r)))
      .map(girlKey)
  ).size;
  // Girls whose household had moved (house_found = 2) and who were never
  // successfully tracked. A moved household means the girl is no longer there,
  // so `girl_found`/`consent` are blank — requiring isTrackedSubmission here
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

  const incompleteSubmissions = rows.filter(
    (r) => r.survey_status === "2" || r.survey_status === "99"
  ).length;

  const visitGroups = new Map<string, number>();
  for (const r of rows) {
    const k = `${girlKey(r)}_${r.visit_num || "1"}`;
    visitGroups.set(k, (visitGroups.get(k) || 0) + 1);
  }
  const duplicateSubmissions = [...visitGroups.values()].filter((c) => c > 1).length;

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
      ? (rows.filter((r) => r.survey_status === "1").length / rows.length) * 100
      : 0;

  const untrackedBreakdown = computeUntrackedBreakdown(rows);

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
    },
    {
      cohort: "New Sample",
      trackingGroup: "new-sample" as TrackingCohort,
      tracked: cohorts.newSample.totalTrackedGirls,
      remaining: cohorts.newSample.remainingToSuccessTarget,
      target: cohorts.newSample.successTarget,
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
    allSubmissions: rows
      .slice()
      .sort(
        (a, b) =>
          new Date(b.SubmissionDate || 0).getTime() -
          new Date(a.SubmissionDate || 0).getTime()
      ),
  };
}

export type TrackingMetrics = ReturnType<typeof computeTrackingMetrics>;

/* -------------------------------------------------------------------------- */
/*  Monitoring module — enumerator performance against daily tracking target  */
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
    const id = r.enumerator_id || r.enumerator_name || "unknown";
    if (!byEnumerator.has(id)) byEnumerator.set(id, []);
    byEnumerator.get(id)!.push(r);
  }

  let enumeratorDays = 0;
  let enumeratorDaysMeetingTarget = 0;

  const enumeratorPerformance: EnumeratorPerformance[] = [...byEnumerator.entries()]
    .map(([id, subs]) => {
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
        id,
        name: cleanEnumeratorName(subs[0]?.enumerator_name) || id,
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
        subs.map((r) => r.enumerator_id || r.enumerator_name || "unknown")
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
    targetAchievement:
      expectedTracked > 0 ? (totalTracked / expectedTracked) * 100 : 0,
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
