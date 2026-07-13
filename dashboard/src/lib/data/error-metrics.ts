import {
  buildEnumeratorFilterOptions,
  displayEnumeratorLabel,
  enumeratorIdentityKey,
  matchesEnumeratorFilter,
} from "./enumerator-identity";

export type ErrorSeverity = "CRITICAL" | "FLAG";

export interface ErrorRow {
  survey: string;
  district: string;
  recordKey: string;
  severity: ErrorSeverity;
  ruleId: string;
  title: string;
  message: string;
  field: string;
  value: string;
  enumeratorName: string;
  enumeratorId: string;
  deviceId: string;
  submissionDate: string;
  createdAt: string;
  /** Live-enriched from Surveys (optional on older payloads). */
  girlName?: string;
  villageName?: string;
  schoolName?: string;
}

export interface ErrorFilters {
  district: string;
  survey: string;
  severity: string;
  enumerator: string;
  ruleId: string;
}

export const defaultErrorFilters: ErrorFilters = {
  district: "all",
  survey: "all",
  severity: "all",
  enumerator: "all",
  ruleId: "all",
};

/** Surveys shown on the Error Report (enumerator-attributable field checks). */
export const ERROR_REPORT_SURVEYS = ["Tracking", "Household", "Girls"] as const;

/**
 * Rules handled elsewhere (revisits) or intentionally not treated as DQA
 * errors (late submit / offline sync). Dropped from the Error Report even if
 * still present in an older Daily_Error_Log.xlsx.
 */
export const ERROR_REPORT_EXCLUDED_RULE_IDS = new Set([
  "TRK_CE_MIN_3_ATTEMPTS",
  "TRK_CE_VISIT_DATE_NOT_SAME_DAY",
]);

const UNASSIGNED = "-";

/** A cross-survey integrity check has no responsible field enumerator. */
export function isEnumeratorAttributable(row: ErrorRow): boolean {
  const name = (row.enumeratorName || "").trim();
  return (
    name !== "" &&
    name !== "-" &&
    name !== "-" &&
    !name.toUpperCase().startsWith("UNASSIGNED")
  );
}

/** A cross-survey rule compares two datasets (e.g. "Tracking vs Household"). */
export function isCrossSurvey(row: ErrorRow): boolean {
  return / vs /i.test(row.survey || "");
}

/**
 * Keep only active single-survey modules for the Error Report:
 * Tracking (baseline + new sample combined in DQA), Household, Girls.
 * Drops Listing / School / Driver, cross-survey " vs " rows, and excluded rules.
 */
export function scopeErrorReportRows(rows: ErrorRow[]): ErrorRow[] {
  const allowed = new Set<string>(ERROR_REPORT_SURVEYS);
  return rows.filter((r) => {
    if (isCrossSurvey(r)) return false;
    if (ERROR_REPORT_EXCLUDED_RULE_IDS.has((r.ruleId || "").trim())) return false;
    return allowed.has((r.survey || "").trim());
  });
}

/** @deprecated Prefer scopeErrorReportRows — kept for callers that only drop cross-survey. */
export function excludeCrossSurveyChecks(rows: ErrorRow[]): ErrorRow[] {
  return rows.filter((r) => !isCrossSurvey(r));
}

/** Toggle filter values from chart clicks - click again to clear. */
export function toggleErrorFilters(
  current: ErrorFilters,
  patch: Partial<ErrorFilters>
): ErrorFilters {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch) as [
    keyof ErrorFilters,
    string,
  ][]) {
    if (!value || value === "all") continue;
    next[key] = current[key] === value ? "all" : value;
  }
  return next;
}

export function applyErrorFilters(
  rows: ErrorRow[],
  filters: ErrorFilters
): ErrorRow[] {
  return rows.filter((r) => {
    if (filters.district !== "all" && r.district !== filters.district)
      return false;
    if (filters.survey !== "all" && r.survey !== filters.survey) return false;
    if (filters.severity !== "all" && r.severity !== filters.severity)
      return false;
    if (filters.ruleId !== "all" && r.ruleId !== filters.ruleId) return false;
    if (filters.enumerator !== "all") {
      if (filters.enumerator === UNASSIGNED) {
        if (isEnumeratorAttributable(r)) return false;
      } else if (
        !matchesEnumeratorFilter(
          {
            enumerator_id: r.enumeratorId,
            enumerator_name: r.enumeratorName,
          },
          filters.enumerator
        )
      ) {
        return false;
      }
    }
    return true;
  });
}

/** Restrict error rows to a district field account's district. */
export function scopeErrorsToDistrict(
  rows: ErrorRow[],
  district: string
): ErrorRow[] {
  return rows.filter((r) => r.district === district);
}

