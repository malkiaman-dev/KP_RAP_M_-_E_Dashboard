import type { TrackingMetrics } from "./tracking-metrics";

/** Remove heavy Excel row arrays from the main API payload. Counts stay on metrics. */
export function stripTrackingExportLists(
  metrics: TrackingMetrics
): TrackingMetrics {
  const operationalKpiLists = { ...metrics.operationalKpiLists };
  for (const key of Object.keys(operationalKpiLists) as Array<
    keyof TrackingMetrics["operationalKpiLists"]
  >) {
    const entry = operationalKpiLists[key];
    operationalKpiLists[key] = {
      ...entry,
      rows: [],
    };
  }

  const revisitLists = { ...metrics.revisitDetail.lists };
  for (const key of Object.keys(revisitLists) as Array<
    keyof TrackingMetrics["revisitDetail"]["lists"]
  >) {
    revisitLists[key] = [];
  }

  const duplicateLists = { ...metrics.duplicateDetail.lists };
  for (const key of Object.keys(duplicateLists) as Array<
    keyof TrackingMetrics["duplicateDetail"]["lists"]
  >) {
    duplicateLists[key] = [];
  }

  return {
    ...metrics,
    operationalKpiLists,
    revisitDetail: {
      ...metrics.revisitDetail,
      lists: revisitLists,
    },
    duplicateDetail: {
      ...metrics.duplicateDetail,
      lists: duplicateLists,
    },
  };
}

export function mergeTrackingExportLists(
  metrics: TrackingMetrics,
  exports: {
    operationalKpiLists: TrackingMetrics["operationalKpiLists"];
    revisitLists: TrackingMetrics["revisitDetail"]["lists"];
    duplicateLists: TrackingMetrics["duplicateDetail"]["lists"];
  }
): TrackingMetrics {
  return {
    ...metrics,
    operationalKpiLists: exports.operationalKpiLists,
    revisitDetail: {
      ...metrics.revisitDetail,
      lists: exports.revisitLists,
    },
    duplicateDetail: {
      ...metrics.duplicateDetail,
      lists: exports.duplicateLists,
    },
  };
}
