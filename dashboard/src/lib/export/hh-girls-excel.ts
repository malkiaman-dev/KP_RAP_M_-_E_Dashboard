import * as XLSX from "xlsx";
import type { HhGirlsExportRow } from "@/lib/data/hh-girls-revisit";

function toSheetRows(rows: HhGirlsExportRow[]) {
  const includeDuplicateType = rows.some((r) => r.duplicateType);
  const includeReason = rows.some((r) => r.exportReason);
  const includeHouseholdSummary = rows.some(
    (r) => r.fatherSlotStatus || r.girlsSurveyDone
  );

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

    if (includeHouseholdSummary) {
      base["Father Slot"] = row.fatherSlotStatus || "";
      base["Mother Slot"] = row.motherSlotStatus || "";
      base["Girls Survey Done"] = row.girlsSurveyDone || "";
      base["Girls Survey Status"] = row.girlsSurveyStatusLabel || "";
      base["Girl Available"] = row.girlAvailable || "";
      base["Parental Consent"] = row.parentalConsent || "";
      base["Child Consent"] = row.childConsent || "";
      base["Girls Survey Key ID"] = row.girlsSurveyKeyId || "";
      base["Girls Survey Date"] = row.girlsSurveyDate || "";
    }

    if (includeDuplicateType) {
      base["Duplicate Type"] = row.duplicateType || "";
    }
    if (includeReason) {
      base.Reason = row.exportReason || "";
    }
    if (row.unavailableCode || row.unavailableReason) {
      base["Unavailable Code"] = row.unavailableCode || "";
      base["Unavailable Reason"] = row.unavailableReason || "";
      base["Unavailable Other"] = row.unavailableOther || "";
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
