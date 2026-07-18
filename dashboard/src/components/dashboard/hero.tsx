"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Calendar,
  MapPin,
  Radio,
  School,
  Target,
  Users,
} from "lucide-react";
import { FieldPeriodToggle } from "@/components/filters/field-period-toggle";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { FIRMS } from "@/lib/brand";
import { PROTOCOL } from "@/lib/data/protocol";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import { cn, formatDisplayDate } from "@/lib/utils";

function formatDate(iso: string) {
  if (!iso) return "-";
  return formatDisplayDate(iso) || "-";
}

function ProgressRing({
  value,
  max,
  colorClass,
  trackClass,
  size = 96,
  stroke = 8,
}: {
  value: number;
  max: number;
  colorClass: string;
  trackClass: string;
  size?: number;
  stroke?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackClass}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={colorClass}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums text-foreground">
          {pct.toFixed(0)}
          <span className="text-xs font-semibold text-muted-foreground">%</span>
        </span>
      </div>
    </div>
  );
}

interface DashboardHeroProps {
  metrics?: DashboardMetrics;
  loading?: boolean;
}

export function DashboardHero({ metrics, loading }: DashboardHeroProps) {
  const periodStart = metrics?.reportingPeriod.start
    ? formatDate(metrics.reportingPeriod.start)
    : "-";
  const periodEnd = metrics?.reportingPeriod.end
    ? formatDate(metrics.reportingPeriod.end)
    : "-";
  const reportingPeriod =
    periodStart !== "-" && periodEnd !== "-"
      ? `${periodStart} to ${periodEnd}`
      : "No data loaded";

  const tracked = metrics?.girlsTracked ?? 0;
  const trackingTarget = PROTOCOL.SUCCESSFUL_TRACKING_TARGET;
  const hhCompleted = metrics?.completedHouseholds ?? 0;
  const hhTarget = PROTOCOL.HH_SURVEY_TARGET;

  const quickLinks = [
    { href: "/analytics", label: "Analytics" },
    { href: "/tracking", label: "Tracking" },
    { href: "/monitoring", label: "Monitoring" },
    { href: "/reports", label: "Reports" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-8 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-teal/[0.06] p-6 sm:p-8 dark:to-teal/[0.1]"
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute right-1/3 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-deep-teal/10 blur-3xl" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 grid gap-8 xl:grid-cols-[1.35fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal/5 px-3 py-1 text-xs font-medium text-teal dark:bg-teal/10"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
            </span>
            <Radio className="h-3 w-3" aria-hidden="true" />
            Field operations live
          </motion.div>

          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
          >
            <span className="firm-brand-pidc">{FIRMS.pidc.name} </span>
            <span className="firm-brand-aoe">{FIRMS.aoe.name} </span>
            <span className="firm-brand-kprap">{FIRMS.kprap.name} </span>
            <span className="bg-gradient-to-r from-teal via-deep-teal to-teal bg-clip-text text-transparent">
              Command Center
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
          >
            Executive view of tracking, household, and girls survey rollouts
            across Khyber Pakhtunkhwa. Click any chart or KPI to drill into the
            field picture.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-5 flex flex-wrap items-center gap-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-teal" aria-hidden="true" />
              <span>
                Period{" "}
                <strong className="font-semibold text-foreground">
                  {reportingPeriod}
                </strong>
              </span>
            </div>
            <FieldPeriodToggle className="backdrop-blur-sm" />
            {!loading && metrics?.lastSubmissionDate && (
              <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
                Last submission{" "}
                <strong className="text-foreground">
                  {formatDate(metrics.lastSubmissionDate)}
                </strong>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-5 flex flex-wrap gap-2"
          >
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-teal/40 hover:bg-teal/5 hover:text-teal"
              >
                {link.label}
                <ArrowUpRight className="h-3 w-3 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.22, type: "spring", stiffness: 200 }}
          className="glass-card glow-teal grid gap-5 rounded-2xl p-5 sm:grid-cols-2"
        >
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
            <ProgressRing
              value={loading ? 0 : tracked}
              max={trackingTarget}
              colorClass="stroke-teal"
              trackClass="stroke-muted/80"
            />
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="h-3 w-3 text-teal" aria-hidden="true" />
                Tracking target
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                {loading ? (
                  "-"
                ) : (
                  <>
                    <AnimatedCounter value={tracked} /> /{" "}
                    {trackingTarget.toLocaleString()}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
            <ProgressRing
              value={loading ? 0 : hhCompleted}
              max={hhTarget}
              colorClass="stroke-deep-teal"
              trackClass="stroke-muted/80"
            />
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="h-3 w-3 text-deep-teal" aria-hidden="true" />
                Completed HH
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                {loading ? (
                  "-"
                ) : (
                  <>
                    <AnimatedCounter value={hhCompleted} /> /{" "}
                    {hhTarget.toLocaleString()}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            {[
              {
                label: "Districts",
                value: metrics?.activeDistricts ?? 0,
                icon: MapPin,
                color: "text-teal",
              },
              {
                label: "Enumerators",
                value: metrics?.totalEnumerators ?? 0,
                icon: Users,
                color: "text-deep-teal",
              },
              {
                label: "Villages",
                value: metrics?.totalVillages ?? 0,
                icon: MapPin,
                color: "text-teal",
              },
              {
                label: "Schools",
                value: metrics?.totalSchools ?? 0,
                icon: School,
                color: "text-amber-600 dark:text-gold",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
                >
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Icon className={cn("h-3 w-3", item.color)} aria-hidden="true" />
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                    {loading ? "-" : <AnimatedCounter value={item.value} />}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
