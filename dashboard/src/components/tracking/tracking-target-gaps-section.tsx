"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ClipboardList,
  Download,
  MapPin,
  RefreshCw,
  UserX,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { FilterSelect } from "@/components/ui/filter-select";
import { cn } from "@/lib/utils";
import type { TrackingCohort } from "@/lib/data/tracking-metrics";
import type {
  TargetGapGirl,
  TrackingTargetGaps,
} from "@/lib/data/tracking-target-gaps-types";
import { downloadTargetGapExcel } from "@/lib/export/target-gap-excel";
import {
  fetchTrackingGaps,
  QUERY_STALE_MS,
  TRACKING_GAPS_QUERY_KEY,
} from "@/lib/queries/app-data";

function filterTargetGapGirls(
  girls: TargetGapGirl[],
  filters: {
    district?: string;
    cohort?: "all" | TrackingCohort;
  }
): TargetGapGirl[] {
  return girls.filter((g) => {
    if (
      filters.district &&
      filters.district !== "all" &&
      g.district !== filters.district
    ) {
      return false;
    }
    if (
      filters.cohort &&
      filters.cohort !== "all" &&
      g.cohort !== filters.cohort
    ) {
      return false;
    }
    return true;
  });
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadList(
  rows: TargetGapGirl[],
  label: string
) {
  if (!rows.length) return;
  const date = new Date().toISOString().slice(0, 10);
  downloadTargetGapExcel(rows, `outstanding-girls-${label}-${date}.xlsx`);
}

export function TrackingTargetGapsSection({
  districtFilter = "all",
  cohortFilter = "all",
}: {
  districtFilter?: string;
  cohortFilter?: "all" | TrackingCohort;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localDistrict, setLocalDistrict] = useState<string>("all");
  const [localCohort, setLocalCohort] = useState<"all" | TrackingCohort>("all");
  const [statusView, setStatusView] = useState<
    "actionable" | "not_attempted" | "needs_revisit"
  >("actionable");

  const { data, isLoading, isError } = useQuery({
    queryKey: [...TRACKING_GAPS_QUERY_KEY],
    queryFn: fetchTrackingGaps,
    staleTime: QUERY_STALE_MS,
    enabled: expanded,
  });

  // Prefer page-level filters when set; otherwise local controls.
  const effectiveDistrict =
    districtFilter && districtFilter !== "all"
      ? districtFilter
      : localDistrict;
  const effectiveCohort =
    cohortFilter && cohortFilter !== "all" ? cohortFilter : localCohort;

  const filtered = useMemo(() => {
    if (!data?.available) {
      return {
        actionable: [] as TargetGapGirl[],
        notAttempted: [] as TargetGapGirl[],
        needsRevisit: [] as TargetGapGirl[],
      };
    }
    const opts = {
      district: effectiveDistrict,
      cohort: effectiveCohort,
    };
    return {
      actionable: filterTargetGapGirls(data.actionableGirls, opts),
      notAttempted: filterTargetGapGirls(data.notAttemptedGirls, opts),
      needsRevisit: filterTargetGapGirls(data.needsRevisitGirls, opts),
    };
  }, [data, effectiveDistrict, effectiveCohort]);

  const viewRows =
    statusView === "not_attempted"
      ? filtered.notAttempted
      : statusView === "needs_revisit"
        ? filtered.needsRevisit
        : filtered.actionable;

  const districtOptions = useMemo(() => {
    if (!data?.byDistrict) return [{ value: "all", label: "All districts" }];
    return [
      { value: "all", label: "All districts" },
      ...data.byDistrict.map((d) => ({
        value: d.district,
        label: `${d.districtLabel} (${d.actionable})`,
      })),
    ];
  }, [data]);

  if (isError) {
    return (
      <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
        Could not load assignment-frame gap analysis. Check Tracking_Targets
        folder.
      </div>
    );
  }

  if (!isLoading && data && !data.available) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        Place Tracking_Survey_Baseline.xlsx and Tracking_Survey_NewSample.xlsx
        in the Tracking_Targets folder to enable outstanding-girl lists.
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assignment frame · outstanding girls
            </p>
            {!isLoading && data && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                {data.actionable.toLocaleString()} to share with districts
              </span>
            )}
            {!expanded && !data && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Click Show to load
              </span>
            )}
          </div>
          {expanded && (
            <p className="mt-1 max-w-2xl text-[11px] text-muted-foreground">
              Compares official target lists (Tracking_Targets) with survey
              submissions. Outstanding = not attempted + girls who still need a
              2nd/3rd revisit. Download Excel lists for each district team.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          aria-expanded={expanded}
        >
          <span>{expanded ? "Hide" : "Show"}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {isLoading || !data ? (
                  <StatCardSkeleton count={4} />
                ) : (
                  <>
                    <StatCard
                      muted
                      index={0}
                      label="Target girls"
                      value={data.targetTotal}
                      icon={ClipboardList}
                      color="text-deep-teal"
                      hint="Official assignment frame (baseline + new sample)"
                    />
                    <StatCard
                      muted
                      index={1}
                      label="Not attempted"
                      value={
                        effectiveDistrict !== "all" || effectiveCohort !== "all"
                          ? filtered.notAttempted.length
                          : data.notAttempted
                      }
                      icon={UserX}
                      color="text-rose-600"
                      hint="In targets, no survey submission yet"
                      onClick={
                        filtered.notAttempted.length
                          ? () =>
                              downloadList(
                                filtered.notAttempted,
                                `not-attempted-${slug(effectiveDistrict)}`
                              )
                          : undefined
                      }
                    />
                    <StatCard
                      muted
                      index={2}
                      label="Needs revisit"
                      value={
                        effectiveDistrict !== "all" || effectiveCohort !== "all"
                          ? filtered.needsRevisit.length
                          : data.needsRevisit
                      }
                      icon={RefreshCw}
                      color="text-amber-600"
                      hint="Attempted but still needs 2nd or 3rd visit"
                      onClick={
                        filtered.needsRevisit.length
                          ? () =>
                              downloadList(
                                filtered.needsRevisit,
                                `needs-revisit-${slug(effectiveDistrict)}`
                              )
                          : undefined
                      }
                    />
                    <StatCard
                      muted
                      index={3}
                      label="Outstanding (share)"
                      value={
                        effectiveDistrict !== "all" || effectiveCohort !== "all"
                          ? filtered.actionable.length
                          : data.actionable
                      }
                      icon={MapPin}
                      color="text-amber-700"
                      hint="Not attempted + needs revisit — click to download"
                      onClick={
                        filtered.actionable.length
                          ? () =>
                              downloadList(
                                filtered.actionable,
                                `all-outstanding-${slug(effectiveDistrict)}`
                              )
                          : undefined
                      }
                    />
                  </>
                )}
              </div>

              {!isLoading && data && (
                <>
                  <div className="flex flex-wrap items-end gap-3">
                    {(!districtFilter || districtFilter === "all") && (
                      <div className="min-w-[180px] flex-1">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          District
                        </p>
                        <FilterSelect
                          aria-label="District"
                          value={localDistrict}
                          onChange={setLocalDistrict}
                          options={districtOptions}
                        />
                      </div>
                    )}
                    {(!cohortFilter || cohortFilter === "all") && (
                      <div className="min-w-[160px] flex-1">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Cohort
                        </p>
                        <FilterSelect
                          aria-label="Cohort"
                          value={localCohort}
                          onChange={(v) =>
                            setLocalCohort(v as "all" | TrackingCohort)
                          }
                          options={[
                            { value: "all", label: "All cohorts" },
                            { value: "baseline", label: "Baseline" },
                            { value: "new-sample", label: "New sample" },
                          ]}
                        />
                      </div>
                    )}
                    <div className="min-w-[160px] flex-1">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        List
                      </p>
                      <FilterSelect
                        aria-label="List"
                        value={statusView}
                        onChange={(v) =>
                          setStatusView(
                            v as "actionable" | "not_attempted" | "needs_revisit"
                          )
                        }
                        options={[
                          {
                            value: "actionable",
                            label: `Outstanding (${filtered.actionable.length})`,
                          },
                          {
                            value: "not_attempted",
                            label: `Not attempted (${filtered.notAttempted.length})`,
                          },
                          {
                            value: "needs_revisit",
                            label: `Needs revisit (${filtered.needsRevisit.length})`,
                          },
                        ]}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!viewRows.length}
                      onClick={() =>
                        downloadList(
                          viewRows,
                          `${statusView}-${slug(effectiveDistrict)}-${effectiveCohort}`
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-teal px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Excel
                    </button>
                  </div>

                  <DistrictGapTable
                    data={data}
                    effectiveDistrict={effectiveDistrict}
                    onDownloadDistrict={(code, label) => {
                      const rows = filterTargetGapGirls(data.actionableGirls, {
                        district: code,
                        cohort: effectiveCohort,
                      });
                      downloadList(rows, `district-${slug(label)}`);
                    }}
                  />

                  <PreviewTable rows={viewRows} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DistrictGapTable({
  data,
  effectiveDistrict,
  onDownloadDistrict,
}: {
  data: TrackingTargetGaps;
  effectiveDistrict: string;
  onDownloadDistrict: (code: string, label: string) => void;
}) {
  const rows =
    effectiveDistrict === "all"
      ? data.byDistrict
      : data.byDistrict.filter((d) => d.district === effectiveDistrict);

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">District</th>
            <th className="px-3 py-2 font-semibold text-right">Target</th>
            <th className="px-3 py-2 font-semibold text-right">Tracked</th>
            <th className="px-3 py-2 font-semibold text-right">Not attempted</th>
            <th className="px-3 py-2 font-semibold text-right">Needs revisit</th>
            <th className="px-3 py-2 font-semibold text-right">Outstanding</th>
            <th className="px-3 py-2 font-semibold text-right">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr
              key={d.district}
              className="border-t border-border/40 hover:bg-muted/20"
            >
              <td className="px-3 py-2 font-medium">{d.districtLabel}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {d.targetTotal.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-teal">
                {d.tracked.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-rose-600">
                {d.notAttempted.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-amber-600">
                {d.needsRevisit.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold">
                {d.actionable.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  disabled={!d.actionable}
                  onClick={() => onDownloadDistrict(d.district, d.districtLabel)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-teal hover:bg-teal/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-3 w-3" />
                  Excel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewTable({ rows }: { rows: TargetGapGirl[] }) {
  const preview = rows.slice(0, 25);
  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
        No outstanding girls for this filter — all assigned girls are either
        tracked or closed without a pending revisit.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Preview ({preview.length} of {rows.length.toLocaleString()})
      </p>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">District</th>
              <th className="px-3 py-2 font-semibold">Village</th>
              <th className="px-3 py-2 font-semibold">Girl</th>
              <th className="px-3 py-2 font-semibold">Father</th>
              <th className="px-3 py-2 font-semibold">Contact</th>
              <th className="px-3 py-2 font-semibold">Cohort</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((g) => (
              <tr
                key={`${g.cohort}-${g.girlId}`}
                className="border-t border-border/40"
              >
                <td className="px-3 py-2">{g.districtLabel}</td>
                <td className="px-3 py-2">{g.village || "—"}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{g.girlName || "—"}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {g.girlId}
                  </span>
                </td>
                <td className="px-3 py-2">{g.fatherName || "—"}</td>
                <td className="px-3 py-2 tabular-nums">{g.contact || "—"}</td>
                <td className="px-3 py-2">
                  {g.cohort === "baseline" ? "Baseline" : "New sample"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      g.status === "not_attempted"
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                        : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    )}
                  >
                    {g.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
