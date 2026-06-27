"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, Search, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  EnumeratorPerformance,
  MonitoringMetrics,
} from "@/lib/data/tracking-metrics";

type SortKey =
  | "name"
  | "submissions"
  | "uniqueGirls"
  | "trackedGirls"
  | "successRate"
  | "activeDays"
  | "avgTrackedPerDay"
  | "targetAttainment"
  | "avgSubmissionsPerDay"
  | "submissionTargetAttainment";

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Enumerator" },
  { key: "submissions", label: "Submissions", numeric: true },
  { key: "uniqueGirls", label: "Girls", numeric: true },
  { key: "trackedGirls", label: "Tracked", numeric: true },
  { key: "successRate", label: "Success %", numeric: true },
  { key: "activeDays", label: "Days", numeric: true },
  { key: "avgTrackedPerDay", label: "Avg/Day (Tracked)", numeric: true },
  { key: "targetAttainment", label: "Target % (Tracked)", numeric: true },
  { key: "avgSubmissionsPerDay", label: "Avg/Day (Subs)", numeric: true },
  { key: "submissionTargetAttainment", label: "Target % (Subs)", numeric: true },
];

export function MonitoringEnumeratorTable({
  metrics,
  loading,
}: {
  metrics?: MonitoringMetrics;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("trackedGirls");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [statusMetric, setStatusMetric] = useState<"tracked" | "subs">(
    "tracked"
  );

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    // Once the user scrolls past the halfway point, the Subs target columns
    // are in view, so the pinned status reflects submission performance.
    const next = maxScroll > 0 && el.scrollLeft >= maxScroll / 2 ? "subs" : "tracked";
    setStatusMetric((prev) => (prev === next ? prev : next));
  };

  const rows = useMemo(() => {
    const data = metrics?.enumeratorPerformance ?? [];
    const filtered = query
      ? data.filter(
          (e) =>
            e.name.toLowerCase().includes(query.toLowerCase()) ||
            e.district.toLowerCase().includes(query.toLowerCase())
        )
      : data;
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return sorted;
  }, [metrics, query, sortKey, sortDir]);

  if (loading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />;
  }

  if (!metrics) return null;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Enumerator Performance
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {metrics.enumeratorsOnTrack} of {metrics.activeEnumerators} enumerators
            meeting the {metrics.dailyTarget}/day target on average
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search enumerator…"
            className="w-full rounded-lg border border-border/60 bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-teal sm:w-56"
            aria-label="Search enumerator"
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[480px] overflow-auto"
      >
        <table className="w-full min-w-[1180px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20 bg-card">
            <tr className="border-b border-border/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "bg-card px-4 py-2.5 font-medium text-muted-foreground",
                    col.numeric && "text-right"
                  )}
                >
                  <button
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-foreground",
                      col.numeric && "flex-row-reverse",
                      sortKey === col.key && "text-foreground"
                    )}
                  >
                    {col.label}
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
              ))}
              <th className="sticky right-0 z-30 border-l border-border/60 bg-card px-4 py-2.5 text-center font-medium text-muted-foreground shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.12)]">
                Status
                <span className="ml-1 font-normal normal-case text-[10px] text-muted-foreground/70">
                  ({statusMetric === "subs" ? "Subs" : "Tracked"})
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e: EnumeratorPerformance) => (
              <tr
                key={e.id}
                className="group border-b border-border/40 last:border-0 hover:bg-muted/40"
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium text-foreground">{e.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {e.district}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {e.submissions}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {e.uniqueGirls}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium text-teal">
                  {e.trackedGirls}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {e.successRate.toFixed(0)}%
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {e.activeDays}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right tabular-nums font-medium",
                    e.avgTrackedPerDay >= e.dailyTarget
                      ? "text-teal"
                      : "text-red-600"
                  )}
                >
                  {Math.round(e.avgTrackedPerDay)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <TargetPercentCell value={e.targetAttainment} />
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right tabular-nums font-medium",
                    e.avgSubmissionsPerDay >= e.dailyTarget
                      ? "text-teal"
                      : "text-red-600"
                  )}
                >
                  {Math.round(e.avgSubmissionsPerDay)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <TargetPercentCell value={e.submissionTargetAttainment} />
                </td>
                <td className="sticky right-0 z-10 border-l border-border/60 bg-card px-4 py-2.5 text-center shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.12)]">
                  <StatusBadge
                    value={
                      statusMetric === "subs"
                        ? e.submissionTargetAttainment
                        : e.targetAttainment
                    }
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No enumerators match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function StatusBadge({ value }: { value: number }) {
  const tier =
    value >= 100
      ? {
          label: "On track",
          icon: CheckCircle2,
          className: "bg-teal/10 text-teal",
        }
      : value >= 70
        ? {
            label: "Near target",
            icon: AlertTriangle,
            className: "bg-amber-400/15 text-amber-600 dark:text-amber-400",
          }
        : {
            label: "Below",
            icon: AlertTriangle,
            className: "bg-red-500/10 text-red-600",
          };

  const Icon = tier.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
        tier.className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {tier.label}
    </span>
  );
}

function TargetPercentCell({ value }: { value: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 100
              ? "bg-teal"
              : value >= 70
                ? "bg-amber-400"
                : "bg-red-500"
          )}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="tabular-nums">{value.toFixed(0)}%</span>
    </div>
  );
}
