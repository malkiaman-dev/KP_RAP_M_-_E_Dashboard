"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";
import type { FieldErrorAnalytics } from "@/lib/data/field-error-analytics";
import { cn } from "@/lib/utils";

export function FieldErrorAnalyticsPanel({
  analytics,
  loading,
  districtName,
}: {
  analytics?: FieldErrorAnalytics;
  loading?: boolean;
  districtName: string;
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-muted/60" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted/60" />
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const empty = analytics.totalErrors === 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Open errors"
          value={analytics.totalErrors}
          hint={`${districtName} scoped`}
          icon={AlertTriangle}
          tone="amber"
        />
        <MetricTile
          label="Critical"
          value={analytics.criticalErrors}
          hint="Fix these first"
          icon={ShieldAlert}
          tone="red"
        />
        <MetricTile
          label="Quality flags"
          value={analytics.flagErrors}
          hint="Coach and prevent"
          icon={Target}
          tone="gold"
        />
        <MetricTile
          label="Enumerators affected"
          value={analytics.affectedEnumerators}
          hint="Need coaching"
          icon={Users}
          tone="teal"
        />
      </div>

      {empty ? (
        <div className="rounded-2xl border border-teal/25 bg-teal/5 px-5 py-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-teal" />
          <p className="mt-3 font-semibold text-foreground">
            No errors in this district right now
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep verifying phones, roster order, and household linkage on every
            visit.
          </p>
        </div>
      ) : (
        <>
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-teal" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">
                Message for enumerators
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Dear enumerators, please read these points carefully and follow them
              in the field today.
            </p>
            <ol className="space-y-3">
              {analytics.teamChecklist.map((item, index) => (
                <li
                  key={`${index}-${item.slice(0, 24)}`}
                  className="flex gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/15 text-xs font-bold text-teal">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-foreground">{item}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                What to focus on
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Highest-impact rules in {districtName}, with how to avoid them.
              </p>
            </div>
            <div className="space-y-4">
              {analytics.focusRules.map((rule, index) => (
                <article
                  key={rule.ruleId}
                  className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            rule.severity === "CRITICAL"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-amber-500/10 text-amber-700 dark:text-gold"
                          )}
                        >
                          {rule.severity === "CRITICAL" ? "Critical" : "Quality"}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {rule.survey}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-foreground">
                        {rule.title}
                      </h3>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {rule.ruleId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tabular-nums text-foreground">
                        {rule.count.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {rule.shareOfTotal.toFixed(1)}% of district errors
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-0 md:grid-cols-2">
                    <div className="border-b border-border/50 px-5 py-4 md:border-b-0 md:border-r">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        What to focus on
                      </p>
                      <p className="text-sm leading-relaxed text-foreground">
                        {rule.focus}
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal">
                        How to avoid
                      </p>
                      <p className="text-sm leading-relaxed text-foreground">
                        {rule.avoid}
                      </p>
                    </div>
                  </div>

                  {rule.topEnumerators.length > 0 && (
                    <div className="border-t border-border/50 bg-muted/30 px-5 py-3">
                      <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                        Most affected enumerators
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {rule.topEnumerators.map((person) => (
                          <span
                            key={person.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground"
                          >
                            {person.name}
                            <span className="tabular-nums text-muted-foreground">
                              {person.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Enumerator coaching priorities
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lowest quality scores first — each row includes a direct note for
                that enumerator’s main issue.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border/60 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Enumerator</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold">Critical</th>
                      <th className="px-4 py-3 font-semibold">Quality</th>
                      <th className="px-4 py-3 font-semibold">Top issue</th>
                      <th className="px-4 py-3 font-semibold">How to avoid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.focusEnumerators.map((person) => (
                      <tr
                        key={person.id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {person.name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                              person.score >= 90
                                ? "bg-teal/15 text-teal"
                                : person.score >= 75
                                  ? "bg-amber-500/15 text-amber-700 dark:text-gold"
                                  : "bg-red-500/15 text-red-600"
                            )}
                          >
                            {person.score}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-red-600">
                          {person.critical}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {person.flag}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {person.topRuleTitle || "—"}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {person.topRuleId} · {person.topRuleCount}
                          </p>
                        </td>
                        <td className="max-w-xs px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                          {person.tip}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof AlertTriangle;
  tone: "amber" | "red" | "gold" | "teal";
}) {
  const toneClass = {
    amber: "text-amber-600",
    red: "text-red-600",
    gold: "text-amber-600 dark:text-gold",
    teal: "text-teal",
  }[tone];

  return (
    <div className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={cn("h-4 w-4", toneClass)} aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
