import type { HhGirlsMetrics } from "./hh-girls-metrics";

export function stripHhGirlsExportLists(metrics: HhGirlsMetrics): HhGirlsMetrics {
  const revisitLists = { ...metrics.revisitDetail.lists };
  for (const key of Object.keys(revisitLists) as Array<
    keyof HhGirlsMetrics["revisitDetail"]["lists"]
  >) {
    revisitLists[key] = [];
  }

  const missingLists = { ...metrics.missingDetail.lists };
  for (const key of Object.keys(missingLists) as Array<
    keyof HhGirlsMetrics["missingDetail"]["lists"]
  >) {
    missingLists[key] = [];
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
    missingDetail: {
      ...metrics.missingDetail,
      lists: missingLists,
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
    missingLists: HhGirlsMetrics["missingDetail"]["lists"];
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
    missingDetail: {
      ...metrics.missingDetail,
      lists: exports.missingLists,
    },
    duplicateDetail: {
      ...metrics.duplicateDetail,
      lists: exports.duplicateLists,
    },
    coreKpiLists: exports.coreKpiLists,
  };
}
