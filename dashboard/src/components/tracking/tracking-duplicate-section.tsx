"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Copy,
  RefreshCw,
  Users,
  Layers,
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
    label: "Total Extra Forms",
    exportLabel: "total-extra-forms",
    hint: "Submissions − Attempted girls — categories below are mutually exclusive and sum to this",
    icon: Copy,
    color: "text-purple-600",
    listKey: "totalDuplicates",
    value: (d) => d.totalDuplicates ?? d.totalUnnecessaryRows ?? 0,
    hoverDetail: (d) =>
      `${(d.submissionsInScope ?? 0).toLocaleString()} submissions − ${(d.uniqueGirlsInScope ?? 0).toLocaleString()} girls = ${(d.totalDuplicates ?? 0).toLocaleString()}`,
  },
  {
    label: "Exact Duplicates",
    exportLabel: "exact-duplicates",
    hint: "Extra forms with identical answers — KEY / form ID and Submission Date may differ",
    icon: Copy,
    color: "text-indigo-600",
    listKey: "exactDuplicates",
    value: (d) => d.exactDuplicates ?? 0,
    hoverDetail: (d) =>
      `${d.exactDuplicateGroups ?? 0} matching group(s) of identical form content`,
  },
  {
    label: "Baseline ↔ New Sample",
    exportLabel: "cross-cohort-duplicates",
    hint: "Extra forms that are also in a Baseline↔New Sample tracked pair",
    icon: Users,
    color: "text-fuchsia-600",
    listKey: "crossCohortDuplicates",
    value: (d) => d.crossCohortDuplicates ?? 0,
    hoverDetail: (d) =>
      `${d.crossCohortGirls ?? 0} girl(s) / ${d.crossCohortAllForms ?? 0} form(s) flagged overall (most pairs use different listing IDs, so they count as two attempted girls and sit outside this gap)`,
  },
  {
    label: "Revisit Duplicate Forms",
    exportLabel: "revisit-duplicates",
    hint: "Extra form after a failed first attempt (2nd/3rd visit path)",
    icon: RefreshCw,
    color: "text-orange-600",
    listKey: "revisitDuplicates",
    value: (d) => d.revisitDuplicates ?? 0,
  },
  {
    label: "Other Extras",
    exportLabel: "other-extras",
    hint: "Follow-up after already tracked, same-visit resubmit with different answers, and other extras",
    icon: Layers,
    color: "text-slate-600",
    listKey: "otherExtras",
    value: (d) => d.otherExtras ?? 0,
    hoverDetail: (d) =>
      `After tracked: ${(d.followUpAfterTracked ?? 0).toLocaleString()} · Same visit different answers: ${(d.sameVisitDifferentAnswers ?? 0).toLocaleString()}`,
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
  const total = d?.totalDuplicates ?? d?.totalUnnecessaryRows ?? 0;
  const partsSum =
    (d?.exactDuplicates ?? 0) +
    (d?.crossCohortDuplicates ?? 0) +
    (d?.revisitDuplicates ?? 0) +
    (d?.otherExtras ?? 0);

  if (!loading && (!d || total === 0)) return null;

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
                {total} extra form{total === 1 ? "" : "s"} (gap)
              </span>
            )}
          </div>
          {expanded && d && (
            <div className="mt-1 space-y-1 text-[10px] text-muted-foreground">
              <p>
                Complete gap breakdown · click a card to download (Duplicate Type
                on full export)
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {(d.submissionsInScope ?? 0).toLocaleString()} submissions −{" "}
                  {(d.uniqueGirlsInScope ?? 0).toLocaleString()} attempted ={" "}
                  {total.toLocaleString()} extra forms
                </span>
                . Exact {(d.exactDuplicates ?? 0).toLocaleString()} + Baseline↔New
                Sample {(d.crossCohortDuplicates ?? 0).toLocaleString()} + Revisit{" "}
                {(d.revisitDuplicates ?? 0).toLocaleString()} + Other{" "}
                {(d.otherExtras ?? 0).toLocaleString()} ={" "}
                <span className="font-medium text-foreground">
                  {partsSum.toLocaleString()}
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
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-5">
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
                                if (hasCachedExport) {
                                  downloadCardList(list!, card.exportLabel!);
                                  return;
                                }
                                const full = buildExportMetrics?.();
                                const rows =
                                  full?.duplicateDetail.lists[
                                    card.listKey!
                                  ] ?? [];
                                if (rows.length > 0) {
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
