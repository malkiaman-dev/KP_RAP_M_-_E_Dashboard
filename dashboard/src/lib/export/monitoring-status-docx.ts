import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type {
  EnumeratorPerformance,
  MonitoringMetrics,
  TrackingFilters,
} from "@/lib/data/tracking-metrics";
import { formatDisplayDate, toIsoDateString } from "@/lib/utils";

export interface MonitoringReportSection {
  districtLabel: string;
  metrics: MonitoringMetrics;
}

export interface MonitoringStatusReportInput {
  scopeLabel: string;
  dateRangeLabel: string;
  generatedAt: Date;
  sections: MonitoringReportSection[];
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildMonitoringStatusReportFilename(
  scopeLabel: string,
  filters: TrackingFilters,
  districtOptions?: { value: string; label: string }[]
): string {
  const district =
    scopeLabel === "All_Districts"
      ? "All_Districts"
      : sanitizeFilenamePart(scopeLabel);

  const fmt = (iso: string) => formatDisplayDate(iso) || iso;

  let datePart: string;
  if (filters.todayOnly) {
    datePart = fmt(toIsoDateString(new Date()));
  } else if (filters.dateFrom && filters.dateTo) {
    datePart =
      filters.dateFrom === filters.dateTo
        ? fmt(filters.dateFrom)
        : `${fmt(filters.dateFrom)}_to_${fmt(filters.dateTo)}`;
  } else if (filters.dateFrom) {
    datePart = fmt(filters.dateFrom);
  } else if (filters.dateTo) {
    datePart = fmt(filters.dateTo);
  } else {
    datePart = "All_Dates";
  }

  return `${district}_Tracking_Status_Report_${datePart}.docx`;
}

export function buildDateRangeLabel(filters: TrackingFilters): string {
  if (filters.todayOnly) {
    return `Today (${formatDisplayDate(toIsoDateString(new Date()))})`;
  }
  if (filters.dateFrom && filters.dateTo) {
    if (filters.dateFrom === filters.dateTo) {
      return formatDisplayDate(filters.dateFrom);
    }
    return `${formatDisplayDate(filters.dateFrom)} to ${formatDisplayDate(filters.dateTo)}`;
  }
  if (filters.dateFrom) {
    return `From ${formatDisplayDate(filters.dateFrom)}`;
  }
  if (filters.dateTo) {
    return `Up to ${formatDisplayDate(filters.dateTo)}`;
  }
  return "All dates";
}

function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

function num(n: number): string {
  return n.toLocaleString();
}

function categorizeEnumerators(enumerators: EnumeratorPerformance[]) {
  const onOrNearTarget = enumerators.filter(
    (e) => e.submissionTargetAttainment >= 70
  );
  const belowTarget = enumerators.filter(
    (e) => e.submissionTargetAttainment > 50 && e.submissionTargetAttainment < 70
  );
  const critical = enumerators.filter(
    (e) => e.submissionTargetAttainment <= 50
  );
  return { onOrNearTarget, belowTarget, critical };
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
}

function body(text: string, bold = false) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, bold })],
  });
}

function kpiTable(rows: [string, string][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: label })] })],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: value, bold: true })],
                }),
              ],
            }),
          ],
        })
    ),
  });
}

