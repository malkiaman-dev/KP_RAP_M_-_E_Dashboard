"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";

async function fetchMetrics(): Promise<DashboardMetrics> {
  const res = await fetch("/api/metrics");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function GirlsSurveyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: fetchMetrics,
  });

  const gs = data?.girls;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold">Girls Survey</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Direct girl interview with parental consent and learning assessment
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Submissions", value: gs?.total },
          { label: "Completed", value: gs?.complete },
          { label: "Revisits", value: gs?.revisits },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border/60 bg-card p-6"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-3xl font-bold">
              {isLoading ? "—" : <AnimatedCounter value={item.value ?? 0} />}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Child Consent Rate</p>
            <p className="text-xs text-muted-foreground">Target: 90%</p>
          </div>
          <span className="text-3xl font-bold text-teal">
            {isLoading ? "—" : (
              <AnimatedCounter
                value={gs?.total ? (gs.complete / gs.total) * 100 : 0}
                suffix="%"
                decimals={1}
              />
            )}
          </span>
        </div>
        <div className="relative mt-4 h-4 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${gs?.total ? (gs.complete / gs.total) * 100 : 0}%`,
            }}
            className="h-full rounded-full bg-gradient-to-r from-teal to-gold"
          />
          <div className="absolute left-[90%] top-0 h-full w-0.5 bg-foreground/30" />
        </div>
      </div>
    </div>
  );
}
