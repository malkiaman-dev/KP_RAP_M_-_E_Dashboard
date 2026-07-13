import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { formatDisplayDate } from "@/lib/utils";
import {
  buildErrorExecutiveSummary,
  buildErrorRecapBullets,
  num,
  pct,
  type ErrorReportInput,
  type ErrorReportSection,
} from "@/lib/export/error-dqa-report-shared";

const C = {
  brand: "#0F766E",
  brandDark: "#134E4A",
  brandSoft: "#CCFBF1",
  ink: "#0F172A",
  body: "#334155",
  subtle: "#64748B",
  line: "#E2E8F0",
  white: "#FFFFFF",
  tile: "#F8FAFC",
  critical: "#B91C1C",
  criticalBg: "#FEE2E2",
  quality: "#B45309",
  qualityBg: "#FEF3C7",
};

async function getPdfMake() {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfMake = pdfMakeModule.default as typeof pdfMakeModule.default & {
    vfs?: Record<string, string>;
  };
  const vfs =
    (pdfFontsModule as { default?: { pdfMake?: { vfs: unknown } }; pdfMake?: { vfs: unknown } })
      .default?.pdfMake?.vfs ??
    (pdfFontsModule as { pdfMake?: { vfs: unknown } }).pdfMake?.vfs;
  if (vfs) pdfMake.vfs = vfs as Record<string, string>;
  return pdfMake;
}

function sectionTitle(text: string): Content {
  return {
    margin: [0, 14, 0, 8],
    table: {
      widths: ["*"],
      body: [[{ text, style: "sectionHeading", border: [false, false, false, true] }]],
    },
    layout: {
      hLineWidth: () => 1,
      hLineColor: () => C.brand,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 6,
    },
  };
}

function bulletPanel(bullets: string[]): Content {
  return {
    margin: [0, 0, 0, 10],
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: bullets.map((text) => ({
              text: `• ${text}`,
              style: "bullet",
              margin: [0, 2, 0, 2],
            })),
            fillColor: C.brandSoft,
            margin: [12, 10, 12, 10],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: (i: number) => (i === 0 ? 4 : 1),
      hLineColor: () => C.brand,
      vLineColor: (i: number) => (i === 0 ? C.brand : C.brand),
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
}

function kpiTiles(metrics: ErrorReportSection["metrics"]): Content {
  const tiles = [
    { label: "Total errors", value: num(metrics.totalErrors), color: C.ink },
    { label: "Critical", value: num(metrics.criticalErrors), color: C.critical },
    { label: "Quality", value: num(metrics.flagErrors), color: C.quality },
    { label: "Critical rate", value: pct(metrics.criticalRate), color: C.critical },
    { label: "Enumerators", value: num(metrics.affectedEnumerators), color: C.brandDark },
    { label: "Rule types", value: num(metrics.ruleTypes), color: C.brand },
  ];

  return {
    margin: [0, 0, 0, 10],
    columns: tiles.map((tile) => ({
      width: "*",
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                { text: tile.label.toUpperCase(), fontSize: 7, color: C.subtle, margin: [0, 0, 0, 4] },
                { text: tile.value, fontSize: 14, bold: true, color: tile.color },
              ],
              fillColor: C.tile,
              margin: [8, 8, 8, 8],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => C.line,
        vLineColor: () => C.line,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    })),
    columnGap: 6,
  };
}

function simpleTable(
  title: string,
  headers: string[],
  rows: string[][],
  emptyText: string
): Content {
  const headerRow = headers.map((h) => ({
    text: h,
    style: "tableHeader",
  }));
  const body: Content[][] = [headerRow];

  if (rows.length === 0) {
    body.push([
      {
        text: emptyText,
        colSpan: headers.length,
        italics: true,
        color: C.subtle,
        margin: [4, 6, 4, 6],
      },
      ...Array.from({ length: headers.length - 1 }, () => ""),
    ] as Content[]);
  } else {
    for (const row of rows) {
      body.push(
        row.map((cell, i) => ({
          text: cell,
          color: C.body,
          bold: i === 0,
        })) as Content[]
      );
    }
  }

  return {
    margin: [0, 0, 0, 10],
    stack: [
      { text: title, style: "subHeading", margin: [0, 0, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: headers.map(() => "*"),
          body,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => C.line,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 4,
          paddingBottom: () => 4,
          fillColor: (rowIndex: number) =>
            rowIndex === 0 ? C.brandSoft : rowIndex % 2 === 0 ? C.tile : C.white,
        },
      },
    ],
  };
}

