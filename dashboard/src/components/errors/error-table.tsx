"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, ShieldAlert, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ErrorMetrics, ErrorRow } from "@/lib/data/error-metrics";

const PAGE_SIZE = 50;

export function ErrorTable({
  metrics,
  loading,
}: {
  metrics?: ErrorMetrics;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const rows = useMemo(() => {
    const data = metrics?.allErrors ?? [];
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.ruleId.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        e.enumeratorName.toLowerCase().includes(q) ||
        e.survey.toLowerCase().includes(q) ||
        e.district.toLowerCase().includes(q)
    );
  }, [metrics, query]);

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-muted/50" />;
  }

  if (!metrics) return null;

  const shown = rows.slice(0, visible);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Error Detail Log</h3>
          <p className="text-[11px] text-muted-foreground">
            Showing {shown.length.toLocaleString()} of {rows.length.toLocaleString()} issues
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Search rule, title, enumerator…"
            className="w-full rounded-lg border border-border/60 bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-teal sm:w-72"
            aria-label="Search errors"
          />
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border/60 text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Enumerator</th>
              <th className="px-4 py-2.5 font-medium">District</th>
              <th className="px-4 py-2.5 font-medium">Rule</th>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Survey</th>
              <th className="px-4 py-2.5 font-medium">Severity</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e: ErrorRow, i) => (
              <tr
                key={`${e.recordKey}-${e.ruleId}-${i}`}
                className="border-b border-border/40 last:border-0 align-top hover:bg-muted/40"
              >
                <td className="px-4 py-2.5 text-muted-foreground">
                  {e.enumeratorName && e.enumeratorName !== "-"
                    ? e.enumeratorName
                    : "-"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{e.district}</td>
                <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
                  {e.ruleId}
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-foreground">{e.title}</div>
                  <div className="mt-0.5 max-w-md text-[10px] text-muted-foreground">
                    {e.message}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{e.survey}</td>
                <td className="px-4 py-2.5">
                  <SeverityBadge severity={e.severity} />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No errors match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {visible < rows.length && (
        <div className="border-t border-border/60 px-5 py-3 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-lg border border-border/60 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Load more ({(rows.length - visible).toLocaleString()} remaining)
          </button>
        </div>
      )}
    </motion.div>
  );
}

function SeverityBadge({ severity }: { severity: ErrorRow["severity"] }) {
  if (severity === "CRITICAL") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600">
        <ShieldAlert className="h-3 w-3" />
        Critical
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium",
        "bg-amber-400/15 text-amber-600 dark:text-amber-400"
      )}
    >
      <Flag className="h-3 w-3" />
      Quality
    </span>
  );
}
