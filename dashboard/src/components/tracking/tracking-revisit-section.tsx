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
  RevisitDetailMetricKey,
  TrackingMetrics,
} from "@/lib/data/tracking-metrics";
import { downloadRevisitExcel } from "@/lib/export/revisit-excel";

type Detail = NonNullable<TrackingMetrics["revisitDetail"]>;

const cards: {
  key: RevisitDetailMetricKey;
  label: string;
  hint: string;
  exportLabel: string;
  icon: typeof RefreshCw;
  color: string;
  group: "general" | "2nd" | "3rd";
  hoverDetail?: (d: Detail) => string;
}[] = [
  {
    key: "revisitsNeedToBeDone",
    label: "Revisits Still Needed",
    exportLabel: "revisits-still-needed",
    hint: "Girls who still need a 2nd or 3rd follow-up · click to download",
    icon: Target,
    color: "text-amber-600",
    group: "general",
    hoverDetail: (d) =>
      `2nd attempt still needed: ${d.revisitsNeed2nd} · 3rd attempt still needed: ${d.revisitsNeed3rd} · Click to download`,
  },
  {
    key: "revisitsNeed2nd",
    label: "2nd Attempt Still Needed",
    exportLabel: "2nd-attempt-still-needed",
    hint: "1st visit done, girl temporarily not located — click to download",
    icon: Target,
    color: "text-amber-500",
    group: "2nd",
  },
  {
    key: "revisitsNeed3rd",
    label: "3rd Attempt Still Needed",
    exportLabel: "3rd-attempt-still-needed",
    hint: "2nd visit done but girl still not located — click to download",
    icon: Target,
    color: "text-orange-600",
    group: "3rd",
  },
  {
    key: "girls2ndRevisited",
    label: "2nd Revisited Girls",
    exportLabel: "2nd-revisited-girls",
    hint: "Girls with an actual 2nd follow-up visit · click to download",
    icon: Users,
    color: "text-sky-600",
    group: "2nd",
  },
  {
    key: "girls3rdRevisited",
    label: "3rd Revisited Girls",
    exportLabel: "3rd-revisited-girls",
    hint: "Girls with an actual 3rd follow-up visit · click to download",
    icon: Users,
    color: "text-indigo-600",
    group: "3rd",
  },
  {
    key: "totalRevisitedGirls",
    label: "Total Revisited Girls",
    exportLabel: "total-revisited-girls",
    hint: "Unique girls with a 2nd or 3rd follow-up visit · click to download",
    icon: RefreshCw,
    color: "text-teal",
    group: "general",
  },
  {
    key: "girlsTrackedOn2ndRevisit",
    label: "Tracked on 2nd Revisit",
    exportLabel: "tracked-on-2nd-revisit",
    hint: "Successfully tracked on the 2nd follow-up form · click to download",
    icon: CheckCircle2,
    color: "text-teal",
    group: "2nd",
  },
  {
    key: "girlsTrackedOn3rdRevisit",
    label: "Tracked on 3rd Revisit",
    exportLabel: "tracked-on-3rd-revisit",
    hint: "Successfully tracked on the 3rd follow-up form · click to download",
    icon: CheckCircle2,
    color: "text-deep-teal",
    group: "3rd",
  },
  {
    key: "girlsNotTrackedOn2ndRevisit",
    label: "Not Tracked on 2nd Revisit",
    exportLabel: "not-tracked-on-2nd-revisit",
    hint: "2nd follow-up completed but not tracked on that visit · click to download",
    icon: UserX,
    color: "text-orange-600",
    group: "2nd",
  },
  {
    key: "girlsNotTrackedOn3rdRevisit",
    label: "Not Tracked on 3rd Revisit",
    exportLabel: "not-tracked-on-3rd-revisit",
    hint: "3rd follow-up completed but not tracked on that visit · click to download",
    icon: UserX,
    color: "text-red-500",
    group: "3rd",
  },
];

const columns: { group: "general" | "2nd" | "3rd"; heading: string }[] = [
  { group: "general", heading: "Overall" },
  { group: "2nd", heading: "2nd attempt" },
  { group: "3rd", heading: "3rd attempt" },
];

function downloadCardList(
  d: Detail,
  key: RevisitDetailMetricKey,
  exportLabel: string
) {
  const rows = d.lists[key];
  const date = new Date().toISOString().slice(0, 10);
  downloadRevisitExcel(rows, `follow-up-${exportLabel}-${date}.xlsx`);
}

export function TrackingRevisitSection({
  metrics,
  loading,
}: {
  metrics?: TrackingMetrics;
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
                          return (
                            <StatCard
                              key={card.key}
                              index={i}
                              muted
                              label={card.label}
                              value={d![card.key]}
                              icon={Icon}
                              color={card.color}
                              hint={card.hint}
                              hoverDetail={card.hoverDetail?.(d!)}
                              onClick={() =>
                                downloadCardList(d!, card.key, card.exportLabel)
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
