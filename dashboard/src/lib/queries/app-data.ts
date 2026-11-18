import type { QueryClient } from "@tanstack/react-query";
import type { DashboardMetrics } from "@/lib/data/survey-metrics";
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import type { TrackingTargetGaps } from "@/lib/data/tracking-target-gaps-types";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";
import type { TrackedGirlsByDistrict } from "@/lib/data/tracking-loader";

export const TRACKING_METRICS_QUERY_KEY = ["tracking-metrics", "v5-dates"] as const;
export const TRACKING_EXPORTS_QUERY_KEY = ["tracking-exports"] as const;
export const TRACKING_GAPS_QUERY_KEY = ["tracking-gaps", "v5"] as const;
export const TRACKING_DISTRICT_TARGETS_QUERY_KEY = ["tracking-district-targets", "v1"] as const;
export const DASHBOARD_METRICS_QUERY_KEY = ["dashboard-metrics", "v5-slim"] as const;
export const HH_GIRLS_METRICS_QUERY_KEY = ["hh-girls-metrics", "v10-dates"] as const;
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

/** Successfully tracked girls per district (HH / Girls district targets). */
export async function fetchTrackingDistrictTargets(): Promise<TrackedGirlsByDistrict[]> {
  const res = await fetch("/api/tracking-district-targets");
  if (!res.ok) throw new Error("Failed to load district targets");
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

/** Prefetch the selected tab's default view on sidebar hover or focus. */
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
    if (href === "/tracking") warm(TRACKING_GAPS_QUERY_KEY, fetchTrackingGaps);
  }

  if (
    href === "/surveys/errors" ||
    href === "/field" ||
    href === "/field/analytics"
  ) {
    warm(ERROR_METRICS_QUERY_KEY, fetchErrorMetrics);
  }

  if (href === "/surveys") {
    warm(ERROR_METRICS_QUERY_KEY, fetchErrorMetrics);
  }
}

export { QUERY_STALE_MS };
