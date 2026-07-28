import type { QueryClient } from "@tanstack/react-query";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import type { TrackingTargetGaps } from "@/lib/data/tracking-target-gaps-types";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";

export const TRACKING_METRICS_QUERY_KEY = ["tracking-metrics", "v4-fast"] as const;
export const TRACKING_EXPORTS_QUERY_KEY = ["tracking-exports"] as const;
export const TRACKING_GAPS_QUERY_KEY = ["tracking-gaps", "v4"] as const;
export const DASHBOARD_METRICS_QUERY_KEY = ["dashboard-metrics", "v2"] as const;
export const HH_GIRLS_METRICS_QUERY_KEY = ["hh-girls-metrics", "v9"] as const;
export const HH_GIRLS_EXPORTS_QUERY_KEY = ["hh-girls-exports", "v2"] as const;
export const ERROR_METRICS_QUERY_KEY = ["error-metrics", "v2"] as const;

export interface TrackingExportPayload {
  operationalKpiLists: TrackingMetrics["operationalKpiLists"];
  revisitLists: TrackingMetrics["revisitDetail"]["lists"];
  duplicateLists: TrackingMetrics["duplicateDetail"]["lists"];
}

/** Keep tab data warm longer so switching tabs does not refetch. */
const QUERY_STALE_MS = 15 * 60 * 1000;

export async function fetchTrackingMetrics(): Promise<TrackingMetrics> {
  const res = await fetch("/api/tracking");
  if (!res.ok) throw new Error("Failed to load tracking data");
  return res.json();
}

export async function fetchTrackingExports(): Promise<TrackingExportPayload> {
  const res = await fetch("/api/tracking-exports");
  if (!res.ok) throw new Error("Failed to load tracking export data");
  return res.json();
}

export async function fetchTrackingGaps(): Promise<TrackingTargetGaps> {
  const res = await fetch("/api/tracking-gaps");
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

export async function fetchErrorMetrics(): Promise<
  import("@/lib/data/error-metrics").ErrorMetrics
> {
  const res = await fetch("/api/errors");
  if (!res.ok) throw new Error("Failed to load error log");
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
    globalThis.requestIdleCallback(() => cb(), { timeout: fallbackMs + 2000 });
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
    warm(TRACKING_GAPS_QUERY_KEY, fetchTrackingGaps);
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
    warm(TRACKING_GAPS_QUERY_KEY, fetchTrackingGaps);
  }

  if (href === "/reports") {
    idle(() => warm(ERROR_METRICS_QUERY_KEY, fetchErrorMetrics), 2500);
    idle(() => warm(HH_GIRLS_METRICS_QUERY_KEY, fetchHhGirlsMetrics), 3000);
  }

  if (href === "/monitoring") {
    idle(() => warm(HH_GIRLS_METRICS_QUERY_KEY, fetchHhGirlsMetrics), 2500);
  }
}

/**
 * Warm caches after shell mount. Prioritize the current route, then idle-warm
 * other common tabs so switches feel instant without fighting the first paint.
 */
export function prefetchAppQueries(
  queryClient: QueryClient,
  pathname = "/"
) {
  prefetchRouteData(queryClient, pathname);

  // Stagger background warm-ups so they do not compete with the active tab.
  idle(() => {
    if (pathname !== "/") {
      prefetchRouteData(queryClient, "/");
    }
  }, 2500);

  idle(() => {
    if (pathname !== "/tracking") {
      prefetchRouteData(queryClient, "/tracking");
    }
  }, 4000);

  idle(() => {
    if (pathname !== "/surveys/hh-girls") {
      prefetchRouteData(queryClient, "/surveys/hh-girls");
    }
  }, 5500);

  idle(() => {
    if (pathname !== "/analytics") {
      prefetchRouteData(queryClient, "/analytics");
    }
  }, 7000);
}

export { QUERY_STALE_MS };