function enumeratorTable(
  enumerators: EnumeratorPerformance[],
  showDistrict: boolean
) {
  const headers = [
    "Enumerator",
    ...(showDistrict ? ["District"] : []),
    "Submissions",
    "Tracked",
    "Days",
    "Avg/Day (Subs)",
    "Target % (Subs)",
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true })],
            }),
          ],
        })
    ),
  });

  const dataRows = enumerators.map((e) => {
    const cells = [
      e.name,
      ...(showDistrict ? [e.district] : []),
      num(e.submissions),
      num(e.trackedGirls),
      num(e.activeDays),
      Math.round(e.avgSubmissionsPerDay).toString(),
      pct(e.submissionTargetAttainment, 0),
    ];
    return new TableRow({
      children: cells.map(
        (text) =>
          new TableCell({
            children: [new Paragraph({ text })],
          })
      ),
    });
  });

  if (dataRows.length === 0) {
    dataRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: headers.length,
            children: [new Paragraph({ text: "No enumerators in this category." })],
          }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function buildSectionContent(
  section: MonitoringReportSection,
  showDistrictInTables: boolean
): (Paragraph | Table)[] {
  const { metrics, districtLabel } = section;
  const categories = categorizeEnumerators(metrics.enumeratorPerformance);
  const avgSubsPerDay =
    metrics.enumeratorDays > 0
      ? metrics.totalSubmissions / metrics.enumeratorDays
      : 0;

  const statusSummary =
    metrics.submissionTargetAchievement >= 100
      ? "The field team has met or exceeded the daily submission target for this scope."
      : metrics.submissionTargetAchievement >= 70
        ? "The field team is near the daily submission target but has not fully met it yet."
        : metrics.submissionTargetAchievement > 50
          ? "The field team is below the daily submission target and requires closer monitoring."
          : "The field team is well below the daily submission target and needs immediate support.";

  const blocks: (Paragraph | Table)[] = [
    heading(districtLabel, HeadingLevel.HEADING_2),
    heading("Overall Tracking Status", HeadingLevel.HEADING_3),
    body(statusSummary),
    body(
      `${num(metrics.activeEnumerators)} active enumerators worked across ${num(metrics.enumeratorDays)} enumerator-days. ` +
        `${num(metrics.totalSubmissions)} submissions were received against an expected ${num(metrics.expectedSubmissions)} ` +
        `(${metrics.dailyTarget} girls per enumerator per working day). ` +
        `${num(metrics.totalTracked)} girls were successfully tracked with a tracking success rate of ${pct(metrics.trackingSuccessRate, 0)}.`
    ),
    heading("Daily Target Achievement", HeadingLevel.HEADING_3),
    body(
      `Protocol target: each enumerator must submit tracking forms for ${metrics.dailyTarget} girls per working day.`
    ),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: `Target achieved (submissions): ${pct(metrics.submissionTargetAchievement)}`,
          bold: true,
          size: 28,
        }),
        new TextRun({
          text: `  (${num(metrics.totalSubmissions)} of ${num(metrics.expectedSubmissions)} expected submissions)`,
          size: 22,
        }),
      ],
    }),
    body(
      `Target achieved (tracked): ${pct(metrics.targetAchievement)} (${num(metrics.totalTracked)} of ${num(metrics.expectedTracked)} expected tracked girls).`
    ),
    heading("Key Performance Indicators", HeadingLevel.HEADING_3),
    kpiTable([
      ["Total Submissions", num(metrics.totalSubmissions)],
      ["Girls Attempted (unique)", num(metrics.uniqueGirls)],
      ["Successfully Tracked", num(metrics.totalTracked)],
      ["Tracking Success Rate", pct(metrics.trackingSuccessRate, 0)],
      ["Active Enumerators", num(metrics.activeEnumerators)],
      ["Enumerator-Days", num(metrics.enumeratorDays)],
      ["Field Days (distinct dates)", num(metrics.activeFieldDays)],
      [
        "Avg Submissions / Enumerator / Day",
        avgSubsPerDay.toFixed(1),
      ],
      [
        "Avg Tracked / Enumerator / Day",
        metrics.avgTrackedPerEnumeratorPerDay.toFixed(1),
      ],
      [
        "Days Meeting Target (≥10 tracked/day)",
        `${num(metrics.enumeratorDaysMeetingTarget)} (${pct(metrics.pctDaysMeetingTarget)})`,
      ],
      [
        "Enumerators On Track (avg tracked ≥10/day)",
        `${num(metrics.enumeratorsOnTrack)} of ${num(metrics.activeEnumerators)}`,
      ],
    ]),
    heading("Enumerator Performance by Target Category", HeadingLevel.HEADING_3),
    body(
      "Enumerators are grouped by submission-based target attainment (submissions ÷ days × 10 × 100)."
    ),
    heading(
      `Category 1 — On or Near Target (≥70%) — ${categories.onOrNearTarget.length} enumerator(s)`,
      HeadingLevel.HEADING_4
    ),
    enumeratorTable(categories.onOrNearTarget, showDistrictInTables),
    heading(
      `Category 2 — Below Target (>50% and <70%) — ${categories.belowTarget.length} enumerator(s)`,
      HeadingLevel.HEADING_4
    ),
    enumeratorTable(categories.belowTarget, showDistrictInTables),
    heading(
      `Category 3 — Critical (≤50%) — ${categories.critical.length} enumerator(s)`,
      HeadingLevel.HEADING_4
    ),
    enumeratorTable(categories.critical, showDistrictInTables),
  ];

  return blocks;
}

export function buildMonitoringStatusReport(
  input: MonitoringStatusReportInput
): Document {
  const generatedLabel = formatDisplayDate(
    input.generatedAt.toISOString().slice(0, 10)
  );
  const isMultiDistrict = input.sections.length > 1;
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Field Monitoring Status Report",
          bold: true,
          size: 36,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: input.scopeLabel, size: 26 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `Reporting period: ${input.dateRangeLabel}`,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: `Generated: ${generatedLabel}`,
          italics: true,
          size: 20,
        }),
      ],
    }),
  ];

  for (let i = 0; i < input.sections.length; i++) {
    const section = input.sections[i]!;
    const showDistrict =
      isMultiDistrict && section.districtLabel !== "All Districts";
    children.push(
      ...buildSectionContent(section, showDistrict)
    );
    if (i < input.sections.length - 1) {
      children.push(
        new Paragraph({
          pageBreakBefore: true,
          children: [],
        })
      );
    }
  }

  return new Document({
    sections: [{ children }],
  });
}

export async function downloadMonitoringStatusReport(
  input: MonitoringStatusReportInput,
  filename: string
) {
  const doc = buildMonitoringStatusReport(input);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
