import { exec } from "child_process";
import path from "path";
import { promisify } from "util";
import { credentialsPath, getCredentialsFileContent } from "@/lib/auth/users";
import {
  getPermissionsFileContent,
  permissionsPath,
} from "@/lib/auth/permissions";
import { commitContents, isGithubConfigured } from "./github";

const execAsync = promisify(exec);

/** The git repository lives one level above the Next.js app folder. */
function repoRoot(): string {
  return path.join(process.cwd(), "..");
}

async function git(args: string): Promise<string> {
  const { stdout } = await execAsync(`git ${args}`, {
    cwd: repoRoot(),
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 10,
  });
  return stdout.trim();
}

async function isGitAvailable(): Promise<boolean> {
  try {
    await git("rev-parse --is-inside-work-tree");
    return true;
  } catch {
    return false;
  }
}

/** The data files this dashboard edits at runtime (credentials, permissions). */
function managedDataFiles() {
  return [
    { localPath: credentialsPath(), content: getCredentialsFileContent() },
    { localPath: permissionsPath(), content: getPermissionsFileContent() },
  ];
}

export type PublishMode = "git" | "github" | "unavailable";

export interface PublishStatus {
  mode: PublishMode;
  branch: string;
  pendingChanges: number;
  changedFiles: string[];
  ahead: number;
  lastCommit: { message: string; date: string } | null;
}

export async function getPublishStatus(): Promise<PublishStatus> {
  if (await isGitAvailable()) {
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
      const log = await git("log -1 --pretty=format:%s%n%cI");
      const [message, date] = log.split("\n");
      if (message) lastCommit = { message, date: date ?? "" };
    } catch {
      lastCommit = null;
    }

    return {
      mode: "git",
      branch,
      pendingChanges: changedFiles.length,
      changedFiles,
      ahead,
      lastCommit,
    };
  }

  // No local git (e.g. hosted serverless): publishing goes through the GitHub API.
  return {
    mode: isGithubConfigured() ? "github" : "unavailable",
    branch: process.env.GITHUB_BRANCH ?? "main",
    pendingChanges: 0,
    changedFiles: [],
    ahead: 0,
    lastCommit: null,
  };
}

export interface PublishResult {
  via: PublishMode;
  committed: boolean;
  message: string;
}

function buildCommitMessage(note?: string): string {
  const timestamp = new Date().toISOString();
  const trimmed = note?.trim();
  const summary = trimmed ? `Publish: ${trimmed}` : "Publish dashboard updates";
  return `${summary}\n\nPublished from dashboard on ${timestamp}`;
}

export async function publishChanges(note?: string): Promise<PublishResult> {
  const message = buildCommitMessage(note);

  if (await isGitAvailable()) {
    await git("add -A");
    const statusRaw = await git("status --porcelain");
    const hasChanges = statusRaw.trim().length > 0;

    let committed = false;
    if (hasChanges) {
      const escaped = message.replace(/"/g, '\\"');
      await git(`commit -m "${escaped}"`);
      committed = true;
    }

    await git("push origin HEAD");

    return {
      via: "git",
      committed,
      message: committed
        ? "Changes committed and published live."
        : "No local changes to commit. Pushed any pending commits live.",
    };
  }

  if (isGithubConfigured()) {
    await commitContents(managedDataFiles(), message);
    return {
      via: "github",
      committed: true,
      message: "Changes published live to GitHub.",
    };
  }

  throw new Error(
    "Publishing is not configured on this server. Set a GITHUB_TOKEN environment variable to enable publishing from the live site."
  );
}

/**
 * Persist a single managed data file to GitHub when a token is configured.
 * Used to auto-publish credential/permission changes made on the live site.
 * Returns true when the change was committed to GitHub.
 */
export async function autoPublishDataFiles(
  files: { localPath: string; content: string }[],
  note: string
): Promise<boolean> {
  if (!isGithubConfigured()) return false;

  await commitContents(files, buildCommitMessage(note));
  return true;
}
