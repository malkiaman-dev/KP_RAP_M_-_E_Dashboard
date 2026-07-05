import * as XLSX from "xlsx";
import type { RevisitGirlExportRow } from "@/lib/data/tracking-metrics";

function toSheetRows(rows: RevisitGirlExportRow[]) {
  const includeDuplicateType = rows.some((r) => r.duplicateType);
  const includeReason = rows.some((r) => r.exportReason);

  return rows.map((row) => {
    const base: Record<string, string> = {
      "Key ID": row.keyId,
      "Girl ID": row.girlId,
      "Girl Name": row.girlName,
      District: row.district,
      Village: row.village,
      School: row.school,
      "Enumerator ID": row.enumeratorId,
      Enumerator: row.enumeratorName,
      "Tracking Group": row.trackingGroup,
      Session: row.session,
      "Submission Date": row.submissionDate,
      "Visit #": row.visitNum,
      "House Found": row.houseFound,
      "Girl Found": row.girlFound,
      Consent: row.consent,
      survey_status: row.surveyStatus,
      survey_status_othr: row.surveyStatusOthr,
      survey_comments: row.surveyComments,
      Category: row.revisitCategory,
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

export function downloadRevisitExcel(
  rows: RevisitGirlExportRow[],
  filename: string
) {
  const sheet = XLSX.utils.json_to_sheet(toSheetRows(rows));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Girls");
  XLSX.writeFile(workbook, filename);
}
