import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
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
    margin: [0, 16, 0, 8],
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

function bulletPanel(bullets: string[], fill: string, accent: string): Content {
  return {
    margin: [0, 0, 0, 12],
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
            fillColor: fill,
            margin: [12, 10, 12, 10],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: (i: number) => (i === 0 ? 4 : 1),
      hLineColor: () => accent,
      vLineColor: () => accent,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
}

function buildKpiGrid(tiles: ProgressKpiTile[]): Content {
  const rows: Content[][] = [];
  for (let i = 0; i < tiles.length; i += 3) {
    rows.push(
      tiles.slice(i, i + 3).map((tile) => ({
        stack: [
          {
            text: tile.value,
            fontSize: 14,
            bold: true,
            color: tile.accent,
            margin: [0, 0, 0, 2],
          },
          ...(tile.sub ? [{ text: tile.sub, fontSize: 7, color: C.subtle }] : []),
          {
            text: tile.label.toUpperCase(),
            fontSize: 7,
            color: C.subtle,
            bold: true,
          },
        ],
        fillColor: tile.bg,
        margin: [8, 8, 8, 8],
      }))
    );
    while (rows[rows.length - 1]!.length < 3) {
      rows[rows.length - 1]!.push({ text: "" });
    }
  }

  return {
    table: { widths: ["*", "*", "*"], body: rows },
    layout: {
      hLineWidth: () => 6,
      vLineWidth: () => 6,
      hLineColor: () => C.white,
      vLineColor: () => C.white,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 12],
  };
}

function districtComparisonTable(
  rows: HhGirlsProgressReportMetrics["completionByDistrict"]
): Content {
  if (rows.length === 0) return { text: "" };

  const header = [
    { text: "District", style: "tableHeader" },
    { text: "Completed", style: "tableHeader", alignment: "right" as const },
    { text: "Total", style: "tableHeader", alignment: "right" as const },
    { text: "Rate", style: "tableHeader", alignment: "right" as const },
  ];

  const body = [header] as Content[][];
  for (const row of rows) {
    body.push([
      { text: row.district, bold: true, color: C.ink },
      {
        text: num(row.completed),
        alignment: "right" as const,
        color: C.brand,
        bold: true,
      },
      { text: num(row.total), alignment: "right" as const },
      { text: pct(row.rate, 0), alignment: "right" as const },
    ]);
  }

  return {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: ["*", "auto", "auto", "auto"],
      body,
    },
    layout: {
      fillColor: (rowIndex: number) =>
        rowIndex === 0 ? C.brand : rowIndex % 2 === 0 ? C.white : C.tile,
      hLineColor: () => C.line,
      vLineColor: () => C.line,
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 12],
  };
}

function buildSectionPdfContent(section: HhGirlsProgressReportSection): Content[] {
  const { metrics, districtLabel } = section;
  const tiles = buildHhProgressKpiTiles(metrics);
  const showDistrictComparison =
    districtLabel === "All Districts" && metrics.completionByDistrict.length > 0;

  const content: Content[] = [
    {
      unbreakable: true,
      stack: [
        { text: districtLabel, style: "districtTitle" },
        {
          text: `${num(metrics.totalVillages)} villages · ${num(metrics.totalEnumerators)} enumerators · ${num(metrics.uniqueGirls)} girls attempted · ${num(metrics.completedHouseholds)} completed HH`,
          style: "districtMeta",
          margin: [0, 0, 0, 12],
        },
        sectionTitle("Summary"),
        bulletPanel(
          buildHhProgressExecutiveSummaryBullets(districtLabel, metrics),
          C.brandSoft,
          C.brand
        ),
      ],
    },
    {
      unbreakable: true,
      stack: [sectionTitle("HH / Girls Progress Indicators"), buildKpiGrid(tiles)],
    },
  ];

  if (showDistrictComparison) {
    content.push(
      sectionTitle("District Comparison"),
      districtComparisonTable(metrics.completionByDistrict)
    );
  }

  content.push({
    unbreakable: true,
    stack: [
      sectionTitle("Conclusion"),
      bulletPanel(
        buildHhProgressConclusionBullets(districtLabel, metrics),
        C.tile,
        C.brandDark
      ),
      {
        text: `— End of ${districtLabel} Section —`,
        alignment: "center",
        italics: true,
        color: C.subtle,
        fontSize: 8,
        margin: [0, 12, 0, 0],
      },
    ],
  });

  return content;
}

export function buildHhGirlsProgressPdfDefinition(
  input: HhGirlsProgressReportInput
): TDocumentDefinitions {
  const generatedLabel = formatDisplayDate(
    input.generatedAt.toISOString().slice(0, 10)
  );
  const content: Content[] = [
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                {
                  text: "KPRAP · FIELD MONITORING",
                  color: C.brandSoft,
                  bold: true,
                  fontSize: 9,
                },
                {
                  text: "HH / Girls Progress Report",
                  color: C.white,
                  bold: true,
                  fontSize: 22,
                  margin: [0, 4, 0, 4],
                },
                { text: input.scopeLabel, color: C.white, bold: true, fontSize: 12 },
                {
                  text: `Reporting period: ${input.dateRangeLabel}    |    Generated: ${generatedLabel}`,
                  color: C.brandSoft,
                  fontSize: 8,
                  margin: [0, 6, 0, 0],
                },
              ],
              fillColor: C.brand,
              margin: [14, 14, 14, 14],
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 16],
    },
  ];

  for (let i = 0; i < input.sections.length; i++) {
    const section = input.sections[i]!;
    if (i > 0) content.push({ text: "", pageBreak: "before" });
    content.push(...buildSectionPdfContent(section));
  }

  return {
    pageSize: "A4",
    pageMargins: [40, 52, 40, 48],
    defaultStyle: { font: "Roboto", fontSize: 9, color: C.body },
    styles: {
      sectionHeading: { fontSize: 11, bold: true, color: C.brand },
      districtTitle: { fontSize: 16, bold: true, color: C.ink },
      districtMeta: { fontSize: 8, color: C.subtle },
      bullet: { fontSize: 9, lineHeight: 1.35 },
      tableHeader: { bold: true, color: C.white, fontSize: 8 },
    },
    header: (currentPage: number) =>
      currentPage === 1
        ? null
        : {
            text: `HH / Girls Progress Report  ·  ${input.scopeLabel}`,
            alignment: "right",
            fontSize: 7,
            color: C.subtle,
            margin: [40, 16, 40, 0],
          },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "Confidential · KPRAP M&E Platform", fontSize: 7, color: C.subtle },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: C.subtle,
        },
      ],
      margin: [40, 0, 40, 16],
    }),
    content,
  };
}

export async function downloadHhGirlsProgressPdf(
  input: HhGirlsProgressReportInput,
  filename: string
) {
  const pdfMake = await getPdfMake();
  const doc = buildHhGirlsProgressPdfDefinition(input);
  pdfMake.createPdf(doc).download(filename);
}
