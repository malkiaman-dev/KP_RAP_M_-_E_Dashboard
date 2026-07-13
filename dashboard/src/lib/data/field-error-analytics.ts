import { getRuleGuidance } from "./error-guidance";
import {
  isEnumeratorAttributable,
  type ErrorMetrics,
  type ErrorRow,
  type ErrorSeverity,
} from "./error-metrics";
import {
  displayEnumeratorLabel,
  enumeratorIdentityKey,
} from "./enumerator-identity";

export interface FocusRuleInsight {
  ruleId: string;
  title: string;
  severity: ErrorSeverity;
  count: number;
  shareOfTotal: number;
  survey: string;
  focus: string;
  avoid: string;
  topEnumerators: { id: string; name: string; count: number }[];
}

export interface EnumeratorFocusInsight {
  id: string;
  name: string;
  critical: number;
  flag: number;
  total: number;
  score: number;
  topRuleId: string;
  topRuleTitle: string;
  topRuleCount: number;
  tip: string;
}

export interface FieldErrorAnalytics {
  totalErrors: number;
  criticalErrors: number;
  flagErrors: number;
  affectedEnumerators: number;
  /** Top rules to coach on this week (critical first, then volume). */
  focusRules: FocusRuleInsight[];
  /** Enumerators needing the most coaching. */
  focusEnumerators: EnumeratorFocusInsight[];
  /** Short team checklist derived from top issues. */
  teamChecklist: string[];
}

function rate(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

function qualityScore(critical: number, flag: number): number {
  return Math.max(0, Math.round(100 - critical * 4 - flag * 1.5));
}

/**
 * Build coaching-oriented analytics from district-scoped error rows / metrics.
 */
export function computeFieldErrorAnalytics(
  rows: ErrorRow[],
  metrics?: ErrorMetrics
): FieldErrorAnalytics {
  const totalErrors = rows.length;
  const criticalErrors = rows.filter((r) => r.severity === "CRITICAL").length;
  const flagErrors = rows.filter((r) => r.severity === "FLAG").length;

  const attributable = rows.filter(isEnumeratorAttributable);
  const affectedEnumerators =
    metrics?.affectedEnumerators ??
    new Set(
      attributable
        .map((r) =>
          enumeratorIdentityKey({
            enumerator_id: r.enumeratorId,
            enumerator_name: r.enumeratorName,
          })
        )
        .filter((id) => id && id !== "unknown")
    ).size;

  // Aggregate by rule
  const ruleMap = new Map<
    string,
    {
      ruleId: string;
      title: string;
      severity: ErrorSeverity;
      count: number;
      critical: number;
      surveys: Map<string, number>;
      enums: Map<string, number>;
    }
  >();

  for (const r of rows) {
    const ruleId = r.ruleId || "Unknown";
    if (!ruleMap.has(ruleId)) {
      ruleMap.set(ruleId, {
        ruleId,
        title: r.title || ruleId,
        severity: r.severity,
        count: 0,
        critical: 0,
        surveys: new Map(),
        enums: new Map(),
      });
    }
    const entry = ruleMap.get(ruleId)!;
    entry.count += 1;
    if (r.severity === "CRITICAL") {
      entry.critical += 1;
      entry.severity = "CRITICAL";
    }
    if (r.title) entry.title = r.title;
    const survey = r.survey || "Unknown";
    entry.surveys.set(survey, (entry.surveys.get(survey) ?? 0) + 1);

    if (isEnumeratorAttributable(r)) {
      const eid = enumeratorIdentityKey({
        enumerator_id: r.enumeratorId,
        enumerator_name: r.enumeratorName,
      });
      if (eid && eid !== "unknown") {
        entry.enums.set(eid, (entry.enums.get(eid) ?? 0) + 1);
      }
    }
  }

  const focusRules: FocusRuleInsight[] = [...ruleMap.values()]
    .sort(
      (a, b) =>
        b.critical - a.critical ||
        b.count - a.count ||
        a.ruleId.localeCompare(b.ruleId)
    )
    .slice(0, 8)
    .map((entry) => {
      const guidance = getRuleGuidance(entry.ruleId);
      const topSurvey =
        [...entry.surveys.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "—";
      const topEnumerators = [...entry.enums.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({
          id,
          name: displayEnumeratorLabel(id),
          count,
        }));

      return {
        ruleId: entry.ruleId,
        title: entry.title,
        severity: entry.severity,
        count: entry.count,
        shareOfTotal: rate(entry.count, totalErrors),
        survey: topSurvey,
        focus: guidance.focus,
        avoid: guidance.avoid,
        topEnumerators,
      };
    });

  // Per-enumerator coaching targets
  const enumMap = new Map<
    string,
    {
      id: string;
      critical: number;
      flag: number;
      rules: Map<string, { title: string; count: number }>;
    }
  >();

  for (const r of attributable) {
    const id = enumeratorIdentityKey({
      enumerator_id: r.enumeratorId,
      enumerator_name: r.enumeratorName,
    });
    if (!id || id === "unknown") continue;
    if (!enumMap.has(id)) {
      enumMap.set(id, { id, critical: 0, flag: 0, rules: new Map() });
    }
    const e = enumMap.get(id)!;
    if (r.severity === "CRITICAL") e.critical += 1;
    else e.flag += 1;
    const rid = r.ruleId || "Unknown";
    if (!e.rules.has(rid)) {
      e.rules.set(rid, { title: r.title || rid, count: 0 });
    }
    const rule = e.rules.get(rid)!;
    rule.count += 1;
    if (r.title) rule.title = r.title;
  }

  const focusEnumerators: EnumeratorFocusInsight[] = [...enumMap.values()]
    .map((e) => {
      const total = e.critical + e.flag;
      const top = [...e.rules.entries()].sort(
        (a, b) => b[1].count - a[1].count
      )[0];
      const topRuleId = top?.[0] ?? "";
      const topRuleTitle = top?.[1].title ?? "";
      const topRuleCount = top?.[1].count ?? 0;
      const tip = topRuleId
        ? getRuleGuidance(topRuleId).avoid
        : "Review their open critical errors with them before the next field day.";

      return {
        id: e.id,
        name: displayEnumeratorLabel(e.id),
        critical: e.critical,
        flag: e.flag,
        total,
        score: qualityScore(e.critical, e.flag),
        topRuleId,
        topRuleTitle,
        topRuleCount,
        tip,
      };
    })
    .sort((a, b) => a.score - b.score || b.critical - a.critical || b.total - a.total)
    .slice(0, 10);

  const teamChecklist = buildTeamChecklist(focusRules);

  return {
    totalErrors,
    criticalErrors,
    flagErrors,
    affectedEnumerators,
    focusRules,
    focusEnumerators,
    teamChecklist,
  };
}

function buildTeamChecklist(focusRules: FocusRuleInsight[]): string[] {
  const items: string[] = [];
  const seen = new Set<string>();

  for (const rule of focusRules.slice(0, 5)) {
    const line = rule.avoid;
    const key = line.slice(0, 48).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(line);
  }

  if (items.length === 0) {
    items.push(
      "No open errors in scope — keep verifying phones, roster order, and HH linkage on every visit."
    );
  }

  return items.slice(0, 5);
}
