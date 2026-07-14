import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import {
  computeErrorMetrics,
  scopeErrorReportRows,
  type ErrorRow,
  type ErrorSeverity,
} from "./error-metrics";
import { enrichErrorRowsLive } from "./error-context";
import { getDqaLastError, type DqaStatus } from "./dqa-runner";

export type { ErrorRow, ErrorMetrics, ErrorFilters } from "./error-metrics";
export {
  computeErrorMetrics,
  applyErrorFilters,
  defaultErrorFilters,
  excludeCrossSurveyChecks,
  scopeErrorReportRows,
  ERROR_REPORT_SURVEYS,
  toggleErrorFilters,
} from "./error-metrics";
export type { DqaStatus } from "./dqa-runner";
export { runDqaNow, isErrorLogStale, getDqaStatus } from "./dqa-runner";

const DATA_ROOT = path.join(process.cwd(), "..");

const ERROR_LOG_CANDIDATES = [
  path.join(DATA_ROOT, "Error_log", "Daily_Error_Log.xlsx"),
  path.join(DATA_ROOT, "Error_log", "Daily_Error_log.xlsx"),
];

function readFileResilient(filePath: string): Buffer | null {
  try {
    return fs.readFileSync(filePath);
  } catch {
    try {
      const tmp = path.join(
        process.cwd(),
        ".next",
        `error-log-${Date.now()}.xlsx`
      );
      fs.copyFileSync(filePath, tmp);
      const data = fs.readFileSync(tmp);
      fs.unlinkSync(tmp);
      return data;
    } catch (err) {
      console.error("Unable to read error log file:", err);
      return null;
    }
  }
}

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeSeverity(value: unknown): ErrorSeverity {
  return str(value).toUpperCase() === "CRITICAL" ? "CRITICAL" : "FLAG";
}

/**
 * Map legacy dual-tier rule IDs onto the consolidated single-check IDs.
 * Severity is unchanged — only the rule category is unified.
 */
const LEGACY_RULE_ID_ALIASES: Record<string, string> = {
  HH_QF_07: "HH_CE_FAST_10",
  GL_QF_10: "GL_CE_FAST_10",
  HH_QF_LONG_DURATION_WARN: "HH_CR_LONG_DURATION",
};

const LEGACY_RULE_TITLES: Record<string, string> = {
  HH_CE_FAST_10: "Survey completed too quickly",
  GL_CE_FAST_10: "Interview completed too quickly",
  HH_CR_LONG_DURATION: "Long survey duration",
};

function normalizeRuleId(ruleId: string): string {
  return LEGACY_RULE_ID_ALIASES[ruleId] ?? ruleId;
}

function normalizeTitle(ruleId: string, title: string): string {
  return LEGACY_RULE_TITLES[ruleId] ?? title;
}

export function loadErrorRows(): ErrorRow[] {
  const filePath = ERROR_LOG_CANDIDATES.find((p) => fs.existsSync(p));
  if (!filePath) return [];

  const buffer = readFileResilient(filePath);
  if (!buffer) return [];
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet =
    workbook.Sheets["errors"] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return raw.map((row) => {
    const ruleId = normalizeRuleId(str(row["Rule ID"]));
    return {
      survey: str(row["Survey"]),
      district: str(row["District"]),
      recordKey: str(row["Record Key"]),
      severity: normalizeSeverity(row["Severity"]),
      ruleId,
      title: normalizeTitle(ruleId, str(row["Title"])),
      message: str(row["Message"]),
      field: str(row["Field"]),
      value: str(row["Value"]),
      enumeratorName: str(row["Enumerator Name"]),
      enumeratorId: str(row["Enumerator ID"]),
      deviceId: str(row["Device ID"]),
      submissionDate: str(row["Submission Date"]),
      createdAt: str(row["Created At"]),
    };
  });
}

/**
 * Error Report metrics.
 *
 * Girl / village / school are filled live from Surveys/*.csv on every load
 * (mtime-cached), including cross-survey school lookup by girl ID. This avoids
 * waiting several minutes for Python DQA just to refresh context fields.
 *
 * Full rule regeneration still uses `runDqaNow()` / publish (Python) when you
 * need a fresh Daily_Error_Log.xlsx from scratch.
 */
export function loadErrorMetrics() {
  const rows = enrichErrorRowsLive(scopeErrorReportRows(loadErrorRows()));
  const metrics = computeErrorMetrics(rows);
  return {
    ...metrics,
    dqaStatus: "fresh" as DqaStatus,
    dqaError: getDqaLastError(),
    dqaMode: "live-surveys" as const,
  };
}

export type ErrorMetricsPayload = ReturnType<typeof loadErrorMetrics>;
