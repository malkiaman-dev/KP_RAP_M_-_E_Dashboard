"use client";

import { motion } from "framer-motion";
import {
  FileStack,
  MapPin,
  Users,
  ClipboardCheck,
  Home,
  RefreshCw,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

type KpiKey =
  | "totalSubmissions"
  | "girlsTracked"
  | "totalEnumerators"
  | "surveyCompletionRate"
  | "trackingSuccessRate"
  | "hhCompletionRate";

const colorMap: Record<string, { bg: string; text: string; spark: string }> = {
  teal: {
    bg: "bg-teal/10 dark:bg-teal/15",
    text: "text-teal",
    spark: "#21A1AA",
  },
  "deep-teal": {
    bg: "bg-deep-teal/10 dark:bg-deep-teal/15",
    text: "text-deep-teal",
    spark: "#178891",
  },
  gold: {
    bg: "bg-gold/15 dark:bg-gold/10",
    text: "text-amber-600 dark:text-gold",
    spark: "#EDCA5C",
  },
};

interface KpiCardsProps {
  metrics: DashboardMetrics;
  loading?: boolean;
}

export function KpiCards({ metrics, loading }: KpiCardsProps) {
  const sparkline = metrics.submissionSparkline.map((p, i) => ({
    i,
    v: p.value,
  }));

  const kpiConfig: {
    key: KpiKey;
    label: string;
    sublabel?: string;
    icon: typeof FileStack;
    color: string;
    suffix?: string;
    decimals?: number;
  }[] = [
    {
      key: "totalSubmissions",
      label: "Total Submissions",
      icon: FileStack,
      color: "teal",
    },
    {
      key: "girlsTracked",
      label: "Girls Tracked",
      sublabel: `of ${metrics.tracking.uniqueGirls} assigned`,
      icon: MapPin,
      color: "teal",
    },
    {
      key: "totalEnumerators",
      label: "Active Enumerators",
      icon: Users,
      color: "deep-teal",
    },
    {
      key: "surveyCompletionRate",
      label: "Survey Completion Rate",
      icon: ClipboardCheck,
      color: "gold",
      suffix: "%",
      decimals: 1,
    },
    {
      key: "trackingSuccessRate",
      label: "Tracking Success Rate",
      icon: MapPin,
      color: "teal",
      suffix: "%",
      decimals: 1,
    },
    {
      key: "hhCompletionRate",
      label: "HH Both Parents",
      sublabel: `${metrics.household.bothParent} households`,
      icon: Home,
      color: "deep-teal",
      suffix: "%",
      decimals: 1,
    },
  ];

  if (loading) {
    return (
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {kpiConfig.map((kpi, index) => {
        const Icon = kpi.icon;
        const colors = colorMap[kpi.color];
        const value = metrics[kpi.key];

        return (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.08,
              type: "spring",
              stiffness: 260,
              damping: 24,
            }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="kpi-border group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-lg hover:shadow-teal/5"
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                colors.bg
              )}
            >
              <Icon className={cn("h-5 w-5", colors.text)} aria-hidden="true" />
            </div>

            <p className="mt-4 text-xs font-medium text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              <AnimatedCounter
                value={value}
                suffix={kpi.suffix || ""}
                decimals={kpi.decimals || 0}
              />
            </p>
            {kpi.sublabel && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {kpi.sublabel}
              </p>
            )}

            {sparkline.length > 1 && (
              <div className="mt-3 h-10 w-full opacity-60 transition-opacity group-hover:opacity-100">
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
                          stopColor={colors.spark}
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor={colors.spark}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={colors.spark}
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

      {metrics.totalRevisits > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-full flex items-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-2 text-xs text-muted-foreground sm:col-span-2 xl:col-span-3"
        >
          <RefreshCw className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
          <span>
            <strong className="text-foreground">{metrics.totalRevisits}</strong>{" "}
            revisit submissions across tracking, household, and girls surveys
          </span>
        </motion.div>
      )}
    </div>
  );
}
