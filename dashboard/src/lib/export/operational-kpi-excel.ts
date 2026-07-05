import * as XLSX from "xlsx";
import type { OperationalKpiExportData } from "@/lib/data/tracking-metrics";
import { downloadRevisitExcel } from "@/lib/export/revisit-excel";

export function downloadOperationalKpiExcel(
  data: OperationalKpiExportData,
  filename: string
) {
  if (data.enumeratorSummary && data.enumeratorSummary.length > 0) {
    const sheet = XLSX.utils.json_to_sheet(
      data.enumeratorSummary.map((row) => ({
        "Enumerator ID": row.enumeratorId,
        Enumerator: row.enumeratorName,
        District: row.district,
        "Unique Girls": row.uniqueGirls,
        "Tracked Girls": row.trackedGirls,
        "Untracked Girls": row.untrackedGirls,
        Submissions: row.submissions,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Enumerators");
    XLSX.writeFile(workbook, filename);
    return;
  }

  downloadRevisitExcel(data.rows, filename);
}
