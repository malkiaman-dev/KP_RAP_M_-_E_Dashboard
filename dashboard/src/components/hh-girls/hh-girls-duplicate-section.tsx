"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Copy, UserRound, Users } from "lucide-react";
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
  exportLabel: string;
  icon: typeof Copy;
  color: string;
  listKey: HhGirlsDuplicateListKey;
  value: (d: Detail) => number;
  hoverDetail?: (d: Detail) => string;
}[] = [
  {
    label: "Duplicate Submissions",
    exportLabel: "duplicate-submissions",
    hint: "Extra submissions of the same survey (same girl + same respondent, or the same girl's girls survey). The original is not counted",
    icon: Copy,
    color: "text-purple-600",
    listKey: "totalDuplicates",
    value: (d) => d.totalDuplicates,
    hoverDetail: (d) =>
      (Object.entries(d.byFormType) as [string, number][])
        .filter(([, n]) => n > 0)
        .map(([type, n]) => `${type}: ${n}`)
        .join(" · ") || "No duplicates",
  },
  {
    label: "Same Enumerator",
    exportLabel: "same-enumerator-duplicates",
    hint: "The same enumerator submitted the same survey again",
    icon: Copy,
    color: "text-indigo-600",
    listKey: "sameEnumeratorDuplicates",
    value: (d) => d.sameEnumeratorDuplicates,
  },
  {
    label: "Different Enumerator",
    exportLabel: "different-enumerator-duplicates",
    hint: "A different enumerator submitted a survey that was already submitted",
    icon: Users,
    color: "text-fuchsia-600",
    listKey: "differentEnumeratorDuplicates",
    value: (d) => d.differentEnumeratorDuplicates,
  },
  {
    label: "Girls with duplicates (not forms)",
    exportLabel: "girls-with-duplicates",
    hint: "Counts girls, not forms: one girl can have several duplicate forms, so this is not part of the total",
    icon: UserRound,
    color: "text-sky-600",
    listKey: "girlsWithDuplicates",
    value: (d) => d.girlsWithDuplicates,
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
                {d.totalDuplicates === 0
                  ? "No duplicates"
                  : `${d.totalDuplicates} duplicate submission${d.totalDuplicates === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
          {expanded && d && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              A duplicate is the same survey submitted again: after it was
              already complete, or a second copy of the same attempt (by the
              same or a different enumerator). Father + mother forms for the
              same girl, and revisits after a not-found attempt, are not
              duplicates. Each Excel row shows the form it duplicates.
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
                          list.length
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
