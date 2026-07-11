"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { DashboardActiveFilters } from "@/components/dashboard/dashboard-active-filters";
import { DataTable } from "@/components/dashboard/data-table";
import {
  defaultFilters,
  FiltersPanel,
} from "@/components/dashboard/filters-panel";
import { DashboardHero } from "@/components/dashboard/hero";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ModulePulse } from "@/components/dashboard/module-pulse";
import {
  applyFilters,
  computeMetrics,
  type DashboardFilters,
} from "@/lib/data/survey-metrics";
import {
  DASHBOARD_METRICS_QUERY_KEY,
  fetchDashboardMetrics,
  QUERY_STALE_MS,
} from "@/lib/queries/app-data";

export function DashboardContent() {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const deferredFilters = useDeferredValue(filters);

  const { data, isLoading, isError } = useQuery({
    queryKey: [...DASHBOARD_METRICS_QUERY_KEY],
    queryFn: fetchDashboardMetrics,
    staleTime: QUERY_STALE_MS,
  });

  const displayMetrics = useMemo(() => {
    if (!data?.allSubmissions) return data;
    return computeMetrics(applyFilters(data.allSubmissions, deferredFilters), {
      allRows: data.allSubmissions,
    });
  }, [data, deferredFilters]);

  const tableData = useMemo(() => {
    if (!data?.allSubmissions) return [];
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
        onChange={setFilters}
      />
      <DashboardActiveFilters
        filters={filters}
        onChange={setFilters}
        filterOptions={data?.filterOptions}
      />
      {displayMetrics && (
        <>
          <KpiCards
            metrics={displayMetrics}
            loading={isLoading}
            filters={filters}
            onFilterChange={setFilters}
          />
          <ModulePulse
            metrics={displayMetrics}
            loading={isLoading}
            filters={filters}
            onFilterChange={setFilters}
          />
          <ChartsSection
            metrics={displayMetrics}
            loading={isLoading}
            filters={filters}
            onFilterChange={setFilters}
          />
        </>
      )}
      <DataTable data={tableData} loading={isLoading} />
    </div>
  );
}
