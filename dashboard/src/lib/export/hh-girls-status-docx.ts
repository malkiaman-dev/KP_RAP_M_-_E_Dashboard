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
  HhGirlsEnumeratorPerformance,
  HhGirlsMonitoringMetrics,
} from "@/lib/data/hh-girls-monitoring";
import { formatDisplayDate } from "@/lib/utils";
import {
  buildHhExecutiveSummaryBullets,
  buildHhReportSummaryBullets,
  buildHhStatusSummary,
  categorizeHhEnumerators,
  formsWithUniqueGirls,
  num,
  pct,
  tierFor,
  type HhGirlsEnumeratorCategories,
  type HhGirlsStatusReportInput,
  type HhGirlsStatusReportSection,
} from "@/lib/export/hh-girls-status-report-shared";

export type { HhGirlsStatusReportSection, HhGirlsStatusReportInput };
export {
  buildHhDateRangeLabel,
  buildHhGirlsStatusReportFilename,
} from "@/lib/export/hh-girls-status-report-shared";

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

function localTier(value: number, high = 70, med = 50): Tier {
  if (value >= high) return { fg: COLOR.high, bg: COLOR.highBg, label: "On Track" };
  if (value > med) return { fg: COLOR.med, bg: COLOR.medBg, label: "Below" };
  return { fg: COLOR.low, bg: COLOR.lowBg, label: "Critical" };
}

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

function paragraph(
  text: string,
  opts: { spacingAfter?: number; keepNext?: boolean } = {}
) {
  return new Paragraph({
    spacing: { after: opts.spacingAfter ?? 140, line: 276 },
    keepNext: opts.keepNext,
    children: [new TextRun({ text, color: COLOR.body, size: 20 })],
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 360, after: 160 },
    keepNext: true,
    keepLines: true,
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

function coverBanner(input: HhGirlsStatusReportInput, generatedLabel: string) {
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
                    text: "HH / Girls Status Report",
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
    rows.push(new TableRow({ cantSplit: true, children: slice.map(kpiTileCell) }));
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: gapBorders(COLOR.white, 16),
    rows,
  });
}

