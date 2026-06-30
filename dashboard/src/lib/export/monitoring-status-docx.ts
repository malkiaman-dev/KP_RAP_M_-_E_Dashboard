import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
} from "docx";
import type {
  EnumeratorPerformance,
  MonitoringMetrics,
} from "@/lib/data/tracking-metrics";
import { formatDisplayDate } from "@/lib/utils";
import {
  buildExecutiveSummaryBullets,
  buildReportSummaryBullets,
  categorizeEnumerators as sharedCategorizeEnumerators,
  num,
  pct,
  type EnumeratorCategories,
  type MonitoringReportSection,
  type MonitoringStatusReportInput,
} from "@/lib/export/monitoring-report-shared";

export type { MonitoringReportSection, MonitoringStatusReportInput };
export {
  buildDateRangeLabel,
  buildMonitoringStatusReportFilename,
} from "@/lib/export/monitoring-report-shared";

/* -------------------------------------------------------------------------- */
/*  Brand & status palette (hex without the leading #)                        */
/* -------------------------------------------------------------------------- */

const COLOR = {
  brand: "0F766E",
  brandDark: "134E4A",
  brandSoft: "CCFBF1",
  ink: "0F172A",
  body: "334155",
  subtle: "64748B",
  line: "E2E8F0",
  white: "FFFFFF",
  zebra: "F1F5F9",
  tile: "F8FAFC",
  high: "15803D",
  highBg: "DCFCE7",
  med: "B45309",
  medBg: "FEF3C7",
  low: "B91C1C",
  lowBg: "FEE2E2",
  neutral: "1E293B",
} as const;

interface Tier {
  fg: string;
  bg: string;
  label: string;
}

function tierFor(value: number, high = 70, med = 50): Tier {
  if (value >= high) return { fg: COLOR.high, bg: COLOR.highBg, label: "On Track" };
  if (value > med) return { fg: COLOR.med, bg: COLOR.medBg, label: "Below" };
  return { fg: COLOR.low, bg: COLOR.lowBg, label: "Critical" };
}

/* -------------------------------------------------------------------------- */
/*  Filename + label helpers — see monitoring-report-shared.ts              */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Low-level building blocks                                                 */
/* -------------------------------------------------------------------------- */

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: COLOR.white };

function gapBorders(color = COLOR.white, size = 14) {
  const edge = { style: BorderStyle.SINGLE, size, color };
  return {
    top: edge,
    bottom: edge,
    left: edge,
    right: edge,
    insideHorizontal: edge,
    insideVertical: edge,
  };
}

function paragraph(text: string, opts: { spacingAfter?: number } = {}) {
  return new Paragraph({
    spacing: { after: opts.spacingAfter ?? 140, line: 276 },
    children: [new TextRun({ text, color: COLOR.body, size: 20 })],
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 360, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 14, color: COLOR.brand },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 24,
        color: COLOR.brand,
      }),
    ],
  });
}

/* ----- Cover banner ------------------------------------------------------- */

