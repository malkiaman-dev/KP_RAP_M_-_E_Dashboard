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
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";

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
  const items = [
    {
      label: "Total Submissions",
      value: c.totalSubmissions,
      icon: FileStack,
      color: "text-foreground",
      hint: "All household (father + mother) and girls survey forms",
    },
    {
      label: "Unique Submissions",
      value: c.uniqueGirls,
      icon: Users,
      color: "text-sky-500",
      hint: "Unique tracked girls across all survey forms (deduplicated by girl ID)",
    },
    {
      label: "Father Surveys",
      value: c.fatherSurveys,
      icon: UserCheck,
      color: "text-gold",
      hint: "Household survey submissions with father respondent",
    },
    {
      label: "Mother Surveys",
      value: c.motherSurveys,
      icon: UserCheck,
      color: "text-teal",
      hint: "Household survey submissions with mother respondent",
    },
    {
      label: "Girls Surveys",
      value: c.girlsSurveys,
      icon: UserCheck,
      color: "text-blue-500",
      hint: "Direct girl interview submissions",
    },
    {
      label: "Total Unavailable",
      value: c.totalUnavailable,
      icon: Ban,
      color: "text-amber-500",
      hint: "Girls with father, mother, or girl unavailability on any visit",
    },
    {
      label: "Father Not Available",
      value: c.fatherNotAvailable,
      icon: UserX,
      color: "text-orange-500",
      hint: "Tracked girls without a father household survey submission",
    },
    {
      label: "Mother Not Available",
      value: c.motherNotAvailable,
      icon: UserX,
      color: "text-red-500",
      hint: "Tracked girls without a mother household survey submission",
    },
    {
      label: "Girl Not Available",
      value: c.girlNotAvailable,
      icon: UserX,
      color: "text-purple-500",
      hint: "Girls survey visits where the girl was not available",
    },
    {
      label: "Consent Refused",
      value: c.consentRefused,
      icon: Handshake,
      color: "text-red-500",
      hint: "Parent or child consent explicitly refused across all survey forms",
    },
    {
      label: "Completed Households",
      value: c.completedHouseholds,
      icon: Home,
      color: "text-teal",
      hint: `Girl + mother + father surveys complete with consent · Target ${metrics.targetN.toLocaleString()}`,
      hoverDetail: `${c.progressToTarget.toFixed(1)}% of rollout target`,
    },
  ];

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <StatCard key={item.label} index={i} {...item} />
      ))}
    </div>
  );
}
