"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { DashboardActiveFilters } from "@/components/dashboard/dashboard-active-filters";
import { DataTable } from "@/components/dashboard/data-table";
import { FiltersPanel } from "@/components/dashboard/filters-panel";
import { DashboardHero } from "@/components/dashboard/hero";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ModulePulse } from "@/components/dashboard/module-pulse";
import { useFieldPeriod } from "@/components/filters/field-period-provider";
import {
  applyFilters,
  computeMetrics,
  createDefaultDashboardFilters,
  dashboardFiltersEqual,
  type DashboardFilters,
} from "@/lib/data/survey-metrics";
import { FIELD_PERIOD_START } from "@/lib/data/field-period";
import {
  DASHBOARD_METRICS_QUERY_KEY,
  fetchDashboardMetrics,
  QUERY_STALE_MS,
} from "@/lib/queries/app-data";

export function DashboardContent() {
  const {
    dateFrom: fieldDateFrom,
    enabled: fieldPeriodEnabled,
    setEnabled: setFieldPeriodEnabled,
  } = useFieldPeriod();
  const [filters, setFilters] = useState<DashboardFilters>(() =>
    createDefaultDashboardFilters(fieldDateFrom)
  );
  const deferredFilters = useDeferredValue(filters);

  // Keep filters in sync when the field-period toggle changes.
  useEffect(() => {
    setFilters((prev) => ({ ...prev, dateFrom: fieldDateFrom }));
  }, [fieldDateFrom, fieldPeriodEnabled]);

  const onFiltersChange = (next: DashboardFilters) => {
    // Manual date edits take priority over the field-period toggle.
    if (fieldPeriodEnabled) {
      const leftFieldPeriod =
        !next.dateFrom || next.dateFrom !== FIELD_PERIOD_START;
      if (leftFieldPeriod) {
        setFieldPeriodEnabled(false);
      }
    }
    setFilters(next);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [...DASHBOARD_METRICS_QUERY_KEY],
    queryFn: fetchDashboardMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const displayMetrics = useMemo(() => {
    if (!data?.allSubmissions) return data;

    // Server already computed the default field-period view — skip heavy recompute.
    if (
      dashboardFiltersEqual(
        deferredFilters,
        createDefaultDashboardFilters(FIELD_PERIOD_START)
      )
    ) {
      return data;
    }

    return computeMetrics(applyFilters(data.allSubmissions, deferredFilters), {
      allRows: data.allSubmissions,
    });
  }, [data, deferredFilters]);

  const tableData = useMemo(() => {
    if (!data?.allSubmissions) return [];
    if (
      dashboardFiltersEqual(
        deferredFilters,
        createDefaultDashboardFilters(FIELD_PERIOD_START)
      )
    ) {
      return applyFilters(
        data.allSubmissions,
        createDefaultDashboardFilters(FIELD_PERIOD_START)
      ).slice(0, 100);
    }
    return applyFilters(data.allSubmissions, deferredFilters).slice(0, 100);
  }, [data, deferredFilters]);

  const filtering =
    filters.district !== deferredFilters.district ||
    filters.surveyType !== deferredFilters.surveyType ||
    filters.enumerator !== deferredFilters.enumerator ||
    filters.status !== deferredFilters.status ||
    filters.dateFrom !== deferredFilters.dateFrom ||
    filters.dateTo !== deferredFilters.dateTo;

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">
            Failed to load dashboard data
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure survey CSV files exist in the Surveys folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={filtering ? "opacity-80 transition-opacity" : undefined}>
      <DashboardHero metrics={displayMetrics} loading={isLoading} />
      <FiltersPanel
        filterOptions={data?.filterOptions}
        filters={filters}
        onChange={onFiltersChange}
        resetFilters={() => createDefaultDashboardFilters(fieldDateFrom)}
      />
      <DashboardActiveFilters
        filters={filters}
        onChange={onFiltersChange}
        filterOptions={data?.filterOptions}
      />
      {displayMetrics && (
        <>
          <KpiCards
            metrics={displayMetrics}
            loading={isLoading}
            filters={filters}
            onFilterChange={onFiltersChange}
          />
          <ModulePulse
            metrics={displayMetrics}
            loading={isLoading}
            filters={filters}
            onFilterChange={onFiltersChange}
          />
          <ChartsSection
            metrics={displayMetrics}
            loading={isLoading}
            filters={filters}
            onFilterChange={onFiltersChange}
          />
        </>
      )}
      <DataTable data={tableData} loading={isLoading} />
    </div>
  );
}
