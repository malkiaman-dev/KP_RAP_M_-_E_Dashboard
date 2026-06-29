import path from "path";

const API = "https://api.github.com";

export interface GithubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export function getGithubConfig(): GithubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  return {
    token,
    owner: process.env.GITHUB_OWNER ?? "malkiaman-dev",
    repo: process.env.GITHUB_REPO ?? "KP_RAP_M_-_E_Dashboard",
    branch: process.env.GITHUB_BRANCH ?? "main",
  };
}

export function isGithubConfigured(): boolean {
  return getGithubConfig() !== null;
}

async function gh<T>(
  cfg: GithubConfig,
  endpoint: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "tracking-dashboard",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json() as Promise<T>;
}

/** Convert an absolute local path to a repo-relative POSIX path. */
function toRepoPath(localPath: string): string {
  const repoRoot = path.join(process.cwd(), "..");
  return path.relative(repoRoot, localPath).split(path.sep).join("/");
}

export interface CommitFile {
  /** Absolute local path (used to derive the path inside the repo). */
  localPath: string;
  /** File content to commit (taken from memory, not re-read from disk). */
  content: string;
}

export interface CommitResult {
  commitUrl: string;
  sha: string;
}

/**
 * Commit one or more files to the configured GitHub repo in a single commit
 * using the Git Data API. Content is provided directly so this works even on
 * hosts with a read-only filesystem.
 */
export async function commitContents(
  files: CommitFile[],
  message: string
): Promise<CommitResult> {
  const cfg = getGithubConfig();
  if (!cfg) throw new Error("GitHub token is not configured");

  const base = `/repos/${cfg.owner}/${cfg.repo}`;

  const ref = await gh<{ object: { sha: string } }>(
    cfg,
    `${base}/git/ref/heads/${cfg.branch}`
  );
  const latestCommitSha = ref.object.sha;

  const baseCommit = await gh<{ tree: { sha: string } }>(
    cfg,
    `${base}/git/commits/${latestCommitSha}`
  );

  const treeEntries = await Promise.all(
    files.map(async (file) => {
      const blob = await gh<{ sha: string }>(cfg, `${base}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
      });
      return {
        path: toRepoPath(file.localPath),
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      };
    })
  );

  const tree = await gh<{ sha: string }>(cfg, `${base}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: treeEntries,
    }),
  });

  const commit = await gh<{ sha: string; html_url: string }>(
    cfg,
    `${base}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [latestCommitSha],
      }),
    }
  );

  await gh(cfg, `${base}/git/refs/heads/${cfg.branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return { commitUrl: commit.html_url, sha: commit.sha };
}
