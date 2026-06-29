import { exec } from "child_process";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

/** The git repository lives one level above the Next.js app folder. */
function repoRoot(): string {
  return join(process.cwd(), "..");
}

async function git(args: string): Promise<string> {
  const { stdout } = await execAsync(`git ${args}`, {
    cwd: repoRoot(),
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 10,
  });
  return stdout.trim();
}

export interface PublishStatus {
  branch: string;
  pendingChanges: number;
  changedFiles: string[];
  ahead: number;
  lastCommit: { message: string; date: string } | null;
}

export async function getPublishStatus(): Promise<PublishStatus> {
  const branch = await git("rev-parse --abbrev-ref HEAD");

  const statusRaw = await git("status --porcelain");
  const changedFiles = statusRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\S+\s+/, ""));

  let ahead = 0;
  try {
    const counts = await git("rev-list --left-right --count @{upstream}...HEAD");
    const parts = counts.split(/\s+/);
    ahead = Number(parts[1] ?? 0) || 0;
  } catch {
    ahead = 0;
  }

  let lastCommit: PublishStatus["lastCommit"] = null;
  try {
    const log = await git('log -1 --pretty=format:%s%n%cI');
    const [message, date] = log.split("\n");
    if (message) lastCommit = { message, date: date ?? "" };
  } catch {
    lastCommit = null;
  }

  return {
    branch,
    pendingChanges: changedFiles.length,
    changedFiles,
    ahead,
    lastCommit,
  };
}

export interface PublishResult {
  committed: boolean;
  pushed: boolean;
  message: string;
}

export async function publishChanges(note?: string): Promise<PublishResult> {
  await git("add -A");

  const statusRaw = await git("status --porcelain");
  const hasStagedChanges = statusRaw.trim().length > 0;

  let committed = false;
  if (hasStagedChanges) {
    const timestamp = new Date().toISOString();
    const trimmedNote = note?.trim();
    const summary = trimmedNote
      ? `Publish: ${trimmedNote}`
      : "Publish dashboard updates";
    const commitMessage = `${summary}\n\nPublished from dashboard on ${timestamp}`;

    const escaped = commitMessage.replace(/"/g, '\\"');
    await git(`commit -m "${escaped}"`);
    committed = true;
  }

  await git("push origin HEAD");

  return {
    committed,
    pushed: true,
    message: committed
      ? "Changes committed and published live."
      : "No local changes to commit. Pushed any pending commits live.",
  };
}
