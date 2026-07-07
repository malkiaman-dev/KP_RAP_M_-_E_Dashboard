"use client";

import { motion } from "framer-motion";
import { Calendar, Radio, MapPin, Users, School, FileStack } from "lucide-react";
import { useFirm } from "@/components/brand/firm-provider";
import { formatDisplayDate } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";

const particles = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: `${10 + (i * 7) % 80}%`,
  y: `${15 + (i * 11) % 70}%`,
  size: 2 + (i % 3),
  delay: i * 0.15,
}));

function formatDate(iso: string) {
  if (!iso) return "-";
  return formatDisplayDate(iso) || "-";
}

interface DashboardHeroProps {
  metrics?: DashboardMetrics;
  loading?: boolean;
}

export function DashboardHero({ metrics, loading }: DashboardHeroProps) {
  const { firm } = useFirm();
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-8 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-teal/[0.04] p-8 dark:from-card dark:via-card dark:to-teal/[0.08]"
      aria-labelledby="hero-heading"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="pointer-events-none absolute rounded-full bg-teal/30"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -12, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + p.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}

      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/5 px-3 py-1 text-xs font-medium text-teal dark:bg-teal/10"
          >
            <Radio className="h-3 w-3" aria-hidden="true" />
            KPRAP SurveyCTO data connected
          </motion.div>

          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {firm.name}{" "}
            <span className="bg-gradient-to-r from-teal to-deep-teal bg-clip-text text-transparent">
              Dashboard
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-2 text-muted-foreground"
          >
            Real-time monitoring of tracking, household, and girls survey
            rollouts across Khyber Pakhtunkhwa.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-5 flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-teal" aria-hidden="true" />
              <span>
                Data period:{" "}
                <strong className="text-foreground">{reportingPeriod}</strong>
              </span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="glass-card glow-teal flex shrink-0 flex-col gap-4 rounded-2xl p-5 sm:min-w-[260px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Live Metrics
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-teal">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
              </span>
              Live
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Submissions",
                value: loading ? "-" : String(metrics?.totalSubmissions ?? 0),
                icon: FileStack,
              },
              {
                label: "Districts",
                value: loading ? "-" : String(metrics?.activeDistricts ?? 0),
                icon: MapPin,
              },
              {
                label: "Enumerators",
                value: loading ? "-" : String(metrics?.totalEnumerators ?? 0),
                icon: Users,
              },
              {
                label: "Schools",
                value: loading ? "-" : String(metrics?.totalSchools ?? 0),
                icon: School,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
          {!loading && metrics?.lastSubmissionDate && (
            <p className="text-[10px] text-muted-foreground">
              Last submission: {formatDate(metrics.lastSubmissionDate)}
            </p>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}
