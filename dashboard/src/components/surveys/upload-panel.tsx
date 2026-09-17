"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ServerOff,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ERROR_METRICS_QUERY_KEY } from "@/lib/queries/app-data";
import { cn } from "@/lib/utils";

interface SurveyFileStatus {
  key: string;
  label: string;
  filename: string;
  exists: boolean;
  size: number;
  updatedAt: string | null;
}

const TARGET_DESCRIPTIONS: Record<string, string> = {
  tracking_baseline: "Listed-girl tracking survey, baseline sample export.",
  tracking_new_sample: "Listed-girl tracking survey, new sample export.",
  household: "Household parent interview export.",
  girls: "Direct girl survey export.",
};

/** Mirrors DqaModule from lib/data/dqa-runner without importing that server-only module client-side. */
type DqaModuleKey = "tracking" | "household" | "girls";

interface ModuleOption {
  key: "tracking" | "hh_girls";
  label: string;
  description: string;
  modules: DqaModuleKey[];
}

const MODULE_OPTIONS: ModuleOption[] = [
  {
    key: "tracking",
    label: "Tracking (Baseline + New Sample)",
    description: "Listed-girl tracking checks.",
    modules: ["tracking"],
  },
  {
    key: "hh_girls",
    label: "HH / Girls (Household + Girls)",
    description: "Household and Girls survey checks.",
    modules: ["household", "girls"],
  },
];

const FILE_STATUS_QUERY_KEY = ["survey-file-status"] as const;

async function fetchFileStatuses(): Promise<SurveyFileStatus[]> {
  const res = await fetch("/api/surveys/upload");
  if (!res.ok) throw new Error("Failed to load survey file status");
  const data = await res.json();
  return data.files as SurveyFileStatus[];
}

const DQA_STATUS_QUERY_KEY = ["dqa-status"] as const;

async function fetchDqaAvailability(): Promise<boolean> {
  const res = await fetch("/api/surveys/generate-errors");
  if (!res.ok) return true; // fail open — let the generate button surface any real error
  const data = await res.json();
  return Boolean(data.pythonAvailable);
}

function formatSize(bytes: number): string {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Indeterminate progress indicator for the DQA run (no real % is available
 * from the server). The bar itself is a pure CSS/GPU animation (same
 * `tabProgress` keyframe as the top nav loading bar) so it stays smooth with
 * zero React re-renders; only the elapsed-seconds counter ticks in JS, and
 * only once a second.
 */
function GenerationProgress() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(
      () => setElapsedSeconds(Math.floor((Date.now() - start) / 1000)),
      1000
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
        <div className="h-full w-1/3 animate-[tabProgress_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-teal via-deep-teal to-teal" />
      </div>
      <p className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Running the DQA pipeline against the Surveys files…</span>
        <span className="tabular-nums">{elapsedSeconds}s</span>
      </p>
    </div>
  );
}

function UploadCard({
  file,
  onUploaded,
}: {
  file: SurveyFileStatus;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      form.set("target", file.key);
      form.set("file", selected);

      const res = await fetch("/api/surveys/upload", {
        method: "POST",
        body: form,
      });
      const payload = await res.json();

      if (!res.ok) {
        setError(payload.error ?? "Upload failed");
        return;
      }

      setSuccess(`Uploaded successfully — replaced with ${selected.name}`);
      onUploaded();
    } catch {
      setError("Unable to upload. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/10">
          <FileSpreadsheet className="h-5 w-5 text-teal" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{file.label}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {TARGET_DESCRIPTIONS[file.key]}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {file.exists ? (
          <>
            <span className="truncate font-mono">{file.filename}</span>
            <span className="flex shrink-0 items-center gap-1">
              <Clock className="h-3 w-3" />
              {file.updatedAt
                ? formatDistanceToNow(new Date(file.updatedAt), {
                    addSuffix: true,
                  })
                : "-"}
              {" · "}
              {formatSize(file.size)}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1 text-amber-600 dark:text-gold">
            <AlertTriangle className="h-3 w-3" />
            No file uploaded yet
          </span>
        )}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </motion.p>
      )}
      {success && !error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-start gap-1.5 rounded-lg bg-teal/10 px-3 py-2 text-xs font-medium text-teal"
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {success}
        </motion.p>
      )}

      <label className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-semibold text-foreground transition-colors hover:border-teal/40 hover:bg-teal/5 hover:text-teal">
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <UploadCloud className="h-4 w-4" />
            {file.exists ? "Replace file" : "Upload file"}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          disabled={uploading}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}

