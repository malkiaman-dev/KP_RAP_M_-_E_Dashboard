"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  Handshake,
  RefreshCw,
  Target,
  UserX,
  Users,
} from "lucide-react";
import {
  SplitStatCard,
  StatCard,
  StatCardSkeleton,
  type StatCardHalf,
} from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import type { HhGirlsExportRow } from "@/lib/data/hh-girls-revisit";
import { downloadHhGirlsExcel } from "@/lib/export/hh-girls-excel";

type Detail = NonNullable<HhGirlsMetrics["revisitDetail"]>;

/** Revisited = completed + not found + next attempt + consent refused + other. */
function outcomeBreakdown(o: Detail["revisit2Outcomes"]): string {
  const parts = [
    `Completed: ${o.completed}`,
    `Not found: ${o.notFound}`,
    o.nextAttempt ? `Moved to 3rd attempt: ${o.nextAttempt}` : "",
    o.consentRefused ? `Consent refused: ${o.consentRefused}` : "",
    o.other ? `Other: ${o.other}` : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

/** "all" = full-width card below both attempt columns. */
type Group = "1st" | "2nd" | "all";

type CardConfig = {
  label: string;
  hint: string;
  exportLabel: string;
  icon: typeof RefreshCw;
  color: string;
  value: (d: Detail) => number;
  getList: (d: Detail) => HhGirlsExportRow[];
  hoverDetail?: (d: Detail) => string;
};

const cards: (CardConfig & {
  group: Group;
  /** Second value shown in the right half of a split card. */
  split?: CardConfig;
})[] = [
  {
    label: "Revisit Needed",
    exportLabel: "1st-revisit-needed",
    hint: "Not found on attempt 1 (temporarily unavailable) and the 1st revisit (attempt 2) is not done yet",
    icon: Target,
    color: "text-amber-600",
    group: "1st",
    value: (d) => d.revisitsNeed2nd,
    getList: (d) => d.lists.revisitsNeed2nd,
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
    hoverDetail: (d) => outcomeBreakdown(d.revisit2Outcomes),
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
    split: {
      label: "Consent Refused",
      exportLabel: "consent-refused-on-1st-revisit",
      hint: "Found on the 1st revisit (attempt 2) but consent was refused",
      icon: Handshake,
      color: "text-red-500",
      value: (d) => d.revisit2Outcomes.consentRefused,
      getList: (d) => d.lists.consentRefusedOn2ndRevisit,
    },
  },
  {
    label: "Not Found",
    exportLabel: "permanently-not-found",
    hint: "Permanently not found: still unavailable after the last revisit allowed (father after attempt 2; mother / girl / caretaker after attempt 3), or found on a revisit to be permanently away (another city / country, passed away)",
    icon: UserX,
    color: "text-red-500",
    group: "all",
    value: (d) => d.notFoundAfter2nd + d.notFoundAfter3rd,
    getList: (d) => [...d.lists.notFoundAfter2nd, ...d.lists.notFoundAfter3rd],
    hoverDetail: (d) =>
      `Father after attempt 2: ${d.notFoundAfter2nd} · mother / girl / caretaker after attempt 3: ${d.notFoundAfter3rd}`,
  },
  {
    label: "Revisit Needed",
    exportLabel: "2nd-revisit-needed",
    hint: "Not found on the 1st revisit (attempt 2) and the 2nd revisit (attempt 3) is not done yet. Mother / girl / caretaker only (father max is 1 revisit)",
    icon: Target,
    color: "text-orange-600",
    group: "2nd",
    value: (d) => d.revisitsNeed3rd,
    getList: (d) => d.lists.revisitsNeed3rd,
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
    hoverDetail: (d) => outcomeBreakdown(d.revisit3Outcomes),
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
    split: {
      label: "Consent Refused",
      exportLabel: "consent-refused-on-2nd-revisit",
      hint: "Found on the 2nd revisit (attempt 3) but consent was refused",
      icon: Handshake,
      color: "text-red-500",
      value: (d) => d.revisit3Outcomes.consentRefused,
      getList: (d) => d.lists.consentRefusedOn3rdRevisit,
    },
  },
];

const columns: { group: Exclude<Group, "all">; heading: string }[] = [
  { group: "1st", heading: "2nd attempt (1st revisit)" },
  { group: "2nd", heading: "3rd attempt (2nd revisit)" },
];

function downloadCardList(rows: HhGirlsExportRow[], exportLabel: string) {
  const date = new Date().toISOString().slice(0, 10);
  downloadHhGirlsExcel(rows, `hh-girls-follow-up-${exportLabel}-${date}.xlsx`);
}

function toHalf(card: CardConfig, d: Detail): StatCardHalf {
  const list = card.getList(d);
  return {
    label: card.label,
    value: card.value(d),
    icon: card.icon,
    color: card.color,
    hint: card.hint,
    hoverDetail: card.hoverDetail?.(d),
    onClick: list.length ? () => downloadCardList(list, card.exportLabel) : undefined,
  };
}

function renderCard(card: (typeof cards)[number], index: number, d: Detail) {
  if (card.split) {
    return (
      <SplitStatCard
        key={card.label}
        index={index}
        muted
        left={toHalf(card, d)}
        right={toHalf(card.split, d)}
      />
    );
  }
  const list = card.getList(d);
  return (
    <StatCard
      key={card.label}
      index={index}
      muted
      label={card.label}
      value={card.value(d)}
      icon={card.icon}
      color={card.color}
      hint={card.hint}
      hoverDetail={card.hoverDetail?.(d)}
      onClick={
        list.length ? () => downloadCardList(list, card.exportLabel) : undefined
      }
    />
  );
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
              Revisit Needed = still to be done; Revisited = that attempt was
              submitted; Completed = found and completed on it. Not found on the 1st revisit → counted in the
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
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {loading
                ? columns.map((col) => (
                    <div key={col.group} className="flex flex-col gap-3">
                      <StatCardSkeleton count={3} />
                    </div>
                  ))
                : columns.map((col) => (
                    <div key={col.group} className="flex flex-col gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {col.heading}
                      </p>
                      {cards
                        .filter((c) => c.group === col.group)
                        .map((card, i) => renderCard(card, i, d!))}
                    </div>
                  ))}
              <div className="flex flex-col gap-3 sm:col-span-2">
                {loading ? (
                  <StatCardSkeleton count={1} />
                ) : (
                  cards
                    .filter((c) => c.group === "all")
                    .map((card, i) => renderCard(card, i, d!))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
