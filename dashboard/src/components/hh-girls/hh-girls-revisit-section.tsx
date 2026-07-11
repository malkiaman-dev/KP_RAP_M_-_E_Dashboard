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
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import type { HhGirlsExportRow } from "@/lib/data/hh-girls-revisit";
import { downloadHhGirlsExcel } from "@/lib/export/hh-girls-excel";

type Detail = NonNullable<HhGirlsMetrics["revisitDetail"]>;
type ListKey = keyof Detail["lists"];

function dedupeGirls(rows: HhGirlsExportRow[]): HhGirlsExportRow[] {
  const map = new Map<string, HhGirlsExportRow>();
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
  listKey?: ListKey;
  getList?: (d: Detail) => HhGirlsExportRow[];
  hoverDetail?: (d: Detail) => string;
}[] = [
  {
    label: "Revisits Still Needed",
    exportLabel: "revisits-still-needed",
    hint: "Survey slots still needing attempt 2 or 3 (SurveyCTO revisits)",
    icon: Target,
    color: "text-amber-600",
    group: "general",
    value: (d) => d.revisitsNeedToBeDone,
    getList: (d) => d.lists.revisitsNeedToBeDone,
    hoverDetail: (d) =>
      `2nd attempt: ${d.revisitsNeed2nd} · 3rd attempt: ${d.revisitsNeed3rd}`,
  },
  {
    label: "Total Remaining Revisits",
    exportLabel: "total-remaining-revisits",
    hint: "Follow-ups still needed minus slots completed on a revisit",
    icon: RefreshCw,
    color: "text-amber-700",
    group: "general",
    value: (d) => d.totalRemainingRevisits,
    getList: (d) => d.lists.revisitsNeedToBeDone,
  },
  {
    label: "Total Revisited Girls",
    exportLabel: "total-revisited-girls",
    hint: "Unique girls with at least one follow-up submission (attempt 2 or 3)",
    icon: RefreshCw,
    color: "text-teal",
    group: "general",
    value: (d) => d.totalRevisitedGirls,
    getList: (d) => d.lists.totalRevisitedGirls,
  },
  {
    label: "Completed via Revisit",
    exportLabel: "completed-via-revisit",
    hint: "Survey slots completed on attempt 2 or 3",
    icon: CheckCircle2,
    color: "text-green-600",
    group: "general",
    value: (d) =>
      d.slotsCompletedOn2ndRevisit + d.slotsCompletedOn3rdRevisit,
    getList: (d) =>
      dedupeGirls([
        ...d.lists.slotsCompletedOn2ndRevisit,
        ...d.lists.slotsCompletedOn3rdRevisit,
      ]),
    hoverDetail: (d) =>
      `2nd: ${d.slotsCompletedOn2ndRevisit} · 3rd: ${d.slotsCompletedOn3rdRevisit}`,
  },
  {
    label: "2nd Attempt Still Needed",
    exportLabel: "2nd-attempt-still-needed",
    hint: "1st revisit still due (father max stops here if not found)",
    icon: Target,
    color: "text-amber-500",
    group: "2nd",
    value: (d) => d.revisitsNeed2nd,
    getList: (d) => d.lists.revisitsNeed2nd,
  },
  {
    label: "2nd Attempt Slots",
    exportLabel: "2nd-attempt-slots",
    hint: "Slots with an actual attempt-2 (1st revisit) submission",
    icon: Users,
    color: "text-sky-600",
    group: "2nd",
    value: (d) => d.girls2ndRevisited,
    getList: (d) => d.lists.girls2ndRevisited,
  },
  {
    label: "Completed on 2nd Attempt",
    exportLabel: "completed-on-2nd-attempt",
    hint: "Slots completed on attempt 2 (1st revisit)",
    icon: CheckCircle2,
    color: "text-teal",
    group: "2nd",
    value: (d) => d.slotsCompletedOn2ndRevisit,
    getList: (d) => d.lists.slotsCompletedOn2ndRevisit,
  },
  {
    label: "Not Completed on 2nd",
    exportLabel: "not-completed-on-2nd-attempt",
    hint: "Attempt 2 filed but slot still not complete",
    icon: UserX,
    color: "text-orange-600",
    group: "2nd",
    value: (d) => d.slotsNotCompletedOn2ndRevisit,
    getList: (d) => d.lists.slotsNotCompletedOn2ndRevisit,
  },
  {
    label: "3rd Attempt Still Needed",
    exportLabel: "3rd-attempt-still-needed",
    hint: "2nd revisit still due (mother / girl / caretaker; not father)",
    icon: Target,
    color: "text-orange-600",
    group: "3rd",
    value: (d) => d.revisitsNeed3rd,
    getList: (d) => d.lists.revisitsNeed3rd,
  },
  {
    label: "3rd Attempt Slots",
    exportLabel: "3rd-attempt-slots",
    hint: "Slots with an actual attempt-3 (2nd revisit) submission",
    icon: Users,
    color: "text-indigo-600",
    group: "3rd",
    value: (d) => d.girls3rdRevisited,
    getList: (d) => d.lists.girls3rdRevisited,
  },
  {
    label: "Completed on 3rd Attempt",
    exportLabel: "completed-on-3rd-attempt",
    hint: "Slots completed on attempt 3 (2nd revisit)",
    icon: CheckCircle2,
    color: "text-deep-teal",
    group: "3rd",
    value: (d) => d.slotsCompletedOn3rdRevisit,
    getList: (d) => d.lists.slotsCompletedOn3rdRevisit,
  },
  {
    label: "Not Completed on 3rd",
    exportLabel: "not-completed-on-3rd-attempt",
    hint: "Attempt 3 filed but slot still not complete",
    icon: UserX,
    color: "text-red-500",
    group: "3rd",
    value: (d) => d.slotsNotCompletedOn3rdRevisit,
    getList: (d) => d.lists.slotsNotCompletedOn3rdRevisit,
  },
];

const columns: { group: "general" | "2nd" | "3rd"; heading: string }[] = [
  { group: "general", heading: "Overall" },
  { group: "2nd", heading: "2nd attempt (1st revisit)" },
  { group: "3rd", heading: "3rd attempt (2nd revisit)" },
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
              SurveyCTO attempt 1 = first visit · attempt 2 = 1st revisit ·
              attempt 3 = 2nd revisit. Father: 1 revisit (attempt 2) ·
              mother/caretaker/girl: up to 2 revisits (attempts 2–3). Girl
              codes 1/4 only for revisits. Click any card to download Excel.
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
                                list?.length
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
