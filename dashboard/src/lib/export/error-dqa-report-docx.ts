import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from "docx";
import { formatDisplayDate } from "@/lib/utils";
import {
  buildErrorExecutiveSummary,
  buildErrorRecapBullets,
  num,
  pct,
  type ErrorReportInput,
  type ErrorReportSection,
} from "@/lib/export/error-dqa-report-shared";

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
  critical: "B91C1C",
  quality: "B45309",
} as const;

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: COLOR.white };

function p(
  text: string,
  opts: {
    bold?: boolean;
    size?: number;
    color?: string;
    spacingAfter?: number;
  } = {}
) {
  return new Paragraph({
    spacing: { after: opts.spacingAfter ?? 80 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: opts.size ?? 18,
        color: opts.color ?? COLOR.body,
        font: "Calibri",
      }),
    ],
  });
}

function bullet(text: string) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(0.15) },
    children: [
      new TextRun({
        text: `• ${text}`,
        size: 18,
        color: COLOR.body,
        font: "Calibri",
      }),
    ],
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR.brand },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color: COLOR.brandDark,
        font: "Calibri",
      }),
    ],
  });
}

function cell(
  text: string,
  opts: { bold?: boolean; fill?: string; color?: string; width?: number } = {}
) {
  return new TableCell({
    width: { size: opts.width ?? 2000, type: WidthType.DXA },
    shading: opts.fill
      ? { type: ShadingType.CLEAR, fill: opts.fill }
      : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.line },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.line },
      left: NO_BORDER,
      right: NO_BORDER,
    },
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: 16,
            color: opts.color ?? COLOR.body,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

function simpleTable(headers: string[], rows: string[][]) {
  const colWidth = Math.floor(9000 / headers.length);
  const headerRow = new TableRow({
    children: headers.map((h) =>
      cell(h, { bold: true, fill: COLOR.brandSoft, color: COLOR.brandDark, width: colWidth })
    ),
  });
  const dataRows =
    rows.length === 0
      ? [
          new TableRow({
            children: [
              cell("No data in this section.", {
                fill: COLOR.tile,
                width: 9000,
              }),
              ...headers.slice(1).map(() =>
                cell("", { fill: COLOR.tile, width: colWidth })
              ),
            ],
          }),
        ]
      : rows.map(
          (row, i) =>
            new TableRow({
              children: row.map((value, j) =>
                cell(value, {
                  bold: j === 0,
                  fill: i % 2 === 0 ? COLOR.tile : COLOR.white,
                  width: colWidth,
                })
              ),
            })
        );

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [headerRow, ...dataRows],
  });
}

function kpiRow(metrics: ErrorReportSection["metrics"]) {
  const tiles = [
    ["Total", num(metrics.totalErrors), COLOR.ink],
    ["Critical", num(metrics.criticalErrors), COLOR.critical],
    ["Quality", num(metrics.flagErrors), COLOR.quality],
    ["Crit. %", pct(metrics.criticalRate), COLOR.critical],
    ["Enums", num(metrics.affectedEnumerators), COLOR.brandDark],
    ["Rules", num(metrics.ruleTypes), COLOR.brand],
  ] as const;

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: tiles.map(([label, value, color]) =>
          new TableCell({
            width: { size: 1500, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: COLOR.tile },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.line },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.line },
              left: { style: BorderStyle.SINGLE, size: 4, color: COLOR.line },
              right: { style: BorderStyle.SINGLE, size: 4, color: COLOR.line },
            },
            children: [
              new Paragraph({
                spacing: { before: 60 },
                children: [
                  new TextRun({
                    text: label.toUpperCase(),
                    size: 12,
                    color: COLOR.subtle,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: value,
                    bold: true,
                    size: 22,
                    color,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          })
        ),
      }),
    ],
  });
}

function buildSectionChildren(section: ErrorReportSection) {
  const { districtLabel, metrics } = section;
  return [
    p(districtLabel, { bold: true, size: 28, color: COLOR.brandDark, spacingAfter: 120 }),
    sectionHeading("Executive summary"),
    ...buildErrorExecutiveSummary(districtLabel, metrics).map(bullet),
    sectionHeading("Key quality indicators"),
    kpiRow(metrics),
    p("", { spacingAfter: 80 }),
    sectionHeading("Errors by survey"),
    simpleTable(
      ["Survey", "Critical", "Quality", "Total"],
      metrics.bySurvey.map((s) => [
        s.survey,
        num(s.critical),
        num(s.flag),
        num(s.total),
      ])
    ),
    p("", { spacingAfter: 80 }),
    sectionHeading("Top critical rules"),
    simpleTable(
      ["Rule", "Title", "Count"],
      metrics.topCriticalRules.slice(0, 8).map((r) => [
        r.ruleId,
        r.title,
        num(r.count),
      ])
    ),
    p("", { spacingAfter: 80 }),
    sectionHeading("Top quality flags"),
    simpleTable(
      ["Rule", "Title", "Count"],
      metrics.topQualityRules.slice(0, 8).map((r) => [
        r.ruleId,
        r.title,
        num(r.count),
      ])
    ),
    p("", { spacingAfter: 80 }),
    sectionHeading("Enumerator coaching priorities"),
    simpleTable(
      ["Enumerator", "Score", "Critical", "Quality", "Total"],
      metrics.enumeratorQuality.slice(0, 12).map((e) => [
        e.name,
        String(e.score),
        num(e.critical),
        num(e.flag),
        num(e.total),
      ])
    ),
    p("", { spacingAfter: 80 }),
    sectionHeading("Recap"),
    ...buildErrorRecapBullets(districtLabel, metrics).map(bullet),
  ];
}

export async function downloadErrorDqaReportDocx(
  input: ErrorReportInput,
  filename: string
) {
  const generated =
    formatDisplayDate(input.generatedAt.toISOString().slice(0, 10)) || "—";

  const children: (Paragraph | Table)[] = [
    p("KP-RAP Project", { bold: true, size: 16, color: COLOR.brand }),
    p("Error Quality Report", { bold: true, size: 32, color: COLOR.ink }),
    p(`${input.scopeLabel} · ${input.dateRangeLabel}`, {
      size: 18,
      color: COLOR.body,
      spacingAfter: 40,
    }),
    p(`Generated: ${generated}`, { size: 16, color: COLOR.subtle, spacingAfter: 200 }),
  ];

  input.sections.forEach((section, index) => {
    if (index > 0) {
      children.push(
        new Paragraph({
          children: [],
          pageBreakBefore: true,
        })
      );
    }
    children.push(...buildSectionChildren(section));
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.7),
              bottom: convertInchesToTwip(0.7),
              left: convertInchesToTwip(0.7),
              right: convertInchesToTwip(0.7),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              p("KP-RAP M&E · Error Quality Report", {
                size: 14,
                color: COLOR.subtle,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                    size: 14,
                    color: COLOR.subtle,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
