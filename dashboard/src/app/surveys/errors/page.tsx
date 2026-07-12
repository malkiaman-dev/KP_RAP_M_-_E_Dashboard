"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ShieldAlert, Users } from "lucide-react";
import { ErrorFiltersPanel } from "@/components/errors/error-filters";
import { ErrorActiveFilters } from "@/components/errors/error-active-filters";
import { ErrorKpis } from "@/components/errors/error-kpis";
import { ErrorCharts } from "@/components/errors/error-charts";
import { ErrorTable } from "@/components/errors/error-table";
import { PageHero, SectionHeader } from "@/components/ui/page-hero";
import {
  applyErrorFilters,
  computeErrorMetrics,
  defaultErrorFilters,
  type ErrorFilters,
  type ErrorMetrics,
} from "@/lib/data/error-metrics";

async function fetchErrors(): Promise<ErrorMetrics> {
  const res = await fetch("/api/errors");
  if (!res.ok) throw new Error("Failed to load error log");
  return res.json();
}

export default function ErrorReportPage() {
  const [filters, setFilters] = useState<ErrorFilters>(defaultErrorFilters);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["error-metrics"],
    queryFn: fetchErrors,
  });

  const display = useMemo(() => {
    if (!data?.allErrors) return data;
    const rows = applyErrorFilters(data.allErrors, filters);
    return computeErrorMetrics(rows);
  }, [data, filters]);

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">Failed to load error log</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure Daily_Error_Log.xlsx exists in the Error_log folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        eyebrow="Data quality surveillance"
        title="Error Report"
        accent="Quality"
        description="Critical vs quality issues, root causes, and enumerator accountability across KPRAP field surveys. Filter and drill into patterns before they cascade."
        loading={isLoading}
        links={[
          { href: "/surveys", label: "All Surveys" },
          { href: "/monitoring", label: "Monitoring" },
          { href: "/analytics", label: "Analytics" },
        ]}
        stats={[
          {
            label: "Total errors",
            value: display?.totalErrors ?? 0,
            icon: AlertTriangle,
            colorClass: "text-amber-600 dark:text-gold",
          },
          {
            label: "Critical",
            value: display?.criticalErrors ?? 0,
            icon: ShieldAlert,
            colorClass: "text-red-600",
          },
          {
            label: "Quality",
            value: display?.flagErrors ?? 0,
            icon: AlertTriangle,
            colorClass: "text-amber-600",
          },
          {
            label: "Enumerators",
            value: display?.affectedEnumerators ?? 0,
            icon: Users,
            colorClass: "text-teal",
          },
        ]}
      />

      <ErrorFiltersPanel
        filterOptions={data?.filterOptions}
        filters={filters}
        onChange={setFilters}
      />

      <ErrorActiveFilters filters={filters} onChange={setFilters} />

      <SectionHeader
        title="Quality KPIs"
        subtitle="Critical vs quality volume and enumerator exposure."
      />
      <ErrorKpis metrics={display} loading={isLoading} />

      {display && !isLoading && (
        <p className="mb-4 text-xs text-muted-foreground">
          {display.criticalErrors.toLocaleString()} critical ·{" "}
          {display.flagErrors.toLocaleString()} quality ·{" "}
          {display.affectedEnumerators} enumerators ·{" "}
          {display.affectedDistricts} districts ·{" "}
          {display.affectedDevices} devices
        </p>
      )}

      <SectionHeader
        title="Pattern intelligence"
        subtitle="Click charts to filter the error log by cause, severity, or geography."
        className="mt-6"
      />
      <div className="mb-6">
        <ErrorCharts
          metrics={display}
          loading={isLoading}
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>

      <SectionHeader
        title="Error ledger"
        subtitle="Row-level audit trail for field and supervisor follow-up."
      />
      <ErrorTable metrics={display} loading={isLoading} />
    </div>
  );
}
