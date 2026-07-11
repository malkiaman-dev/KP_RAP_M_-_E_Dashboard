import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { HhGirlsEnumeratorPerformance } from "@/lib/data/hh-girls-monitoring";
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
  type HhGirlsStatusReportInput,
  type HhGirlsStatusReportSection,
  type PerformanceTier,
} from "@/lib/export/hh-girls-status-report-shared";

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
  high: "#15803D",
  highBg: "#DCFCE7",
  med: "#B45309",
  medBg: "#FEF3C7",
  low: "#B91C1C",
  lowBg: "#FEE2E2",
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
            stack: bullets.map((text) => ({ text: `• ${text}`, style: "bullet", margin: [0, 2, 0, 2] })),
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
      vLineColor: (i: number) => (i === 0 ? accent : accent),
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
}

function categoryTable(
  title: string,
  count: number,
  tier: PerformanceTier,
  enumerators: HhGirlsEnumeratorPerformance[]
): Content {
  const columns = [
    { text: "Enumerator", style: "tableHeader" },
    { text: "District", style: "tableHeader" },
    { text: "Forms", style: "tableHeader", alignment: "right" as const },
    { text: "Completed HH", style: "tableHeader", alignment: "right" as const },
    { text: "Days", style: "tableHeader", alignment: "right" as const },
    { text: "Avg/Day", style: "tableHeader", alignment: "right" as const },
    { text: "Target %", style: "tableHeader", alignment: "right" as const },
    { text: "Status", style: "tableHeader", alignment: "center" as const },
  ];

  const titleRow = [
    {
      text: [
        { text: title, bold: true, color: tier.fg },
        { text: `    ${count} enumerator${count === 1 ? "" : "s"}`, color: C.subtle },
      ],
      colSpan: columns.length,
      fillColor: tier.bg,
      margin: [8, 6, 8, 6],
    },
    ...Array.from({ length: columns.length - 1 }, () => ""),
  ] as Content[];

  const body = [titleRow, columns] as Content[][];

  if (enumerators.length === 0) {
    body.push([
      {
        text: "No enumerators in this category.",
        colSpan: columns.length,
        italics: true,
        color: C.subtle,
        margin: [4, 6, 4, 6],
      },
      ...Array.from({ length: columns.length - 1 }, () => ""),
    ] as Content[]);
  } else {
    for (const e of enumerators) {
      const tier2 = tierFor(e.submissionTargetAttainment);
      body.push([
        { text: e.name, bold: true, color: C.ink },
        { text: e.district },
        { text: num(e.submissions), alignment: "right" as const },
        {
          text: num(e.completedHouseholds),
          alignment: "right" as const,
          color: C.brand,
          bold: true,
        },
        { text: num(e.activeDays), alignment: "right" as const },
        {
          text: Math.round(e.avgSubmissionsPerDay).toString(),
          alignment: "right" as const,
        },
        {
          text: pct(e.submissionTargetAttainment, 0),
          alignment: "right" as const,
          color: tier2.fg,
          bold: true,
        },
        {
          text: tier2.label,
          alignment: "center" as const,
          color: tier2.fg,
          bold: true,
        },
      ]);
    }
  }

  return {
    table: {
      headerRows: 2,
      keepWithHeaderRows: 1,
      dontBreakRows: true,
      widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
      body,
    },
    layout: {
      fillColor: (rowIndex: number) =>
        rowIndex === 0
          ? tier.bg
          : rowIndex === 1
            ? C.brand
            : rowIndex % 2 === 0
              ? C.white
              : C.tile,
      hLineColor: () => C.line,
      vLineColor: () => C.line,
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 10, 0, 10],
  };
}

