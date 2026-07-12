import type { QueryClient } from "@tanstack/react-query";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import type { TrackingTargetGaps } from "@/lib/data/tracking-target-gaps-types";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";

export const TRACKING_METRICS_QUERY_KEY = ["tracking-metrics", "v2"] as const;
export const TRACKING_EXPORTS_QUERY_KEY = ["tracking-exports"] as const;
export const TRACKING_GAPS_QUERY_KEY = ["tracking-gaps"] as const;
export const DASHBOARD_METRICS_QUERY_KEY = ["dashboard-metrics"] as const;
export const HH_GIRLS_METRICS_QUERY_KEY = ["hh-girls-metrics", "v9"] as const;
export const HH_GIRLS_EXPORTS_QUERY_KEY = ["hh-girls-exports", "v2"] as const;

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

export async function fetchTrackingGaps(): Promise<TrackingTargetGaps> {
  const res = await fetch("/api/tracking/gaps");
  if (!res.ok) throw new Error("Failed to load tracking target gaps");
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
  missingLists: HhGirlsMetrics["missingDetail"]["lists"];
  duplicateLists: HhGirlsMetrics["duplicateDetail"]["lists"];
  coreKpiLists: HhGirlsMetrics["coreKpiLists"];
}

export async function fetchHhGirlsExports(): Promise<HhGirlsExportPayload> {
  const res = await fetch("/api/hh-girls/exports");
  if (!res.ok) throw new Error("Failed to load HH/Girls export data");
  return res.json();
}

function idle(cb: () => void, fallbackMs = 1200) {
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(() => cb());
    return;
  }
  window.setTimeout(cb, fallbackMs);
}

/** Prefetch APIs needed for a specific tab (sidebar hover / warm start). */
export function prefetchRouteData(queryClient: QueryClient, href: string) {
  const warm = (
    queryKey: readonly unknown[],
    queryFn: () => Promise<unknown>
  ) => {
    void queryClient.prefetchQuery({
      queryKey: [...queryKey],
      queryFn,
      staleTime: QUERY_STALE_MS,
    });
  };

  if (href === "/" || href === "/analytics" || href === "/surveys") {
    warm(DASHBOARD_METRICS_QUERY_KEY, fetchDashboardMetrics);
  }

  if (href === "/analytics") {
    warm(TRACKING_METRICS_QUERY_KEY, fetchTrackingMetrics);
    warm(HH_GIRLS_METRICS_QUERY_KEY, fetchHhGirlsMetrics);
  }

  if (href === "/surveys/hh-girls") {
    warm(HH_GIRLS_METRICS_QUERY_KEY, fetchHhGirlsMetrics);
  }

  if (
    href === "/tracking" ||
    href === "/monitoring" ||
    href === "/reports"
  ) {
    warm(TRACKING_METRICS_QUERY_KEY, fetchTrackingMetrics);
  }

  if (href === "/monitoring") {
    idle(() => warm(HH_GIRLS_METRICS_QUERY_KEY, fetchHhGirlsMetrics));
  }
}

/**
 * Warm caches after shell mount. Prioritize the current route, then idle-warm
 * the other common tabs so switches feel instant.
 */
export function prefetchAppQueries(
  queryClient: QueryClient,
  pathname = "/"
) {
  prefetchRouteData(queryClient, pathname);

  idle(() => {
    if (pathname !== "/") {
      prefetchRouteData(queryClient, "/");
    }
    if (pathname !== "/tracking") {
      prefetchRouteData(queryClient, "/tracking");
    }
    if (pathname !== "/surveys/hh-girls") {
      prefetchRouteData(queryClient, "/surveys/hh-girls");
    }
  }, 1800);
}

export { QUERY_STALE_MS };
