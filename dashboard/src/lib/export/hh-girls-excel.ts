import * as XLSX from "xlsx";
import type { HhGirlsExportRow } from "@/lib/data/hh-girls-revisit";

function toSheetRows(rows: HhGirlsExportRow[]) {
  const includeDuplicateType = rows.some((r) => r.duplicateType);
  const includeReason = rows.some((r) => r.exportReason);
  const includeHouseholdSummary = rows.some(
    (r) => r.fatherSlotStatus || r.girlsSurveyDone
  );
  const includeRevisitFor = rows.some((r) => r.revisitFor);

  return rows.map((row) => {
    const base: Record<string, string> = {
      "Key ID": row.keyId,
      "Girl ID": row.girlId,
      "Girl Name": row.girlName,
      District: row.district,
      Village: row.village,
    };

    if (includeRevisitFor) {
      base["Revisit For"] = row.revisitFor || "";
    }

    base["Survey Type"] = row.surveyType;
    base.Respondent = row.respondent;
    base.Attempt = row.attempt;
    base.Availability = row.availability;
    base.Consent = row.consent;
    base["Consent Label"] = row.consentLabel;
    base.survey_status = row.surveyStatus;
    base["Survey Status Label"] = row.surveyStatusLabel;
    base["Enumerator ID"] = row.enumeratorId;
    base.Enumerator = row.enumeratorName;
    base["Submission Date"] = row.submissionDate;
    base.Category = row.category;

    if (includeHouseholdSummary) {
      base["Father Slot"] = row.fatherSlotStatus || "";
      base["Mother Slot"] = row.motherSlotStatus || "";
      base["Caretaker Slot"] = row.caretakerSlotStatus || "";
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
