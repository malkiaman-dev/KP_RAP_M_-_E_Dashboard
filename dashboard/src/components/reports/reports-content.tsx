"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, Home, Users } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { TrackingFiltersPanel } from "@/components/tracking/tracking-filters";
import { TrackingActiveFilters } from "@/components/tracking/tracking-active-filters";
import { ReportCard } from "@/components/reports/report-card";
import { TrackingStatusReportCard } from "@/components/reports/tracking-status-report-card";
import { TrackingProgressReportCard } from "@/components/reports/tracking-progress-report-card";
import { cn } from "@/lib/utils";
import {
  defaultMonitoringFilters,
  type TrackingFilters,
  type TrackingMetrics,
} from "@/lib/data/tracking-metrics";

type ReportMode = "operations" | "progress";

async function fetchTracking(): Promise<TrackingMetrics> {
  const res = await fetch("/api/tracking");
  if (!res.ok) throw new Error("Failed to load tracking data");
  return res.json();
}

function ComingSoonReportActions({
  districts,
}: {
  districts: { value: string; label: string }[];
}) {
  const districtSelectOptions = [
    { value: "", label: "Select a district…" },
    ...districts,
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[200px] flex-1 sm:max-w-xs">
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          District
        </label>
        <FilterSelect
          value=""
          options={districtSelectOptions}
          onChange={() => {}}
          disabled
          aria-label="Report district"
        />
      </div>

      <div className="min-w-[200px] flex-1 sm:max-w-xs">
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          Format
        </label>
        <FilterSelect
          value="pdf"
          options={[
            { value: "pdf", label: "PDF (.pdf)" },
            { value: "docx", label: "Microsoft Word (.docx)" },
          ]}
          onChange={() => {}}
          disabled
          aria-label="Report format"
        />
      </div>

      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Download district report
      </button>

      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Download all districts report
      </button>
    </div>
  );
}

export function ReportsContent() {
  const [filters, setFilters] = useState<TrackingFilters>(() =>
    defaultMonitoringFilters()
  );
  const [reportMode, setReportMode] = useState<ReportMode>("progress");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tracking-metrics"],
    queryFn: fetchTracking,
  });

  const districts = data?.filterOptions?.districts ?? [];

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <div>
          <p className="font-semibold text-red-600">Failed to load report data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ensure survey data files are available in the Surveys folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Reports
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Generate and export tracking reports for field operations or programme
          progress summaries. Download district-wise or all-district reports in
          PDF or Word, with Girls and Household reports coming soon.
        </p>
      </motion.div>

      <div className="mb-6 inline-flex rounded-xl border border-border/60 bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setReportMode("progress")}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-medium transition-colors",
            reportMode === "progress"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Progress Summary
        </button>
        <button
          type="button"
          onClick={() => setReportMode("operations")}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-medium transition-colors",
            reportMode === "operations"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Field Operations
        </button>
      </div>

      <TrackingFiltersPanel
        filterOptions={data?.filterOptions}
        filters={filters}
        onChange={setFilters}
        showTodayToggle
        resetFilters={defaultMonitoringFilters}
      />

      <TrackingActiveFilters
        filters={filters}
        onChange={setFilters}
        filterOptions={data?.filterOptions}
        resetFilters={defaultMonitoringFilters}
      />

      <div className="mt-6 space-y-4">
        {reportMode === "progress" ? (
          <TrackingProgressReportCard
            allSubmissions={data?.allSubmissions}
            filters={filters}
            districtOptions={districts}
            loading={isLoading}
          />
        ) : (
          <TrackingStatusReportCard
            allSubmissions={data?.allSubmissions}
            filters={filters}
            districtOptions={districts}
            loading={isLoading}
          />
        )}

        <ReportCard
          icon={Users}
          title="Girls Survey Report"
          description="Completion status, enumerator productivity, and district-level summary for the Girls survey module."
          status="coming-soon"
          accentClass="bg-sky-500/10 text-sky-500"
          footer="Formats: Word (.docx) & PDF · District-wise and all-district downloads"
        >
          <ComingSoonReportActions districts={districts} />
        </ReportCard>

        <ReportCard
          icon={Home}
          title="Household Survey Report"
          description="Household completion rates, parent respondent coverage, and field progress by district."
          status="coming-soon"
          accentClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          footer="Formats: Word (.docx) & PDF · District-wise and all-district downloads"
        >
          <ComingSoonReportActions districts={districts} />
        </ReportCard>
      </div>
    </div>
  );
}
