import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import type { TrackingCohort } from "./tracking-metrics";

const DATA_ROOT = path.join(process.cwd(), "..");
const TARGETS_DIR = path.join(DATA_ROOT, "Tracking_Targets");

export interface TrackingTargetGirl {
  girlId: string;
  girlName: string;
  fatherName: string;
  district: string;
  districtLabel: string;
  village: string;
  villageId: string;
  school: string;
  schoolId: string;
  contact: string;
  address: string;
  landmark: string;
  cohort: TrackingCohort;
  batch: string;
  statusListing: string;
}

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readFileResilient(filePath: string): Buffer | null {
  try {
    return fs.readFileSync(filePath);
  } catch {
    try {
      const tmp = path.join(
        process.cwd(),
        ".next",
        `tracking-targets-${Date.now()}.xlsx`
      );
      fs.copyFileSync(filePath, tmp);
      const data = fs.readFileSync(tmp);
      fs.unlinkSync(tmp);
      return data;
    } catch (err) {
      console.error("Unable to read tracking targets file:", err);
      return null;
    }
  }
}

function districtCode(districtid: unknown, districtLabel: string): string {
  const id = str(districtid);
  if (id) return id;
  const label = districtLabel.toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
  if (label.includes("khan") || label.includes("dikhan")) return "1";
  if (label.includes("hangu")) return "2";
  if (label.includes("lakki")) return "3";
  if (label.includes("torghar") || label.includes("torghar")) return "4";
  return "";
}

function loadTargetSheet(
  fileName: string,
  cohort: TrackingCohort
): TrackingTargetGirl[] {
  const filePath = path.join(TARGETS_DIR, fileName);
  if (!fs.existsSync(filePath)) return [];

  const buffer = readFileResilient(filePath);
  if (!buffer) return [];

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return raw
    .map((row) => {
      const districtLabel = str(row.district);
      const girlId = str(row.girlid);
      if (!girlId) return null;

      const girlName =
        cohort === "baseline"
          ? str(row.name) || str(row.girl).split("|")[0]?.trim() || ""
          : str(row.girlname) || str(row.girl).split("|")[0]?.trim() || "";

      return {
        girlId,
        girlName,
        fatherName: str(row.fathername),
        district: districtCode(row.districtid, districtLabel),
        districtLabel,
        village: str(row.village),
        villageId: str(row.villageid),
        school: str(row.school),
        schoolId: str(row.schoolid),
        contact:
          cohort === "baseline"
            ? str(row.contactnumber1) || str(row.contactnumber2)
            : str(row.contact),
        address: str(row.address),
        landmark: str(row.landmark),
        cohort,
        batch: str(row.batch),
        statusListing:
          cohort === "baseline"
            ? str(row.baseline_status)
            : str(row.status),
      } satisfies TrackingTargetGirl;
    })
    .filter((row): row is TrackingTargetGirl => row !== null);
}

/** Load the official tracking assignment frame (baseline + new sample). */
export function loadTrackingTargetGirls(): TrackingTargetGirl[] {
  return [
    ...loadTargetSheet("Tracking_Survey_Baseline.xlsx", "baseline"),
    ...loadTargetSheet("Tracking_Survey_NewSample.xlsx", "new-sample"),
  ];
}

export function trackingTargetsAvailable(): boolean {
  return (
    fs.existsSync(path.join(TARGETS_DIR, "Tracking_Survey_Baseline.xlsx")) ||
    fs.existsSync(path.join(TARGETS_DIR, "Tracking_Survey_NewSample.xlsx"))
  );
}