function buildKpiGrid(metrics: HhGirlsStatusReportSection["metrics"]): Content {
  const avgFormsPerDay =
    metrics.enumeratorDays > 0
      ? metrics.totalSubmissions / metrics.enumeratorDays
      : 0;
  const avgHhPerDay = metrics.avgCompletedPerEnumeratorPerDay;
  const formsPct =
    metrics.dailyFormsTarget > 0
      ? (avgFormsPerDay / metrics.dailyFormsTarget) * 100
      : 0;
  const hhPct =
    metrics.dailyHhTarget > 0 ? (avgHhPerDay / metrics.dailyHhTarget) * 100 : 0;

  const tiles = [
    { label: "Total Forms", value: num(metrics.totalSubmissions), color: C.brand, bg: C.tile },
    { label: "Girls Attempted", value: num(metrics.uniqueGirls), color: C.ink, bg: C.tile },
    {
      label: "Completed Households",
      value: num(metrics.totalCompleted),
      color: C.high,
      bg: C.highBg,
    },
    {
      label: "Completion Rate",
      value: pct(metrics.completionRate, 0),
      color: tierFor(metrics.completionRate).fg,
      bg: tierFor(metrics.completionRate).bg,
    },
    { label: "Active Enumerators", value: num(metrics.activeEnumerators), color: C.brand, bg: C.tile },
    {
      label: "Enumerator-Days",
      value: num(metrics.enumeratorDays),
      sub: `${num(metrics.activeFieldDays)} field days`,
      color: C.ink,
      bg: C.tile,
    },
    {
      label: "Avg Forms / Enum / Day",
      value: `${avgFormsPerDay.toFixed(1)} / ${metrics.dailyFormsTarget}`,
      color: tierFor(formsPct).fg,
      bg: tierFor(formsPct).bg,
    },
    {
      label: "Avg Completed HH / Enum / Day",
      value: `${avgHhPerDay.toFixed(1)} / ${metrics.dailyHhTarget}`,
      color: tierFor(hhPct).fg,
      bg: tierFor(hhPct).bg,
    },
  ];

  const rows: Content[][] = [];
  for (let i = 0; i < tiles.length; i += 3) {
    rows.push(
      tiles.slice(i, i + 3).map((tile) => ({
        stack: [
          { text: tile.value, fontSize: 14, bold: true, color: tile.color, margin: [0, 0, 0, 2] },
          ...(tile.sub ? [{ text: tile.sub, fontSize: 7, color: C.subtle }] : []),
          { text: tile.label.toUpperCase(), fontSize: 7, color: C.subtle, bold: true },
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

function targetCallout(metrics: HhGirlsStatusReportSection["metrics"]): Content {
  const tier = tierFor(metrics.submissionTargetAchievement);
  return {
    margin: [0, 0, 0, 10],
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              {
                text: [
                  { text: "DAILY TARGET ACHIEVED ", bold: true, color: tier.fg },
                  { text: "(forms-based)", color: C.subtle },
                ],
                fontSize: 9,
              },
              {
                text: [
                  {
                    text: pct(metrics.submissionTargetAchievement),
                    fontSize: 22,
                    bold: true,
                    color: tier.fg,
                  },
                  { text: `   ${tier.label}`, fontSize: 11, bold: true, color: tier.fg },
                ],
                margin: [0, 4, 0, 4],
              },
              {
                text: `${formsWithUniqueGirls(metrics)} of ${num(metrics.expectedSubmissions)} expected forms  ·  Target: ${metrics.dailyFormsTarget} forms/day (${metrics.dailyHhTarget} completed HH/day)`,
                fontSize: 8,
                color: C.body,
              },
            ],
            fillColor: tier.bg,
            margin: [12, 10, 12, 10],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: (i: number) => (i === 0 ? 4 : 1),
      hLineColor: () => tier.fg,
      vLineColor: () => tier.fg,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
}

function buildSectionPdfContent(section: HhGirlsStatusReportSection): Content[] {
  const { metrics, districtLabel } = section;
  const categories = categorizeHhEnumerators(metrics.enumeratorPerformance);
  const subTier = tierFor(metrics.submissionTargetAchievement);

  return [
    {
      unbreakable: true,
      stack: [
        { text: districtLabel, style: "districtTitle" },
        {
          text: `${num(metrics.activeEnumerators)} enumerators · ${num(metrics.enumeratorDays)} enumerator-days · ${num(metrics.activeFieldDays)} actual field days · ${formsWithUniqueGirls(metrics)}`,
          style: "districtMeta",
          margin: [0, 0, 0, 12],
        },
        sectionTitle("Executive Summary"),
        bulletPanel(
          buildHhExecutiveSummaryBullets(districtLabel, metrics, categories),
          C.brandSoft,
          C.brand
        ),
      ],
    },
    {
      unbreakable: true,
      stack: [
        sectionTitle("Overall HH / Girls Status"),
        {
          text: buildHhStatusSummary(metrics),
          bold: true,
          color: subTier.fg,
          margin: [0, 0, 0, 6],
        },
        {
          text: `${num(metrics.activeEnumerators)} active enumerators worked across ${num(metrics.enumeratorDays)} enumerator-days (${num(metrics.activeFieldDays)} actual field days). ${formsWithUniqueGirls(metrics)} were received against an expected ${num(metrics.expectedSubmissions)} (${metrics.dailyFormsTarget} forms per enumerator per working day). ${num(metrics.totalCompleted)} households were completed, a completion rate of ${pct(metrics.completionRate, 0)}.`,
          style: "body",
          margin: [0, 0, 0, 10],
        },
      ],
    },
    {
      unbreakable: true,
      stack: [
        sectionTitle("Daily Target Achievement"),
        targetCallout(metrics),
        {
          text: `HH-based achievement: ${pct(metrics.targetAchievement)} (${num(metrics.totalCompleted)} of ${num(metrics.expectedCompleted)} expected completed households at ${metrics.dailyHhTarget} HH/day).`,
          style: "body",
          margin: [0, 6, 0, 10],
        },
      ],
    },
    {
      unbreakable: true,
      stack: [sectionTitle("Key Performance Indicators"), buildKpiGrid(metrics)],
    },
    {
      unbreakable: true,
      stack: [
        sectionTitle("Enumerator Performance by Target Category"),
        {
          text: `Enumerators are grouped by forms-based target attainment, calculated as forms ÷ (working days × ${metrics.dailyFormsTarget}) × 100.`,
          style: "body",
          margin: [0, 0, 0, 0],
        },
      ],
    },
    categoryTable(
      "Category 1 — High Performers (≥ 70%)",
      categories.onOrNearTarget.length,
      { fg: C.high, bg: C.highBg, label: "On Track" },
      categories.onOrNearTarget
    ),
    categoryTable(
      "Category 2 — Medium Performers (> 50% and < 70%)",
      categories.belowTarget.length,
      { fg: C.med, bg: C.medBg, label: "Below" },
      categories.belowTarget
    ),
    categoryTable(
      "Category 3 — Low Performers (≤ 50%)",
      categories.critical.length,
      { fg: C.low, bg: C.lowBg, label: "Critical" },
      categories.critical
    ),
    {
      unbreakable: true,
      stack: [
        sectionTitle("Report Summary"),
        bulletPanel(
          buildHhReportSummaryBullets(districtLabel, metrics, categories),
          C.tile,
          C.brandDark
        ),
        {
          text: `— End of ${districtLabel} Report —`,
          alignment: "center",
          italics: true,
          color: C.subtle,
          fontSize: 8,
          margin: [0, 12, 0, 0],
        },
      ],
    },
  ];
}

export function buildHhGirlsStatusPdfDefinition(
  input: HhGirlsStatusReportInput
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
                { text: "KPRAP · FIELD MONITORING", color: C.brandSoft, bold: true, fontSize: 9 },
                {
                  text: "HH / Girls Status Report",
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
      body: { fontSize: 9, lineHeight: 1.3 },
      bullet: { fontSize: 9, lineHeight: 1.35 },
      tableHeader: { bold: true, color: C.white, fontSize: 8 },
    },
    header: (currentPage: number) =>
      currentPage === 1
        ? null
        : {
            text: `HH / Girls Status Report  ·  ${input.scopeLabel}`,
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

export async function downloadHhGirlsStatusPdf(
  input: HhGirlsStatusReportInput,
  filename: string
) {
  const pdfMake = await getPdfMake();
  const doc = buildHhGirlsStatusPdfDefinition(input);
  pdfMake.createPdf(doc).download(filename);
}
