"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Copy,
  RefreshCw,
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
  exportLabel: string;
  icon: typeof Copy;
  color: string;
  listKey: DuplicateDetailListKey;
  value: (d: Detail) => number;
  hoverDetail?: (d: Detail) => string;
}[] = [
  {
    label: "Total Duplicates",
    exportLabel: "total-duplicates",
    hint: "All submissions where the same girl and visit was submitted more than once",
    icon: Copy,
    color: "text-purple-600",
    listKey: "totalDuplicates",
    value: (d) => d.totalDuplicates,
    hoverDetail: (d) =>
      `${d.duplicateGroups} girl + visit group(s) · ${d.totalDuplicates} submission row(s)`,
  },
  {
    label: "Exact Duplicates",
    exportLabel: "exact-duplicates",
    hint: "Same girl, visit, and enumerator submitted more than once",
    icon: Copy,
    color: "text-violet-600",
    listKey: "exactDuplicates",
    value: (d) => d.exactDuplicates,
  },
  {
    label: "Revisit Duplicates",
    exportLabel: "revisit-duplicates",
    hint: "Duplicate submissions on a 2nd or 3rd follow-up visit",
    icon: RefreshCw,
    color: "text-indigo-600",
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
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const d = metrics?.duplicateDetail;

  if (!loading && (!d || d.totalDuplicates === 0)) return null;

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
                {d.totalDuplicates} duplicate submission
                {d.totalDuplicates === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {expanded && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Same girl and visit submitted more than once · click any card to
              download an Excel list · total duplicates includes a Duplicate
              Type column
            </p>
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
                    const list = d!.lists[card.listKey];
                    const hasExport = list.length > 0;

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
                          hasExport
                            ? () => downloadCardList(list, card.exportLabel)
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
