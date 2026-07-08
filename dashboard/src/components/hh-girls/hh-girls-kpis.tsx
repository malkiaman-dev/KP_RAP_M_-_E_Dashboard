"use client";

import {
  FileStack,
  MapPin,
  Users,
  Home,
  UserCheck,
  UserX,
  AlertTriangle,
  Percent,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";

export function HhGirlsHouseholdKpis({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
}) {
  if (loading || !metrics) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton count={8} />
      </div>
    );
  }

  const hh = metrics.household;
  const items = [
    { label: "Total Submissions", value: hh.totalSubmissions, icon: FileStack, color: "text-foreground" },
    { label: "HH Total Villages", value: hh.totalVillages, icon: MapPin, color: "text-foreground" },
    { label: "Households (Girls)", value: hh.uniqueGirls, icon: Users, color: "text-sky-500" },
    { label: "HH Both Parent", value: hh.bothParent, icon: UserCheck, color: "text-teal" },
    { label: "HH Single Parent", value: hh.singleParent, icon: UserX, color: "text-amber-500" },
    { label: "Both Agree Missing One", value: hh.bothAgreeMissingOne, icon: AlertTriangle, color: "text-red-500" },
    { label: "Completion Rate", value: hh.completionRate, icon: Percent, color: "text-red-500", suffix: "%", decimals: 1 },
    { label: "HH Consent Inconsistent", value: hh.consentInconsistent, icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <StatCard key={item.label} index={i} {...item} />
      ))}
    </div>
  );
}

export function HhGirlsGirlsKpis({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
}) {
  if (loading || !metrics) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton count={8} />
      </div>
    );
  }

  const gs = metrics.girls;
  const items = [
    { label: "Total Submissions", value: gs.totalSubmissions, icon: FileStack, color: "text-foreground" },
    { label: "Total Villages", value: gs.totalVillages, icon: MapPin, color: "text-amber-500" },
    { label: "Total Enumerators", value: gs.totalEnumerators, icon: Users, color: "text-pink-500" },
    { label: "Total Girls", value: gs.uniqueGirls, icon: Users, color: "text-sky-500" },
    { label: "GS Available Girls", value: gs.availableGirls, icon: UserCheck, color: "text-teal" },
    { label: "Studying Girls", value: gs.studyingGirls, icon: Home, color: "text-sky-400" },
    { label: "Studying & Enrolled", value: gs.studyingEnrolled, icon: UserCheck, color: "text-teal" },
    { label: "GS Studying Rate", value: gs.studyingRate, icon: Percent, color: "text-amber-500", suffix: "%", decimals: 1 },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <StatCard key={item.label} index={i} {...item} />
      ))}
    </div>
  );
}
