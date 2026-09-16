import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { autoPublishDataFiles } from "@/lib/git/publish";

const DATA_ROOT = path.join(process.cwd(), "..");
const SURVEYS_DIR = path.join(DATA_ROOT, "Surveys");

export type SurveyUploadTarget =
  | "tracking_baseline"
  | "tracking_new_sample"
  | "household"
  | "girls";

export interface SurveyUploadTargetDef {
  key: SurveyUploadTarget;
  label: string;
  filename: string;
  description: string;
}

export const SURVEY_UPLOAD_TARGETS: SurveyUploadTargetDef[] = [
  {
    key: "tracking_baseline",
    label: "Tracking — Baseline",
    filename: "Tracking_Survey_Baseline.csv",
    description: "Listed-girl tracking survey, baseline sample export.",
  },
  {
    key: "tracking_new_sample",
    label: "Tracking — New Sample",
    filename: "Tracking_Survey_NewSample.csv",
    description: "Listed-girl tracking survey, new sample export.",
  },
  {
    key: "household",
    label: "Household Survey",
    filename: "Household_Survey.csv",
    description: "Household parent interview export.",
  },
  {
    key: "girls",
    label: "Girls Survey",
    filename: "Girls_Survey.csv",
    description: "Direct girl survey export.",
  },
];

const TARGET_BY_KEY = new Map(SURVEY_UPLOAD_TARGETS.map((t) => [t.key, t]));

function targetFilename(target: SurveyUploadTarget): string {
  const found = TARGET_BY_KEY.get(target);
  if (!found) throw new Error(`Unknown upload target: ${target}`);
  return found.filename;
}

export interface SurveyFileStatus {
  key: SurveyUploadTarget;
  label: string;
  filename: string;
  exists: boolean;
  size: number;
  updatedAt: string | null;
}

export function getSurveyFileStatuses(): SurveyFileStatus[] {
  return SURVEY_UPLOAD_TARGETS.map((t) => {
    const filePath = path.join(SURVEYS_DIR, t.filename);
    try {
      const stat = fs.statSync(filePath);
      return {
        key: t.key,
        label: t.label,
        filename: t.filename,
        exists: true,
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
      };
    } catch {
      return {
        key: t.key,
        label: t.label,
        filename: t.filename,
        exists: false,
        size: 0,
        updatedAt: null,
      };
    }
  });
}

/** Convert an uploaded file to CSV text based on its extension. */
function bufferToCsv(buffer: Buffer, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === ".xlsx" || ext === ".xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("The uploaded workbook has no sheets");
    return XLSX.utils.sheet_to_csv(sheet);
  }
  return buffer.toString("utf-8");
}

/** Light sanity check so an obviously wrong file doesn't silently replace real survey data. */
function assertLooksLikeSurveyCsv(csv: string, filename: string): void {
  const firstLine = (csv.split(/\r?\n/, 1)[0] ?? "").trim();
  if (!firstLine) {
    throw new Error(`${filename}: the uploaded file is empty`);
  }

  const header = (Papa.parse<string[]>(firstLine).data[0] ?? []) as string[];
  if (header.length < 2) {
    throw new Error(
      `${filename}: file does not look like a valid CSV export (fewer than 2 columns in the header row)`
    );
  }
  if (!header.some((col) => col.trim().toLowerCase() === "submissiondate")) {
    throw new Error(
      `${filename}: missing an expected "SubmissionDate" column — is this the correct SurveyCTO export?`
    );
  }
}

export interface SaveSurveyUploadResult {
  target: SurveyUploadTarget;
  filename: string;
  bytes: number;
  wroteLocally: boolean;
  published: boolean;
  publishError: string | null;
}

/**
 * Replace one of the four Surveys/*.csv files with an uploaded file.
 * Writes to disk when possible (local dev / self-hosted), and always also
 * tries to commit the change to GitHub when a token is configured, mirroring
 * how credentials/permissions changes are persisted elsewhere in the app.
 */
export async function saveSurveyUpload(
  target: SurveyUploadTarget,
  buffer: Buffer,
  originalName: string
): Promise<SaveSurveyUploadResult> {
  const filename = targetFilename(target);
  const csv = bufferToCsv(buffer, originalName);
  assertLooksLikeSurveyCsv(csv, filename);

  const filePath = path.join(SURVEYS_DIR, filename);

  let wroteLocally = false;
  try {
    fs.mkdirSync(SURVEYS_DIR, { recursive: true });
    if (fs.existsSync(filePath)) {
      const backupDir = path.join(SURVEYS_DIR, ".backups");
      fs.mkdirSync(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.copyFileSync(filePath, path.join(backupDir, `${filename}.${stamp}.bak`));
    }
    fs.writeFileSync(filePath, csv, "utf-8");
    wroteLocally = true;
  } catch {
    wroteLocally = false;
  }

  let published = false;
  let publishError: string | null = null;
  try {
    published = await autoPublishDataFiles(
      [{ localPath: filePath, content: csv }],
      `Upload survey data: ${filename}`
    );
  } catch (error) {
    publishError = error instanceof Error ? error.message : "Failed to publish upload";
  }

  if (!wroteLocally && !published) {
    throw new Error(
      publishError ??
        "Unable to save the uploaded file: no writable filesystem and GitHub publishing is not configured."
    );
  }

  return {
    target,
    filename,
    bytes: Buffer.byteLength(csv, "utf-8"),
    wroteLocally,
    published,
    publishError,
  };
}
