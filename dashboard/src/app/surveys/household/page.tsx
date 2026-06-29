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

export default function HouseholdSurveyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: fetchMetrics,
  });

  const hh = data?.household;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold">Household Survey</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Father and mother surveys of tracked girls - two forms per girl expected
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Submissions", value: hh?.total },
          { label: "Unique Girls", value: hh?.uniqueGirls },
          { label: "Mother Forms", value: hh?.motherForms },
          { label: "Father Forms", value: hh?.fatherForms },
          { label: "Both Parents", value: hh?.bothParent },
          { label: "Completion Rate", value: hh?.completionRate, suffix: "%", decimals: 1 },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border/60 bg-card p-5"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-bold">
              {isLoading ? "-" : (
                <AnimatedCounter
                  value={item.value ?? 0}
                  suffix={item.suffix || ""}
                  decimals={item.decimals || 0}
                />
              )}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-5">
        <p className="text-sm font-medium text-foreground">Duplicate Detection Rule</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Same girl with mother (respondent=2) and father (respondent=1) forms is expected - not flagged as duplicate.
          Only same girl + same respondent + same attempt is flagged.
        </p>
      </div>
    </div>
  );
}