function coverBanner(input: MonitoringStatusReportInput, generatedLabel: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: COLOR.brand },
            margins: { top: 360, bottom: 360, left: 360, right: 360 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "KPRAP · FIELD MONITORING",
                    bold: true,
                    size: 18,
                    color: COLOR.brandSoft,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: "Tracking Status Report",
                    bold: true,
                    size: 48,
                    color: COLOR.white,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: input.scopeLabel,
                    bold: true,
                    size: 26,
                    color: COLOR.white,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Reporting period: ${input.dateRangeLabel}    |    Generated: ${generatedLabel}`,
                    size: 18,
                    color: COLOR.brandSoft,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/* ----- KPI tile grid ------------------------------------------------------ */

interface KpiTile {
  label: string;
  value: string;
  accent: string;
  bg: string;
  sub?: string;
}

function kpiTileCell(tile: KpiTile | null): TableCell {
  if (!tile) {
    return new TableCell({
      width: { size: 33, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: COLOR.white },
      children: [new Paragraph({ children: [] })],
    });
  }
  return new TableCell({
    width: { size: 33, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: tile.bg },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 160, bottom: 160, left: 200, right: 160 },
    children: [
      new Paragraph({
        spacing: { after: 30 },
        children: [
          new TextRun({ text: tile.value, bold: true, size: 40, color: tile.accent }),
          ...(tile.sub
            ? [new TextRun({ text: `  ${tile.sub}`, size: 16, color: COLOR.subtle })]
            : []),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: tile.label.toUpperCase(),
            bold: true,
            size: 15,
            color: COLOR.subtle,
          }),
        ],
      }),
    ],
  });
}

function kpiGrid(tiles: KpiTile[]): Table {
  const rows: TableRow[] = [];
  for (let i = 0; i < tiles.length; i += 3) {
    const slice = [tiles[i] ?? null, tiles[i + 1] ?? null, tiles[i + 2] ?? null];
    rows.push(new TableRow({ children: slice.map(kpiTileCell) }));
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: gapBorders(COLOR.white, 16),
    rows,
  });
}

/* ----- Headline target callout ------------------------------------------- */

function targetCallout(metrics: MonitoringMetrics): Table {
  const tier = tierFor(metrics.submissionTargetAchievement);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: tier.fg },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: tier.fg },
      left: { style: BorderStyle.SINGLE, size: 24, color: tier.fg },
      right: { style: BorderStyle.SINGLE, size: 4, color: tier.fg },
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: tier.bg },
            margins: { top: 200, bottom: 200, left: 280, right: 280 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "DAILY TARGET ACHIEVED ",
                    bold: true,
                    size: 18,
                    color: tier.fg,
                  }),
                  new TextRun({
                    text: "(submission-based)",
                    size: 16,
                    color: COLOR.subtle,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: pct(metrics.submissionTargetAchievement),
                    bold: true,
                    size: 64,
                    color: tier.fg,
                  }),
                  new TextRun({
                    text: `   ${tier.label}`,
                    bold: true,
                    size: 24,
                    color: tier.fg,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${num(metrics.totalSubmissions)} of ${num(metrics.expectedSubmissions)} expected submissions  ·  Target: ${metrics.dailyTarget} girls per enumerator per working day`,
                    size: 18,
                    color: COLOR.body,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/* ----- Enumerator category tables ---------------------------------------- */

function categoryBanner(title: string, count: number, tier: Tier): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: { style: BorderStyle.SINGLE, size: 20, color: tier.fg },
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: tier.bg },
            margins: { top: 120, bottom: 120, left: 220, right: 220 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: title, bold: true, size: 22, color: tier.fg }),
                  new TextRun({
                    text: `    ${count} enumerator${count === 1 ? "" : "s"}`,
                    bold: true,
                    size: 18,
                    color: COLOR.subtle,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function headerCell(text: string, alignRight = false): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLOR.brand },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, size: 17, color: COLOR.white })],
      }),
    ],
  });
}

function dataCell(
  text: string,
  opts: {
    alignRight?: boolean;
    bold?: boolean;
    color?: string;
    fill?: string;
  } = {}
): TableCell {
  return new TableCell({
    shading: opts.fill
      ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill }
      : undefined,
    margins: { top: 70, bottom: 70, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: opts.alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: 17,
            color: opts.color ?? COLOR.body,
          }),
        ],
      }),
    ],
  });
}

function statusCell(tier: Tier, zebra: boolean): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: zebra ? COLOR.zebra : COLOR.white },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: tier.label, bold: true, size: 16, color: tier.fg }),
        ],
      }),
    ],
  });
}

