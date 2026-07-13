import type {
  ErrorReportInput,
  ReportFormat,
} from "@/lib/export/error-dqa-report-shared";
import { downloadErrorDqaReportPdf } from "@/lib/export/error-dqa-report-pdf";
import { downloadErrorDqaReportDocx } from "@/lib/export/error-dqa-report-docx";

export async function downloadErrorDqaReport(
  input: ErrorReportInput,
  filename: string,
  format: ReportFormat
) {
  if (format === "pdf") {
    await downloadErrorDqaReportPdf(input, filename);
    return;
  }
  await downloadErrorDqaReportDocx(input, filename);
}
