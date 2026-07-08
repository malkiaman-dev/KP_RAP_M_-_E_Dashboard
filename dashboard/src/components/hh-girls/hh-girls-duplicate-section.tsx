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
import type { HhGirlsDuplicateListKey } from "@/lib/data/hh-girls-duplicates";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import type { HhGirlsExportRow } from "@/lib/data/hh-girls-revisit";
import { downloadHhGirlsExcel } from "@/lib/export/hh-girls-excel";

type Detail = NonNullable<HhGirlsMetrics["duplicateDetail"]>;

const cards: {
  label: string;
  hint: string;
  exportLabel?: string;
  icon: typeof Copy;
  color: string;
  listKey?: HhGirlsDuplicateListKey;
  exportable?: boolean;
  value: (d: Detail) => number;
  hoverDetail?: (d: Detail) => string;
}[] = [
  {
    label: "All Unnecessary Rows",
    exportLabel: "all-unnecessary",
    hint: "Every submission flagged as duplicate or unnecessary",
    icon: Copy,
    color: "text-purple-600",
    listKey: "totalDuplicates",
    value: (d) => d.totalUnnecessaryRows,
  },
  {
    label: "Same-Attempt Duplicates",
    exportLabel: "same-attempt-duplicates",
    hint: "Same girl + respondent + attempt (HH) or girl + attempt (Girls)",
    icon: Copy,
    color: "text-violet-600",
    listKey: "sameAttemptDuplicates",
    value: (d) => d.sameAttemptDuplicateRows,
    hoverDetail: (d) =>
      `${d.duplicateGroups} group(s) · ${d.extraDuplicates} redundant copy(ies)`,
  },
  {
    label: "Redundant Copies",
    hint: "Extra same-attempt copies beyond one per slot",
    icon: Copy,
    color: "text-purple-700",
    exportable: false,
    value: (d) => d.extraDuplicates,
    hoverDetail: (d) =>
      `${d.extraDuplicates} extra row(s) · ${d.uniqueAttemptSlots} unique attempt slots`,
  },
  {
    label: "Superseded Failed Attempts",
    exportLabel: "superseded-failed-attempts",
    hint: "Earlier failed attempt replaced by a later chronological attempt",
    icon: UserX,
    color: "text-orange-600",
    listKey: "supersededUnsuccessful",
    value: (d) => d.supersededUnsuccessful,
  },
  {
    label: "Unnecessary Follow-up",
    exportLabel: "unnecessary-follow-up",
    hint: "Follow-up attempt filed after the slot was already complete",
    icon: RefreshCw,
    color: "text-amber-600",
    listKey: "unnecessaryFollowUp",
    value: (d) => d.unnecessaryFollowUp,
  },
  {
    label: "Exact Duplicates",
    exportLabel: "exact-duplicates",
    hint: "Same girl, attempt, and enumerator submitted more than once",
    icon: Copy,
    color: "text-indigo-600",
    listKey: "exactDuplicates",
    value: (d) => d.exactDuplicates,
  },
  {
    label: "Revisit Duplicates",
    exportLabel: "revisit-duplicates",
    hint: "Same slot and attempt submitted more than once on a revisit",
    icon: RefreshCw,
    color: "text-indigo-500",
    listKey: "revisitDuplicates",
    value: (d) => d.revisitDuplicates,
  },
  {
    label: "Different Enumerator",
    exportLabel: "different-enumerator-duplicates",
    hint: "Same girl and attempt submitted by more than one enumerator",
    icon: Users,
    color: "text-fuchsia-600",
    listKey: "differentEnumeratorDuplicates",
    value: (d) => d.differentEnumeratorDuplicates,
  },
];

function downloadCardList(rows: HhGirlsExportRow[], exportLabel: string) {
  const date = new Date().toISOString().slice(0, 10);
  downloadHhGirlsExcel(rows, `hh-girls-duplicate-${exportLabel}-${date}.xlsx`);
}

export function HhGirlsDuplicateSection({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const d = metrics?.duplicateDetail;

  if (!loading && !d) return null;

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
                {d.totalUnnecessaryRows === 0
                  ? "No duplicates"
                  : `${d.totalUnnecessaryRows} unnecessary row${d.totalUnnecessaryRows === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
          {expanded && d && metrics && (
            <div className="mt-1 space-y-1 text-[10px] text-muted-foreground">
              <p>
                Father + mother forms for the same girl are expected — not
                duplicates. Only same girl + same respondent + same attempt is
                flagged.
              </p>
              <p>
                Same-attempt only:{" "}
                <span className="font-medium text-foreground">
                  {metrics.core.totalSubmissions.toLocaleString()} submissions −{" "}
                  {d.extraDuplicates.toLocaleString()} redundant ={" "}
                  {d.uniqueAttemptSlots.toLocaleString()} unique attempt slots
                </span>
                .
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
                    const hasExport = (list?.length ?? 0) > 0;

                    return (
                      <StatCard
                        key={card.label}
                        index={i}
                        muted
                        label={card.label}
                        value={card.value(d!)}
                        icon={card.icon}
                        color={card.color}
                        hint={card.hint}
                        hoverDetail={card.hoverDetail?.(d!)}
                        onClick={
                          hasExport && card.exportLabel
                            ? () => downloadCardList(list!, card.exportLabel!)
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
