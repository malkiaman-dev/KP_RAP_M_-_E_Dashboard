"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldAlert, Timer, Users } from "lucide-react";
import { ErrorFiltersPanel } from "@/components/errors/error-filters";
import { ErrorActiveFilters } from "@/components/errors/error-active-filters";
import { ErrorKpis } from "@/components/errors/error-kpis";
import { ErrorCharts } from "@/components/errors/error-charts";
import { ErrorTable } from "@/components/errors/error-table";
import { ErrorAnomalyPanel } from "@/components/errors/error-anomaly-panel";
import { ModeToggle, PageHero, SectionHeader } from "@/components/ui/page-hero";
import { useAuth } from "@/components/auth/auth-provider";
import {
  actualErrorRows,
  anomalyErrorRows,
  applyErrorFilters,
  buildErrorTitleOptions,
  computeErrorMetrics,
  defaultErrorFilters,
  type ErrorFilters,
  type ErrorMetrics,
} from "@/lib/data/error-metrics";
import type { DqaStatus } from "@/lib/data/dqa-runner";

type ErrorMetricsPayload = ErrorMetrics & {
  dqaStatus?: DqaStatus;
  dqaError?: string | null;
};

type ErrorView = "quality" | "implausible";

async function fetchErrors(): Promise<ErrorMetricsPayload> {
  const res = await fetch("/api/errors");
  if (!res.ok) throw new Error("Failed to load error log");
  return res.json();
}

export default function FieldErrorsPage() {
  const { user } = useAuth();
  const districtName = user?.district ?? user?.name ?? "your district";
  const [filters, setFilters] = useState<ErrorFilters>(defaultErrorFilters);
  const [view, setView] = useState<ErrorView>("quality");

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

  const scopedBase = useMemo(() => {
    if (!data?.allErrors) return [];
    return view === "quality"
      ? actualErrorRows(data.allErrors)
      : anomalyErrorRows(data.allErrors);
  }, [data, view]);

  const display = useMemo(() => {
    const rows = applyErrorFilters(scopedBase, filters);
    return computeErrorMetrics(rows);
  }, [scopedBase, filters]);

  const panelFilterOptions = useMemo(() => {
    const forOptions = applyErrorFilters(scopedBase, {
      ...filters,
      title: "all",
    });
    const scopedMetrics = computeErrorMetrics(forOptions);
    return {
      districts: data?.filterOptions?.districts ?? [],
      surveys: scopedMetrics.filterOptions.surveys,
      titles: buildErrorTitleOptions(forOptions),
      enumerators: scopedMetrics.filterOptions.enumerators,
      severities:
        view === "quality"
          ? scopedMetrics.filterOptions.severities
          : [{ value: "ANOMALY", label: "Implausible" }],
      dateRange:
        data?.filterOptions?.dateRange ?? scopedMetrics.filterOptions.dateRange,
    };
  }, [scopedBase, filters, data?.filterOptions, view]);

  const setViewAndResetTitle = (next: ErrorView) => {
    setView(next);
    setFilters((prev) => ({
      ...prev,
      title: "all",
      severity: "all",
      ruleId: "all",
    }));
  };

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
          <p className="font-semibold text-red-600">Failed to load error log</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure Daily_Error_Log.xlsx exists in the Error_log folder, or wait
            for DQA to regenerate from Surveys/.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        eyebrow="District field dashboard"
        title={`${districtName} Error Log`}
        accent="Field"
        description="Review critical and quality issues for your district, or inspect implausible duration cases separately. Filter by error title, enumerator, and more."
        loading={isLoading}
        links={[{ href: "/field/analytics", label: "Error Analytics" }]}
        stats={
          view === "quality"
            ? [
                {
                  label: "Total errors",
                  value: display.totalErrors,
                  icon: AlertTriangle,
                  colorClass: "text-amber-600 dark:text-gold",
                },
                {
                  label: "Critical",
                  value: display.criticalErrors,
                  icon: ShieldAlert,
                  colorClass: "text-red-600",
                },
                {
                  label: "Quality",
                  value: display.flagErrors,
                  icon: AlertTriangle,
                  colorClass: "text-amber-600",
                },
                {
                  label: "Enumerators",
                  value: display.affectedEnumerators,
                  icon: Users,
                  colorClass: "text-teal",
                },
              ]
            : [
                {
                  label: "Implausible cases",
                  value: display.totalErrors,
                  icon: Timer,
                  colorClass: "text-sky-600",
                },
                {
                  label: "Rule types",
                  value: display.ruleTypes,
                  icon: AlertTriangle,
                  colorClass: "text-sky-600",
                },
                {
                  label: "Enumerators",
                  value: display.affectedEnumerators,
                  icon: Users,
                  colorClass: "text-teal",
                },
                {
                  label: "Devices",
                  value: display.affectedDevices,
                  icon: ShieldAlert,
                  colorClass: "text-teal",
                },
              ]
        }
      >
        <ModeToggle
          value={view}
          onChange={setViewAndResetTitle}
          options={[
            { value: "quality", label: "Data Quality Errors" },
            { value: "implausible", label: "Implausible Cases" },
          ]}
        />
      </PageHero>

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
                  Survey CSVs are newer than the error log. DQA is regenerating
                  in the background — this page will refresh automatically.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <ErrorFiltersPanel
        filterOptions={panelFilterOptions}
        filters={filters}
        onChange={setFilters}
        hideDistrict
        hideSeverity={view === "implausible"}
      />

      <ErrorActiveFilters
        filters={filters}
        onChange={setFilters}
        hideDistrict
      />

      {view === "quality" ? (
        <>
          <SectionHeader
            title="Quality KPIs"
            subtitle={`Critical vs quality volume for ${districtName}.`}
          />
          <ErrorKpis metrics={display} loading={isLoading} />

          {!isLoading && (
            <p className="mb-4 text-xs text-muted-foreground">
              {display.criticalErrors.toLocaleString()} critical ·{" "}
              {display.flagErrors.toLocaleString()} quality ·{" "}
              {display.affectedEnumerators} enumerators ·{" "}
              {display.affectedDevices} devices
            </p>
          )}

          <SectionHeader
            title="Pattern intelligence"
            subtitle="Click charts to filter by enumerator, severity, survey, or rule."
            className="mt-6"
          />
          <div className="mb-6">
            <ErrorCharts
              metrics={display}
              loading={isLoading}
              filters={filters}
              onFilterChange={setFilters}
              lockDistrict
            />
          </div>

          <SectionHeader
            title="Enumerator error ledger"
            subtitle="Row-level audit trail for supervisor follow-up in your district."
          />
          <ErrorTable metrics={display} loading={isLoading} />
        </>
      ) : (
        <>
          <SectionHeader
            title="Implausible / technical cases"
            subtitle="Duration patterns that may be device issues — review explanations before coaching."
          />
          <ErrorAnomalyPanel metrics={display} loading={isLoading} />
        </>
      )}
    </div>
  );
}
