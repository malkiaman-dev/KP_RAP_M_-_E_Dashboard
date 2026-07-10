"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Copy,
  RefreshCw,
  Users,
  Layers,
  UserCheck,
  FileDiff,
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

type CardDef = {
  label: string;
  hint: string;
  exportLabel?: string;
  icon: typeof Copy;
  color: string;
  listKey?: DuplicateDetailListKey;
  value: number;
  hoverDetail?: string;
  hideWhenZero?: boolean;
};

/**
 * Build the exclusive gap breakdown so categories always sum to
 * submissions − attempted girls (never double-count).
 */
function gapBreakdown(d: Detail) {
  const submissions = d.submissionsInScope ?? 0;
  const girls = d.uniqueGirlsInScope ?? 0;
  const total =
    submissions > 0 && girls > 0
      ? Math.max(0, submissions - girls)
      : (d.totalDuplicates ?? d.totalUnnecessaryRows ?? 0);

  const exact = d.exactDuplicates ?? 0;
  const revisit = d.revisitDuplicates ?? 0;
  const afterTracked = d.followUpAfterTracked ?? 0;
  const sameVisit = d.sameVisitDifferentAnswers ?? 0;
  // Residual only — ignores stale otherExtras that used to include afterTracked+sameVisit
  const other = Math.max(
    0,
    total - exact - revisit - afterTracked - sameVisit
  );

  return { submissions, girls, total, exact, revisit, afterTracked, sameVisit, other };
}

const crossCohortCardBase = {
  label: "Baseline ↔ New Sample",
  exportLabel: "cross-cohort-duplicates",
  hint: "Girls present in both cohorts (tracked or not) — not part of the extra-forms gap",
  icon: Users,
  color: "text-fuchsia-600",
  listKey: "crossCohortDuplicates" as const,
};

function downloadCardList(rows: RevisitGirlExportRow[], exportLabel: string) {
  const date = new Date().toISOString().slice(0, 10);
  downloadRevisitExcel(rows, `duplicate-${exportLabel}-${date}.xlsx`);
}

