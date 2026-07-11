"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  applyHhGirlsMonitoringFilters,
  type HhGirlsMonitoringFilters,
} from "@/lib/data/hh-girls-monitoring";
import type { HhGirlsRow } from "@/lib/data/hh-girls-metrics";
import { computeHhGirlsProgressReportMetrics } from "@/lib/data/hh-girls-progress-report-metrics";
import { downloadHhGirlsProgressReport } from "@/lib/export/hh-girls-progress-report-download";
import {
  buildDateRangeLabel,
  buildHhGirlsProgressReportFilename,
  type HhGirlsProgressReportSection,
  type ReportFormat,
} from "@/lib/export/hh-girls-progress-report-shared";
import { ReportCard } from "@/components/reports/report-card";
import { PROTOCOL } from "@/lib/data/protocol";

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "docx", label: "Microsoft Word (.docx)" },
] as const;

export function HhGirlsProgressReportCard({
  allHousehold,
  allGirls,
  filters,
  districtOptions,
  loading,
}: {
  allHousehold?: HhGirlsRow[];
  allGirls?: HhGirlsRow[];
  filters: HhGirlsMonitoringFilters;
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

  const base = useMemo(() => {
    if (!allHousehold || !allGirls) {
      return { household: [] as HhGirlsRow[], girls: [] as HhGirlsRow[] };
    }
    return applyHhGirlsMonitoringFilters(allHousehold, allGirls, {
      ...filters,
      district: "all",
    });
  }, [allHousehold, allGirls, filters]);

  const dateRangeLabel = useMemo(
    () => buildDateRangeLabel(filters),
    [filters]
  );

  const hasRows = base.household.length + base.girls.length > 0;

  const buildDistrictSection = (
    districtValue: string,
    districtLabel: string
  ): HhGirlsProgressReportSection | null => {
    const household = base.household.filter((r) => r.district === districtValue);
    const girls = base.girls.filter((r) => r.district === districtValue);
    if (household.length + girls.length === 0) return null;
    return {
      districtLabel,
      metrics: computeHhGirlsProgressReportMetrics(household, girls),
    };
  };

  const buildAllDistrictsSections = (): HhGirlsProgressReportSection[] => {
    const sections: HhGirlsProgressReportSection[] = [
      {
        districtLabel: "All Districts",
        metrics: computeHhGirlsProgressReportMetrics(
          base.household,
          base.girls
        ),
      },
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
      await downloadHhGirlsProgressReport(
        {
          scopeLabel: district.label,
          dateRangeLabel,
          generatedAt: new Date(),
          sections: [section],
        },
        buildHhGirlsProgressReportFilename(district.label, filters, format),
        format
      );
    } finally {
      setDownloading(null);
    }
  };

  const handleAllDistrictsDownload = async () => {
    if (!hasRows) return;
    setDownloading("all");
    try {
      await downloadHhGirlsProgressReport(
        {
          scopeLabel: "All Districts",
          dateRangeLabel,
          generatedAt: new Date(),
          sections: buildAllDistrictsSections(),
        },
        buildHhGirlsProgressReportFilename("All_Districts", filters, format),
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
    (base.household.some((r) => r.district === selectedDistrict) ||
      base.girls.some((r) => r.district === selectedDistrict));

  const formatLabel = format === "pdf" ? "PDF" : "Word";

  return (
    <ReportCard
      icon={BarChart3}
      title="HH / Girls Progress Report"
      description={`Programme-wide and district-level summary of household completion toward the ${PROTOCOL.HH_SURVEY_TARGET.toLocaleString()} target, form coverage, consent, revisits, and missing surveys. Excludes enumerator daily-target performance.`}
      status="available"
      accentClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      footer={`Period: ${dateRangeLabel} · Formats: Word (.docx) & PDF · Combined household + girls survey`}
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
            disabled={!hasRows}
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
            disabled={!hasRows}
            aria-label="Report format"
          />
        </div>

        <button
          type="button"
          onClick={handleDistrictDownload}
          disabled={!districtHasData || downloading !== null || !hasRows}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal/30 bg-teal/10 px-4 py-2 text-xs font-medium text-teal hover:bg-teal/15 disabled:pointer-events-none disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {downloading === "district"
            ? "Generating…"
            : `Download district report (${formatLabel})`}
        </button>

        <button
          type="button"
          onClick={handleAllDistrictsDownload}
          disabled={downloading !== null || !hasRows}
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
