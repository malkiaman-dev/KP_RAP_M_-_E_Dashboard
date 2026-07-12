import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const DATA_ROOT = path.join(process.cwd(), "..");
const DQA_DIR = path.join(DATA_ROOT, "DQA_Script");
const ERROR_LOG = path.join(DATA_ROOT, "Error_log", "Daily_Error_Log.xlsx");

const SURVEY_FILES = [
  "Tracking_Survey_NewSample.csv",
  "Tracking_Survey_Baseline.csv",
  "Household_Survey.csv",
  "Girls_Survey.csv",
];

export type DqaStatus = "fresh" | "stale" | "regenerating" | "missing" | "unavailable";

let inFlight: Promise<void> | null = null;
let lastRunError: string | null = null;
let lastRunAt = 0;

function fileMtimeMs(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function latestSurveyMtimeMs(): number {
  const surveysDir = path.join(DATA_ROOT, "Surveys");
  let latest = 0;
  for (const name of SURVEY_FILES) {
    latest = Math.max(latest, fileMtimeMs(path.join(surveysDir, name)));
  }
  return latest;
}

/** True when survey CSVs are newer than Daily_Error_Log (or the log is missing). */
export function isErrorLogStale(): boolean {
  const surveyMtime = latestSurveyMtimeMs();
  if (surveyMtime <= 0) return false;
  const logMtime = fileMtimeMs(ERROR_LOG);
  if (logMtime <= 0) return true;
  // Small grace window avoids re-running on tiny clock skew / write order
  return surveyMtime > logMtime + 1000;
}

export function getDqaStatus(): DqaStatus {
  if (inFlight) return "regenerating";
  if (!fs.existsSync(path.join(DQA_DIR, "run_dqa.py"))) return "unavailable";
  if (!fs.existsSync(ERROR_LOG) && latestSurveyMtimeMs() > 0) return "missing";
  if (isErrorLogStale()) return "stale";
  return "fresh";
}

export function getDqaLastError(): string | null {
  return lastRunError;
}

async function runPythonDqa(): Promise<void> {
  const script = path.join(DQA_DIR, "run_dqa.py");
  if (!fs.existsSync(script)) {
    throw new Error("DQA_Script/run_dqa.py not found");
  }

  // Prefer `py -3` on Windows, then `python`, then `python3`
  const commands: Array<{ cmd: string; args: string[] }> = process.platform === "win32"
    ? [
        { cmd: "py", args: ["-3", script] },
        { cmd: "python", args: [script] },
        { cmd: "python3", args: [script] },
      ]
    : [
        { cmd: "python3", args: [script] },
        { cmd: "python", args: [script] },
      ];

  let lastError: unknown = null;
  for (const { cmd, args } of commands) {
    try {
      await execFileAsync(cmd, args, {
        cwd: DQA_DIR,
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024,
        timeout: 20 * 60 * 1000, // DQA can take several minutes on full exports
      });
      return;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Try next interpreter if command missing
      if (/ENOENT|not recognized|not found/i.test(msg)) continue;
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Python is not available to run DQA_Script/run_dqa.py");
}

/**
 * Run DQA now and wait for completion. Used by publish and explicit refresh.
 */
export async function runDqaNow(): Promise<{ ok: boolean; message: string }> {
  if (inFlight) {
    try {
      await inFlight;
      return { ok: true, message: "DQA regeneration already in progress completed." };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "DQA regeneration failed",
      };
    }
  }

  inFlight = (async () => {
    lastRunError = null;
    await runPythonDqa();
    lastRunAt = Date.now();
  })();

  try {
    await inFlight;
    return { ok: true, message: "Error report regenerated from latest survey files." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "DQA regeneration failed";
    lastRunError = message;
    console.error("[dqa-runner]", message);
    return { ok: false, message };
  } finally {
    inFlight = null;
  }
}

/**
 * If survey CSVs are newer than the error log, start a background DQA run.
 * Safe to call on every /api/errors request — concurrent calls share one run.
 */
export function scheduleDqaIfStale(): DqaStatus {
  const status = getDqaStatus();
  if (status !== "stale" && status !== "missing") return status;
  if (inFlight) return "regenerating";

  // Avoid hammering if the last attempt just failed
  if (lastRunError && Date.now() - lastRunAt < 60_000) return status;

  inFlight = (async () => {
    lastRunError = null;
    await runPythonDqa();
    lastRunAt = Date.now();
  })()
    .catch((err) => {
      lastRunError = err instanceof Error ? err.message : String(err);
      console.error("[dqa-runner] background regenerate failed:", lastRunError);
    })
    .finally(() => {
      inFlight = null;
    });

  return "regenerating";
}
