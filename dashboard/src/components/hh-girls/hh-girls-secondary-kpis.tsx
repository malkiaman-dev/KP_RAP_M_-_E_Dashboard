"use client";

import {
  Users,
  Percent,
  RefreshCw,
  UserCheck,
  UserX,
  FileStack,
  Target,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";

export function HhGirlsSecondaryKpis({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
}) {
  if (loading || !metrics) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatCardSkeleton count={6} />
      </div>
    );
  }

  const hh = metrics.household;
  const gs = metrics.girls;

  const items = [
    {
      label: "Mother Forms",
      value: hh.motherForms,
      icon: UserCheck,
      color: "text-teal",
      hint: "Mother respondent submissions (required)",
    },
    {
      label: "Father Forms",
      value: hh.fatherForms,
      icon: UserCheck,
      color: "text-gold",
      hint: "Father respondent submissions",
    },
    {
      label: "Progress to Target",
      value: hh.progressToTarget,
      icon: Target,
      color: "text-teal",
      suffix: "%",
      decimals: 1,
      hint: `Both-parent households vs ${metrics.targetN.toLocaleString()} target`,
    },
    {
      label: "HH Enumerators",
      value: hh.totalEnumerators,
      icon: Users,
      color: "text-sky-500",
      hint: "Unique enumerators on household survey",
    },
    {
      label: "Parental Consent",
      value: gs.parentalConsentRate,
      icon: Percent,
      color: "text-teal",
      suffix: "%",
      decimals: 1,
      hint: "Parental consent agreed among girls surveyed",
    },
    {
      label: "GS Revisits",
      value: gs.revisits,
      icon: RefreshCw,
      color: "text-amber-500",
      hint: "Girls survey attempts after the first visit",
    },
    {
      label: "Parent Refused",
      value: gs.parentConsentRefused,
      icon: UserX,
      color: "text-red-500",
      hint: "Parental consent explicitly refused",
    },
    {
      label: "Child Refused",
      value: gs.childConsentRefused,
      icon: UserX,
      color: "text-orange-500",
      hint: "Child consent explicitly refused",
    },
    {
      label: "GS Complete",
      value: gs.complete,
      icon: FileStack,
      color: "text-green-600",
      hint: "Girls survey submissions marked complete",
    },
  ];

  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Operational metrics
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {items.map((item, i) => (
          <StatCard key={item.label} index={i} muted {...item} />
        ))}
      </div>
    </div>
  );
}
