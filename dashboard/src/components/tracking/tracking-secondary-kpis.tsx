"use client";

import {
  Users,
  Percent,
  RefreshCw,
  MapPinOff,
  Truck,
  Handshake,
  AlertCircle,
  Copy,
  BarChart3,
  CheckCircle2,
  UserX,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type {
  OperationalKpiKey,
  OperationalKpiLists,
  TrackingMetrics,
} from "@/lib/data/tracking-metrics";
import { downloadOperationalKpiExcel } from "@/lib/export/operational-kpi-excel";

type SecondaryKpis = TrackingMetrics["secondaryKpis"];

const cards: {
  key: OperationalKpiKey;
  exportLabel: string;
  label: string;
  hint: string;
  icon: typeof Users;
  color: string;
  suffix?: string;
  decimals?: number;
}[] = [
  {
    key: "uniqueGirlsAttempted",
    exportLabel: "girls-attempted",
    label: "Girls Attempted",
    hint: "Unique girls — one girl may have several visit submissions (1st, 2nd, 3rd)",
    icon: Users,
    color: "text-teal",
  },
  {
    key: "trackedGirls",
    exportLabel: "tracked-girls",
    label: "Tracked Girls",
    hint: "Unique girls meeting the full tracking success criteria",
    icon: CheckCircle2,
    color: "text-teal",
  },
  {
    key: "dataCoverageRate",
    exportLabel: "field-coverage",
    label: "Field Coverage %",
    hint: "Attempted vs assignment pool target",
    icon: Percent,
    color: "text-blue-600",
    suffix: "%",
    decimals: 1,
  },
  {
    key: "successRate",
    exportLabel: "success-rate",
    label: "Success Rate %",
    hint: "Successfully tracked girls vs protocol success target",
    icon: Percent,
    color: "text-teal",
    suffix: "%",
    decimals: 1,
  },
  {
    key: "attemptedNotTracked",
    exportLabel: "not-tracked",
    label: "Not Tracked",
    hint: "Unique girls never tracked on any attempt (if tracked on 2nd/3rd visit, prior fails are excluded)",
    icon: UserX,
    color: "text-orange-600",
  },
  {
    key: "girlNotFound",
    exportLabel: "girl-not-found",
    label: "Girl Not Found",
    hint: "Case 1: house_found = 1 with girl_found = 4, 99, or 999 (incomplete, no revisit)",
    icon: UserX,
    color: "text-red-500",
  },
  {
    key: "noConsentGirls",
    exportLabel: "no-consent",
    label: "No Consent",
    hint: "Consent explicitly refused (consent = 0 or 2)",
    icon: Handshake,
    color: "text-amber-600",
  },
  {
    key: "revisitSubmissions",
    exportLabel: "follow-up-attempts",
    label: "Follow-up Attempts",
    hint: "2nd & 3rd visits when the girl was not yet located on a prior attempt",
    icon: RefreshCw,
    color: "text-amber-600",
  },
  {
    key: "revisitGirls",
    exportLabel: "girls-revisited",
    label: "Girls Revisited",
    hint: "Girls with an actual follow-up visit after a prior unsuccessful attempt",
    icon: RefreshCw,
    color: "text-amber-500",
  },
  {
    key: "girls2023",
    exportLabel: "girls-2023",
    label: "Girls 2023",
    hint: "Unique girls from the 2022-2023 listing (baseline + new sample batch 1)",
    icon: Users,
    color: "text-teal",
  },
  {
    key: "girls2024",
    exportLabel: "girls-2024",
    label: "Girls 2024",
    hint: "Unique girls from the 2023-2024 listing (new sample batch 2)",
    icon: Users,
    color: "text-deep-teal",
  },
  {
    key: "houseUntraceableGirls",
    exportLabel: "untraceable-hh",
    label: "Untraceable HH",
    hint: "House not found after checks",
    icon: MapPinOff,
    color: "text-red-500",
  },
  {
    key: "familyMovedGirls",
    exportLabel: "family-moved",
    label: "Family Moved",
    hint: "Tracked at new address",
    icon: Truck,
    color: "text-deep-teal",
  },
  {
    key: "consentRate",
    exportLabel: "consent-rate",
    label: "Consent Rate %",
    hint: "Among located households",
    icon: Handshake,
    color: "text-teal",
    suffix: "%",
    decimals: 1,
  },
  {
    key: "completionRate",
    exportLabel: "form-completion",
    label: "Form Completion %",
    hint: "survey_status = 1, excluding protocol Cases 1–6 terminal incomplete",
    icon: CheckCircle2,
    color: "text-green-600",
    suffix: "%",
    decimals: 1,
  },
  {
    key: "incompleteSubmissions",
    exportLabel: "incomplete-other",
    label: "Incomplete / Other",
    hint: "Status incomplete/other, or protocol Cases 1–6 (no revisit)",
    icon: AlertCircle,
    color: "text-orange-500",
  },
  {
    key: "duplicateSubmissions",
    exportLabel: "duplicate-visits",
    label: "Extra Forms (Gap)",
    hint: "Submissions − Attempted girls — see Duplicate records for the full mutually exclusive breakdown",
    icon: Copy,
    color: "text-purple-500",
  },
  {
    key: "avgGirlsPerEnumerator",
    exportLabel: "girls-per-enumerator",
    label: "Girls / Enumerator",
    hint: "Average unique girls per enumerator",
    icon: BarChart3,
    color: "text-sky-600",
  },
];

function downloadCardExport(
  lists: OperationalKpiLists,
  key: OperationalKpiKey,
  exportLabel: string
) {
  const date = new Date().toISOString().slice(0, 10);
  downloadOperationalKpiExcel(
    lists[key],
    `operational-${exportLabel}-${date}.xlsx`
  );
}

export function TrackingSecondaryKpis({
  metrics,
  loading,
  buildExportMetrics,
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
  /** Rebuild full Excel lists on click when they were skipped during filtering. */
  buildExportMetrics?: () => TrackingMetrics | undefined;
}) {
  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatCardSkeleton count={cards.length} />
      </div>
    );
  }

  if (!metrics?.secondaryKpis || !metrics.operationalKpiLists) return null;

  const s: SecondaryKpis = metrics.secondaryKpis;
  const lists = metrics.operationalKpiLists;

  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Operational metrics
      </p>
      <p className="mb-3 text-[10px] text-muted-foreground">
        Click any card to download the underlying records as an Excel file.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {cards.map((card, i) => {
          const exportData = lists[card.key];
          const hasCachedExport =
            exportData.rows.length > 0 ||
            (exportData.enumeratorSummary?.length ?? 0) > 0;
          const value = s[card.key] as number;
          const canDownload =
            hasCachedExport || (value > 0 && !!buildExportMetrics);

          return (
            <StatCard
              key={card.key}
              index={i}
              muted
              label={card.label}
              value={value}
              icon={card.icon}
              color={card.color}
              hint={card.hint}
              suffix={card.suffix}
              decimals={card.decimals}
              hoverDetail={
                card.key === "revisitSubmissions"
                  ? `2nd attempts: ${s.revisit2ndSubmissions} · 3rd attempts: ${s.revisit3rdSubmissions}`
                  : card.key === "revisitGirls"
                    ? `2nd revisits: ${s.girls2ndRevisit} girls · 3rd revisits: ${s.girls3rdRevisit} girls`
                    : hasCachedExport
                      ? `${exportData.rows.length || exportData.enumeratorSummary?.length || 0} record(s)`
                      : canDownload
                        ? "Click to prepare Excel download"
                        : undefined
              }
              onClick={
                canDownload
                  ? () => {
                      if (hasCachedExport) {
                        downloadCardExport(lists, card.key, card.exportLabel);
                        return;
                      }
                      const full = buildExportMetrics?.();
                      if (!full?.operationalKpiLists) return;
                      downloadCardExport(
                        full.operationalKpiLists,
                        card.key,
                        card.exportLabel
                      );
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
