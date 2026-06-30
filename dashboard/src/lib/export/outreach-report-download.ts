import type { ReportFormat } from "@/lib/export/monitoring-report-shared";
import type { OutreachReportInput } from "@/lib/export/outreach-report-shared";
import { downloadOutreachReportDocx } from "@/lib/export/outreach-report-docx";
import { downloadOutreachReportPdf } from "@/lib/export/outreach-report-pdf";

export async function downloadOutreachReport(
  input: OutreachReportInput,
  filename: string,
  format: ReportFormat
) {
  if (format === "pdf") {
    await downloadOutreachReportPdf(input, filename);
    return;
  }
  await downloadOutreachReportDocx(input, filename);
}