function enumeratorTable(
  enumerators: EnumeratorPerformance[],
  showDistrict: boolean
): Table {
  const headers: { label: string; alignRight: boolean }[] = [
    { label: "Enumerator", alignRight: false },
    ...(showDistrict ? [{ label: "District", alignRight: false }] : []),
    { label: "Subs", alignRight: true },
    { label: "Tracked", alignRight: true },
    { label: "Days", alignRight: true },
    { label: "Avg/Day", alignRight: true },
    { label: "Target %", alignRight: true },
    { label: "Status", alignRight: false },
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h) => headerCell(h.label, h.alignRight)),
  });

  const dataRows: TableRow[] = enumerators.map((e, idx) => {
    const zebra = idx % 2 === 1;
    const fill = zebra ? COLOR.zebra : undefined;
    const tier = tierFor(e.submissionTargetAttainment);
    return new TableRow({
      children: [
        dataCell(e.name, { bold: true, color: COLOR.ink, fill }),
        ...(showDistrict ? [dataCell(e.district, { fill })] : []),
        dataCell(num(e.submissions), { alignRight: true, fill }),
        dataCell(num(e.trackedGirls), { alignRight: true, color: COLOR.brand, bold: true, fill }),
        dataCell(num(e.activeDays), { alignRight: true, fill }),
        dataCell(Math.round(e.avgSubmissionsPerDay).toString(), { alignRight: true, fill }),
        dataCell(pct(e.submissionTargetAttainment, 0), {
          alignRight: true,
          bold: true,
          color: tier.fg,
          fill,
        }),
        statusCell(tier, zebra),
      ],
    });
  });

  if (dataRows.length === 0) {
    dataRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: headers.length,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "No enumerators in this category.",
                    italics: true,
                    size: 17,
                    color: COLOR.subtle,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  const line = { style: BorderStyle.SINGLE, size: 4, color: COLOR.line };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: line,
      bottom: line,
      left: line,
      right: line,
      insideHorizontal: line,
      insideVertical: line,
    },
    rows: [headerRow, ...dataRows],
  });
}

/* -------------------------------------------------------------------------- */
/*  Executive summary & report summary                                        */
/* -------------------------------------------------------------------------- */

interface SectionSummaryData {
  districtLabel: string;
  metrics: MonitoringMetrics;
  categories: EnumeratorCategories;
}

function summaryPanel(
  title: string | null,
  fill: string,
  accent: string,
  bullets: string[]
): Table {
  const titleParagraph =
    title != null && title.length > 0
      ? [
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: title.toUpperCase(),
                bold: true,
                size: 22,
                color: accent,
              }),
            ],
          }),
        ]
      : [];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: accent },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: accent },
      left: { style: BorderStyle.SINGLE, size: 24, color: accent },
      right: { style: BorderStyle.SINGLE, size: 4, color: accent },
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill },
            margins: { top: 200, bottom: 200, left: 280, right: 280 },
            children: [
              ...titleParagraph,
              ...bullets.map(
                (text) =>
                  new Paragraph({
                    spacing: { after: 80, line: 276 },
                    bullet: { level: 0 },
                    children: [
                      new TextRun({ text, size: 19, color: COLOR.body }),
                    ],
                  })
              ),
            ],
          }),
        ],
      }),
    ],
  });
}

function buildExecutiveSummary(data: SectionSummaryData): Table {
  const bullets = buildExecutiveSummaryBullets(
    data.districtLabel,
    data.metrics,
    data.categories
  );
  return summaryPanel(null, COLOR.brandSoft, COLOR.brand, bullets);
}

function buildReportSummary(data: SectionSummaryData): (Paragraph | Table)[] {
  const recapBullets = buildReportSummaryBullets(
    data.districtLabel,
    data.metrics,
    data.categories
  );

  return [
    sectionHeading("Report Summary"),
    summaryPanel(null, COLOR.tile, COLOR.brandDark, recapBullets),
    new Paragraph({
      spacing: { before: 160, after: 0 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `— End of ${data.districtLabel} Report —`,
          italics: true,
          size: 17,
          color: COLOR.subtle,
        }),
      ],
    }),
  ];
}

/* -------------------------------------------------------------------------- */
/*  Section assembly                                                          */
/* -------------------------------------------------------------------------- */

