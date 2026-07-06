"use client";

import { Fragment, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  ChevronDown,
} from "lucide-react";
import { cn, formatDisplayDate } from "@/lib/utils";
import { girlKey, resolveGirlName } from "@/lib/data/tracking-metrics";
import type { SurveyRow } from "@/lib/data/survey-metrics";

const districtNames: Record<string, string> = {
  "1": "D.I. Khan",
  "2": "Hangu",
  "3": "Lakki Marwat",
  "4": "Torghar",
};

const surveyLabels: Record<string, string> = {
  tracking: "Tracking",
  household: "Household",
  girls: "Girls",
};

const statusLabels: Record<string, { label: string; class: string }> = {
  "1": { label: "Complete", class: "bg-teal/10 text-teal" },
  "2": { label: "Incomplete", class: "bg-amber-500/10 text-amber-600" },
  "99": { label: "Other", class: "bg-red-500/10 text-red-500" },
};

interface DataTableProps {
  data: SurveyRow[];
  loading?: boolean;
}

export function DataTable({ data, loading }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const columns = useMemo<ColumnDef<SurveyRow>[]>(
    () => [
      {
        id: "expand",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() =>
              setExpanded((prev) => ({
                ...prev,
                [row.id]: !prev[row.id],
              }))
            }
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Expand row"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded[row.id] && "rotate-180"
              )}
            />
          </button>
        ),
        size: 40,
      },
      {
        accessorKey: "SubmissionDate",
        header: ({ column }) => (
          <SortHeader column={column} label="Date" />
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground">
            {formatDisplayDate(String(getValue() || "")) || "-"}
          </span>
        ),
      },
      {
        accessorKey: "survey_type",
        header: "Survey",
        cell: ({ getValue }) => {
          const v = String(getValue());
          return (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                v === "tracking" && "bg-teal/10 text-teal",
                v === "household" && "bg-deep-teal/10 text-deep-teal",
                v === "girls" && "bg-gold/15 text-amber-700 dark:text-gold"
              )}
            >
              {surveyLabels[v] || v}
            </span>
          );
        },
      },
      {
        id: "beneficiary",
        accessorFn: (row) => resolveGirlName(row),
        header: ({ column }) => (
          <SortHeader column={column} label="Beneficiary" />
        ),
        cell: ({ row }) => {
          const name = resolveGirlName(row.original);
          return (
            <div>
              <p className="text-sm font-medium text-foreground">
                {name || "-"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {girlKey(row.original) || row.original.girl || row.original.girl_id || ""}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "district",
        header: "District",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {districtNames[String(getValue())] || String(getValue() || "-")}
          </span>
        ),
      },
      {
        accessorKey: "enumerator_name",
        header: "Enumerator",
        cell: ({ getValue }) => (
          <span className="max-w-[140px] truncate text-sm text-muted-foreground">
            {String(getValue() || "-").replace(/\(.*\)/, "").trim()}
          </span>
        ),
      },
      {
        accessorKey: "survey_status",
        header: "Status",
        cell: ({ getValue }) => {
          const v = String(getValue() || "");
          const s = statusLabels[v] || {
            label: v || "-",
            class: "bg-muted text-muted-foreground",
          };
          return (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                s.class
              )}
            >
              {s.label}
            </span>
          );
        },
      },
    ],
    [expanded]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (loading) {
    return (
      <div className="h-96 animate-pulse rounded-2xl bg-muted/50" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Recent Submissions
          </h3>
          <p className="text-xs text-muted-foreground">
            {table.getFilteredRowModel().rows.length} records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search records..."
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm sm:w-56"
              aria-label="Search table"
            />
          </div>
          <button
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
            aria-label="Export data"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left" role="table">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border/60">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <Fragment key={row.id}>
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/40 transition-colors hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </motion.tr>
                {expanded[row.id] && (
                  <tr key={`${row.id}-expanded`} className="bg-muted/20">
                    <td colSpan={columns.length} className="px-5 py-4">
                      <div className="grid gap-2 text-xs sm:grid-cols-3">
                        <Detail label="Village" value={row.original.village_label || row.original.village} />
                        <Detail label="Attempt / Visit" value={row.original.attempt || row.original.visit_num} />
                        <Detail label="Record Key" value={row.original.KEY?.slice(0, 24) + "..."} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 px-5 py-4">
        <p className="text-xs text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SortHeader({
  column,
  label,
}: {
  column: { getToggleSortingHandler: () => unknown; getIsSorted: () => false | "asc" | "desc" };
  label: string;
}) {
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground"
      onClick={column.getToggleSortingHandler() as () => void}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium text-foreground">{value || "-"}</span>
    </div>
  );
}
