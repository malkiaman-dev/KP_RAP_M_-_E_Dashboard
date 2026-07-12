import * as XLSX from "xlsx";
import type { ErrorRow } from "@/lib/data/error-metrics";

function toSheetRows(rows: ErrorRow[]) {
  return rows.map((row) => ({
    Survey: row.survey,
    District: row.district,
    "Record Key": row.recordKey,
    Severity: row.severity === "CRITICAL" ? "Critical" : "Quality",
    "Rule ID": row.ruleId,
    Title: row.title,
    Message: row.message,
    Field: row.field,
    Value: row.value,
    "Enumerator Name": row.enumeratorName,
    "Enumerator ID": row.enumeratorId,
    "Device ID": row.deviceId,
    "Submission Date": row.submissionDate,
    "Created At": row.createdAt,
  }));
}

export function downloadErrorReportExcel(rows: ErrorRow[], filename: string) {
  const sheet = XLSX.utils.json_to_sheet(toSheetRows(rows));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Errors");
  XLSX.writeFile(workbook, filename);
}