function buildSectionContent(
  section: MonitoringReportSection,
  showDistrictInTables: boolean
): (Paragraph | Table)[] {
  const { metrics, districtLabel } = section;
  const categories = sharedCategorizeEnumerators(metrics.enumeratorPerformance);
  const avgSubsPerDay =
    metrics.enumeratorDays > 0
      ? metrics.totalSubmissions / metrics.enumeratorDays
      : 0;

  const summaryData: SectionSummaryData = {
    districtLabel,
    metrics,
    categories,
  };

  const subTier = tierFor(metrics.submissionTargetAchievement);
  const statusSummary =
    metrics.submissionTargetAchievement >= 100
      ? "The field team has met or exceeded the daily submission target for this scope."
      : metrics.submissionTargetAchievement >= 70
        ? "The field team is near the daily submission target but has not fully met it yet."
        : metrics.submissionTargetAchievement > 50
          ? "The field team is below the daily submission target and requires closer monitoring."
          : "The field team is well below the daily submission target and needs immediate support.";

  const successTier = tierFor(metrics.trackingSuccessRate);
  const avgSubsPct = (avgSubsPerDay / metrics.dailyTarget) * 100;
  const avgSubsTier = tierFor(avgSubsPct);
  const daysTier = tierFor(metrics.pctDaysMeetingTarget);

  const tiles: KpiTile[] = [
    {
      label: "Total Submissions",
      value: num(metrics.totalSubmissions),
      accent: COLOR.brand,
      bg: COLOR.tile,
    },
    {
      label: "Girls Attempted",
      value: num(metrics.uniqueGirls),
      accent: COLOR.neutral,
      bg: COLOR.tile,
    },
    {
      label: "Successfully Tracked",
      value: num(metrics.totalTracked),
      accent: COLOR.high,
      bg: COLOR.highBg,
    },
    {
      label: "Tracking Success Rate",
      value: pct(metrics.trackingSuccessRate, 0),
      accent: successTier.fg,
      bg: successTier.bg,
    },
    {
      label: "Active Enumerators",
      value: num(metrics.activeEnumerators),
      accent: COLOR.brand,
      bg: COLOR.tile,
    },
    {
      label: "Enumerator-Days",
      value: num(metrics.enumeratorDays),
      sub: `${num(metrics.activeFieldDays)} field days`,
      accent: COLOR.neutral,
      bg: COLOR.tile,
    },
    {
      label: "Avg Subs / Enum / Day",
      value: avgSubsPerDay.toFixed(1),
      sub: `/ ${metrics.dailyTarget}`,
      accent: avgSubsTier.fg,
      bg: avgSubsTier.bg,
    },
    {
      label: "Days Meeting Target",
      value: pct(metrics.pctDaysMeetingTarget, 0),
      accent: daysTier.fg,
      bg: daysTier.bg,
    },
    {
      label: "Enumerators On Track",
      value: `${num(metrics.enumeratorsOnTrack)}/${num(metrics.activeEnumerators)}`,
      accent: COLOR.high,
      bg: COLOR.highBg,
    },
  ];

  return [
    new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({ text: districtLabel, bold: true, size: 32, color: COLOR.ink }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR.line },
      },
      children: [
        new TextRun({
          text: `${num(metrics.activeEnumerators)} enumerators · ${num(metrics.enumeratorDays)} enumerator-days · ${num(metrics.activeFieldDays)} actual field days · ${num(metrics.totalSubmissions)} submissions`,
          size: 18,
          color: COLOR.subtle,
        }),
      ],
    }),

    sectionHeading("Executive Summary"),
    buildExecutiveSummary(summaryData),
    new Paragraph({ spacing: { after: 160 }, children: [] }),

    sectionHeading("Overall Tracking Status"),
    new Paragraph({
      spacing: { after: 140, line: 276 },
      children: [
        new TextRun({ text: statusSummary, bold: true, size: 21, color: subTier.fg }),
      ],
    }),
    paragraph(
      `${num(metrics.activeEnumerators)} active enumerators worked across ${num(metrics.enumeratorDays)} enumerator-days (${num(metrics.activeFieldDays)} actual field days). ${num(metrics.totalSubmissions)} submissions were received against an expected ${num(metrics.expectedSubmissions)} (${metrics.dailyTarget} girls per enumerator per working day). ${num(metrics.totalTracked)} girls were successfully tracked, a tracking success rate of ${pct(metrics.trackingSuccessRate, 0)}.`
    ),

    sectionHeading("Daily Target Achievement"),
    targetCallout(metrics),
    new Paragraph({
      spacing: { before: 140, after: 120 },
      children: [
        new TextRun({
          text: `Tracked-based achievement: ${pct(metrics.targetAchievement)} (${num(metrics.totalTracked)} of ${num(metrics.expectedTracked)} expected tracked girls).`,
          size: 19,
          color: COLOR.body,
        }),
      ],
    }),

    sectionHeading("Key Performance Indicators"),
    kpiGrid(tiles),

    sectionHeading("Enumerator Performance by Target Category"),
    paragraph(
      "Enumerators are grouped by submission-based target attainment, calculated as submissions ÷ (working days × 10) × 100.",
      { spacingAfter: 180 }
    ),

    categoryBanner(
      "Category 1 — High Performers (≥ 70%)",
      categories.onOrNearTarget.length,
      { fg: COLOR.high, bg: COLOR.highBg, label: "On Track" }
    ),
    enumeratorTable(categories.onOrNearTarget, showDistrictInTables),

    new Paragraph({ spacing: { after: 120 }, children: [] }),
    categoryBanner(
      "Category 2 — Medium Performers (> 50% and < 70%)",
      categories.belowTarget.length,
      { fg: COLOR.med, bg: COLOR.medBg, label: "Below" }
    ),
    enumeratorTable(categories.belowTarget, showDistrictInTables),

    new Paragraph({ spacing: { after: 120 }, children: [] }),
    categoryBanner(
      "Category 3 — Low Performers (≤ 50%)",
      categories.critical.length,
      { fg: COLOR.low, bg: COLOR.lowBg, label: "Critical" }
    ),
    enumeratorTable(categories.critical, showDistrictInTables),

    new Paragraph({ spacing: { after: 160 }, children: [] }),
    ...buildReportSummary(summaryData),
  ];
}