function DuplicateStatCard({
  card,
  index,
  detail,
  buildExportMetrics,
}: {
  card: CardDef;
  index: number;
  detail: Detail;
  buildExportMetrics?: () => TrackingMetrics | undefined;
}) {
  const list = card.listKey ? detail.lists[card.listKey] : undefined;
  const hasCachedExport = (list?.length ?? 0) > 0;
  const canDownload =
    !!card.exportLabel &&
    (hasCachedExport || (card.value > 0 && !!buildExportMetrics));

  return (
    <StatCard
      index={index}
      muted
      label={card.label}
      value={card.value}
      icon={card.icon}
      color={card.color}
      hint={card.hint}
      hoverDetail={card.hoverDetail}
      onClick={
        canDownload
          ? () => {
              if (hasCachedExport) {
                downloadCardList(list!, card.exportLabel!);
                return;
              }
              const full = buildExportMetrics?.();
              const rows = full?.duplicateDetail.lists[card.listKey!] ?? [];
              if (rows.length > 0) {
                downloadCardList(rows, card.exportLabel!);
              }
            }
          : undefined
      }
    />
  );
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
  const gap = useMemo(() => (d ? gapBreakdown(d) : null), [d]);
  const crossGirls = d?.crossCohortGirls ?? d?.crossCohortDuplicates ?? 0;

  const gapCards: CardDef[] = useMemo(() => {
    if (!gap) return [];
    const cards: CardDef[] = [
      {
        label: "Total Extra Forms",
        exportLabel: "total-extra-forms",
        hint: "Submissions − Attempted girls. Categories below are exclusive and sum to this.",
        icon: Copy,
        color: "text-purple-600",
        listKey: "totalDuplicates",
        value: gap.total,
        hoverDetail: `${gap.submissions.toLocaleString()} − ${gap.girls.toLocaleString()} = ${gap.total.toLocaleString()}`,
      },
      {
        label: "Exact Duplicates",
        exportLabel: "exact-duplicates",
        hint: "Same answers again — only KEY / form ID / Submission Date differ",
        icon: Copy,
        color: "text-indigo-600",
        listKey: "exactDuplicates",
        value: gap.exact,
        hoverDetail: `${d?.exactDuplicateGroups ?? 0} matching group(s)`,
      },
      {
        label: "Revisit Duplicates",
        exportLabel: "revisit-duplicates",
        hint: "Another form after a failed first attempt (2nd / 3rd visit path)",
        icon: RefreshCw,
        color: "text-orange-600",
        listKey: "revisitDuplicates",
        value: gap.revisit,
      },
      {
        label: "After Already Tracked",
        exportLabel: "follow-up-after-tracked",
        hint: "Extra form filed after the girl was already successfully tracked",
        icon: UserCheck,
        color: "text-amber-600",
        listKey: "followUpAfterTracked",
        value: gap.afterTracked,
      },
      {
        label: "Same Visit, Different Answers",
        exportLabel: "same-visit-different",
        hint: "Same visit number submitted again with different field values",
        icon: FileDiff,
        color: "text-sky-600",
        listKey: "sameVisitDifferentAnswers",
        value: gap.sameVisit,
      },
    ];
    if (gap.other > 0) {
      cards.push({
        label: "Other Extras",
        exportLabel: "other-extras",
        hint: "Remaining extras that do not fit Exact / Revisit / After tracked / Same visit",
        icon: Layers,
        color: "text-slate-600",
        listKey: "otherExtras",
        value: gap.other,
      });
    }
    return cards;
  }, [gap, d?.exactDuplicateGroups]);

  if (!loading && (!d || !gap || (gap.total === 0 && crossGirls === 0))) {
    return null;
  }

  const partsSum = gap
    ? gap.exact + gap.revisit + gap.afterTracked + gap.sameVisit + gap.other
    : 0;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Extra / unnecessary forms
            </p>
            {!expanded && gap && (
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                {gap.total} extra forms (= submissions − attempted)
              </span>
            )}
          </div>
          {expanded && gap && (
            <div className="mt-1 space-y-1 text-[10px] text-muted-foreground">
              <p>
                Only the gap between submissions and attempted girls — each extra
                form is in exactly one category.
              </p>
              <p className="font-medium text-foreground">
                {gap.submissions.toLocaleString()} submissions −{" "}
                {gap.girls.toLocaleString()} attempted ={" "}
                {gap.total.toLocaleString()}
                {" = "}
                Exact {gap.exact.toLocaleString()} + Revisit{" "}
                {gap.revisit.toLocaleString()} + After tracked{" "}
                {gap.afterTracked.toLocaleString()} + Same visit{" "}
                {gap.sameVisit.toLocaleString()}
                {gap.other > 0
                  ? ` + Other ${gap.other.toLocaleString()}`
                  : ""}
                {" = "}
                {partsSum.toLocaleString()}
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
            expanded ? "Hide extra forms details" : "Show extra forms details"
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
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <StatCardSkeleton key={i} count={1} />
                    ))
                  : gapCards.map((card, i) => (
                      <DuplicateStatCard
                        key={card.label}
                        card={card}
                        index={i}
                        detail={d!}
                        buildExportMetrics={buildExportMetrics}
                      />
                    ))}
              </div>

              {(loading || crossGirls > 0) && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Also flagged (not in the {gap?.total ?? ""} above)
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                    {loading ? (
                      <StatCardSkeleton count={1} />
                    ) : (
                      <DuplicateStatCard
                        card={{
                          ...crossCohortCardBase,
                          value: crossGirls,
                          hoverDetail: `${d!.crossCohortAllForms ?? 0} submission(s) · matched by district, village, name, father`,
                        }}
                        index={gapCards.length}
                        detail={d!}
                        buildExportMetrics={buildExportMetrics}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
