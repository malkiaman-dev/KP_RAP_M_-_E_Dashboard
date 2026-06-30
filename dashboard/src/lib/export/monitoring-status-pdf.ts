import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { EnumeratorPerformance } from "@/lib/data/tracking-metrics";
import { formatDisplayDate } from "@/lib/utils";
import {
  buildExecutiveSummaryBullets,
  buildReportSummaryBullets,
  buildStatusSummary,
  categorizeEnumerators,
  num,
  pct,
  submissionsWithUniqueGirls,
  tierFor,
  type MonitoringReportSection,
  type MonitoringStatusReportInput,
  type PerformanceTier,
} from "@/lib/export/monitoring-report-shared";

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

function categoryBanner(title: string, count: number, tier: PerformanceTier): Content {
  return {
    margin: [0, 10, 0, 6],
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: [
              { text: title, bold: true, color: tier.fg },
              { text: `    ${count} enumerator${count === 1 ? "" : "s"}`, color: C.subtle },
            ],
            fillColor: tier.bg,
            margin: [10, 6, 10, 6],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i: number) => (i === 0 ? 3 : 0),
      vLineColor: () => tier.fg,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
}

function enumeratorTable(
  enumerators: EnumeratorPerformance[],
  showDistrict: boolean
): Content {
  const header = [
    { text: "Enumerator", style: "tableHeader" },
    ...(showDistrict ? [{ text: "District", style: "tableHeader" }] : []),
    { text: "Subs", style: "tableHeader", alignment: "right" as const },
    { text: "Tracked", style: "tableHeader", alignment: "right" as const },
    { text: "Days", style: "tableHeader", alignment: "right" as const },
    { text: "Avg/Day", style: "tableHeader", alignment: "right" as const },
    { text: "Target %", style: "tableHeader", alignment: "right" as const },
    { text: "Status", style: "tableHeader", alignment: "center" as const },
  ];

  const body = [header] as Content[][];

  if (enumerators.length === 0) {
    body.push([
      {
        text: "No enumerators in this category.",
        colSpan: header.length,
        italics: true,
        color: C.subtle,
        margin: [4, 6, 4, 6],
      },
      ...Array.from({ length: header.length - 1 }, () => ""),
    ] as Content[]);
  } else {
    for (const e of enumerators) {
      const tier = tierFor(e.submissionTargetAttainment);
      body.push([
        { text: e.name, bold: true, color: C.ink },
        ...(showDistrict ? [{ text: e.district }] : []),
        { text: num(e.submissions), alignment: "right" as const },
        { text: num(e.trackedGirls), alignment: "right" as const, color: C.brand, bold: true },
        { text: num(e.activeDays), alignment: "right" as const },
        { text: Math.round(e.avgSubmissionsPerDay).toString(), alignment: "right" as const },
        { text: pct(e.submissionTargetAttainment, 0), alignment: "right" as const, color: tier.fg, bold: true },
        { text: tier.label, alignment: "center" as const, color: tier.fg, bold: true },
      ]);
    }
  }

  return {
    table: {
      headerRows: 1,
      widths: showDistrict
        ? ["*", "auto", "auto", "auto", "auto", "auto", "auto", "auto"]
        : ["*", "auto", "auto", "auto", "auto", "auto", "auto"],
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
    margin: [0, 0, 0, 8],
  };
}

function buildKpiGrid(metrics: MonitoringReportSection["metrics"]): Content {
  const avgSubsPerDay =
    metrics.enumeratorDays > 0
      ? metrics.totalSubmissions / metrics.enumeratorDays
      : 0;
  const tiles = [
    { label: "Total Submissions", value: num(metrics.totalSubmissions), color: C.brand, bg: C.tile },
    { label: "Girls Attempted", value: num(metrics.uniqueGirls), color: C.ink, bg: C.tile },
    { label: "Successfully Tracked", value: num(metrics.totalTracked), color: C.high, bg: C.highBg },
    {
      label: "Tracking Success Rate",
      value: pct(metrics.trackingSuccessRate, 0),
      color: tierFor(metrics.trackingSuccessRate).fg,
      bg: tierFor(metrics.trackingSuccessRate).bg,
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
      label: "Avg Subs / Enum / Day",
      value: `${avgSubsPerDay.toFixed(1)} / ${metrics.dailyTarget}`,
      color: tierFor((avgSubsPerDay / metrics.dailyTarget) * 100).fg,
      bg: tierFor((avgSubsPerDay / metrics.dailyTarget) * 100).bg,
    },
    {
      label: "Days Meeting Target",
      value: pct(metrics.pctDaysMeetingTarget, 0),
      color: tierFor(metrics.pctDaysMeetingTarget).fg,
      bg: tierFor(metrics.pctDaysMeetingTarget).bg,
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

function targetCallout(metrics: MonitoringReportSection["metrics"]): Content {
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
                  { text: "(submission-based)", color: C.subtle },
                ],
                fontSize: 9,
              },
              {
                text: [
                  { text: pct(metrics.submissionTargetAchievement), fontSize: 22, bold: true, color: tier.fg },
                  { text: `   ${tier.label}`, fontSize: 11, bold: true, color: tier.fg },
                ],
                margin: [0, 4, 0, 4],
              },
              {
                text: `${submissionsWithUniqueGirls(metrics)} of ${num(metrics.expectedSubmissions)} expected submissions  ·  Target: ${metrics.dailyTarget} girls per enumerator per working day`,
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

function buildSectionPdfContent(
  section: MonitoringReportSection,
  showDistrictInTables: boolean
): Content[] {
  const { metrics, districtLabel } = section;
  const categories = categorizeEnumerators(metrics.enumeratorPerformance);
  const subTier = tierFor(metrics.submissionTargetAchievement);

  return [
    { text: districtLabel, style: "districtTitle" },
    {
      text: `${num(metrics.activeEnumerators)} enumerators · ${num(metrics.enumeratorDays)} enumerator-days · ${num(metrics.activeFieldDays)} actual field days · ${submissionsWithUniqueGirls(metrics)}`,
      style: "districtMeta",
      margin: [0, 0, 0, 12],
    },
    sectionTitle("Executive Summary"),
    bulletPanel(
      buildExecutiveSummaryBullets(districtLabel, metrics, categories),
      C.brandSoft,
      C.brand
    ),
    sectionTitle("Overall Tracking Status"),
    { text: buildStatusSummary(metrics), bold: true, color: subTier.fg, margin: [0, 0, 0, 6] },
    {
      text: `${num(metrics.activeEnumerators)} active enumerators worked across ${num(metrics.enumeratorDays)} enumerator-days (${num(metrics.activeFieldDays)} actual field days). ${submissionsWithUniqueGirls(metrics)} were received against an expected ${num(metrics.expectedSubmissions)} (${metrics.dailyTarget} girls per enumerator per working day). ${num(metrics.totalTracked)} girls were successfully tracked, a tracking success rate of ${pct(metrics.trackingSuccessRate, 0)}.`,
      style: "body",
      margin: [0, 0, 0, 10],
    },
    sectionTitle("Daily Target Achievement"),
    targetCallout(metrics),
    {
      text: `Tracked-based achievement: ${pct(metrics.targetAchievement)} (${num(metrics.totalTracked)} of ${num(metrics.expectedTracked)} expected tracked girls).`,
      style: "body",
      margin: [0, 6, 0, 10],
    },
    sectionTitle("Key Performance Indicators"),
    buildKpiGrid(metrics),
    sectionTitle("Enumerator Performance by Target Category"),
    {
      text: "Enumerators are grouped by submission-based target attainment, calculated as submissions ÷ (working days × 10) × 100.",
      style: "body",
      margin: [0, 0, 0, 8],
    },
    categoryBanner(
      "Category 1 — High Performers (≥ 70%)",
      categories.onOrNearTarget.length,
      { fg: C.high, bg: C.highBg, label: "On Track" }
    ),
    enumeratorTable(categories.onOrNearTarget, showDistrictInTables),
    categoryBanner(
      "Category 2 — Medium Performers (> 50% and < 70%)",
      categories.belowTarget.length,
      { fg: C.med, bg: C.medBg, label: "Below" }
    ),
    enumeratorTable(categories.belowTarget, showDistrictInTables),
    categoryBanner(
      "Category 3 — Low Performers (≤ 50%)",
      categories.critical.length,
      { fg: C.low, bg: C.lowBg, label: "Critical" }
    ),
    enumeratorTable(categories.critical, showDistrictInTables),
    sectionTitle("Report Summary"),
    bulletPanel(
      buildReportSummaryBullets(districtLabel, metrics, categories),
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
  ];
}

export function buildMonitoringStatusPdfDefinition(
  input: MonitoringStatusReportInput
): TDocumentDefinitions {
  const generatedLabel = formatDisplayDate(
    input.generatedAt.toISOString().slice(0, 10)
  );
  const isMultiDistrict = input.sections.length > 1;

  const content: Content[] = [
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                { text: "KPRAP · FIELD MONITORING", color: C.brandSoft, bold: true, fontSize: 9 },
                { text: "Tracking Status Report", color: C.white, bold: true, fontSize: 22, margin: [0, 4, 0, 4] },
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
    const showDistrict =
      isMultiDistrict && section.districtLabel !== "All Districts";
    if (i > 0) content.push({ text: "", pageBreak: "before" });
    content.push(...buildSectionPdfContent(section, showDistrict));
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
            text: `Tracking Status Report  ·  ${input.scopeLabel}`,
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

export async function downloadMonitoringStatusPdf(
  input: MonitoringStatusReportInput,
  filename: string
) {
  const pdfMake = await getPdfMake();
  const doc = buildMonitoringStatusPdfDefinition(input);
  pdfMake.createPdf(doc).download(filename);
}
