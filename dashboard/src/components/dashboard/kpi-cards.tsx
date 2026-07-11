"use client";

import { motion } from "framer-motion";
import {
  ClipboardCheck,
  FileStack,
  Home,
  MapPin,
  RefreshCw,
  Target,
  Users,
  Building2,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useFirm } from "@/components/brand/firm-provider";
import { PROTOCOL } from "@/lib/data/protocol";
import {
  toggleDashboardFilters,
  type DashboardFilters,
  type DashboardMetrics,
} from "@/lib/data/survey-metrics";
import { cn } from "@/lib/utils";

type SparkKey = "teal" | "deepTeal" | "gold";

const colorStyles: Record<
  string,
  { bg: string; text: string; sparkKey: SparkKey }
> = {
  teal: {
    bg: "bg-teal/10 dark:bg-teal/15",
    text: "text-teal",
    sparkKey: "teal",
  },
  "deep-teal": {
    bg: "bg-deep-teal/10 dark:bg-deep-teal/15",
    text: "text-deep-teal",
    sparkKey: "deepTeal",
  },
  gold: {
    bg: "bg-gold/15 dark:bg-gold/10",
    text: "text-amber-600 dark:text-gold",
    sparkKey: "gold",
  },
};

interface KpiCardsProps {
  metrics: DashboardMetrics;
  loading?: boolean;
  filters?: DashboardFilters;
  onFilterChange?: (filters: DashboardFilters) => void;
}

export function KpiCards({
  metrics,
  loading,
  filters,
  onFilterChange,
}: KpiCardsProps) {
  const { palette } = useFirm();
  const sparkline = metrics.submissionSparkline.map((p, i) => ({
    i,
    v: p.value,
  }));

  const trackingTargetPct =
    PROTOCOL.SUCCESSFUL_TRACKING_TARGET > 0
      ? (metrics.girlsTracked / PROTOCOL.SUCCESSFUL_TRACKING_TARGET) * 100
      : 0;
  const hhTargetPct = metrics.hhTargetProgress;

  const kpiConfig: {
    key: string;
    label: string;
    value: number;
    sublabel?: string;
    icon: typeof FileStack;
    color: string;
    suffix?: string;
    decimals?: number;
    filterPatch?: Partial<DashboardFilters>;
  }[] = [
    {
      key: "totalSubmissions",
      label: "Total Submissions",
      value: metrics.totalSubmissions,
      sublabel: `${metrics.tracking.total + metrics.household.total + metrics.girls.total} forms in view`,
      icon: FileStack,
      color: "teal",
    },
    {
      key: "girlsTracked",
      label: "Girls Tracked",
      value: metrics.girlsTracked,
      sublabel: `${trackingTargetPct.toFixed(1)}% of ${PROTOCOL.SUCCESSFUL_TRACKING_TARGET.toLocaleString()} target`,
      icon: Target,
      color: "teal",
      filterPatch: { surveyType: "tracking" },
    },
    {
      key: "trackingSuccessRate",
      label: "Tracking Success",
      value: metrics.trackingSuccessRate,
      sublabel: `${metrics.tracking.tracked} of ${metrics.tracking.uniqueGirls} attempted`,
      icon: MapPin,
      color: "teal",
      suffix: "%",
      decimals: 1,
      filterPatch: { surveyType: "tracking", status: "complete" },
    },
    {
      key: "hhTargetProgress",
      label: "HH Target Progress",
      value: hhTargetPct,
      sublabel: `${metrics.completedHouseholds.toLocaleString()} of ${PROTOCOL.HH_SURVEY_TARGET.toLocaleString()} completed`,
      icon: Home,
      color: "deep-teal",
      suffix: "%",
      decimals: 1,
      filterPatch: { surveyType: "household" },
    },
    {
      key: "completedHouseholds",
      label: "Completed HH",
      value: metrics.completedHouseholds,
      sublabel: `${metrics.household.bothParent} both-parent · ${metrics.household.uniqueGirls} unique girls`,
      icon: Building2,
      color: "deep-teal",
      filterPatch: { surveyType: "household", status: "complete" },
    },
    {
      key: "surveyCompletionRate",
      label: "Form Completion",
      value: metrics.surveyCompletionRate,
      sublabel: `${metrics.girlsCompletionRate.toFixed(1)}% girls survey complete`,
      icon: ClipboardCheck,
      color: "gold",
      suffix: "%",
      decimals: 1,
      filterPatch: { status: "complete" },
    },
    {
      key: "totalEnumerators",
      label: "Active Enumerators",
      value: metrics.totalEnumerators,
      sublabel: `${metrics.totalVillages} villages · ${metrics.totalSchools} schools`,
      icon: Users,
      color: "deep-teal",
    },
    {
      key: "totalRevisits",
      label: "Revisit Forms",
      value: metrics.totalRevisits,
      sublabel: "Across tracking, HH, and girls",
      icon: RefreshCw,
      color: "gold",
      filterPatch: { status: "revisit" },
    },
  ];

  if (loading) {
    return (
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  const pick = (patch?: Partial<DashboardFilters>) => {
    if (!patch || !filters || !onFilterChange) return;
    onFilterChange(toggleDashboardFilters(filters, patch));
  };

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Performance Snapshot
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Protocol-aligned KPIs · click a card to filter the dashboard
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiConfig.map((kpi, index) => {
          const Icon = kpi.icon;
          const colors = colorStyles[kpi.color];
          const spark = palette[colors.sparkKey];
          const clickable = Boolean(kpi.filterPatch && onFilterChange);
          const active =
            clickable &&
            filters &&
            kpi.filterPatch &&
            Object.entries(kpi.filterPatch).every(
              ([key, value]) =>
                filters[key as keyof DashboardFilters] === value
            );

          return (
            <motion.div
              key={kpi.key}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={() => pick(kpi.filterPatch)}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        pick(kpi.filterPatch);
                      }
                    }
                  : undefined
              }
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.05,
                type: "spring",
                stiffness: 260,
                damping: 24,
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={cn(
                "kpi-border group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all",
                active
                  ? "border-teal/50 shadow-md shadow-teal/10 ring-1 ring-teal/20"
                  : "border-border/60 hover:shadow-lg hover:shadow-teal/5",
                clickable &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                    colors.bg
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5", colors.text)}
                    aria-hidden="true"
                  />
                </div>
                {clickable && (
                  <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    Filter
                  </span>
                )}
              </div>

              <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                <AnimatedCounter
                  value={kpi.value}
                  suffix={kpi.suffix || ""}
                  decimals={kpi.decimals || 0}
                />
              </p>
              {kpi.sublabel && (
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {kpi.sublabel}
                </p>
              )}

              {sparkline.length > 1 && (
                <div className="mt-3 h-10 w-full opacity-50 transition-opacity group-hover:opacity-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkline}>
                      <defs>
                        <linearGradient
                          id={`spark-${kpi.key}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={spark}
                            stopOpacity={0.45}
                          />
                          <stop
                            offset="100%"
                            stopColor={spark}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={spark}
                        strokeWidth={1.5}
                        fill={`url(#spark-${kpi.key})`}
                        isAnimationActive
                        animationDuration={1200}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
