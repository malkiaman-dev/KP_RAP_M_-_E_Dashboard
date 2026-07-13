"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  applyErrorFilters,
  computeErrorMetrics,
  type ErrorFilters,
  type ErrorRow,
} from "@/lib/data/error-metrics";
import { downloadErrorDqaReport } from "@/lib/export/error-dqa-report-download";
import {
  buildErrorDateRangeLabel,
  buildErrorReportFilename,
  type ErrorReportSection,
  type ReportFormat,
} from "@/lib/export/error-dqa-report-shared";
import { ReportCard } from "@/components/reports/report-card";

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "docx", label: "Microsoft Word (.docx)" },
] as const;

export function ErrorReportCard({
  allErrors,
  filters,
  districtOptions,
  loading,
}: {
  allErrors?: ErrorRow[];
  filters: ErrorFilters;
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
    if (!allErrors) return [];
    return applyErrorFilters(allErrors, { ...filters, district: "all" });
  }, [allErrors, filters]);

  const dateRangeLabel = useMemo(
    () => buildErrorDateRangeLabel(filters),
    [filters]
  );

  const buildDistrictSection = (
    districtValue: string,
    districtLabel: string
  ): ErrorReportSection | null => {
    const rows = baseRows.filter((r) => r.district === districtValue);
    if (rows.length === 0) return null;
    return {
      districtLabel,
      metrics: computeErrorMetrics(rows),
    };
  };

  const buildAllDistrictsSections = (): ErrorReportSection[] => {
    const overall = computeErrorMetrics(baseRows);
    const sections: ErrorReportSection[] = [
      { districtLabel: "All Districts", metrics: overall },
    ];

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
      await downloadErrorDqaReport(
        {
          scopeLabel: district.label,
          dateRangeLabel,
          generatedAt: new Date(),
          sections: [section],
        },
        buildErrorReportFilename(district.label, filters, format),
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
      await downloadErrorDqaReport(
        {
          scopeLabel: "All Districts",
          dateRangeLabel,
          generatedAt: new Date(),
          sections: buildAllDistrictsSections(),
        },
        buildErrorReportFilename("All_Districts", filters, format),
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

  return (
    <ReportCard
      icon={AlertTriangle}
      title="Error Quality Report"
      description="Downloadable overall and district-wise data-quality briefing with critical vs quality KPIs, top rules, survey mix, and enumerator coaching priorities."
      status="available"
      footer={`Period: ${dateRangeLabel} · Formats: Word (.docx) & PDF · Includes All Districts + each district section`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] flex-1 basis-[160px] sm:max-w-[220px]">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            District
          </label>
          <FilterSelect
            value={selectedDistrict}
            options={districtSelectOptions}
            onChange={setSelectedDistrict}
            disabled={!allErrors || baseRows.length === 0}
            aria-label="Error report district"
            placement="auto"
          />
        </div>

        <div className="min-w-[140px] flex-1 basis-[140px] sm:max-w-[180px]">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Format
          </label>
          <FilterSelect
            value={format}
            options={[...FORMAT_OPTIONS]}
            onChange={(value) => setFormat(value as ReportFormat)}
            disabled={!allErrors || baseRows.length === 0}
            aria-label="Error report format"
            placement="auto"
          />
        </div>

        <button
          type="button"
          onClick={handleDistrictDownload}
          disabled={
            !districtHasData || downloading !== null || baseRows.length === 0
          }
          className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-teal/30 bg-teal/10 px-4 py-2 text-xs font-medium text-teal hover:bg-teal/15 disabled:pointer-events-none disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {downloading === "district"
            ? "Generating…"
            : "Download district report"}
        </button>

        <button
          type="button"
          onClick={handleAllDistrictsDownload}
          disabled={downloading !== null || baseRows.length === 0}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border/60 bg-muted/40 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {downloading === "all"
            ? "Generating…"
            : "Download all districts report"}
        </button>
      </div>
    </ReportCard>
  );
}
