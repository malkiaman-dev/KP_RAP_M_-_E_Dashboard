"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Copy,
  RefreshCw,
  UserX,
  Users,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type {
  DuplicateDetailListKey,
  RevisitGirlExportRow,
  TrackingMetrics,
} from "@/lib/data/tracking-metrics";
import { downloadRevisitExcel } from "@/lib/export/revisit-excel";

type Detail = NonNullable<TrackingMetrics["duplicateDetail"]>;

const cards: {
  label: string;
  hint: string;
  exportLabel?: string;
  icon: typeof Copy;
  color: string;
  listKey?: DuplicateDetailListKey;
  exportable?: boolean;
  value: (d: Detail) => number;
  hoverDetail?: (d: Detail) => string;
}[] = [
  {
    label: "All Unnecessary Rows",
    exportLabel: "all-unnecessary",
    hint: "Every submission flagged as duplicate or unnecessary (full export includes Duplicate Type)",
    icon: Copy,
    color: "text-purple-600",
    listKey: "totalDuplicates",
    value: (d) => d.totalUnnecessaryRows,
  },
  {
    label: "Same-Visit Duplicates",
    exportLabel: "same-visit-duplicates",
    hint: "Same girl and same visit submitted more than once",
    icon: Copy,
    color: "text-violet-600",
    listKey: "sameVisitDuplicates",
    value: (d) => d.sameVisitDuplicateRows,
    hoverDetail: (d) =>
      `${d.duplicateGroups} group(s) · ${d.extraDuplicates} redundant copy(ies) beyond one per girl + visit`,
  },
  {
    label: "Redundant Copies",
    hint: "Extra same-visit copies only — subtract from Total Submissions for unique girl + visit slots",
    icon: Copy,
    color: "text-purple-700",
    exportable: false,
    value: (d) => d.extraDuplicates,
    hoverDetail: (d) =>
      `${d.extraDuplicates} extra row(s) · ${d.uniqueGirlVisitSlots} unique girl + visit slots after removal`,
  },
  {
    label: "Superseded Failed Attempts",
    exportLabel: "superseded-failed-attempts",
    hint: "Prior failed attempts replaced by a later chronological attempt — form visit # may be wrong",
    icon: UserX,
    color: "text-orange-600",
    listKey: "supersededUnsuccessful",
    value: (d) => d.supersededUnsuccessful,
    hoverDetail: () =>
      "By attempt order (not form visit #): A1 fail only → 0 · A1+A2 fail → 1 · A1+A2+A3 → 2",
  },
  {
    label: "Unnecessary Follow-up",
    exportLabel: "unnecessary-follow-up",
    hint: "Visit 2 or 3 filed after the girl was already tracked on an earlier visit",
    icon: RefreshCw,
    color: "text-amber-600",
    listKey: "unnecessaryFollowUp",
    value: (d) => d.unnecessaryFollowUp,
  },
  {
    label: "Exact Duplicates",
    exportLabel: "exact-duplicates",
    hint: "Same girl, visit, and enumerator submitted more than once",
    icon: Copy,
    color: "text-indigo-600",
    listKey: "exactDuplicates",
    value: (d) => d.exactDuplicates,
  },
  {
    label: "Revisit Duplicates",
    exportLabel: "revisit-duplicates",
    hint: "Same girl and same follow-up visit submitted more than once",
    icon: RefreshCw,
    color: "text-indigo-500",
    listKey: "revisitDuplicates",
    value: (d) => d.revisitDuplicates,
  },
  {
    label: "Different Enumerator",
    exportLabel: "different-enumerator-duplicates",
    hint: "Same girl and visit submitted by more than one enumerator",
    icon: Users,
    color: "text-fuchsia-600",
    listKey: "differentEnumeratorDuplicates",
    value: (d) => d.differentEnumeratorDuplicates,
  },
];

function downloadCardList(
  rows: RevisitGirlExportRow[],
  exportLabel: string
) {
  const date = new Date().toISOString().slice(0, 10);
  downloadRevisitExcel(rows, `duplicate-${exportLabel}-${date}.xlsx`);
}

export function TrackingDuplicateSection({
  metrics,
  loading,
  buildExportMetrics,
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
  buildExportMetrics?: () => TrackingMetrics | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const d = metrics?.duplicateDetail;

  if (!loading && (!d || d.totalUnnecessaryRows === 0)) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Duplicate records
            </p>
            {!expanded && d && (
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                {d.totalUnnecessaryRows} unnecessary row
                {d.totalUnnecessaryRows === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {expanded && d && metrics && (
            <div className="mt-1 space-y-1 text-[10px] text-muted-foreground">
              <p>
                Same-visit resubmits and obsolete failed attempts · click a card
                to download (Duplicate Type on full export)
              </p>
              <p>
                Same-visit only:{" "}
                <span className="font-medium text-foreground">
                  {metrics.totalSubmissions.toLocaleString()} submissions −{" "}
                  {d.extraDuplicates.toLocaleString()} redundant ={" "}
                  {d.uniqueGirlVisitSlots.toLocaleString()} unique girl + visit
                  slots
                </span>
                . Superseded failed attempts (
                {d.supersededUnsuccessful.toLocaleString()}) use chronological
                attempt order — a form marked visit 3 with no prior submissions
                counts as attempt 1. Rule per girl: A1 fail only → 0 · A1+A2
                fail → 1 · A1+A2+A3 → 2. Active failures stay in the revisit
                queue (
                {metrics.revisitDetail?.revisitsNeedToBeDone.toLocaleString() ??
                  "—"}{" "}
                still needed).
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          aria-expanded={expanded}
          aria-label={
            expanded ? "Hide duplicate details" : "Show duplicate details"
          }
        >
          <span>{expanded ? "Hide" : "Show"}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
              {loading
                ? cards.map((_, i) => <StatCardSkeleton key={i} count={1} />)
                : cards.map((card, i) => {
                    const list =
                      card.exportable !== false && card.listKey
                        ? d!.lists[card.listKey]
                        : undefined;
                    const value = card.value(d!);
                    const hasCachedExport = (list?.length ?? 0) > 0;
                    const canDownload =
                      card.exportable !== false &&
                      !!card.exportLabel &&
                      (hasCachedExport || (value > 0 && !!buildExportMetrics));

                    return (
                      <StatCard
                        key={card.label}
                        index={i}
                        muted
                        label={card.label}
                        value={value}
                        icon={card.icon}
                        color={card.color}
                        hint={card.hint}
                        hoverDetail={card.hoverDetail?.(d!)}
                        onClick={
                          canDownload
                            ? () => {
                                if (hasCachedExport && list) {
                                  downloadCardList(list, card.exportLabel!);
                                  return;
                                }
                                const full = buildExportMetrics?.();
                                const rows =
                                  card.listKey &&
                                  full?.duplicateDetail.lists[card.listKey];
                                if (rows?.length) {
                                  downloadCardList(rows, card.exportLabel!);
                                }
                              }
                            : undefined
                        }
                      />
                    );
                  })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
