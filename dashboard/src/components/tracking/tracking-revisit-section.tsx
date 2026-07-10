"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Target,
  UserX,
  Users,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type {
  RevisitGirlExportRow,
  TrackingMetrics,
} from "@/lib/data/tracking-metrics";
import { downloadRevisitExcel } from "@/lib/export/revisit-excel";

type Detail = NonNullable<TrackingMetrics["revisitDetail"]>;

function dedupeGirls(rows: RevisitGirlExportRow[]): RevisitGirlExportRow[] {
  const map = new Map<string, RevisitGirlExportRow>();
  for (const r of rows) map.set(r.girlId, r);
  return [...map.values()];
}

const cards: {
  label: string;
  hint: string;
  exportLabel: string;
  icon: typeof RefreshCw;
  color: string;
  group: "general" | "2nd" | "3rd";
  value: (d: Detail) => number;
  suffix?: string;
  decimals?: number;
  /** Girls to export on click. Omit to make the card non-clickable. */
  getList?: (d: Detail) => RevisitGirlExportRow[];
  hoverDetail?: (d: Detail) => string;
}[] = [
  {
    label: "Revisits Still Needed",
    exportLabel: "revisits-still-needed",
    hint: "Girls who still need a 2nd or 3rd follow-up",
    icon: Target,
    color: "text-amber-600",
    group: "general",
    value: (d) => d.revisitsNeedToBeDone,
    getList: (d) => d.lists.revisitsNeedToBeDone,
    hoverDetail: (d) =>
      `2nd attempt still needed: ${d.revisitsNeed2nd} · 3rd attempt still needed: ${d.revisitsNeed3rd}`,
  },
  {
    label: "Total Remaining Revisits",
    exportLabel: "total-remaining-revisits",
    hint: "Revisits still needed minus girls concluded via revisit (tracked on 2nd/3rd, or 3rd attempt done)",
    icon: RefreshCw,
    color: "text-amber-700",
    group: "general",
    value: (d) => d.totalRemainingRevisits,
    getList: (d) => d.lists.revisitsNeedToBeDone,
    hoverDetail: (d) =>
      `Still needed: ${d.revisitsNeedToBeDone} − concluded via revisit: ${d.girlsTrackedOn2ndRevisit + d.girlsTrackedOn3rdRevisit + d.girlsNotTrackedOn3rdRevisit} = ${d.totalRemainingRevisits}`,
  },
  {
    label: "Total Revisited Girls",
    exportLabel: "total-revisited-girls",
    hint: "Unique girls with a 2nd or 3rd follow-up visit",
    icon: RefreshCw,
    color: "text-teal",
    group: "general",
    value: (d) => d.totalRevisitedGirls,
    getList: (d) => d.lists.totalRevisitedGirls,
  },
  {
    label: "Tracked via Revisit",
    exportLabel: "tracked-via-revisit",
    hint: "Girls finally tracked thanks to a 2nd or 3rd follow-up",
    icon: CheckCircle2,
    color: "text-green-600",
    group: "general",
    value: (d) => d.girlsTrackedOn2ndRevisit + d.girlsTrackedOn3rdRevisit,
    getList: (d) =>
      dedupeGirls([
        ...d.lists.girlsTrackedOn2ndRevisit,
        ...d.lists.girlsTrackedOn3rdRevisit,
      ]),
    hoverDetail: (d) =>
      `Tracked on 2nd: ${d.girlsTrackedOn2ndRevisit} · Tracked on 3rd: ${d.girlsTrackedOn3rdRevisit}`,
  },
  {
    label: "2nd Attempt Still Needed",
    exportLabel: "2nd-attempt-still-needed",
    hint: "1st visit done, girl temporarily not located",
    icon: Target,
    color: "text-amber-500",
    group: "2nd",
    value: (d) => d.revisitsNeed2nd,
    getList: (d) => d.lists.revisitsNeed2nd,
  },
  {
    label: "2nd Revisited Girls",
    exportLabel: "2nd-revisited-girls",
    hint: "Girls with an actual 2nd follow-up visit",
    icon: Users,
    color: "text-sky-600",
    group: "2nd",
    value: (d) => d.girls2ndRevisited,
    getList: (d) => d.lists.girls2ndRevisited,
  },
  {
    label: "Tracked on 2nd Revisit",
    exportLabel: "tracked-on-2nd-revisit",
    hint: "Successfully tracked on the 2nd follow-up form",
    icon: CheckCircle2,
    color: "text-teal",
    group: "2nd",
    value: (d) => d.girlsTrackedOn2ndRevisit,
    getList: (d) => d.lists.girlsTrackedOn2ndRevisit,
  },
  {
    label: "Not Tracked on 2nd Revisit",
    exportLabel: "not-tracked-on-2nd-revisit",
    hint: "2nd follow-up not tracked, and girl never tracked later (excluded if tracked on 3rd)",
    icon: UserX,
    color: "text-orange-600",
    group: "2nd",
    value: (d) => d.girlsNotTrackedOn2ndRevisit,
    getList: (d) => d.lists.girlsNotTrackedOn2ndRevisit,
  },
  {
    label: "3rd Attempt Still Needed",
    exportLabel: "3rd-attempt-still-needed",
    hint: "2nd visit done but girl still not located",
    icon: Target,
    color: "text-orange-600",
    group: "3rd",
    value: (d) => d.revisitsNeed3rd,
    getList: (d) => d.lists.revisitsNeed3rd,
  },
  {
    label: "3rd Revisited Girls",
    exportLabel: "3rd-revisited-girls",
    hint: "Girls with an actual 3rd follow-up visit",
    icon: Users,
    color: "text-indigo-600",
    group: "3rd",
    value: (d) => d.girls3rdRevisited,
    getList: (d) => d.lists.girls3rdRevisited,
  },
  {
    label: "Tracked on 3rd Revisit",
    exportLabel: "tracked-on-3rd-revisit",
    hint: "Successfully tracked on the 3rd follow-up form",
    icon: CheckCircle2,
    color: "text-deep-teal",
    group: "3rd",
    value: (d) => d.girlsTrackedOn3rdRevisit,
    getList: (d) => d.lists.girlsTrackedOn3rdRevisit,
  },
  {
    label: "Not Tracked on 3rd Revisit",
    exportLabel: "not-tracked-on-3rd-revisit",
    hint: "3rd follow-up completed and girl still never tracked on any attempt",
    icon: UserX,
    color: "text-red-500",
    group: "3rd",
    value: (d) => d.girlsNotTrackedOn3rdRevisit,
    getList: (d) => d.lists.girlsNotTrackedOn3rdRevisit,
  },
];

