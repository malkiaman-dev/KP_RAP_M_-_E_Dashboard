"use client";

import {
  FileStack,
  Users,
  UserCheck,
  UserX,
  Ban,
  Home,
  Handshake,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type { HhGirlsCoreKpiKey } from "@/lib/data/hh-girls-core-kpi-lists";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import { downloadHhGirlsExcel } from "@/lib/export/hh-girls-excel";

const kpiConfig: {
  key: HhGirlsCoreKpiKey;
  exportLabel: string;
  label: string;
  icon: typeof FileStack;
  color: string;
  hint: string;
  suffix?: string;
  decimals?: number;
  hoverDetail?: (metrics: HhGirlsMetrics) => string | undefined;
}[] = [
  {
    key: "totalSubmissions",
    exportLabel: "total-submissions",
    label: "Total Submissions",
    icon: FileStack,
    color: "text-foreground",
    hint: "All household (father + mother) and girls survey forms",
  },
  {
    key: "uniqueGirls",
    exportLabel: "unique-girls",
    label: "Unique Submissions",
    icon: Users,
    color: "text-sky-500",
    hint: "Unique tracked girls across all survey forms (deduplicated by girl ID)",
  },
  {
    key: "fatherSurveys",
    exportLabel: "father-surveys",
    label: "Father Surveys",
    icon: UserCheck,
    color: "text-gold",
    hint: "Household survey submissions with father respondent",
  },
  {
    key: "motherSurveys",
    exportLabel: "mother-surveys",
    label: "Mother Surveys",
    icon: UserCheck,
    color: "text-teal",
    hint: "Household survey submissions with mother respondent",
  },
  {
    key: "girlsSurveys",
    exportLabel: "girls-surveys",
    label: "Girls Surveys",
    icon: UserCheck,
    color: "text-blue-500",
    hint: "Direct girl interview submissions",
  },
  {
    key: "totalUnavailable",
    exportLabel: "total-unavailable",
    label: "Total Unavailable",
    icon: Ban,
    color: "text-amber-500",
    hint: "Girls with father, mother, or girl unavailability on any visit",
  },
  {
    key: "fatherNotAvailable",
    exportLabel: "father-not-available",
    label: "Father Not Available",
    icon: UserX,
    color: "text-orange-500",
    hint: "Tracked girls without a father household survey submission",
  },
  {
    key: "motherNotAvailable",
    exportLabel: "mother-not-available",
    label: "Mother Not Available",
    icon: UserX,
    color: "text-red-500",
    hint: "Tracked girls without a mother household survey submission",
  },
  {
    key: "girlNotAvailable",
    exportLabel: "girl-not-available",
    label: "Girl Not Available",
    icon: UserX,
    color: "text-purple-500",
    hint: "Girls survey visits where the girl was not available",
  },
  {
    key: "consentRefused",
    exportLabel: "consent-refused",
    label: "Consent Refused",
    icon: Handshake,
    color: "text-red-500",
    hint: "Parent or child consent explicitly refused across all survey forms",
  },
  {
    key: "completedHouseholds",
    exportLabel: "completed-households",
    label: "Completed Households",
    icon: Home,
    color: "text-teal",
    hint: "Girl survey + parent slots complete or permanently unavailable; temporary unavailability blocks until revisits",
    hoverDetail: (metrics) =>
      `${metrics.core.progressToTarget.toFixed(1)}% of ${metrics.core.hhTarget.toLocaleString()} target`,
  },
];

function downloadCoreKpi(
  metrics: HhGirlsMetrics,
  key: HhGirlsCoreKpiKey,
  exportLabel: string
) {
  const rows = metrics.coreKpiLists[key];
  const date = new Date().toISOString().slice(0, 10);
  downloadHhGirlsExcel(rows, `hh-girls-kpi-${exportLabel}-${date}.xlsx`);
}

export function HhGirlsCoreKpis({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
}) {
  if (loading || !metrics) {
    return (
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton count={11} />
      </div>
    );
  }

  const c = metrics.core;

  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Operational metrics
      </p>
      <p className="mb-3 text-[10px] text-muted-foreground">
        Click any card to download the underlying records as an Excel file.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiConfig.map((item, i) => {
          const rows = metrics.coreKpiLists[item.key];
          const hasExport = rows.length > 0;
          const value = c[item.key as keyof typeof c] as number;

          return (
            <StatCard
              key={item.key}
              index={i}
              label={item.label}
              value={value}
              icon={item.icon}
              color={item.color}
              hint={item.hint}
              suffix={item.suffix}
              decimals={item.decimals}
              muted
              hoverDetail={
                item.hoverDetail?.(metrics) ??
                (hasExport ? `${rows.length} record(s)` : undefined)
              }
              onClick={
                hasExport
                  ? () => downloadCoreKpi(metrics, item.key, item.exportLabel)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
