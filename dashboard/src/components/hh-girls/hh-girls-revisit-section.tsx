"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import type { HhGirlsExportRow } from "@/lib/data/hh-girls-revisit";
import { downloadHhGirlsExcel } from "@/lib/export/hh-girls-excel";

type Detail = NonNullable<HhGirlsMetrics["revisitDetail"]>;

type Group = "overall" | "1st" | "2nd";

const cards: {
  label: string;
  hint: string;
  exportLabel: string;
  icon: typeof RefreshCw;
  color: string;
  group: Group;
  value: (d: Detail) => number;
  getList: (d: Detail) => HhGirlsExportRow[];
  hoverDetail?: (d: Detail) => string;
}[] = [
  {
    label: "Revisit Needed",
    exportLabel: "revisits-needed",
    hint: "All revisits needed: 1st revisit + 2nd revisit. Stays counted after the revisit",
    icon: Target,
    color: "text-amber-600",
    group: "overall",
    value: (d) => d.revisit1Needed + d.revisit2Needed,
    getList: (d) => [...d.lists.revisit1Needed, ...d.lists.revisit2Needed],
    hoverDetail: (d) =>
      `1st: ${d.revisit1Needed} · 2nd: ${d.revisit2Needed} · still to revisit: ${d.revisitsNeedToBeDone}`,
  },
  {
    label: "Revisited",
    exportLabel: "revisited",
    hint: "All revisits done (attempt 2 or 3 submitted), found or not",
    icon: RefreshCw,
    color: "text-sky-700",
    group: "overall",
    value: (d) => d.girls2ndRevisited + d.girls3rdRevisited,
    getList: (d) => [...d.lists.girls2ndRevisited, ...d.lists.girls3rdRevisited],
    hoverDetail: (d) =>
      `1st: ${d.girls2ndRevisited} · 2nd: ${d.girls3rdRevisited} · unique girls: ${d.totalRevisitedGirls}`,
  },
  {
    label: "Completed on Revisit",
    exportLabel: "completed-on-revisit",
    hint: "Completed on any revisit (attempt 2 or 3)",
    icon: CheckCircle2,
    color: "text-green-600",
    group: "overall",
    value: (d) => d.slotsCompletedOn2ndRevisit + d.slotsCompletedOn3rdRevisit,
    getList: (d) => [
      ...d.lists.slotsCompletedOn2ndRevisit,
      ...d.lists.slotsCompletedOn3rdRevisit,
    ],
    hoverDetail: (d) =>
      `1st: ${d.slotsCompletedOn2ndRevisit} · 2nd: ${d.slotsCompletedOn3rdRevisit}`,
  },
  {
    label: "Revisit Needed",
    exportLabel: "1st-revisit-needed",
    hint: "Not found on attempt 1 (temporarily unavailable), so a 1st revisit (attempt 2) is needed. Stays counted after the revisit",
    icon: Target,
    color: "text-amber-600",
    group: "1st",
    value: (d) => d.revisit1Needed,
    getList: (d) => d.lists.revisit1Needed,
    hoverDetail: (d) => `Still to revisit: ${d.revisitsNeed2nd}`,
  },
  {
    label: "Revisited",
    exportLabel: "1st-revisited",
    hint: "1st revisit done (attempt 2 submitted), found or not",
    icon: Users,
    color: "text-sky-600",
    group: "1st",
    value: (d) => d.girls2ndRevisited,
    getList: (d) => d.lists.girls2ndRevisited,
    hoverDetail: (d) => `Not found on revisit: ${d.slotsNotCompletedOn2ndRevisit}`,
  },
  {
    label: "Completed on Revisit",
    exportLabel: "completed-on-1st-revisit",
    hint: "Completed on the 1st revisit (attempt 2)",
    icon: CheckCircle2,
    color: "text-teal",
    group: "1st",
    value: (d) => d.slotsCompletedOn2ndRevisit,
    getList: (d) => d.lists.slotsCompletedOn2ndRevisit,
  },
  {
    label: "Revisit Needed",
    exportLabel: "2nd-revisit-needed",
    hint: "Revisited on attempt 2 but still temporarily unavailable, so a 2nd revisit (attempt 3) is needed. Mother / girl / caretaker only (father max is 1 revisit)",
    icon: Target,
    color: "text-orange-600",
    group: "2nd",
    value: (d) => d.revisit2Needed,
    getList: (d) => d.lists.revisit2Needed,
    hoverDetail: (d) => `Still to revisit: ${d.revisitsNeed3rd}`,
  },
  {
    label: "Revisited",
    exportLabel: "2nd-revisited",
    hint: "2nd revisit done (attempt 3 submitted), found or not",
    icon: Users,
    color: "text-indigo-600",
    group: "2nd",
    value: (d) => d.girls3rdRevisited,
    getList: (d) => d.lists.girls3rdRevisited,
    hoverDetail: (d) => `Not found on revisit: ${d.slotsNotCompletedOn3rdRevisit}`,
  },
  {
    label: "Completed on Revisit",
    exportLabel: "completed-on-2nd-revisit",
    hint: "Completed on the 2nd revisit (attempt 3)",
    icon: CheckCircle2,
    color: "text-deep-teal",
    group: "2nd",
    value: (d) => d.slotsCompletedOn3rdRevisit,
    getList: (d) => d.lists.slotsCompletedOn3rdRevisit,
  },
];

const columns: { group: Group; heading: string }[] = [
  { group: "overall", heading: "Overall" },
  { group: "1st", heading: "1st revisit (attempt 2)" },
  { group: "2nd", heading: "2nd revisit (attempt 3)" },
];

function downloadCardList(rows: HhGirlsExportRow[], exportLabel: string) {
  const date = new Date().toISOString().slice(0, 10);
  downloadHhGirlsExcel(rows, `hh-girls-follow-up-${exportLabel}-${date}.xlsx`);
}

export function HhGirlsRevisitSection({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
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
              Each survey slot (father / mother / caretaker / girl) not found on
              a visit (temporarily unavailable) needs the next revisit.
              Revisited = that attempt was submitted; Completed = found and
              completed on it. Not found on the 1st revisit → counted in the
              2nd revisit column. Father: 1 revisit · mother/caretaker/girl: up
              to 2. Girl codes 1/4 only. Click any card to download Excel.
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
                      <StatCardSkeleton count={3} />
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
                          const list = card.getList(d!);
                          return (
                            <StatCard
                              key={card.label}
                              index={i}
                              muted
                              label={card.label}
                              value={card.value(d!)}
                              icon={Icon}
                              color={card.color}
                              hint={card.hint}
                              hoverDetail={card.hoverDetail?.(d!)}
                              onClick={
                                list.length
                                  ? () => downloadCardList(list, card.exportLabel)
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
