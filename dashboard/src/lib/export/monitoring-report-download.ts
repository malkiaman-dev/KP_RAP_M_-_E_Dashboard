import type {
  MonitoringStatusReportInput,
  ReportFormat,
} from "@/lib/export/monitoring-report-shared";
import { downloadMonitoringStatusPdf } from "@/lib/export/monitoring-status-pdf";
import { downloadMonitoringStatusDocx } from "@/lib/export/monitoring-status-docx";

export async function downloadMonitoringStatusReport(
  input: MonitoringStatusReportInput,
  filename: string,
  format: ReportFormat
) {
  if (format === "pdf") {
    await downloadMonitoringStatusPdf(input, filename);
    return;
  }
  await downloadMonitoringStatusDocx(input, filename);
}
