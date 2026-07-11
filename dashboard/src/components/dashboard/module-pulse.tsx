"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Home, MapPin, UserRound } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { PROTOCOL } from "@/lib/data/protocol";
import {
  toggleDashboardFilters,
  type DashboardFilters,
  type DashboardMetrics,
} from "@/lib/data/survey-metrics";
import { cn } from "@/lib/utils";

interface ModulePulseProps {
  metrics: DashboardMetrics;
  loading?: boolean;
  filters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
}

function ProgressBar({
  pct,
  barClass,
}: {
  pct: number;
  barClass: string;
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted/70">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className={cn("h-full rounded-full", barClass)}
      />
    </div>
  );
}

export function ModulePulse({
  metrics,
  loading,
  filters,
  onFilterChange,
}: ModulePulseProps) {
  if (loading) {
    return (
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  const modules = [
    {
      key: "tracking",
      title: "Tracking Survey",
      href: "/tracking",
      icon: MapPin,
      accent: "text-teal",
      bar: "bg-teal",
      chip: "bg-teal/10 text-teal",
      filterPatch: { surveyType: "tracking" as const },
      primary: metrics.girlsTracked,
      primaryLabel: "Tracked girls",
      secondary: `${metrics.trackingTargetProgress.toFixed(1)}% of target · ${metrics.tracking.total.toLocaleString()} forms`,
      progress: metrics.trackingTargetProgress,
      progressLabel: `${metrics.girlsTracked.toLocaleString()} / ${PROTOCOL.SUCCESSFUL_TRACKING_TARGET.toLocaleString()} target`,
    },
    {
      key: "household",
      title: "Household Survey",
      href: "/surveys/hh-girls",
      icon: Home,
      accent: "text-deep-teal",
      bar: "bg-deep-teal",
      chip: "bg-deep-teal/10 text-deep-teal",
      filterPatch: { surveyType: "household" as const },
      primary: metrics.completedHouseholds,
      primaryLabel: "Completed households",
      secondary: `${metrics.hhTargetProgress.toFixed(1)}% of target · ${metrics.household.total.toLocaleString()} forms`,
      progress: metrics.hhTargetProgress,
      progressLabel: `${metrics.completedHouseholds.toLocaleString()} / ${PROTOCOL.HH_SURVEY_TARGET.toLocaleString()} target`,
    },
    {
      key: "girls",
      title: "Girls Survey",
      href: "/surveys/hh-girls",
      icon: UserRound,
      accent: "text-amber-600 dark:text-gold",
      bar: "bg-gold",
      chip: "bg-gold/15 text-amber-700 dark:text-gold",
      filterPatch: { surveyType: "girls" as const },
      primary: metrics.girls.complete,
      primaryLabel: "Completed forms",
      secondary: `${metrics.girlsCompletionRate.toFixed(1)}% completion · ${metrics.girls.total.toLocaleString()} forms`,
      progress: metrics.girlsCompletionRate,
      progressLabel: `${metrics.girls.complete.toLocaleString()} complete of ${metrics.girls.total.toLocaleString()}`,
    },
  ];

  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Module Pulse</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Cross-module rollout health · filter in place or open the deep dive
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {modules.map((mod, index) => {
          const Icon = mod.icon;
          const active = filters.surveyType === mod.filterPatch.surveyType;

          return (
            <motion.div
              key={mod.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + index * 0.06 }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all",
                active
                  ? "border-teal/45 shadow-md shadow-teal/10"
                  : "border-border/60 hover:border-teal/30 hover:shadow-md"
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      mod.chip
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {mod.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {mod.primaryLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onFilterChange(
                      toggleDashboardFilters(filters, mod.filterPatch)
                    )
                  }
                  className={cn(
                    "rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    active
                      ? "bg-teal/15 text-teal"
                      : "bg-muted/60 text-muted-foreground hover:bg-teal/10 hover:text-teal"
                  )}
                >
                  {active ? "Filtered" : "Filter"}
                </button>
              </div>

              <p className={cn("text-3xl font-bold tabular-nums", mod.accent)}>
                <AnimatedCounter value={mod.primary} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{mod.secondary}</p>

              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Progress</span>
                  <span>{mod.progressLabel}</span>
                </div>
                <ProgressBar pct={mod.progress} barClass={mod.bar} />
              </div>

              <Link
                href={mod.href}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-teal"
              >
                Open module
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
