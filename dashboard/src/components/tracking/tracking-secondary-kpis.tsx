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
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";

type SecondaryKpis = TrackingMetrics["secondaryKpis"];

const cards: {
  key: keyof SecondaryKpis;
  label: string;
  hint: string;
  icon: typeof Users;
  color: string;
  suffix?: string;
  decimals?: number;
}[] = [
  {
    key: "uniqueGirlsAttempted",
    label: "Girls Attempted",
    hint: "Unique girls in filtered export",
    icon: Users,
    color: "text-teal",
  },
  {
    key: "trackedGirls",
    label: "Tracked Girls",
    hint: "Unique girls meeting the full tracking success criteria",
    icon: CheckCircle2,
    color: "text-teal",
  },
  {
    key: "dataCoverageRate",
    label: "Field Coverage %",
    hint: "Attempted vs assignment pool target",
    icon: Percent,
    color: "text-blue-600",
    suffix: "%",
    decimals: 1,
  },
  {
    key: "successRate",
    label: "Success Rate %",
    hint: "Successfully tracked girls vs protocol success target",
    icon: Percent,
    color: "text-teal",
    suffix: "%",
    decimals: 1,
  },
  {
    key: "attemptedNotTracked",
    label: "Not Tracked",
    hint: "Attempted but missing success criteria",
    icon: UserX,
    color: "text-orange-600",
  },
  {
    key: "girlNotFound",
    label: "Girl Not Found",
    hint: "House located but girl not found",
    icon: UserX,
    color: "text-red-500",
  },
  {
    key: "noConsentGirls",
    label: "No Consent",
    hint: "Consent explicitly refused (consent = 0 or 2)",
    icon: Handshake,
    color: "text-amber-600",
  },
  {
    key: "revisitSubmissions",
    label: "Follow-up Attempts",
    hint: "2nd & 3rd visits when the girl was not yet located on a prior attempt",
    icon: RefreshCw,
    color: "text-amber-600",
  },
  {
    key: "revisitGirls",
    label: "Girls Revisited",
    hint: "Girls with an actual follow-up visit after a prior unsuccessful attempt",
    icon: RefreshCw,
    color: "text-amber-500",
  },
  {
    key: "girls2023",
    label: "Girls 2023",
    hint: "Unique girls from the 2022-2023 listing (baseline + new sample batch 1)",
    icon: Users,
    color: "text-teal",
  },
  {
    key: "girls2024",
    label: "Girls 2024",
    hint: "Unique girls from the 2023-2024 listing (new sample batch 2)",
    icon: Users,
    color: "text-deep-teal",
  },
  {
    key: "houseUntraceableGirls",
    label: "Untraceable HH",
    hint: "House not found after checks",
    icon: MapPinOff,
    color: "text-red-500",
  },
  {
    key: "familyMovedGirls",
    label: "Family Moved",
    hint: "Tracked at new address",
    icon: Truck,
    color: "text-deep-teal",
  },
  {
    key: "consentRate",
    label: "Consent Rate %",
    hint: "Among located households",
    icon: Handshake,
    color: "text-teal",
    suffix: "%",
    decimals: 1,
  },
  {
    key: "completionRate",
    label: "Form Completion %",
    hint: "Submissions marked complete",
    icon: CheckCircle2,
    color: "text-green-600",
    suffix: "%",
    decimals: 1,
  },
  {
    key: "incompleteSubmissions",
    label: "Incomplete / Other",
    hint: "Status incomplete or other",
    icon: AlertCircle,
    color: "text-orange-500",
  },
  {
    key: "duplicateSubmissions",
    label: "Duplicate Visits",
    hint: "Same girl + visit submitted twice",
    icon: Copy,
    color: "text-purple-500",
  },
  {
    key: "avgGirlsPerEnumerator",
    label: "Girls / Enumerator",
    hint: "Average unique girls per enumerator",
    icon: BarChart3,
    color: "text-sky-600",
  },
];

export function TrackingSecondaryKpis({
  metrics,
  loading,
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatCardSkeleton count={cards.length} />
      </div>
    );
  }

  if (!metrics?.secondaryKpis) return null;

  const s = metrics.secondaryKpis;

  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Operational metrics
      </p>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {cards.map((card, i) => (
          <StatCard
            key={card.key}
            index={i}
            muted
            label={card.label}
            value={s[card.key] as number}
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
                  : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
