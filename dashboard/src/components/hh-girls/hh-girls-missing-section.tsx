"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ClipboardX,
  UserRound,
  UserRoundSearch,
  Users,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { HhGirlsMissingListKey } from "@/lib/data/hh-girls-missing";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import type { HhGirlsExportRow } from "@/lib/data/hh-girls-revisit";
import { downloadHhGirlsExcel } from "@/lib/export/hh-girls-excel";

type Detail = NonNullable<HhGirlsMetrics["missingDetail"]>;

const cards: {
  label: string;
  hint: string;
  exportLabel: string;
  icon: typeof ClipboardX;
  color: string;
  listKey: HhGirlsMissingListKey;
  value: (d: Detail) => number;
  hoverDetail?: (d: Detail) => string;
}[] = [
  {
    label: "Total Missing Surveys",
    exportLabel: "total-missing",
    hint: "All required father, mother, girl, or caretaker interviews still not filed",
    icon: ClipboardX,
    color: "text-amber-700",
    listKey: "totalMissingSurveys",
    value: (d) => d.totalMissingSurveys,
    hoverDetail: (d) =>
      `${d.girlsWithAnyMissing} girl(s) with at least one missing survey`,
  },
  {
    label: "Missing Father Surveys",
    exportLabel: "missing-father",
    hint: "Father was required and available (not permanent / not in revisit queue) but no father interview filed",
    icon: UserRound,
    color: "text-gold",
    listKey: "missingFatherSurveys",
    value: (d) => d.missingFatherSurveys,
  },
  {
    label: "Missing Mother Surveys",
    exportLabel: "missing-mother",
    hint: "Mother was required and available but no mother interview filed",
    icon: UserRound,
    color: "text-teal",
    listKey: "missingMotherSurveys",
    value: (d) => d.missingMotherSurveys,
  },
  {
    label: "Missing Girl Surveys",
    exportLabel: "missing-girl",
    hint: "Girls survey still required and not completed (and not in a temporary-revisit queue)",
    icon: Users,
    color: "text-blue-500",
    listKey: "missingGirlSurveys",
    value: (d) => d.missingGirlSurveys,
  },
  {
    label: "Missing Caretaker Surveys",
    exportLabel: "missing-caretaker",
    hint: "Both parents permanently unavailable but caretaker interview not filed",
    icon: UserRoundSearch,
    color: "text-violet-500",
    listKey: "missingCaretakerSurveys",
    value: (d) => d.missingCaretakerSurveys,
  },
];

function downloadCardList(rows: HhGirlsExportRow[], exportLabel: string) {
  const date = new Date().toISOString().slice(0, 10);
  downloadHhGirlsExcel(rows, `hh-girls-missing-${exportLabel}-${date}.xlsx`);
}

export function HhGirlsMissingSection({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const d = metrics?.missingDetail;

  if (!loading && !d) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Missing surveys
            </p>
            {!expanded && d && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                {d.totalMissingSurveys === 0
                  ? "None missing"
                  : `${d.totalMissingSurveys} missing`}
              </span>
            )}
          </div>
          {expanded && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Required interviews that were skipped while the respondent was
              available (not permanently unavailable, and not waiting on a
              temporary revisit). Example: mother + girl done, father never
              filed. Click a card to download Excel.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          aria-expanded={expanded}
          aria-label={
            expanded ? "Hide missing surveys" : "Show missing surveys"
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
              {loading || !d ? (
                <StatCardSkeleton count={5} />
              ) : (
                cards.map((card, i) => {
                    const Icon = card.icon;
                    const list = d.lists[card.listKey];
                    return (
                      <StatCard
                        key={card.label}
                        index={i}
                        muted
                        label={card.label}
                        value={card.value(d)}
                        icon={Icon}
                        color={card.color}
                        hint={card.hint}
                        hoverDetail={
                          card.hoverDetail?.(d) ??
                          (list.length > 0
                            ? `${list.length} record(s)`
                            : undefined)
                        }
                        onClick={
                          list.length > 0
                            ? () => downloadCardList(list, card.exportLabel)
                            : undefined
                        }
                      />
                    );
                  })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
