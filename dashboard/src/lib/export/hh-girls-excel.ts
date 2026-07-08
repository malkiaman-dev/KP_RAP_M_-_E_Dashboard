import * as XLSX from "xlsx";
import type { HhGirlsExportRow } from "@/lib/data/hh-girls-revisit";

function toSheetRows(rows: HhGirlsExportRow[]) {
  const includeDuplicateType = rows.some((r) => r.duplicateType);
  const includeReason = rows.some((r) => r.exportReason);

  return rows.map((row) => {
    const base: Record<string, string> = {
      "Key ID": row.keyId,
      "Girl ID": row.girlId,
      "Girl Name": row.girlName,
      District: row.district,
      Village: row.village,
      "Survey Type": row.surveyType,
      Respondent: row.respondent,
      Attempt: row.attempt,
      Availability: row.availability,
      Consent: row.consent,
      "Consent Label": row.consentLabel,
      survey_status: row.surveyStatus,
      "Survey Status Label": row.surveyStatusLabel,
      "Enumerator ID": row.enumeratorId,
      Enumerator: row.enumeratorName,
      "Submission Date": row.submissionDate,
      Category: row.category,
    };

    if (includeDuplicateType) {
      base["Duplicate Type"] = row.duplicateType || "";
    }
    if (includeReason) {
      base.Reason = row.exportReason || "";
    }

    return base;
  });
}

export function downloadHhGirlsExcel(rows: HhGirlsExportRow[], filename: string) {
  const sheet = XLSX.utils.json_to_sheet(toSheetRows(rows));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Records");
  XLSX.writeFile(workbook, filename);
}
