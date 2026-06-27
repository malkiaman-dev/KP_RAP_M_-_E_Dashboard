"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHero } from "@/components/dashboard/hero";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { FiltersPanel, defaultFilters } from "@/components/dashboard/filters-panel";
import { DashboardActiveFilters } from "@/components/dashboard/dashboard-active-filters";
import { DataTable } from "@/components/dashboard/data-table";
import {
  applyFilters,
  computeMetrics,
  type DashboardFilters,
  type DashboardMetrics,
} from "@/lib/data/survey-metrics";

async function fetchMetrics(): Promise<DashboardMetrics> {
  const res = await fetch("/api/metrics");
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export function DashboardContent() {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: fetchMetrics,
  });

  const filteredMetrics = useMemo(() => {
    if (!data?.allSubmissions) return undefined;
    const filtered = applyFilters(data.allSubmissions, filters);
    return computeMetrics(filtered);
  }, [data, filters]);

  const displayMetrics = filteredMetrics ?? data;

  const tableData = useMemo(() => {
    if (!data?.allSubmissions) return [];
    return applyFilters(data.allSubmissions, filters).slice(0, 100);
  }, [data, filters]);

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">Failed to load dashboard data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure survey CSV files exist in the Surveys folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
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
          <KpiCards metrics={displayMetrics} loading={isLoading} />
          <ChartsSection
            metrics={displayMetrics}
            loading={isLoading}
            filters={filters}
            onFilterChange={setFilters}
          />
        </>
      )}
      <DataTable data={tableData} loading={isLoading} />
    </>
  );
}