const columns: { group: "general" | "2nd" | "3rd"; heading: string }[] = [
  { group: "general", heading: "Overall" },
  { group: "2nd", heading: "2nd attempt" },
  { group: "3rd", heading: "3rd attempt" },
];

function downloadCardList(
  rows: RevisitGirlExportRow[],
  exportLabel: string
) {
  const date = new Date().toISOString().slice(0, 10);
  downloadRevisitExcel(rows, `follow-up-${exportLabel}-${date}.xlsx`);
}

export function TrackingRevisitSection({
  metrics,
  loading,
  buildExportMetrics,
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
  buildExportMetrics?: () => TrackingMetrics | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const d = metrics?.revisitDetail;

  if (!loading && !d) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Follow-up visit details
            </p>
            {!expanded && d && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                {d.revisitsNeedToBeDone} still needed
              </span>
            )}
          </div>
          {expanded && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Revisit needed when household located but girl temporarily not
              tracked · click any card to download an Excel list of those girls
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          aria-expanded={expanded}
          aria-label={expanded ? "Hide follow-up details" : "Show follow-up details"}
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
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
              {loading
                ? columns.map((col) => (
                    <div key={col.group} className="flex flex-col gap-3">
                      <StatCardSkeleton count={4} />
                    </div>
                  ))
                : columns.map((col) => {
                    const colCards = cards.filter((c) => c.group === col.group);
                    return (
                      <div key={col.group} className="flex flex-col gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {col.heading}
                        </p>
                        {colCards.map((card, i) => {
                          const Icon = card.icon;
                          const list = card.getList?.(d!);
                          const value = card.value(d!);
                          const canDownload =
                            (list && list.length > 0) ||
                            (value > 0 && !!buildExportMetrics);
                          return (
                            <StatCard
                              key={card.label}
                              index={i}
                              muted
                              label={card.label}
                              value={value}
                              icon={Icon}
                              color={card.color}
                              hint={card.hint}
                              suffix={card.suffix}
                              decimals={card.decimals}
                              hoverDetail={card.hoverDetail?.(d!)}
                              onClick={
                                canDownload
                                  ? () => {
                                      if (list && list.length > 0) {
                                        downloadCardList(list, card.exportLabel);
                                        return;
                                      }
                                      const full = buildExportMetrics?.();
                                      const rows = card.getList?.(
                                        full!.revisitDetail
                                      );
                                      if (rows?.length) {
                                        downloadCardList(rows, card.exportLabel);
                                      }
                                    }
                                  : undefined
                              }
                            />
                          );
                        })}
                      </div>
                    );
                  })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
