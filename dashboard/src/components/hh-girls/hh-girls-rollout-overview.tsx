"use client";

import { motion } from "framer-motion";
import { Home, Target, TrendingUp, UserCheck } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-muted/60">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full bg-gradient-to-r from-teal to-gold"
      />
    </div>
  );
}

export function HhGirlsRolloutOverview({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
}) {
  if (loading || !metrics) {
    return (
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    );
  }

  const hh = metrics.household;
  const gs = metrics.girls;

  const cards = [
    {
      title: "Household rollout",
      subtitle: `${metrics.targetN.toLocaleString()} fully completed households target`,
      icon: Home,
      accent: "text-teal",
      stats: [
        { label: "Both parents", value: hh.bothParent },
        { label: "Progress", value: hh.progressToTarget, suffix: "%", decimals: 1 },
        { label: "Mother forms", value: hh.motherForms },
        { label: "Father forms", value: hh.fatherForms },
      ],
      progress: { value: hh.bothParent, max: metrics.targetN },
    },
    {
      title: "Girls survey rollout",
      subtitle: "Direct interview with learning assessment",
      icon: UserCheck,
      accent: "text-sky-500",
      stats: [
        { label: "Girls surveyed", value: gs.totalSubmissions },
        { label: "Child consent", value: gs.childConsentRate, suffix: "%", decimals: 1 },
        { label: "Studying rate", value: gs.studyingRate, suffix: "%", decimals: 1 },
        { label: "Revisits", value: gs.revisits },
      ],
      progress: { value: gs.complete, max: gs.totalSubmissions || 1 },
    },
  ];

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
        >
          <div className="mb-4 flex items-start gap-3">
            <div className={cn("rounded-xl bg-current/10 p-2.5", card.accent)}>
              <card.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={cn("text-sm font-semibold", card.accent)}>
                {card.title}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {card.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {card.stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-lg font-bold text-foreground">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </p>
              </div>
            ))}
          </div>

          <ProgressBar value={card.progress.value} max={card.progress.max} />
          <p className="mt-2 text-[10px] text-muted-foreground">
            {card.progress.value.toLocaleString()} of{" "}
            {card.progress.max.toLocaleString()}
            {card.title.includes("Household") ? " households" : " submissions complete"}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
