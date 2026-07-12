"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Target,
  UserCheck,
  Users2,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { PageHero } from "@/components/ui/page-hero";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import type { ErrorMetrics } from "@/lib/data/error-metrics";
import { PROTOCOL } from "@/lib/data/protocol";
import {
  DASHBOARD_METRICS_QUERY_KEY,
  fetchDashboardMetrics,
  QUERY_STALE_MS,
} from "@/lib/queries/app-data";
import { cn } from "@/lib/utils";

async function fetchErrors(): Promise<ErrorMetrics> {
  const res = await fetch("/api/errors");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function SurveysPage() {
  const { data, isLoading } = useQuery({
    queryKey: [...DASHBOARD_METRICS_QUERY_KEY],
    queryFn: fetchDashboardMetrics,
    staleTime: QUERY_STALE_MS,
  });
  const { data: errors } = useQuery({
    queryKey: ["error-metrics"],
    queryFn: fetchErrors,
  });

  const surveys = [
    {
      title: "Tracking Survey",
      desc: "Locate and verify listed girls across districts against the protocol success target.",
      stats: [
        { label: "Tracked", value: data?.girlsTracked },
        {
          label: "Target %",
          value: data?.trackingTargetProgress,
          decimals: 1,
          suffix: "%",
        },
      ],
      href: "/tracking",
      accent: "text-teal",
      chip: "bg-teal/10 text-teal",
      bar: "bg-teal",
      progress: data?.trackingTargetProgress ?? 0,
      progressLabel: `${(data?.girlsTracked ?? 0).toLocaleString()} / ${PROTOCOL.SUCCESSFUL_TRACKING_TARGET.toLocaleString()}`,
      icon: Users2,
    },
    {
      title: "HH / Girls Survey",
      desc: "Household parent interviews and direct girl survey with learning assessment.",
      stats: [
        { label: "Completed HH", value: data?.completedHouseholds },
        {
          label: "Target %",
          value: data?.hhTargetProgress,
          decimals: 1,
          suffix: "%",
        },
      ],
      href: "/surveys/hh-girls",
      accent: "text-deep-teal",
      chip: "bg-deep-teal/10 text-deep-teal",
      bar: "bg-deep-teal",
      progress: data?.hhTargetProgress ?? 0,
      progressLabel: `${(data?.completedHouseholds ?? 0).toLocaleString()} / ${PROTOCOL.HH_SURVEY_TARGET.toLocaleString()}`,
      icon: UserCheck,
    },
    {
      title: "Error Report",
      desc: "DQA issues for Tracking (baseline + new sample), Household, and Girls surveys.",
      stats: [
        { label: "Total Errors", value: errors?.totalErrors },
        { label: "Critical", value: errors?.criticalErrors },
      ],
      href: "/surveys/errors",
      accent: "text-red-600",
      chip: "bg-red-500/10 text-red-600",
      bar: "bg-red-500",
      progress:
        errors && errors.totalErrors > 0
          ? (errors.criticalErrors / errors.totalErrors) * 100
          : 0,
      progressLabel: `${errors?.criticalErrors ?? 0} critical of ${errors?.totalErrors ?? 0}`,
      icon: AlertTriangle,
    },
  ];

  return (
    <div>
      <PageHero
        eyebrow="Survey programme hub"
        title="Survey Modules"
        accent="Overview"
        description="Jump into tracking, HH/girls, or error reporting with live protocol progress and quality signals."
        loading={isLoading}
        links={[
          { href: "/", label: "Dashboard" },
          { href: "/analytics", label: "Analytics" },
          { href: "/monitoring", label: "Monitoring" },
        ]}
        stats={[
          {
            label: "Tracked girls",
            value: data?.girlsTracked ?? 0,
            icon: Target,
            colorClass: "text-teal",
          },
          {
            label: "Completed HH",
            value: data?.completedHouseholds ?? 0,
            icon: ClipboardCheck,
            colorClass: "text-deep-teal",
          },
          {
            label: "Girls surveys",
            value: data?.uniqueGirlsCompleted ?? 0,
            icon: UserCheck,
            colorClass: "text-amber-600 dark:text-gold",
          },
          {
            label: "Errors",
            value: errors?.totalErrors ?? 0,
            icon: AlertTriangle,
            colorClass: "text-red-600",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {surveys.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-teal/30 hover:shadow-lg hover:shadow-teal/5"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    s.chip
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-teal"
                >
                  Open
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>

              <div className="mt-5 flex gap-6">
                {s.stats.map((st) => (
                  <div key={st.label}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {st.label}
                    </p>
                    <p className={cn("text-xl font-bold tabular-nums", s.accent)}>
                      {isLoading ? (
                        "-"
                      ) : (
                        <AnimatedCounter
                          value={st.value ?? 0}
                          decimals={st.decimals}
                          suffix={st.suffix}
                        />
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Progress</span>
                  <span>{s.progressLabel}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, s.progress)}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className={cn("h-full rounded-full", s.bar)}
                  />
                </div>
              </div>

              <Link
                href={s.href}
                className="absolute inset-0"
                aria-label={`Open ${s.title}`}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