function targetCallout(metrics: HhGirlsMonitoringMetrics): Table {
  const tier = localTier(metrics.submissionTargetAchievement);
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
        cantSplit: true,
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
                    text: "(forms-based)",
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
                    text: `${formsWithUniqueGirls(metrics)} of ${num(metrics.expectedSubmissions)} expected forms  ·  Target: ${metrics.dailyFormsTarget} forms/day (${metrics.dailyHhTarget} completed HH/day)`,
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

function categoryBanner(title: string, count: number, tier: Tier): Paragraph {
  return new Paragraph({
    keepNext: true,
    keepLines: true,
    spacing: { before: 60, after: 0 },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: tier.bg },
    border: {
      left: { style: BorderStyle.SINGLE, size: 20, color: tier.fg, space: 8 },
    },
    children: [
      new TextRun({ text: title, bold: true, size: 22, color: tier.fg }),
      new TextRun({
        text: `    ${count} enumerator${count === 1 ? "" : "s"}`,
        bold: true,
        size: 18,
        color: COLOR.subtle,
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
    shading: {
      type: ShadingType.CLEAR,
      color: "auto",
      fill: zebra ? COLOR.zebra : COLOR.white,
    },
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

function enumeratorTable(enumerators: HhGirlsEnumeratorPerformance[]): Table {
  const headers: { label: string; alignRight: boolean }[] = [
    { label: "Enumerator", alignRight: false },
    { label: "District", alignRight: false },
    { label: "Forms", alignRight: true },
    { label: "Completed HH", alignRight: true },
    { label: "Days", alignRight: true },
    { label: "Avg/Day", alignRight: true },
    { label: "Target %", alignRight: true },
    { label: "Status", alignRight: false },
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h) => headerCell(h.label, h.alignRight)),
  });

  const dataRows: TableRow[] = enumerators.map((e, idx) => {
    const zebra = idx % 2 === 1;
    const fill = zebra ? COLOR.zebra : undefined;
    const shared = tierFor(e.submissionTargetAttainment);
    const tier: Tier = { fg: shared.fg.replace("#", ""), bg: shared.bg.replace("#", ""), label: shared.label };
    return new TableRow({
      cantSplit: true,
      children: [
        dataCell(e.name, { bold: true, color: COLOR.ink, fill }),
        dataCell(e.district, { fill }),
        dataCell(num(e.submissions), { alignRight: true, fill }),
        dataCell(num(e.completedHouseholds), {
          alignRight: true,
          color: COLOR.brand,
          bold: true,
          fill,
        }),
        dataCell(num(e.activeDays), { alignRight: true, fill }),
        dataCell(Math.round(e.avgSubmissionsPerDay).toString(), {
          alignRight: true,
          fill,
        }),
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
        cantSplit: true,
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

interface SectionSummaryData {
  districtLabel: string;
  metrics: HhGirlsMonitoringMetrics;
  categories: HhGirlsEnumeratorCategories;
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
        cantSplit: true,
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
  const bullets = buildHhExecutiveSummaryBullets(
    data.districtLabel,
    data.metrics,
    data.categories
  );
  return summaryPanel(null, COLOR.brandSoft, COLOR.brand, bullets);
}

function buildReportSummary(data: SectionSummaryData): (Paragraph | Table)[] {
  const recapBullets = buildHhReportSummaryBullets(
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

function buildSectionContent(
  section: HhGirlsStatusReportSection
): (Paragraph | Table)[] {
  const { metrics, districtLabel } = section;
  const categories = categorizeHhEnumerators(metrics.enumeratorPerformance);
  const avgFormsPerDay =
    metrics.enumeratorDays > 0
      ? metrics.totalSubmissions / metrics.enumeratorDays
      : 0;
  const avgHhPerDay = metrics.avgCompletedPerEnumeratorPerDay;

  const summaryData: SectionSummaryData = {
    districtLabel,
    metrics,
    categories,
  };

  const subTier = localTier(metrics.submissionTargetAchievement);
  const statusSummary = buildHhStatusSummary(metrics);
  const completionTier = localTier(metrics.completionRate);
  const formsPct =
    metrics.dailyFormsTarget > 0
      ? (avgFormsPerDay / metrics.dailyFormsTarget) * 100
      : 0;
  const hhPct =
    metrics.dailyHhTarget > 0 ? (avgHhPerDay / metrics.dailyHhTarget) * 100 : 0;
  const avgFormsTier = localTier(formsPct);
  const avgHhTier = localTier(hhPct);

  const tiles: KpiTile[] = [
    {
      label: "Total Forms",
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
      label: "Completed Households",
      value: num(metrics.totalCompleted),
      accent: COLOR.high,
      bg: COLOR.highBg,
    },
    {
      label: "Completion Rate",
      value: pct(metrics.completionRate, 0),
      accent: completionTier.fg,
      bg: completionTier.bg,
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
      label: "Avg Forms / Enum / Day",
      value: avgFormsPerDay.toFixed(1),
      sub: `/ ${metrics.dailyFormsTarget}`,
      accent: avgFormsTier.fg,
      bg: avgFormsTier.bg,
    },
    {
      label: "Avg Completed HH / Enum / Day",
      value: avgHhPerDay.toFixed(1),
      sub: `/ ${metrics.dailyHhTarget}`,
      accent: avgHhTier.fg,
      bg: avgHhTier.bg,
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
          text: `${num(metrics.activeEnumerators)} enumerators · ${num(metrics.enumeratorDays)} enumerator-days · ${num(metrics.activeFieldDays)} actual field days · ${formsWithUniqueGirls(metrics)}`,
          size: 18,
          color: COLOR.subtle,
        }),
      ],
    }),

    sectionHeading("Executive Summary"),
    buildExecutiveSummary(summaryData),
    new Paragraph({ spacing: { after: 160 }, children: [] }),

    sectionHeading("Overall HH / Girls Status"),
    new Paragraph({
      spacing: { after: 140, line: 276 },
      children: [
        new TextRun({ text: statusSummary, bold: true, size: 21, color: subTier.fg }),
      ],
    }),
    paragraph(
      `${num(metrics.activeEnumerators)} active enumerators worked across ${num(metrics.enumeratorDays)} enumerator-days (${num(metrics.activeFieldDays)} actual field days). ${formsWithUniqueGirls(metrics)} were received against an expected ${num(metrics.expectedSubmissions)} (${metrics.dailyFormsTarget} forms per enumerator per working day). ${num(metrics.totalCompleted)} households were completed, a completion rate of ${pct(metrics.completionRate, 0)}.`
    ),

    sectionHeading("Daily Target Achievement"),
    targetCallout(metrics),
    new Paragraph({
      spacing: { before: 140, after: 120 },
      children: [
        new TextRun({
          text: `HH-based achievement: ${pct(metrics.targetAchievement)} (${num(metrics.totalCompleted)} of ${num(metrics.expectedCompleted)} expected completed households at ${metrics.dailyHhTarget} HH/day).`,
          size: 19,
          color: COLOR.body,
        }),
      ],
    }),

    sectionHeading("Key Performance Indicators"),
    kpiGrid(tiles),

    sectionHeading("Enumerator Performance by Target Category"),
    paragraph(
      `Enumerators are grouped by forms-based target attainment, calculated as forms ÷ (working days × ${metrics.dailyFormsTarget}) × 100.`,
      { spacingAfter: 180, keepNext: true }
    ),

    categoryBanner(
      "Category 1 — High Performers (≥ 70%)",
      categories.onOrNearTarget.length,
      { fg: COLOR.high, bg: COLOR.highBg, label: "On Track" }
    ),
    enumeratorTable(categories.onOrNearTarget),

    new Paragraph({ spacing: { after: 120 }, children: [] }),
    categoryBanner(
      "Category 2 — Medium Performers (> 50% and < 70%)",
      categories.belowTarget.length,
      { fg: COLOR.med, bg: COLOR.medBg, label: "Below" }
    ),
    enumeratorTable(categories.belowTarget),

    new Paragraph({ spacing: { after: 120 }, children: [] }),
    categoryBanner(
      "Category 3 — Low Performers (≤ 50%)",
      categories.critical.length,
      { fg: COLOR.low, bg: COLOR.lowBg, label: "Critical" }
    ),
    enumeratorTable(categories.critical),

    new Paragraph({ spacing: { after: 160 }, children: [] }),
    ...buildReportSummary(summaryData),
  ];
}

export function buildHhGirlsStatusReport(
  input: HhGirlsStatusReportInput
): Document {
  const generatedLabel = formatDisplayDate(
    input.generatedAt.toISOString().slice(0, 10)
  );

  const children: (Paragraph | Table)[] = [
    coverBanner(input, generatedLabel),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];

  for (let i = 0; i < input.sections.length; i++) {
    const section = input.sections[i]!;
    children.push(...buildSectionContent(section));
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
            text: `HH / Girls Status Report  ·  ${input.scopeLabel}`,
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

export async function downloadHhGirlsStatusDocx(
  input: HhGirlsStatusReportInput,
  filename: string
) {
  const doc = buildHhGirlsStatusReport(input);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
