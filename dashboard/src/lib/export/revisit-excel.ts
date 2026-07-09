import * as XLSX from "xlsx";
import type { RevisitGirlExportRow } from "@/lib/data/tracking-metrics";

function toSheetRows(rows: RevisitGirlExportRow[]) {
  const includeDuplicateType = rows.some((r) => r.duplicateType);

  return rows.map((row) => {
    const base: Record<string, string> = {
      "Submission Date": row.submissionDate,
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
      "Visit #": row.visitNum,
      Category: row.revisitCategory,
      Reason: row.exportReason || "",
      house_found: row.houseFoundCode,
      "House Found": row.houseFound,
      girl_found: row.girlFoundCode,
      "Girl Found": row.girlFound,
      girl_found_other: row.girlFoundOther,
      girl_found_confirm_enrolled: row.girlFoundConfirmEnrolled,
      "Enrollment Confirm": row.girlFoundConfirmEnrolledLabel,
      family_whereabouts: row.familyWhereabouts,
      "Family Whereabouts": row.familyWhereaboutsLabel,
      family_moveadd_samevill: row.familyMoveaddSamevill,
      "New Address Known (same village)": row.familyMoveaddSamevillLabel,
      moved_familyaddress: row.movedFamilyAddress,
      house_found_1: row.houseFound1Code,
      "House Found at New Address": row.houseFound1Label,
      check_villageelder: row.checkVillageElder,
      "Asked Village Elder": row.checkVillageElderLabel,
      name_villageelder: row.nameVillageElder,
      number_villageelder: row.numberVillageElder,
      check_lhw: row.checkLhw,
      "Asked LHW": row.checkLhwLabel,
      name_lhw: row.nameLhw,
      number_lhw: row.numberLhw,
      check_neighbour: row.checkNeighbour,
      "Asked Neighbour": row.checkNeighbourLabel,
      name_neighbour: row.nameNeighbour,
      number_neighbour: row.numberNeighbour,
      visit_comments: row.visitComments,
      check_villageelder_1: row.checkVillageElder1,
      "Asked Village Elder (new address)": row.checkVillageElder1Label,
      name_villageelder_1: row.nameVillageElder1,
      number_villageelder_1: row.numberVillageElder1,
      check_lhw_1: row.checkLhw1,
      "Asked LHW (new address)": row.checkLhw1Label,
      name_lhw_1: row.nameLhw1,
      number_lhw_1: row.numberLhw1,
      check_neighbour_1: row.checkNeighbour1,
      "Asked Neighbour (new address)": row.checkNeighbour1Label,
      name_neighbour_1: row.nameNeighbour1,
      number_neighbour_1: row.numberNeighbour1,
      visit_comments_1: row.visitComments1,
      consent: row.consent,
      "Consent Label": row.consentLabel,
      survey_status: row.surveyStatus,
      "Survey Status Label": row.surveyStatusLabel,
      survey_status_othr: row.surveyStatusOthr,
      survey_comments: row.surveyComments,
    };

    if (includeDuplicateType) {
      base["Duplicate Type"] = row.duplicateType || "";
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
