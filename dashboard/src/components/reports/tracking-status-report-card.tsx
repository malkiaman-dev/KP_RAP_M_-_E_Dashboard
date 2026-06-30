"use client";

import { useMemo, useState } from "react";
import { Download, MapPin } from "lucide-react";
import {
  applyTrackingFilters,
  computeMonitoringMetrics,
  type TrackingFilters,
  type TrackingRow,
} from "@/lib/data/tracking-metrics";
import { DAILY_TRACKING_TARGET_PER_ENUMERATOR } from "@/lib/data/protocol";
import {
  buildDateRangeLabel,
  buildMonitoringStatusReportFilename,
  downloadMonitoringStatusReport,
  type MonitoringReportSection,
} from "@/lib/export/monitoring-status-docx";
import { ReportCard } from "@/components/reports/report-card";

export function TrackingStatusReportCard({
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
  const [downloading, setDownloading] = useState<"district" | "all" | null>(
    null
  );

  const districts = districtOptions ?? [];

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
  ): MonitoringReportSection | null => {
    const rows = baseRows.filter((r) => r.district === districtValue);
    if (rows.length === 0) return null;
    return {
      districtLabel,
      metrics: computeMonitoringMetrics(
        rows,
        DAILY_TRACKING_TARGET_PER_ENUMERATOR
      ),
    };
  };

  const buildAllDistrictsSections = (): MonitoringReportSection[] => {
    const overall = computeMonitoringMetrics(
      baseRows,
      DAILY_TRACKING_TARGET_PER_ENUMERATOR
    );
    const sections: MonitoringReportSection[] = [
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
      await downloadMonitoringStatusReport(
        {
          scopeLabel: district.label,
          dateRangeLabel,
          generatedAt: new Date(),
          sections: [section],
        },
        buildMonitoringStatusReportFilename(district.label, filters, districts)
      );
    } finally {
      setDownloading(null);
    }
  };

  const handleAllDistrictsDownload = async () => {
    if (baseRows.length === 0) return;

    setDownloading("all");
    try {
      await downloadMonitoringStatusReport(
        {
          scopeLabel: "All Districts",
          dateRangeLabel,
          generatedAt: new Date(),
          sections: buildAllDistrictsSections(),
        },
        buildMonitoringStatusReportFilename(
          "All_Districts",
          filters,
          districts
        )
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
      icon={MapPin}
      title="Tracking Status Report"
      description={`Word report with overall tracking status, key KPIs, the ${DAILY_TRACKING_TARGET_PER_ENUMERATOR} girls per enumerator per day target (submission-based), and enumerators grouped into three performance categories.`}
      status="available"
      footer={`Period: ${dateRangeLabel} · Format: DOCX · Categories: ≥70% · >50% and <70% · ≤50%`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1 sm:max-w-xs">
          <label
            htmlFor="tracking-report-district"
            className="mb-1 block text-[11px] font-medium text-muted-foreground"
          >
            District
          </label>
          <select
            id="tracking-report-district"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!allSubmissions || baseRows.length === 0}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-teal disabled:opacity-50"
          >
            <option value="">Select a district…</option>
            {districts.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleDistrictDownload}
          disabled={
            !districtHasData || downloading !== null || baseRows.length === 0
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal/30 bg-teal/10 px-4 py-2 text-xs font-medium text-teal hover:bg-teal/15 disabled:pointer-events-none disabled:opacity-50"
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
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
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
