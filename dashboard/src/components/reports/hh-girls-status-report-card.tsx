"use client";

import { useMemo, useState } from "react";
import { Download, Home } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  applyHhGirlsMonitoringFilters,
  computeHhGirlsMonitoringMetrics,
  type HhGirlsMonitoringFilters,
} from "@/lib/data/hh-girls-monitoring";
import type { HhGirlsRow } from "@/lib/data/hh-girls-metrics";
import {
  DAILY_HH_FORMS_TARGET_PER_ENUMERATOR,
  DAILY_HH_TARGET_PER_ENUMERATOR,
} from "@/lib/data/protocol";
import { downloadHhGirlsStatusReport } from "@/lib/export/hh-girls-status-report-download";
import {
  buildHhDateRangeLabel,
  buildHhGirlsStatusReportFilename,
  type HhGirlsStatusReportSection,
  type ReportFormat,
} from "@/lib/export/hh-girls-status-report-shared";
import { ReportCard } from "@/components/reports/report-card";

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "docx", label: "Microsoft Word (.docx)" },
] as const;

export function HhGirlsStatusReportCard({
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
    () => buildHhDateRangeLabel(filters),
    [filters]
  );

  const hasRows = base.household.length + base.girls.length > 0;

  const buildDistrictSection = (
    districtValue: string,
    districtLabel: string
  ): HhGirlsStatusReportSection | null => {
    const household = base.household.filter((r) => r.district === districtValue);
    const girls = base.girls.filter((r) => r.district === districtValue);
    if (household.length + girls.length === 0) return null;
    return {
      districtLabel,
      metrics: computeHhGirlsMonitoringMetrics(
        household,
        girls,
        DAILY_HH_TARGET_PER_ENUMERATOR,
        DAILY_HH_FORMS_TARGET_PER_ENUMERATOR
      ),
    };
  };

  const buildAllDistrictsSections = (): HhGirlsStatusReportSection[] => {
    const overall = computeHhGirlsMonitoringMetrics(
      base.household,
      base.girls,
      DAILY_HH_TARGET_PER_ENUMERATOR,
      DAILY_HH_FORMS_TARGET_PER_ENUMERATOR
    );
    const sections: HhGirlsStatusReportSection[] = [
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
      await downloadHhGirlsStatusReport(
        {
          scopeLabel: district.label,
          dateRangeLabel,
          generatedAt: new Date(),
          sections: [section],
        },
        buildHhGirlsStatusReportFilename(district.label, filters, format),
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
      await downloadHhGirlsStatusReport(
        {
          scopeLabel: "All Districts",
          dateRangeLabel,
          generatedAt: new Date(),
          sections: buildAllDistrictsSections(),
        },
        buildHhGirlsStatusReportFilename("All_Districts", filters, format),
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

  return (
    <ReportCard
      icon={Home}
      title="HH / Girls Status Report"
      description={`Downloadable report with executive summary, overall HH/Girls field status, key KPIs, daily targets (${DAILY_HH_TARGET_PER_ENUMERATOR} completed HH and ${DAILY_HH_FORMS_TARGET_PER_ENUMERATOR} forms per enumerator per day), and enumerators grouped into three performance categories.`}
      status="available"
      accentClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      footer={`Period: ${dateRangeLabel} · Formats: Word (.docx) & PDF · Categories: ≥70% · >50% and <70% · ≤50% (forms target)`}
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
            disabled={!hasRows}
            aria-label="Report district"
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
            disabled={!hasRows}
            aria-label="Report format"
            placement="auto"
          />
        </div>

        <button
          type="button"
          onClick={handleDistrictDownload}
          disabled={!districtHasData || downloading !== null || !hasRows}
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
          disabled={downloading !== null || !hasRows}
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
