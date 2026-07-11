"use client";

import { motion } from "framer-motion";
import { Home, Target, TrendingUp } from "lucide-react";
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
        className="h-full rounded-full bg-linear-to-r from-teal to-gold"
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
    return <div className="mb-6 h-36 animate-pulse rounded-2xl bg-muted/40" />;
  }

  const c = metrics.core;

  const stats = [
    { label: "HH target", value: c.hhTarget },
    { label: "Completed households", value: c.completedHouseholds },
    { label: "Remaining to target", value: c.remainingToTarget },
    {
      label: "Progress to target",
      value: c.progressToTarget,
      suffix: "%",
      decimals: 1,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex items-start gap-3">
        <div className={cn("rounded-xl bg-current/10 p-2.5 text-teal")}>
          <Home className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-teal">
            HH / Girls combined rollout
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Father, mother, and girl surveys fielded together ·{" "}
            {metrics.targetN.toLocaleString()} completed households target
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
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

      <ProgressBar value={c.completedHouseholds} max={metrics.targetN} />
      <p className="mt-2 text-[10px] text-muted-foreground">
        Completed when the girl survey is done with consent and parent slots
        are interviewed or permanently unavailable. If both parents are
        permanently unavailable, a complete caretaker interview is required.
        Temporary unavailability requires revisits first.
      </p>
    </motion.div>
  );
}