function buildSectionContent(section: ErrorReportSection): Content[] {
  const { districtLabel, metrics } = section;
  const content: Content[] = [
    {
      text: districtLabel,
      style: "districtHeading",
      margin: [0, 8, 0, 4],
    },
    sectionTitle("Executive summary"),
    bulletPanel(buildErrorExecutiveSummary(districtLabel, metrics)),
    sectionTitle("Key quality indicators"),
    kpiTiles(metrics),
    sectionTitle("Breakdown"),
    simpleTable(
      "Errors by survey",
      ["Survey", "Critical", "Quality", "Total"],
      metrics.bySurvey.map((s) => [
        s.survey,
        num(s.critical),
        num(s.flag),
        num(s.total),
      ]),
      "No survey breakdown."
    ),
    simpleTable(
      "Top critical rules",
      ["Rule", "Title", "Count"],
      metrics.topCriticalRules.slice(0, 8).map((r) => [
        r.ruleId,
        r.title,
        num(r.count),
      ]),
      "No critical rules in this scope."
    ),
    simpleTable(
      "Top quality flags",
      ["Rule", "Title", "Count"],
      metrics.topQualityRules.slice(0, 8).map((r) => [
        r.ruleId,
        r.title,
        num(r.count),
      ]),
      "No quality flags in this scope."
    ),
    simpleTable(
      "Enumerator coaching priorities (lowest scores)",
      ["Enumerator", "Score", "Critical", "Quality", "Total"],
      metrics.enumeratorQuality.slice(0, 12).map((e) => [
        e.name,
        String(e.score),
        num(e.critical),
        num(e.flag),
        num(e.total),
      ]),
      "No attributable enumerator errors."
    ),
    sectionTitle("Recap"),
    bulletPanel(buildErrorRecapBullets(districtLabel, metrics)),
  ];

  return content;
}

export function buildErrorDqaReportPdfDefinition(
  input: ErrorReportInput
): TDocumentDefinitions {
  const generated = formatDisplayDate(
    input.generatedAt.toISOString().slice(0, 10)
  );

  const body: Content[] = [
    {
      columns: [
        {
          stack: [
            { text: "KP-RAP Project", style: "brand" },
            { text: "Error Quality Report", style: "title" },
            {
              text: `${input.scopeLabel} · ${input.dateRangeLabel}`,
              style: "subtitle",
            },
          ],
        },
        {
          width: "auto",
          stack: [
            { text: "Generated", alignment: "right", color: C.subtle, fontSize: 8 },
            { text: generated || "—", alignment: "right", bold: true, color: C.ink, fontSize: 10 },
          ],
        },
      ],
      margin: [0, 0, 0, 12],
    },
  ];

  input.sections.forEach((section, index) => {
    if (index > 0) {
      body.push({ text: "", pageBreak: "before" });
    }
    body.push(...buildSectionContent(section));
  });

  return {
    pageSize: "A4",
    pageMargins: [40, 48, 40, 48],
    footer: (currentPage, pageCount) => ({
      margin: [40, 0, 40, 20],
      columns: [
        {
          text: "KP-RAP M&E · Error Quality Report · Confidential",
          fontSize: 8,
          color: C.subtle,
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "right",
          fontSize: 8,
          color: C.subtle,
        },
      ],
    }),
    content: body,
    styles: {
      brand: { fontSize: 9, color: C.brand, bold: true, characterSpacing: 1 },
      title: { fontSize: 18, bold: true, color: C.ink, margin: [0, 2, 0, 2] },
      subtitle: { fontSize: 10, color: C.body },
      districtHeading: { fontSize: 14, bold: true, color: C.brandDark },
      sectionHeading: { fontSize: 11, bold: true, color: C.brandDark },
      subHeading: { fontSize: 9, bold: true, color: C.body },
      bullet: { fontSize: 9, color: C.body, lineHeight: 1.25 },
      tableHeader: { fontSize: 8, bold: true, color: C.brandDark },
    },
    defaultStyle: {
      fontSize: 9,
      color: C.body,
    },
  };
}

export async function downloadErrorDqaReportPdf(
  input: ErrorReportInput,
  filename: string
) {
  const pdfMake = await getPdfMake();
  const doc = buildErrorDqaReportPdfDefinition(input);
  pdfMake.createPdf(doc).download(filename);
}