/* -------------------------------------------------------------------------- */
/*  Document assembly                                                         */
/* -------------------------------------------------------------------------- */

export function buildMonitoringStatusReport(
  input: MonitoringStatusReportInput
): Document {
  const generatedLabel = formatDisplayDate(
    input.generatedAt.toISOString().slice(0, 10)
  );
  const isMultiDistrict = input.sections.length > 1;

  const children: (Paragraph | Table)[] = [
    coverBanner(input, generatedLabel),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];

  for (let i = 0; i < input.sections.length; i++) {
    const section = input.sections[i]!;
    const showDistrict =
      isMultiDistrict && section.districtLabel !== "All Districts";
    children.push(...buildSectionContent(section, showDistrict));
    if (i < input.sections.length - 1) {
      children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    }
  }

  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR.line },
        },
        children: [
          new TextRun({
            text: `Tracking Status Report  ·  ${input.scopeLabel}`,
            size: 15,
            color: COLOR.subtle,
          }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: COLOR.line },
        },
        children: [
          new TextRun({
            text: "Confidential · KPRAP M&E Platform     |     Page ",
            size: 15,
            color: COLOR.subtle,
          }),
          new TextRun({ children: [PageNumber.CURRENT], size: 15, color: COLOR.subtle }),
          new TextRun({ text: " of ", size: 15, color: COLOR.subtle }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 15,
            color: COLOR.subtle,
          }),
        ],
      }),
    ],
  });

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20, color: COLOR.body },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
            },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children,
      },
    ],
  });
}

export async function downloadMonitoringStatusDocx(
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
