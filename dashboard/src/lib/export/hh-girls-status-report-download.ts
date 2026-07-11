import type {
  HhGirlsStatusReportInput,
  ReportFormat,
} from "@/lib/export/hh-girls-status-report-shared";
import { downloadHhGirlsStatusPdf } from "@/lib/export/hh-girls-status-pdf";
import { downloadHhGirlsStatusDocx } from "@/lib/export/hh-girls-status-docx";

export async function downloadHhGirlsStatusReport(
  input: HhGirlsStatusReportInput,
  filename: string,
  format: ReportFormat
) {
  if (format === "pdf") {
    await downloadHhGirlsStatusPdf(input, filename);
    return;
  }
  await downloadHhGirlsStatusDocx(input, filename);
}
