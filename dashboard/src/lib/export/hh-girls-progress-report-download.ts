import type { ReportFormat } from "@/lib/export/hh-girls-status-report-shared";
import type { HhGirlsProgressReportInput } from "@/lib/export/hh-girls-progress-report-shared";
import { downloadHhGirlsProgressDocx } from "@/lib/export/hh-girls-progress-docx";
import { downloadHhGirlsProgressPdf } from "@/lib/export/hh-girls-progress-pdf";

export async function downloadHhGirlsProgressReport(
  input: HhGirlsProgressReportInput,
  filename: string,
  format: ReportFormat
) {
  if (format === "pdf") {
    await downloadHhGirlsProgressPdf(input, filename);
    return;
  }
  await downloadHhGirlsProgressDocx(input, filename);
}
