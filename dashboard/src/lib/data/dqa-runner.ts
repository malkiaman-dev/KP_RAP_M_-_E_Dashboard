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

/** Survey modules the Python DQA pipeline can run independently. */
export type DqaModule = "tracking" | "household" | "girls";
export const ALL_DQA_MODULES: DqaModule[] = ["tracking", "household", "girls"];

let inFlight: Promise<void> | null = null;
let lastRunError: string | null = null;
let lastRunAt = 0;

/** Candidate interpreter, resolved lazily and cached for the life of this server instance. */
let pythonCommand: { cmd: string; args: string[] } | null | undefined = undefined;

/** Interpreters to try, in order, for the current platform. */
function pythonCandidates(): Array<{ cmd: string; args: string[] }> {
  return process.platform === "win32"
    ? [
        { cmd: "py", args: ["-3"] },
        { cmd: "python", args: [] },
        { cmd: "python3", args: [] },
      ]
    : [
        { cmd: "python3", args: [] },
        { cmd: "python", args: [] },
      ];
}

/**
 * Finds a working Python interpreter by probing `--version`, caching the
 * result (including "none found") so repeated status checks don't re-spawn.
 * Returns null when no interpreter is available on this server (e.g. a
 * Vercel serverless function, which ships no Python runtime).
 */
async function resolvePythonCommand(): Promise<{ cmd: string; args: string[] } | null> {
  if (pythonCommand !== undefined) return pythonCommand;

  for (const candidate of pythonCandidates()) {
    try {
      await execFileAsync(candidate.cmd, [...candidate.args, "--version"], {
        windowsHide: true,
        timeout: 5000,
      });
      pythonCommand = candidate;
      return pythonCommand;
    } catch {
      // try next candidate
    }
  }

  pythonCommand = null;
  return null;
}

export async function isPythonAvailable(): Promise<boolean> {
  return (await resolvePythonCommand()) !== null;
}

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

/** Only pass --modules when it's a real subset; omit it to run everything (default script behavior). */
function moduleArgs(modules?: DqaModule[]): string[] {
  if (!modules || modules.length === 0 || modules.length >= ALL_DQA_MODULES.length) {
    return [];
  }
  return ["--modules", modules.join(",")];
}

async function runPythonDqa(modules?: DqaModule[]): Promise<void> {
  const script = path.join(DQA_DIR, "run_dqa.py");
  if (!fs.existsSync(script)) {
    throw new Error("DQA_Script/run_dqa.py not found");
  }

  const extraArgs = moduleArgs(modules);

  const python = await resolvePythonCommand();
  if (!python) {
    throw new Error(
      "Error log generation requires Python, which isn't installed on this server. " +
        "This feature only runs where Python and DQA_Script are available " +
        "(e.g. a self-hosted deployment) — it can't run on Vercel's serverless functions. " +
        "Generate Daily_Error_Log.xlsx elsewhere and upload it directly instead."
    );
  }

  await execFileAsync(python.cmd, [...python.args, script, ...extraArgs], {
    cwd: DQA_DIR,
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
    timeout: 20 * 60 * 1000, // DQA can take several minutes on full exports
  });
}

/**
 * Run DQA now and wait for completion. Used by publish and explicit refresh.
 * `modules` limits the run to a subset (e.g. skip Tracking while it isn't
 * being collected) — omit it (or pass all modules) to run everything.
 */
export async function runDqaNow(
  modules?: DqaModule[]
): Promise<{ ok: boolean; message: string }> {
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
    await runPythonDqa(modules);
    lastRunAt = Date.now();
  })();

  try {
    await inFlight;
    const scope =
      modules && modules.length > 0 && modules.length < ALL_DQA_MODULES.length
        ? modules.join(" + ")
        : "all surveys";
    return {
      ok: true,
      message: `Error report regenerated from latest survey files (${scope}).`,
    };
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
 * Context (girl/village/school) is filled live from Surveys CSVs in
 * `loadErrorMetrics`. Do not auto-spawn the multi-minute Python DQA.
 * Use `runDqaNow()` / publish to regenerate Daily_Error_Log.xlsx.
 */
export function scheduleDqaIfStale(): DqaStatus {
  if (inFlight) return "regenerating";
  if (!fs.existsSync(ERROR_LOG) && latestSurveyMtimeMs() > 0) return "missing";
  return "fresh";
}
