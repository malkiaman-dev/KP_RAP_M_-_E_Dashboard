import type { HhGirlsMetrics } from "./hh-girls-metrics";

export function stripHhGirlsExportLists(metrics: HhGirlsMetrics): HhGirlsMetrics {
  const revisitLists = { ...metrics.revisitDetail.lists };
  for (const key of Object.keys(revisitLists) as Array<
    keyof HhGirlsMetrics["revisitDetail"]["lists"]
  >) {
    revisitLists[key] = [];
  }

  const duplicateLists = { ...metrics.duplicateDetail.lists };
  for (const key of Object.keys(duplicateLists) as Array<
    keyof HhGirlsMetrics["duplicateDetail"]["lists"]
  >) {
    duplicateLists[key] = [];
  }

  const coreKpiLists = { ...metrics.coreKpiLists };
  for (const key of Object.keys(coreKpiLists) as Array<
    keyof HhGirlsMetrics["coreKpiLists"]
  >) {
    coreKpiLists[key] = [];
  }

  return {
    ...metrics,
    revisitDetail: {
      ...metrics.revisitDetail,
      lists: revisitLists,
    },
    duplicateDetail: {
      ...metrics.duplicateDetail,
      lists: duplicateLists,
    },
    coreKpiLists,
  };
}

export function mergeHhGirlsExportLists(
  metrics: HhGirlsMetrics,
  exports: {
    revisitLists: HhGirlsMetrics["revisitDetail"]["lists"];
    duplicateLists: HhGirlsMetrics["duplicateDetail"]["lists"];
    coreKpiLists: HhGirlsMetrics["coreKpiLists"];
  }
): HhGirlsMetrics {
  return {
    ...metrics,
    revisitDetail: {
      ...metrics.revisitDetail,
      lists: exports.revisitLists,
    },
    duplicateDetail: {
      ...metrics.duplicateDetail,
      lists: exports.duplicateLists,
    },
    coreKpiLists: exports.coreKpiLists,
  };
}
