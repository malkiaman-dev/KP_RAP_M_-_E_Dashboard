"use client";

import { Fragment, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Download,
  Search,
  ShieldAlert,
  Flag,
} from "lucide-react";
import { cn, formatDisplayDate } from "@/lib/utils";
import {
  buildErrorTitleOptions,
  type ErrorMetrics,
  type ErrorRow,
} from "@/lib/data/error-metrics";
import {
  parseErrorValueParts,
  stripContextFromValue,
} from "@/lib/data/error-value-parse";
import { downloadErrorReportExcel } from "@/lib/export/error-report-excel";
import { FilterSelect } from "@/components/ui/filter-select";

const PAGE_SIZE = 50;

function rowKey(e: ErrorRow, index: number): string {
  return `${e.recordKey}-${e.ruleId}-${e.field}-${index}`;
}

function displayOrDash(value?: string): string {
  const v = (value || "").trim();
  return v && v !== "-" ? v : "—";
}

function displayDateOnly(value?: string): string {
  const formatted = formatDisplayDate((value || "").trim());
  return formatted || "—";
}

function contextFields(e: ErrorRow): {
  girlName: string;
  village: string;
  school: string;
  valueEntered: string;
} {
  const parts = parseErrorValueParts(e.value);
  return {
    girlName: e.girlName || parts.girl_name || parts.girlname || "",
    village: e.villageName || parts.village || "",
    school: e.schoolName || parts.school || "",
    valueEntered: stripContextFromValue(e.value) || e.value || "",
  };
}

export function ErrorTable({
  metrics,
  loading,
}: {
  metrics?: ErrorMetrics;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [titleFilter, setTitleFilter] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const titleOptions = useMemo(
    () => [
      { value: "all", label: "All titles" },
      ...buildErrorTitleOptions(metrics?.allErrors ?? []),
    ],
    [metrics?.allErrors]
  );

  const rows = useMemo(() => {
    let data = metrics?.allErrors ?? [];
    if (titleFilter !== "all") {
      data = data.filter((e) => (e.title || "").trim() === titleFilter);
    }
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.ruleId.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        e.enumeratorName.toLowerCase().includes(q) ||
        e.survey.toLowerCase().includes(q) ||
        e.district.toLowerCase().includes(q) ||
        e.recordKey.toLowerCase().includes(q) ||
        e.field.toLowerCase().includes(q) ||
        e.value.toLowerCase().includes(q) ||
        (e.girlName || "").toLowerCase().includes(q) ||
        (e.villageName || "").toLowerCase().includes(q) ||
        (e.schoolName || "").toLowerCase().includes(q)
    );
  }, [metrics, query, titleFilter]);

  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-muted/50" />;
  }

  if (!metrics) return null;

  const shown = rows.slice(0, visible);

  const handleDownload = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadErrorReportExcel(rows, `error-report-${date}.xlsx`);
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Error Detail Log
          </h3>
          <p className="text-xs text-muted-foreground">
            Showing {Math.min(visible, rows.length).toLocaleString()} of{" "}
            {rows.length.toLocaleString()} issues
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52 sm:w-64">
            <FilterSelect
              value={titleFilter}
              options={titleOptions}
              onChange={(value) => {
                setTitleFilter(value);
                setVisible(PAGE_SIZE);
              }}
              aria-label="Filter by error title"
            />
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Search records..."
              className="h-9 w-48 rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-teal/40 sm:w-64"
            />
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="w-10 px-5 py-3" />
              <th className="px-5 py-3">Enumerator</th>
              <th className="px-5 py-3">District</th>
              <th className="px-5 py-3">Rule</th>
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">Survey</th>
              <th className="px-5 py-3">Severity</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e: ErrorRow, i) => {
              const key = rowKey(e, i);
              const isOpen = Boolean(expanded[key]);
              const ctx = contextFields(e);
              return (
                <Fragment key={key}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i, 20) * 0.02 }}
                    className="border-b border-border/40 align-top transition-colors hover:bg-muted/30"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(key)}
                        aria-expanded={isOpen}
                        aria-label={
                          isOpen ? "Hide error details" : "Show error details"
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isOpen && "rotate-180"
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </td>
                    <td className="max-w-[140px] truncate px-5 py-3.5 text-sm text-muted-foreground">
                      {displayOrDash(e.enumeratorName)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {displayOrDash(e.district)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {e.ruleId}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-foreground">
                        {e.title}
                      </p>
                      <p className="mt-0.5 max-w-md text-[10px] text-muted-foreground">
                        {e.message}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          e.survey === "Tracking" && "bg-teal/10 text-teal",
                          e.survey === "Household" &&
                            "bg-deep-teal/10 text-deep-teal",
                          e.survey === "Girls" &&
                            "bg-gold/15 text-amber-700 dark:text-gold",
                          !["Tracking", "Household", "Girls"].includes(
                            e.survey
                          ) && "bg-muted text-muted-foreground"
                        )}
                      >
                        {e.survey || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <SeverityBadge severity={e.severity} />
                    </td>
                  </motion.tr>
                  {isOpen && (
                    <tr className="bg-muted/20">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                          <Detail
                            label="Girl name"
                            value={displayOrDash(ctx.girlName)}
                          />
                          <Detail
                            label="Village"
                            value={displayOrDash(ctx.village)}
                          />
                          <Detail
                            label="School"
                            value={displayOrDash(ctx.school)}
                          />
                          <Detail
                            label="Value entered"
                            value={displayOrDash(ctx.valueEntered)}
                          />
                          <Detail
                            label="Field"
                            value={displayOrDash(e.field)}
                          />
                          <Detail
                            label="Form ID"
                            value={displayOrDash(e.recordKey)}
                          />
                          <Detail
                            label="Submission date"
                            value={displayDateOnly(e.submissionDate)}
                          />
                        </div>
                        {e.message ? (
                          <div className="mt-3 text-xs">
                            <span className="text-muted-foreground">
                              Full message:{" "}
                            </span>
                            <span className="font-medium text-foreground">
                              {e.message}
                            </span>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-sm text-muted-foreground"
                >
                  No errors match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {visible < rows.length && (
        <div className="flex items-center justify-center border-t border-border/60 px-5 py-4">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Load more ({(rows.length - visible).toLocaleString()} remaining)
          </button>
        </div>
      )}
    </motion.div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-all font-medium text-foreground">{value}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: ErrorRow["severity"] }) {
  if (severity === "CRITICAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600">
        <ShieldAlert className="h-3 w-3" />
        Critical
      </span>
    );
  }
  if (severity === "ANOMALY") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
        <Flag className="h-3 w-3" />
        Implausible
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-gold">
      <Flag className="h-3 w-3" />
      Quality
    </span>
  );
}
