/**
 * Live respondent context for Error Report rows.
 * Reads Surveys/*.csv (mtime-cached) and fills girl name / village / school,
 * including cross-survey school lookup by girl ID when the source form lacks it.
 */
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { filesSignature, getCached } from "./survey-cache";
import {
  parseErrorValueParts,
  stripContextFromValue,
} from "./error-value-parse";
import type { ErrorRow } from "./error-metrics";

export {
  parseErrorValueParts,
  stripContextFromValue,
} from "./error-value-parse";

const DATA_ROOT = path.join(process.cwd(), "..");
const SURVEYS_DIR = path.join(DATA_ROOT, "Surveys");

const SURVEY_FILES = [
  "Tracking_Survey_NewSample.csv",
  "Tracking_Survey_Baseline.csv",
  "Household_Survey.csv",
  "Girls_Survey.csv",
];

export type RespondentContext = {
  girlName: string;
  village: string;
  school: string;
  girlId: string;
};

type ContextIndex = {
  byFormKey: Map<string, RespondentContext>;
  byGirlId: Map<string, RespondentContext>;
};

function blank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return !s || ["nan", "none", "na", "n/a", "-", "--", "."].includes(s.toLowerCase());
}

function text(v: unknown): string {
  if (blank(v)) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function isNumericCode(v: string): boolean {
  return /^\d+(\.\d+)?$/.test(v);
}

function first(
  row: Record<string, string>,
  cols: string[],
  opts?: { preferText?: boolean }
): string {
  let fallback = "";
  for (const c of cols) {
    const t = text(row[c]);
    if (!t) continue;
    if (opts?.preferText && isNumericCode(t)) {
      if (!fallback) fallback = t;
      continue;
    }
    return t;
  }
  return fallback;
}

function normKey(v: unknown): string {
  return blank(v) ? "" : String(v).trim();
}

function extractFromRow(
  row: Record<string, string>,
  survey: "Tracking" | "Household" | "Girls"
): RespondentContext {
  const girlCols =
    survey === "Tracking"
      ? ["girl_name", "girlname_label", "new_name", "name", "girl_name_1", "new_name_1"]
      : survey === "Household"
        ? ["girlname_label", "girl_name", "name"]
        : ["girlname_label", "name", "girl_name"];

  const villageCols =
    survey === "Tracking"
      ? ["village_label", "village_label_1", "village", "village_1", "village_label_b1"]
      : ["village_label", "village"];

  const schoolCols =
    survey === "Tracking"
      ? [
          "new_school_label",
          "school_label",
          "new_school",
          "school",
          "girl_school_label",
          "new_school_label_1",
          "school_label_1",
        ]
      : survey === "Household"
        ? [
            "schoollist_24_25_label_1",
            "schoollist_23_24_label_1",
            "schoollist_22_23_label_1",
            "girls_school",
            "school_label",
            "school",
          ]
        : [
            "ay2425schoolname",
            "middleschool_label",
            "school_label",
            "new_school_label",
            "school",
          ];

  const girlIdCols =
    survey === "Tracking"
      ? ["girl_id", "girl_id_1", "girl"]
      : ["girl", "girl_id"];

  return {
    girlName: first(row, girlCols),
    village: first(row, villageCols, { preferText: true }),
    school: first(row, schoolCols, { preferText: true }),
    girlId: first(row, girlIdCols),
  };
}

function putForm(index: ContextIndex, key: string, ctx: RespondentContext) {
  if (!key) return;
  const prev = index.byFormKey.get(key);
  index.byFormKey.set(key, mergeCtx(prev, ctx));
  if (key.startsWith("uuid:")) {
    const short = key.slice(5);
    if (short) index.byFormKey.set(short, mergeCtx(index.byFormKey.get(short), ctx));
  }
}

function putGirl(index: ContextIndex, girlId: string, ctx: RespondentContext) {
  if (!girlId) return;
  index.byGirlId.set(girlId, mergeCtx(index.byGirlId.get(girlId), ctx));
}

function mergeCtx(
  a: RespondentContext | undefined,
  b: RespondentContext
): RespondentContext {
  if (!a) return { ...b };
  return {
    girlName: a.girlName || b.girlName,
    village: a.village || b.village,
    // Prefer a real school name over a numeric code / empty
    school:
      (a.school && !isNumericCode(a.school) ? a.school : "") ||
      (b.school && !isNumericCode(b.school) ? b.school : "") ||
      a.school ||
      b.school,
    girlId: a.girlId || b.girlId,
  };
}

function parseSurveyCsv(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data;
}

function buildContextIndex(): ContextIndex {
  const index: ContextIndex = {
    byFormKey: new Map(),
    byGirlId: new Map(),
  };

  const trackingFiles = [
    path.join(SURVEYS_DIR, "Tracking_Survey_NewSample.csv"),
    path.join(SURVEYS_DIR, "Tracking_Survey_Baseline.csv"),
  ];
  for (const file of trackingFiles) {
    for (const row of parseSurveyCsv(file)) {
      const ctx = extractFromRow(row, "Tracking");
      putForm(index, normKey(row.KEY), ctx);
      putForm(index, normKey(row.instanceID), ctx);
      putGirl(index, ctx.girlId, ctx);
    }
  }

  for (const row of parseSurveyCsv(path.join(SURVEYS_DIR, "Household_Survey.csv"))) {
    const ctx = extractFromRow(row, "Household");
    putForm(index, normKey(row.KEY), ctx);
    putForm(index, normKey(row.instanceID), ctx);
    putGirl(index, ctx.girlId, ctx);
  }

  for (const row of parseSurveyCsv(path.join(SURVEYS_DIR, "Girls_Survey.csv"))) {
    const ctx = extractFromRow(row, "Girls");
    putForm(index, normKey(row.KEY), ctx);
    putForm(index, normKey(row.instanceID), ctx);
    putGirl(index, ctx.girlId, ctx);
  }

  // Second pass: fill missing school/village/name on girl-id map from any survey
  // (already merged via putGirl). Ensure form keys also get girl-id school fill.
  for (const [key, ctx] of index.byFormKey) {
    if (ctx.girlId && (!ctx.school || isNumericCode(ctx.school))) {
      const byGirl = index.byGirlId.get(ctx.girlId);
      if (byGirl) {
        index.byFormKey.set(key, mergeCtx(ctx, byGirl));
      }
    }
  }

  return index;
}

export function getErrorContextIndex(): ContextIndex {
  const paths = SURVEY_FILES.map((f) => path.join(SURVEYS_DIR, f));
  const signature = filesSignature(paths);
  return getCached("error-context-index-v1", signature, buildContextIndex);
}

function resolveContext(
  index: ContextIndex,
  row: ErrorRow
): RespondentContext {
  const parts = parseErrorValueParts(row.value);
  const keys = [row.recordKey, normKey(parts.girl)].filter(Boolean);
  let ctx: RespondentContext = {
    girlName: parts.girl_name || parts.girlname || "",
    village: parts.village || "",
    school: parts.school || "",
    girlId: parts.girl || "",
  };

  for (const k of keys) {
    const hit = index.byFormKey.get(k) || index.byFormKey.get(k.replace(/^uuid:/, ""));
    if (hit) ctx = mergeCtx(ctx, hit);
  }

  const girlId = ctx.girlId || parts.girl || "";
  if (girlId) {
    const byGirl = index.byGirlId.get(girlId);
    if (byGirl) ctx = mergeCtx(ctx, byGirl);
  }

  return ctx;
}

export type EnrichedErrorRow = ErrorRow & {
  girlName: string;
  villageName: string;
  schoolName: string;
};

export function enrichErrorRowsLive(rows: ErrorRow[]): EnrichedErrorRow[] {
  const index = getErrorContextIndex();
  return rows.map((row) => {
    const ctx = resolveContext(index, row);
    const parts = parseErrorValueParts(row.value);
    const girlName = ctx.girlName || parts.girl_name || "";
    const villageName = ctx.village || parts.village || "";
    const schoolName =
      (ctx.school && !isNumericCode(ctx.school) ? ctx.school : "") ||
      (parts.school && !isNumericCode(parts.school) ? parts.school : "") ||
      ctx.school ||
      parts.school ||
      "";

    // Keep value readable: original evidence + context keys for Excel export/search
    let value = stripContextFromValue(row.value) || row.value;
    const extras: string[] = [];
    if (girlName && !/girl_name=/i.test(value)) extras.push(`girl_name=${girlName}`);
    if (villageName && !/village=/i.test(value)) extras.push(`village=${villageName}`);
    if (schoolName && !/school=/i.test(value)) extras.push(`school=${schoolName}`);
    if (extras.length) {
      value = value ? `${value}; ${extras.join("; ")}` : extras.join("; ");
    }

    return {
      ...row,
      value,
      girlName,
      villageName,
      schoolName,
    };
  });
}
