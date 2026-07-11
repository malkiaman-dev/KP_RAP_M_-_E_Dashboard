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
import type { HhGirlsProgressReportMetrics } from "@/lib/data/hh-girls-progress-report-metrics";
import { formatDisplayDate } from "@/lib/utils";
import {
  buildHhProgressConclusionBullets,
  buildHhProgressExecutiveSummaryBullets,
  buildHhProgressKpiTiles,
  num,
  pct,
  type HhGirlsProgressReportInput,
  type HhGirlsProgressReportSection,
  type ProgressKpiTile,
} from "@/lib/export/hh-girls-progress-report-shared";

export type { HhGirlsProgressReportSection, HhGirlsProgressReportInput };
export {
  buildHhGirlsProgressReportFilename,
  buildDateRangeLabel,
} from "@/lib/export/hh-girls-progress-report-shared";

const COLOR = {
  brand: "0F766E",
  brandDark: "134E4A",
  brandSoft: "CCFBF1",
  ink: "0F172A",
  body: "334155",
  subtle: "64748B",
  line: "E2E8F0",
  white: "FFFFFF",
  tile: "F8FAFC",
  zebra: "F1F5F9",
} as const;

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: COLOR.white };

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

function coverBanner(input: HhGirlsProgressReportInput, generatedLabel: string) {
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
        cantSplit: true,
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
                    text: "HH / Girls Progress Report",
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

function kpiTileCell(tile: ProgressKpiTile | null): TableCell {
  if (!tile) {
    return new TableCell({
      width: { size: 33, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: COLOR.white },
      children: [new Paragraph({ children: [] })],
    });
  }
  return new TableCell({
    width: { size: 33, type: WidthType.PERCENTAGE },
    shading: {
      type: ShadingType.CLEAR,
      color: "auto",
      fill: tile.bg.replace("#", ""),
    },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 160, bottom: 160, left: 200, right: 160 },
    children: [
      new Paragraph({
        spacing: { after: 30 },
        children: [
          new TextRun({
            text: tile.value,
            bold: true,
            size: 40,
            color: tile.accent.replace("#", ""),
          }),
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

function kpiGrid(tiles: ProgressKpiTile[]): Table {
  const rows: TableRow[] = [];
  for (let i = 0; i < tiles.length; i += 3) {
    const slice = [tiles[i] ?? null, tiles[i + 1] ?? null, tiles[i + 2] ?? null];
    rows.push(new TableRow({ cantSplit: true, children: slice.map(kpiTileCell) }));
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 14, color: COLOR.white },
      bottom: { style: BorderStyle.SINGLE, size: 14, color: COLOR.white },
      left: { style: BorderStyle.SINGLE, size: 14, color: COLOR.white },
      right: { style: BorderStyle.SINGLE, size: 14, color: COLOR.white },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 14, color: COLOR.white },
      insideVertical: { style: BorderStyle.SINGLE, size: 14, color: COLOR.white },
    },
    rows,
  });
}

function summaryPanel(
  bullets: string[],
  fill: string = COLOR.brandSoft,
  accent: string = COLOR.brand
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: accent },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: accent },
      left: { style: BorderStyle.SINGLE, size: 20, color: accent },
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
            children: bullets.map(
              (text) =>
                new Paragraph({
                  spacing: { after: 80, line: 276 },
                  children: [
                    new TextRun({ text: `• ${text}`, color: COLOR.body, size: 20 }),
                  ],
                })
            ),
          }),
        ],
      }),
    ],
  });
}

function headerCell(text: string, alignRight = false): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLOR.brand },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, size: 16, color: COLOR.white })],
      }),
    ],
  });
}

function dataCell(
  text: string,
  opts: { bold?: boolean; alignRight?: boolean; fill?: string; color?: string } = {}
) {
  return new TableCell({
    shading: opts.fill
      ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill }
      : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: opts.alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: 16,
            color: opts.color ?? (opts.bold ? COLOR.brand : COLOR.body),
          }),
        ],
      }),
    ],
  });
}

function districtComparisonTable(
  rows: HhGirlsProgressReportMetrics["completionByDistrict"]
): Table {
  const headers = [
    { label: "District", alignRight: false },
    { label: "Completed", alignRight: true },
    { label: "Total", alignRight: true },
    { label: "Rate", alignRight: true },
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h) => headerCell(h.label, h.alignRight)),
  });

  const dataRows = rows.map((row, idx) => {
    const fill = idx % 2 === 1 ? COLOR.zebra : undefined;
    return new TableRow({
      cantSplit: true,
      children: [
        dataCell(row.district, { bold: true, fill, color: COLOR.ink }),
        dataCell(num(row.completed), { alignRight: true, bold: true, fill }),
        dataCell(num(row.total), { alignRight: true, fill }),
        dataCell(pct(row.rate, 0), { alignRight: true, fill }),
      ],
    });
  });

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

function buildSectionContent(
  section: HhGirlsProgressReportSection
): (Paragraph | Table)[] {
  const { metrics, districtLabel } = section;
  const tiles = buildHhProgressKpiTiles(metrics);
  const showDistrictComparison =
    districtLabel === "All Districts" && metrics.completionByDistrict.length > 0;

  const blocks: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 80 },
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
          text: `${num(metrics.totalVillages)} villages · ${num(metrics.totalEnumerators)} enumerators · ${num(metrics.uniqueGirls)} girls attempted · ${num(metrics.completedHouseholds)} completed HH`,
          size: 18,
          color: COLOR.subtle,
        }),
      ],
    }),
    sectionHeading("Summary"),
    summaryPanel(buildHhProgressExecutiveSummaryBullets(districtLabel, metrics)),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
    sectionHeading("HH / Girls Progress Indicators"),
    kpiGrid(tiles),
  ];

  if (showDistrictComparison) {
    blocks.push(
      new Paragraph({ spacing: { after: 160 }, children: [] }),
      sectionHeading("District Comparison"),
      districtComparisonTable(metrics.completionByDistrict)
    );
  }

  blocks.push(
    new Paragraph({ spacing: { after: 160 }, children: [] }),
    sectionHeading("Conclusion"),
    summaryPanel(
      buildHhProgressConclusionBullets(districtLabel, metrics),
      COLOR.tile,
      COLOR.brandDark
    ),
    new Paragraph({ spacing: { before: 240, after: 0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `— End of ${districtLabel} Section —`,
          italics: true,
          size: 18,
          color: COLOR.subtle,
        }),
      ],
    })
  );

  return blocks;
}

export function buildHhGirlsProgressReport(
  input: HhGirlsProgressReportInput
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
            text: `HH / Girls Progress Report  ·  ${input.scopeLabel}`,
            size: 16,
            color: COLOR.subtle,
          }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Table({
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
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Confidential · KPRAP M&E Platform",
                        size: 16,
                        color: COLOR.subtle,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: "Page ",
                        size: 16,
                        color: COLOR.subtle,
                      }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        size: 16,
                        color: COLOR.subtle,
                      }),
                      new TextRun({
                        text: " of ",
                        size: 16,
                        color: COLOR.subtle,
                      }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        size: 16,
                        color: COLOR.subtle,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
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

export async function downloadHhGirlsProgressDocx(
  input: HhGirlsProgressReportInput,
  filename: string
) {
  const doc = buildHhGirlsProgressReport(input);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
