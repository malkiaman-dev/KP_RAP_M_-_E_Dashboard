import type { HhGirlsMetrics } from "./hh-girls-metrics";

/** What the HH target progress is measured on. */
export type HhGirlsProgressBasis = "completed" | "attempted";

export const HH_GIRLS_PROGRESS_BASIS_LABELS: Record<HhGirlsProgressBasis, string> = {
  completed: "Completed households",
  attempted: "Attempted girls",
};

/**
 * Re-bases target progress (progress %, remaining to target, the progress bar
 * value and the progress export list) on completed households (default) or on
 * attempted girls (unique girls with any HH / Girls form).
 */
export function applyHhGirlsProgressBasis(
  metrics: HhGirlsMetrics,
  basis: HhGirlsProgressBasis
): HhGirlsMetrics {
  if (basis === "completed") return metrics;
  const base = metrics.core.uniqueGirls;
  const target = metrics.core.hhTarget;
  return {
    ...metrics,
    core: {
      ...metrics.core,
      progressBasis: basis,
      progressBase: base,
      progressToTarget: target > 0 ? (base / target) * 100 : 0,
      remainingToTarget: Math.max(0, target - base),
    },
    coreKpiLists: {
      ...metrics.coreKpiLists,
      progressToTarget: metrics.coreKpiLists.uniqueGirls,
    },
  };
}