export function UploadPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [...FILE_STATUS_QUERY_KEY],
    queryFn: fetchFileStatuses,
  });

  const { data: pythonAvailable, isLoading: isCheckingDqa } = useQuery({
    queryKey: [...DQA_STATUS_QUERY_KEY],
    queryFn: fetchDqaAvailability,
    staleTime: 60_000,
  });
  const dqaUnavailable = pythonAvailable === false;

  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<ModuleOption["key"], boolean>
  >({ tracking: true, hh_girls: true });

  const selectedModules = MODULE_OPTIONS.filter(
    (opt) => selectedOptions[opt.key]
  ).flatMap((opt) => opt.modules);

  function toggleOption(key: ModuleOption["key"]) {
    setSelectedOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // A new survey file can change every downstream metric (dashboard, tracking,
  // HH/Girls, errors), so invalidate the whole cache in one pass rather than
  // listing each query key. Only currently-mounted queries actually refetch;
  // everything else just refreshes next time its tab is opened.
  function refreshAllSurveyData() {
    void refetch();
    void queryClient.invalidateQueries();
  }

  async function handleGenerateErrors() {
    if (selectedModules.length === 0) {
      setGenError("Select at least one survey type to check.");
      return;
    }

    setGenerating(true);
    setGenResult(null);
    setGenError(null);

    try {
      const res = await fetch("/api/surveys/generate-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: selectedModules }),
      });
      const payload = await res.json();

      if (!res.ok || !payload.ok) {
        setGenError(payload.message ?? "Failed to generate error log");
        return;
      }

      setGenResult(
        payload.message ?? "Error log regenerated successfully."
      );
      void queryClient.invalidateQueries({
        queryKey: [...ERROR_METRICS_QUERY_KEY],
      });
    } catch {
      setGenError("Unable to reach the server. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-teal/[0.05] p-6 shadow-sm dark:to-teal/[0.08]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal/10">
              <UploadCloud className="h-6 w-6 text-teal" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Survey data uploads
              </h2>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Replace the daily SurveyCTO exports the dashboard reads from.
                Every page (Tracking, HH/Girls, Analytics, Reports) refreshes
                automatically as soon as a file is saved.
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
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </button>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking current files…
            </div>
          ) : isError ? (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              Failed to load survey file status.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data?.map((file) => (
                <UploadCard
                  key={file.key}
                  file={file}
                  onUploaded={refreshAllSurveyData}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10">
            <Sparkles className="h-6 w-6 text-amber-600 dark:text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Generate error log
            </h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Runs the full DQA pipeline against the current Surveys files and
              rebuilds Daily_Error_Log.xlsx. The Error Report tab updates
              automatically once this completes.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {dqaUnavailable ? (
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              <ServerOff className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium text-foreground">
                  Not available on this deployment
                </p>
                <p className="mt-0.5">
                  Error log generation runs the Python DQA pipeline, which
                  isn&apos;t installed on this server. Generate
                  Daily_Error_Log.xlsx from an environment with Python (e.g. a
                  self-hosted instance) and it will appear on the Error Report
                  tab automatically.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Survey types to check
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {MODULE_OPTIONS.map((opt) => {
                    const checked = selectedOptions[opt.key];
                    return (
                      <label
                        key={opt.key}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                          checked
                            ? "border-teal/40 bg-teal/5"
                            : "border-border bg-background hover:bg-muted/40",
                          generating && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={generating}
                          onChange={() => toggleOption(opt.key)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-teal focus:ring-teal/30 disabled:cursor-not-allowed"
                        />
                        <span>
                          <span className="block text-sm font-medium text-foreground">
                            {opt.label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {opt.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Uncheck a survey type to skip it and finish faster — e.g.
                  skip Tracking while only HH/Girls is being collected.
                </p>
              </div>

              {generating && <GenerationProgress />}

              {genError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {genError}
                </motion.p>
              )}
              {genResult && !genError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 rounded-lg bg-teal/10 px-3 py-2 text-sm font-medium text-teal"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {genResult}
                </motion.p>
              )}

              <button
                type="button"
                onClick={handleGenerateErrors}
                disabled={generating || selectedModules.length === 0 || isCheckingDqa}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-6"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating error log…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {selectedModules.length === 0
                      ? "Select a survey type"
                      : "Generate error log"}
                  </>
                )}
              </button>

              <p className="text-xs text-muted-foreground">
                This can take a few minutes on full exports. Runs where
                Python/DQA_Script is available on the server.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
