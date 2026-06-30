"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  applyTrackingFilters,
  type TrackingFilters,
  type TrackingRow,
} from "@/lib/data/tracking-metrics";
import { computeOutreachReportMetrics } from "@/lib/data/outreach-report-metrics";
import { downloadOutreachReport } from "@/lib/export/outreach-report-download";
import {
  buildDateRangeLabel,
  buildOutreachReportFilename,
  type OutreachReportSection,
  type ReportFormat,
} from "@/lib/export/outreach-report-shared";
import { ReportCard } from "@/components/reports/report-card";

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "docx", label: "Microsoft Word (.docx)" },
] as const;

export function TrackingProgressReportCard({
  allSubmissions,
  filters,
  districtOptions,
  loading,
}: {
  allSubmissions?: TrackingRow[];
  filters: TrackingFilters;
  districtOptions?: { value: string; label: string }[];
  loading?: boolean;
}) {
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [downloading, setDownloading] = useState<"district" | "all" | null>(
    null
  );

  const districts = districtOptions ?? [];
  const districtSelectOptions = useMemo(
    () => [{ value: "", label: "Select a district…" }, ...districts],
    [districts]
  );

  const baseRows = useMemo(() => {
    if (!allSubmissions) return [];
    return applyTrackingFilters(allSubmissions, { ...filters, district: "all" });
  }, [allSubmissions, filters]);

  const dateRangeLabel = useMemo(
    () => buildDateRangeLabel(filters),
    [filters]
  );

  const buildDistrictSection = (
    districtValue: string,
    districtLabel: string
  ): OutreachReportSection | null => {
    const rows = baseRows.filter((r) => r.district === districtValue);
    if (rows.length === 0) return null;
    return {
      districtLabel,
      metrics: computeOutreachReportMetrics(rows, baseRows),
    };
  };

  const buildAllDistrictsSections = (): OutreachReportSection[] => {
    const overall: OutreachReportSection = {
      districtLabel: "All Districts",
      metrics: computeOutreachReportMetrics(baseRows, baseRows),
    };
    const sections: OutreachReportSection[] = [overall];

    for (const d of districts) {
      const section = buildDistrictSection(d.value, d.label);
      if (section) sections.push(section);
    }
    return sections;
  };

  const handleDistrictDownload = async () => {
    if (!selectedDistrict) return;
    const district = districts.find((d) => d.value === selectedDistrict);
    if (!district) return;

    const section = buildDistrictSection(district.value, district.label);
    if (!section) return;

    setDownloading("district");
    try {
      await downloadOutreachReport(
        {
          scopeLabel: district.label,
          dateRangeLabel,
          generatedAt: new Date(),
          sections: [section],
        },
        buildOutreachReportFilename(district.label, filters, format),
        format
      );
    } finally {
      setDownloading(null);
    }
  };

  const handleAllDistrictsDownload = async () => {
    if (baseRows.length === 0) return;

    setDownloading("all");
    try {
      await downloadOutreachReport(
        {
          scopeLabel: "All Districts",
          dateRangeLabel,
          generatedAt: new Date(),
          sections: buildAllDistrictsSections(),
        },
        buildOutreachReportFilename("All_Districts", filters, format),
        format
      );
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />;
  }

  const districtHasData =
    !!selectedDistrict &&
    baseRows.some((r) => r.district === selectedDistrict);

  const formatLabel = format === "pdf" ? "PDF" : "Word";

  return (
    <ReportCard
      icon={BarChart3}
      title="Tracking Progress Report"
      description="Programme-wide and district-level summary of field coverage, tracking outcomes, consent, and revisit status. Excludes enumerator performance and operational targets."
      status="available"
      accentClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      footer={`Period: ${dateRangeLabel} · Formats: PDF & Word · Includes district comparison in all-districts download`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1 sm:max-w-xs">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            District
          </label>
          <FilterSelect
            value={selectedDistrict}
            options={districtSelectOptions}
            onChange={setSelectedDistrict}
            disabled={!allSubmissions || baseRows.length === 0}
            aria-label="Report district"
          />
        </div>

        <div className="min-w-[200px] flex-1 sm:max-w-xs">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Format
          </label>
          <FilterSelect
            value={format}
            options={[...FORMAT_OPTIONS]}
            onChange={(value) => setFormat(value as ReportFormat)}
            disabled={!allSubmissions || baseRows.length === 0}
            aria-label="Report format"
          />
        </div>

        <button
          type="button"
          onClick={handleDistrictDownload}
          disabled={
            !districtHasData || downloading !== null || baseRows.length === 0
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-500/15 disabled:pointer-events-none disabled:opacity-50 dark:text-emerald-400"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {downloading === "district"
            ? "Generating…"
            : `Download district report (${formatLabel})`}
        </button>

        <button
          type="button"
          onClick={handleAllDistrictsDownload}
          disabled={downloading !== null || baseRows.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {downloading === "all"
            ? "Generating…"
            : `Download all districts report (${formatLabel})`}
        </button>
      </div>
    </ReportCard>
  );
}
