"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldAlert, Target, Users } from "lucide-react";
import { FieldErrorAnalyticsPanel } from "@/components/field/field-error-analytics";
import { PageHero } from "@/components/ui/page-hero";
import { useAuth } from "@/components/auth/auth-provider";
import { computeFieldErrorAnalytics } from "@/lib/data/field-error-analytics";
import type { ErrorMetrics } from "@/lib/data/error-metrics";
import type { DqaStatus } from "@/lib/data/dqa-runner";

type ErrorMetricsPayload = ErrorMetrics & {
  dqaStatus?: DqaStatus;
  dqaError?: string | null;
};

async function fetchErrors(): Promise<ErrorMetricsPayload> {
  const res = await fetch("/api/errors");
  if (!res.ok) throw new Error("Failed to load error log");
  return res.json();
}

export default function FieldErrorAnalyticsPage() {
  const { user } = useAuth();
  const districtName = user?.district ?? user?.name ?? "your district";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["error-metrics", "field", user?.district],
    queryFn: fetchErrors,
    refetchInterval: (query) => {
      const status = query.state.data?.dqaStatus;
      return status === "regenerating" || status === "stale" || status === "missing"
        ? 15_000
        : false;
    },
  });

  const analytics = useMemo(() => {
    if (!data?.allErrors) return undefined;
    return computeFieldErrorAnalytics(data.allErrors, data);
  }, [data]);

  const dqaStatus = data?.dqaStatus;
  const showDqaBanner =
    dqaStatus === "regenerating" ||
    dqaStatus === "stale" ||
    dqaStatus === "missing" ||
    Boolean(data?.dqaError);

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">Failed to load analytics</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Could not load the district error log for coaching insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        eyebrow="District field dashboard"
        title={`${districtName} Error Analytics`}
        accent="Focus"
        description="See which issues matter most, who needs coaching, and how enumerators can avoid repeating them."
        loading={isLoading}
        links={[
          { href: "/field", label: "Error Log" },
        ]}
        stats={[
          {
            label: "Open errors",
            value: analytics?.totalErrors ?? 0,
            icon: AlertTriangle,
            colorClass: "text-amber-600 dark:text-gold",
          },
          {
            label: "Critical",
            value: analytics?.criticalErrors ?? 0,
            icon: ShieldAlert,
            colorClass: "text-red-600",
          },
          {
            label: "Focus rules",
            value: analytics?.focusRules.length ?? 0,
            icon: Target,
            colorClass: "text-teal",
          },
          {
            label: "To coach",
            value: analytics?.focusEnumerators.length ?? 0,
            icon: Users,
            colorClass: "text-teal",
          },
        ]}
      />

      {showDqaBanner && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            data?.dqaError
              ? "border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-300"
              : "border-teal/25 bg-teal/5 text-foreground"
          }`}
        >
          {!data?.dqaError && (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-teal" />
          )}
          <div>
            {data?.dqaError ? (
              <>
                <p className="font-medium">Error report update failed</p>
                <p className="mt-0.5 text-xs opacity-90">{data.dqaError}</p>
              </>
            ) : (
              <>
                <p className="font-medium">
                  Updating error report from latest survey files…
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Analytics will refresh automatically when DQA finishes.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <FieldErrorAnalyticsPanel
        analytics={analytics}
        loading={isLoading}
        districtName={districtName}
      />
    </div>
  );
}
