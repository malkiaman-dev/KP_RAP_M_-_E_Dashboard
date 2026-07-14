"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, HelpCircle, Timer } from "lucide-react";
import type { ErrorMetrics, ErrorRow } from "@/lib/data/error-metrics";
import { getAnomalyExplanation } from "@/lib/data/error-anomaly";

const PAGE_SIZE = 25;

export function ErrorAnomalyPanel({
  metrics,
  loading,
}: {
  metrics?: ErrorMetrics;
  loading?: boolean;
}) {
  const rows = metrics?.allErrors ?? [];
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | null>(null);

  const byRule = useMemo(() => {
    const map = new Map<
      string,
      { ruleId: string; title: string; count: number }
    >();
    for (const r of rows) {
      const key = r.ruleId || "Unknown";
      if (!map.has(key)) {
        map.set(key, { ruleId: key, title: r.title || key, count: 0 });
      }
      map.get(key)!.count += 1;
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [rows]);

  if (loading) {
    return (
      <div className="mb-6 h-48 animate-pulse rounded-2xl border border-border/60 bg-muted/20" />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-foreground">
        <p className="font-medium text-sky-800 dark:text-sky-200">
          These are not Critical or Quality field errors
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cases here look inconsistent with normal interviewing (for example a
          fully answered Girls form with reading/math items submitted in under
          10 minutes). They may be tablet duration/clock issues. Review the
          explanation before coaching enumerators.
        </p>
      </div>

      {byRule.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byRule.map((r) => {
            const expl = getAnomalyExplanation(r.ruleId);
            return (
              <div
                key={r.ruleId}
                className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {r.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {r.ruleId}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {r.count}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {expl.whyImplausible}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="border-b border-border/60 px-5 py-3">
          <p className="text-sm font-semibold text-foreground">
            Implausible case ledger
          </p>
          <p className="text-xs text-muted-foreground">
            {rows.length.toLocaleString()} cases · expand a row for why it may
            not be a real field error
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
            <Timer className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No implausible/technical cases in the current filter scope.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {rows.slice(0, visible).map((row, idx) => {
              const key = `${row.recordKey}-${row.ruleId}-${idx}`;
              const open = expanded === key;
              const expl = getAnomalyExplanation(row.ruleId);
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : key)}
                    className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-muted/30"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {row.title}
                        </p>
                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                          Implausible
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.survey} · {row.district || "—"} ·{" "}
                        {row.enumeratorName || "—"} · {row.value || "—"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {row.message}
                      </p>
                    </div>
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-border/40 bg-muted/20"
                      >
                        <div className="grid gap-3 px-5 py-4 text-xs sm:grid-cols-3">
                          <ExplainBlock
                            label="Why this may not be possible"
                            text={expl.whyImplausible}
                          />
                          <ExplainBlock
                            label="Likely technical cause"
                            text={expl.likelyCause}
                          />
                          <ExplainBlock
                            label="What to do"
                            text={expl.whatToDo}
                          />
                        </div>
                        <div className="grid gap-2 border-t border-border/40 px-5 py-3 text-xs text-muted-foreground sm:grid-cols-3">
                          <Detail label="Record" value={row.recordKey || "—"} />
                          <Detail label="Field" value={row.field || "—"} />
                          <Detail
                            label="Submitted"
                            value={row.submissionDate || "—"}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {visible < rows.length && (
          <div className="flex items-center justify-center border-t border-border/60 px-5 py-4">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Load more ({(rows.length - visible).toLocaleString()} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExplainBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-1 leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-all font-medium text-foreground">{value}</p>
    </div>
  );
}
