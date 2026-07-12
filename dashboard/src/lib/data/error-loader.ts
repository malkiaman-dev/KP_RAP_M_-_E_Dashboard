import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import {
  computeErrorMetrics,
  scopeErrorReportRows,
  type ErrorRow,
  type ErrorSeverity,
} from "./error-metrics";
import {
  getDqaLastError,
  getDqaStatus,
  scheduleDqaIfStale,
  type DqaStatus,
} from "./dqa-runner";

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
    // The file may be locked (open in Excel). Copy to a temp file and read that.
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

export function loadErrorRows(): ErrorRow[] {
  const filePath = ERROR_LOG_CANDIDATES.find((p) => fs.existsSync(p));
  if (!filePath) return [];

  // Read the bytes ourselves (with a copy fallback if the workbook is locked,
  // e.g. open in Excel) instead of XLSX.readFile, which can fail to access the
  // file directly on Windows.
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

  return raw.map((row) => ({
    survey: str(row["Survey"]),
    district: str(row["District"]),
    recordKey: str(row["Record Key"]),
    severity: normalizeSeverity(row["Severity"]),
    ruleId: str(row["Rule ID"]),
    title: str(row["Title"]),
    message: str(row["Message"]),
    field: str(row["Field"]),
    value: str(row["Value"]),
    enumeratorName: str(row["Enumerator Name"]),
    enumeratorId: str(row["Enumerator ID"]),
    deviceId: str(row["Device ID"]),
    submissionDate: str(row["Submission Date"]),
    createdAt: str(row["Created At"]),
  }));
}

export function loadErrorMetrics() {
  // When Surveys/*.csv are newer than the error log, kick off DQA in the
  // background so the next refresh shows updated issues without blocking this
  // request for several minutes.
  const dqaStatus = scheduleDqaIfStale();
  const rows = scopeErrorReportRows(loadErrorRows());
  const metrics = computeErrorMetrics(rows);
  return {
    ...metrics,
    dqaStatus: dqaStatus === "stale" ? getDqaStatus() : dqaStatus,
    dqaError: getDqaLastError(),
  };
}

export type ErrorMetricsPayload = ReturnType<typeof loadErrorMetrics>;
