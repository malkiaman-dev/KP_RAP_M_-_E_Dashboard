import * as XLSX from "xlsx";
import type { TargetGapGirl } from "@/lib/data/tracking-target-gaps-types";

function toSheetRows(rows: TargetGapGirl[]) {
  return rows.map((row) => ({
    District: row.districtLabel,
    "District Code": row.district,
    Village: row.village,
    School: row.school,
    "Girl ID": row.girlId,
    "Girl Name": row.girlName,
    "Father Name": row.fatherName,
    Contact: row.contact,
    Address: row.address,
    Landmark: row.landmark,
    Cohort: row.cohort === "baseline" ? "Baseline" : "New Sample",
    Batch: row.batch,
    Status: row.statusLabel,
    Reason: row.reason,
    Attempts: row.attempts,
  }));
}

export function downloadTargetGapExcel(
  rows: TargetGapGirl[],
  filename: string
) {
  const sheet = XLSX.utils.json_to_sheet(toSheetRows(rows));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Outstanding girls");
  XLSX.writeFile(book, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