function rate(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

/**
 * Enumerator data-quality score.
 *
 * Starts at 100 and deducts points per attributable error, weighting critical
 * errors more heavily than quality flags. Clamped to [0, 100].
 *
 *   score = 100 − (critical × 4) − (flag × 1.5)
 */
function qualityScore(critical: number, flag: number): number {
  return Math.max(0, Math.round(100 - critical * 4 - flag * 1.5));
}

export function computeErrorMetrics(rows: ErrorRow[]) {
  const totalErrors = rows.length;
  const criticalErrors = rows.filter((r) => r.severity === "CRITICAL").length;
  const flagErrors = rows.filter((r) => r.severity === "FLAG").length;

  const attributable = rows.filter(isEnumeratorAttributable);
  const enumeratorErrors = attributable.length;
  const enumeratorCriticalErrors = attributable.filter(
    (r) => r.severity === "CRITICAL"
  ).length;

  const affectedEnumerators = new Set(
    attributable
      .map((r) =>
        enumeratorIdentityKey({
          enumerator_id: r.enumeratorId,
          enumerator_name: r.enumeratorName,
        })
      )
      .filter((id) => id && id !== "unknown")
  ).size;
  const affectedDistricts = new Set(
    rows.map((r) => r.district).filter(Boolean)
  ).size;
  const ruleTypes = new Set(rows.map((r) => r.ruleId).filter(Boolean)).size;
  const affectedDevices = new Set(
    rows.map((r) => r.deviceId).filter(Boolean)
  ).size;

  // ---- Severity donut ----
  const severityBreakdown = [
    { name: "Critical", value: criticalErrors, color: "#EF4444" },
    { name: "Quality", value: flagErrors, color: "#EDCA5C" },
  ].filter((d) => d.value > 0);

  // ---- By survey (stacked critical / flag) ----
  const surveyMap = new Map<string, { critical: number; flag: number }>();
  for (const r of rows) {
    const key = r.survey || "Unknown";
    if (!surveyMap.has(key)) surveyMap.set(key, { critical: 0, flag: 0 });
    const e = surveyMap.get(key)!;
    if (r.severity === "CRITICAL") e.critical += 1;
    else e.flag += 1;
  }
  const bySurvey = [...surveyMap.entries()]
    .map(([survey, v]) => ({
      survey,
      critical: v.critical,
      flag: v.flag,
      total: v.critical + v.flag,
    }))
    .sort((a, b) => b.total - a.total);

  // ---- By district (stacked critical / flag) ----
  const districtMap = new Map<string, { critical: number; flag: number }>();
  for (const r of rows) {
    const key = r.district || "Unknown";
    if (!districtMap.has(key)) districtMap.set(key, { critical: 0, flag: 0 });
    const e = districtMap.get(key)!;
    if (r.severity === "CRITICAL") e.critical += 1;
    else e.flag += 1;
  }
  const byDistrict = [...districtMap.entries()]
    .map(([district, v]) => ({
      district,
      critical: v.critical,
      flag: v.flag,
      total: v.critical + v.flag,
    }))
    .sort((a, b) => b.total - a.total);

  // ---- Top rules by severity ----
  const ruleAgg = (severity: ErrorSeverity) => {
    const map = new Map<string, { ruleId: string; title: string; count: number }>();
    for (const r of rows) {
      if (r.severity !== severity) continue;
      const key = r.ruleId || "Unknown";
      if (!map.has(key)) {
        map.set(key, { ruleId: key, title: r.title || key, count: 0 });
      }
      map.get(key)!.count += 1;
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  };
  const topCriticalRules = ruleAgg("CRITICAL");
  const topQualityRules = ruleAgg("FLAG");

  // ---- Per-enumerator aggregation (named enumerators only) ----
  // `id` is the identity slug used by filters; `name` is the display label.
  const enumMap = new Map<
    string,
    { id: string; name: string; district: string; critical: number; flag: number }
  >();
  for (const r of attributable) {
    const key = enumeratorIdentityKey({
      enumerator_id: r.enumeratorId,
      enumerator_name: r.enumeratorName,
    });
    if (!key || key === "unknown") continue;
    if (!enumMap.has(key)) {
      enumMap.set(key, {
        id: key,
        name: displayEnumeratorLabel(key),
        district: r.district,
        critical: 0,
        flag: 0,
      });
    }
    const e = enumMap.get(key)!;
    if (r.severity === "CRITICAL") e.critical += 1;
    else e.flag += 1;
  }
  const enumerators = [...enumMap.values()].map((e) => ({
    ...e,
    total: e.critical + e.flag,
    score: qualityScore(e.critical, e.flag),
  }));

  const enumeratorCritical = enumerators
    .filter((e) => e.critical > 0)
    .sort((a, b) => b.critical - a.critical)
    .slice(0, 15)
    .map((e) => ({
      id: e.id,
      name: e.name,
      district: e.district,
      count: e.critical,
    }));

  // Lowest scores first = enumerators needing the most attention.
  const enumeratorQuality = [...enumerators]
    .sort((a, b) => a.score - b.score || b.total - a.total)
    .slice(0, 15)
    .map((e) => ({
      id: e.id,
      name: e.name,
      district: e.district,
      score: e.score,
      critical: e.critical,
      flag: e.flag,
      total: e.total,
    }));

  // ---- Filter options (computed from whatever set is passed) ----
  const districts = [...new Set(rows.map((r) => r.district).filter(Boolean))]
    .sort()
    .map((d) => ({ value: d, label: d }));
  const surveys = [...new Set(rows.map((r) => r.survey).filter(Boolean))]
    .sort()
    .map((s) => ({ value: s, label: s }));
  const enumeratorOptions = buildEnumeratorFilterOptions(
    attributable.map((r) => ({
      enumerator_id: r.enumeratorId,
      enumerator_name: r.enumeratorName,
    }))
  );

  return {
    totalErrors,
    criticalErrors,
    flagErrors,
    criticalRate: rate(criticalErrors, totalErrors),
    qualityRate: rate(flagErrors, totalErrors),
    enumeratorErrors,
    enumeratorCriticalErrors,
    enumeratorErrorRate: rate(enumeratorCriticalErrors, enumeratorErrors),
    affectedEnumerators,
    affectedDistricts,
    affectedDevices,
    ruleTypes,
    severityBreakdown,
    bySurvey,
    byDistrict,
    topCriticalRules,
    topQualityRules,
    enumeratorCritical,
    enumeratorQuality,
    allErrors: rows,
    filterOptions: {
      districts,
      surveys,
      enumerators: enumeratorOptions,
      severities: [
        { value: "CRITICAL", label: "Critical" },
        { value: "FLAG", label: "Quality" },
      ],
    },
  };
}

export type ErrorMetrics = ReturnType<typeof computeErrorMetrics>;
