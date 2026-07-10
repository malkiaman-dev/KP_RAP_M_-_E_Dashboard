import type { QueryClient } from "@tanstack/react-query";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";

export const TRACKING_METRICS_QUERY_KEY = ["tracking-metrics"] as const;
export const TRACKING_EXPORTS_QUERY_KEY = ["tracking-exports"] as const;
export const DASHBOARD_METRICS_QUERY_KEY = ["dashboard-metrics"] as const;
export const HH_GIRLS_METRICS_QUERY_KEY = ["hh-girls-metrics"] as const;
export const HH_GIRLS_EXPORTS_QUERY_KEY = ["hh-girls-exports"] as const;

export interface TrackingExportPayload {
  operationalKpiLists: TrackingMetrics["operationalKpiLists"];
  revisitLists: TrackingMetrics["revisitDetail"]["lists"];
  duplicateLists: TrackingMetrics["duplicateDetail"]["lists"];
}

const QUERY_STALE_MS = 5 * 60 * 1000;

export async function fetchTrackingMetrics(): Promise<TrackingMetrics> {
  const res = await fetch("/api/tracking");
  if (!res.ok) throw new Error("Failed to load tracking data");
  return res.json();
}

export async function fetchTrackingExports(): Promise<TrackingExportPayload> {
  const res = await fetch("/api/tracking/exports");
  if (!res.ok) throw new Error("Failed to load tracking export data");
  return res.json();
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch("/api/metrics");
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export async function fetchHhGirlsMetrics(): Promise<HhGirlsMetrics> {
  const res = await fetch("/api/hh-girls");
  if (!res.ok) throw new Error("Failed to load HH/Girls data");
  return res.json();
}

export interface HhGirlsExportPayload {
  revisitLists: HhGirlsMetrics["revisitDetail"]["lists"];
  duplicateLists: HhGirlsMetrics["duplicateDetail"]["lists"];
  coreKpiLists: HhGirlsMetrics["coreKpiLists"];
}

export async function fetchHhGirlsExports(): Promise<HhGirlsExportPayload> {
  const res = await fetch("/api/hh-girls/exports");
  if (!res.ok) throw new Error("Failed to load HH/Girls export data");
  return res.json();
}

export function prefetchAppQueries(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: [...TRACKING_METRICS_QUERY_KEY],
    queryFn: fetchTrackingMetrics,
    staleTime: QUERY_STALE_MS,
  });
  // Defer dashboard metrics so they do not compete with tracking on cold start
  // (Node is single-threaded; parallel heavy computes serialize wall-clock).
  const schedule =
    typeof globalThis.requestIdleCallback === "function"
      ? globalThis.requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 2500);
  schedule(() => {
    void queryClient.prefetchQuery({
      queryKey: [...DASHBOARD_METRICS_QUERY_KEY],
      queryFn: fetchDashboardMetrics,
      staleTime: QUERY_STALE_MS,
    });
  });
}

export { QUERY_STALE_MS };
