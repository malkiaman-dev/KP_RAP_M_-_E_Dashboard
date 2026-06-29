"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  CloudUpload,
  FileClock,
  GitBranch,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PublishStatus {
  branch: string;
  pendingChanges: number;
  changedFiles: string[];
  ahead: number;
  lastCommit: { message: string; date: string } | null;
}

interface PublishResult {
  committed: boolean;
  pushed: boolean;
  message: string;
}

async function fetchPublishStatus(): Promise<PublishStatus> {
  const res = await fetch("/api/settings/publish");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to load publish status");
  }
  return res.json();
}

export function PublishPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["publish-status"],
    queryFn: fetchPublishStatus,
  });

  const [note, setNote] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setResult(null);
    setPublishError(null);

    try {
      const res = await fetch("/api/settings/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });

      const payload = await res.json();

      if (!res.ok) {
        setPublishError(payload.error ?? "Failed to publish changes");
        return;
      }

      setResult(payload as PublishResult);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["publish-status"] });
    } catch {
      setPublishError("Unable to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  const pending = (data?.pendingChanges ?? 0) + (data?.ahead ?? 0);
  const hasSomethingToPublish = pending > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <CloudUpload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Publish live</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Push your latest data and configuration changes to the live site.
              This commits the current changes and updates the hosted dashboard.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label="Refresh status"
          title="Refresh status"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking for changes…
          </div>
        ) : isError ? (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : "Failed to load status"}
          </div>
        ) : (
          data && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <GitBranch className="h-3.5 w-3.5" />
                  Branch
                </div>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {data.branch}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <FileClock className="h-3.5 w-3.5" />
                  Unpublished
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {pending} change{pending === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Last published
                </div>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {data.lastCommit?.date
                    ? formatDistanceToNow(new Date(data.lastCommit.date), {
                        addSuffix: true,
                      })
                    : "—"}
                </p>
              </div>
            </div>
          )
        )}

        {data && data.changedFiles.length > 0 && (
          <details className="rounded-xl border border-border bg-background px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              {data.changedFiles.length} file
              {data.changedFiles.length === 1 ? "" : "s"} changed
            </summary>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {data.changedFiles.map((file) => (
                <li key={file} className="truncate font-mono">
                  {file}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div>
          <label
            htmlFor="publish-note"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Note (optional)
          </label>
          <input
            id="publish-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Updated tracking survey data for week 24"
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {publishError && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {publishError}
          </p>
        )}

        {result && (
          <p className="rounded-lg bg-teal/10 px-3 py-2 text-sm text-teal">
            {result.message}
          </p>
        )}

        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing || isLoading || (!hasSomethingToPublish && !isError)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {publishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing…
            </>
          ) : (
            <>
              <CloudUpload className="h-4 w-4" />
              {hasSomethingToPublish ? "Publish live" : "Nothing to publish"}
            </>
          )}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          The live site updates automatically a few minutes after publishing.
        </p>
      </div>
    </motion.div>
  );
}
