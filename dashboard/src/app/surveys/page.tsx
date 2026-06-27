"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Home, UserCheck, Users2, AlertTriangle } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import type { ErrorMetrics } from "@/lib/data/error-metrics";

async function fetchMetrics(): Promise<DashboardMetrics> {
  const res = await fetch("/api/metrics");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchErrors(): Promise<ErrorMetrics> {
  const res = await fetch("/api/errors");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function SurveysPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: fetchMetrics,
  });
  const { data: errors } = useQuery({
    queryKey: ["error-metrics"],
    queryFn: fetchErrors,
  });

  const surveys = [
    {
      title: "Tracking Survey",
      desc: "Locate and verify listed girls across districts",
      stats: [
        { label: "Submissions", value: data?.tracking.total },
        { label: "Tracked", value: data?.tracking.tracked },
      ],
      href: "/tracking",
      color: "from-teal/20 to-teal/5 border-teal/20",
      icon: Users2,
    },
    {
      title: "Household Survey",
      desc: "Mother and father interviews per tracked girl",
      stats: [
        { label: "Submissions", value: data?.household.total },
        { label: "Both Parents", value: data?.household.bothParent },
      ],
      href: "/surveys/household",
      color: "from-deep-teal/20 to-deep-teal/5 border-deep-teal/20",
      icon: Home,
    },
    {
      title: "Girls Survey",
      desc: "Direct girl interview with learning assessment",
      stats: [
        { label: "Submissions", value: data?.girls.total },
        { label: "Complete", value: data?.girls.complete },
      ],
      href: "/surveys/girls",
      color: "from-gold/20 to-gold/5 border-gold/30",
      icon: UserCheck,
    },
    {
      title: "Error Report",
      desc: "Data quality issues and enumerator accountability",
      stats: [
        { label: "Total Errors", value: errors?.totalErrors },
        { label: "Critical", value: errors?.criticalErrors },
      ],
      href: "/surveys/errors",
      color: "from-red-500/20 to-red-500/5 border-red-500/20",
      icon: AlertTriangle,
    },
  ];

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold tracking-tight">Surveys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          KPRAP survey modules — tracking, household, and girls
        </p>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {surveys.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.a
              key={s.title}
              href={s.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`block rounded-2xl border bg-gradient-to-br p-6 shadow-sm transition-shadow hover:shadow-lg ${s.color}`}
            >
              <Icon className="mb-4 h-8 w-8 text-foreground/80" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              <div className="mt-6 flex gap-6">
                {s.stats.map((st) => (
                  <div key={st.label}>
                    <p className="text-xs text-muted-foreground">{st.label}</p>
                    <p className="text-xl font-bold text-foreground">
                      {isLoading ? "—" : (
                        <AnimatedCounter value={st.value ?? 0} />
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
