import type { TrackingCohort } from "./tracking-metrics";
import type {
  TargetGapCohortDistrictSummary,
  TargetGapDistrictSummary,
  TargetGapGirl,
  TrackingTargetGaps,
} from "./tracking-target-gaps-types";

function matchesDistrict(
  code: string,
  label: string,
  needle: string
): boolean {
  const n = needle.trim().toLowerCase();
  const c = code.trim().toLowerCase();
  const l = label.trim().toLowerCase();
  const labelCompact = l.replace(/\./g, "").replace(/\s+/g, "");
  const needleCompact = n.replace(/\./g, "").replace(/\s+/g, "");
  return (
    c === n ||
    l === n ||
    labelCompact === needleCompact ||
    l.includes(n) ||
    n.includes(labelCompact)
  );
}

function sumCohortDistrictRows(
  rows: TargetGapCohortDistrictSummary[] | TargetGapDistrictSummary[]
) {
  return rows.reduce(
    (acc, row) => {
      acc.notAttempted += row.notAttempted;
      acc.attemptedNotTracked += row.attemptedNotTracked;
      acc.needsRevisit += row.needsRevisit;
      acc.actionable += row.actionable;
      acc.tracked += row.tracked;
      acc.targetTotal += row.targetTotal;
      return acc;
    },
    {
      notAttempted: 0,
      attemptedNotTracked: 0,
      needsRevisit: 0,
      actionable: 0,
      tracked: 0,
      targetTotal: 0,
    }
  );
}

/** Filter assignment-frame girls by the same district/cohort controls as Tracking. */
export function filterTargetGapGirls(
  girls: TargetGapGirl[],
  filters: {
    district?: string;
    cohort?: "all" | TrackingCohort;
  }
): TargetGapGirl[] {
  return girls.filter((g) => {
    if (filters.district && filters.district !== "all") {
      if (!matchesDistrict(g.district, g.districtLabel, filters.district)) {
        return false;
      }
    }
    if (
      filters.cohort &&
      filters.cohort !== "all" &&
      g.cohort !== filters.cohort
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Assignment-frame counts for the active filters.
 * Same source as Outstanding for districts (Tracking_Targets × survey match).
 * Prefers byCohortDistrict aggregates so the API can omit trackedGirls.
 */
export function assignmentFrameCounts(
  gaps: TrackingTargetGaps | undefined,
  filters: {
    district?: string;
    cohort?: "all" | TrackingCohort;
  } = {}
): {
  notAttempted: number;
  attemptedNotTracked: number;
  needsRevisit: number;
  actionable: number;
  tracked: number;
  targetTotal: number;
} | null {
  if (!gaps?.available) return null;

  const districtAll = !filters.district || filters.district === "all";
  const cohortAll = !filters.cohort || filters.cohort === "all";

  if (districtAll && cohortAll) {
    return {
      notAttempted: gaps.notAttempted,
      attemptedNotTracked: gaps.attemptedNotTracked,
      needsRevisit: gaps.needsRevisit,
      actionable: gaps.actionable,
      tracked: gaps.tracked,
      targetTotal: gaps.targetTotal,
    };
  }

  // Prefer pre-aggregated cohort×district (no need to ship trackedGirls).
  if (gaps.byCohortDistrict?.length) {
    const rows = gaps.byCohortDistrict.filter((row) => {
      if (
        !cohortAll &&
        filters.cohort &&
        row.cohort !== filters.cohort
      ) {
        return false;
      }
      if (!districtAll && filters.district) {
        return matchesDistrict(
          row.district,
          row.districtLabel,
          filters.district
        );
      }
      return true;
    });
    return sumCohortDistrictRows(rows);
  }

  // Legacy fallback when girl lists are present (scripts / full compute).
  const notAttempted = filterTargetGapGirls(gaps.notAttemptedGirls, filters);
  const needsRevisit = filterTargetGapGirls(gaps.needsRevisitGirls, filters);
  const attemptedNotTracked = filterTargetGapGirls(
    gaps.attemptedNotTrackedGirls,
    filters
  );
  const tracked = filterTargetGapGirls(gaps.trackedGirls ?? [], filters);
  const actionable = filterTargetGapGirls(gaps.actionableGirls, filters);

  return {
    notAttempted: notAttempted.length,
    attemptedNotTracked: attemptedNotTracked.length,
    needsRevisit: needsRevisit.length,
    actionable: actionable.length,
    tracked: tracked.length,
    targetTotal:
      notAttempted.length +
      needsRevisit.length +
      attemptedNotTracked.length +
      tracked.length,
  };
}

export type AssignmentFrameCounts = NonNullable<
  ReturnType<typeof assignmentFrameCounts>
>;

function remainingOf(frame: AssignmentFrameCounts): number {
  return (
    frame.notAttempted + frame.attemptedNotTracked + frame.needsRevisit
  );
}

/** Per-district tallies from framed girls (respects cohort + district filters). */
export function frameDistrictSummaries(
  gaps: TrackingTargetGaps | undefined,
  filters: {
    district?: string;
    cohort?: "all" | TrackingCohort;
  } = {}
): TargetGapDistrictSummary[] {
  if (!gaps?.available) return [];

  const cohortAll = !filters.cohort || filters.cohort === "all";
  const districtAll = !filters.district || filters.district === "all";

  if (cohortAll) {
    return gaps.byDistrict.filter((d) => {
      if (districtAll) return true;
      return matchesDistrict(d.district, d.districtLabel, filters.district!);
    });
  }

  if (gaps.byCohortDistrict?.length) {
    return gaps.byCohortDistrict
      .filter((row) => {
        if (row.cohort !== filters.cohort) return false;
        if (!districtAll && filters.district) {
          return matchesDistrict(
            row.district,
            row.districtLabel,
            filters.district
          );
        }
        return true;
      })
      .map(({ cohort: _c, ...district }) => district);
  }

  const girls = [
    ...filterTargetGapGirls(gaps.trackedGirls ?? [], filters),
    ...filterTargetGapGirls(gaps.notAttemptedGirls, filters),
    ...filterTargetGapGirls(gaps.needsRevisitGirls, filters),
    ...filterTargetGapGirls(gaps.attemptedNotTrackedGirls, filters),
  ];

  const byCode = new Map<string, TargetGapGirl[]>();
  for (const g of girls) {
    const list = byCode.get(g.district) ?? [];
    list.push(g);
    byCode.set(g.district, list);
  }

  return [...byCode.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, rows]) => {
      const notAttempted = rows.filter((g) => g.status === "not_attempted").length;
      const needsRevisit = rows.filter(
        (g) =>
          g.status === "needs_revisit_2nd" || g.status === "needs_revisit_3rd"
      ).length;
      const attemptedNotTracked = rows.filter(
        (g) => g.status === "attempted_not_tracked"
      ).length;
      const tracked = rows.filter((g) => g.status === "tracked").length;
      return {
        district: code,
        districtLabel: rows[0]?.districtLabel || code,
        targetTotal: rows.length,
        tracked,
        notAttempted,
        needsRevisit,
        attemptedNotTracked,
        actionable: notAttempted + needsRevisit,
      };
    });
}

function applyCohortFrame<
  C extends {
    assignmentTarget: number;
    successTarget: number;
    totalTrackedGirls: number;
    remainingToSuccessTarget: number;
    successRate: number;
    uniqueGirlsAttempted: number;
    assignmentCoverage: number;
    untrackedInData: number;
    districtBreakdown: {
      district: string;
      label: string;
      tracked: number;
      inData: number;
    }[];
  },
>(cohort: C, frame: AssignmentFrameCounts | null, districtRows: TargetGapDistrictSummary[]): C {
  if (!frame) return cohort;
  const rem = remainingOf(frame);
  const attempted = frame.targetTotal - frame.notAttempted;
  return {
    ...cohort,
    assignmentTarget: frame.targetTotal,
    successTarget: frame.targetTotal,
    totalTrackedGirls: frame.tracked,
    remainingToSuccessTarget: rem,
    uniqueGirlsAttempted: attempted,
    untrackedInData: rem,
    assignmentCoverage:
      frame.targetTotal > 0 ? (attempted / frame.targetTotal) * 100 : 0,
    successRate:
      frame.targetTotal > 0 ? (frame.tracked / frame.targetTotal) * 100 : 0,
    districtBreakdown: districtRows.map((d) => ({
      district: d.district,
      label: d.districtLabel,
      tracked: d.tracked,
      inData: d.targetTotal - d.notAttempted,
    })),
  };
}

/** Overlay protocol/survey KPIs with verified Tracking_Targets Excel frame counts. */
export function overlayMetricsWithAssignmentFrame<
  T extends {
    assignmentPool: number;
    successTarget: number;
    girlsToTrack: number;
    totalTrackedGirls: number;
    remainingToSuccessTarget: number;
    totalUntrackedGirls: number;
    untrackedInData: number;
    successRate: number;
    trackingRate: number;
    secondaryKpis: {
      uniqueGirlsAttempted: number;
      trackedGirls: number;
      attemptedNotTracked: number;
      successRate: number;
      dataCoverageRate: number;
    };
    cohorts: {
      baseline: {
        assignmentTarget: number;
        successTarget: number;
        totalTrackedGirls: number;
        remainingToSuccessTarget: number;
        successRate: number;
        uniqueGirlsAttempted: number;
        assignmentCoverage: number;
        untrackedInData: number;
        districtBreakdown: {
          district: string;
          label: string;
          tracked: number;
          inData: number;
        }[];
        totalSubmissions: number;
      };
      newSample: {
        assignmentTarget: number;
        successTarget: number;
        totalTrackedGirls: number;
        remainingToSuccessTarget: number;
        successRate: number;
        uniqueGirlsAttempted: number;
        assignmentCoverage: number;
        untrackedInData: number;
        districtBreakdown: {
          district: string;
          label: string;
          tracked: number;
          inData: number;
        }[];
        totalSubmissions: number;
      };
    };
    cohortProgress: {
      cohort: string;
      trackingGroup: TrackingCohort;
      tracked: number;
      remaining: number;
      target: number;
      totalSubmissions: number;
    }[];
    trackedByDistrict: {
      district: string;
      label: string;
      tracked: number;
      untracked: number;
      target: number;
      inData: number;
      totalSubmissions: number;
    }[];
  },
>(
  metrics: T,
  gaps: TrackingTargetGaps | undefined,
  filters: {
    district?: string;
    cohort?: "all" | TrackingCohort;
  } = {}
): T {
  const frame = assignmentFrameCounts(gaps, filters);
  if (!frame) return metrics;

  const remaining = remainingOf(frame);
  const successRate =
    frame.targetTotal > 0 ? (frame.tracked / frame.targetTotal) * 100 : 0;
  const attempted = frame.targetTotal - frame.notAttempted;

  const baselineFrame = assignmentFrameCounts(gaps, {
    ...filters,
    cohort: "baseline",
  });
  const newSampleFrame = assignmentFrameCounts(gaps, {
    ...filters,
    cohort: "new-sample",
  });

  const districtRows = frameDistrictSummaries(gaps, filters);
  const baselineDistricts = frameDistrictSummaries(gaps, {
    ...filters,
    cohort: "baseline",
  });
  const newSampleDistricts = frameDistrictSummaries(gaps, {
    ...filters,
    cohort: "new-sample",
  });

  const trackedByDistrict = districtRows.map((d) => {
    const existing = metrics.trackedByDistrict.find(
      (row) => row.district === d.district
    );
    const rem = d.notAttempted + d.needsRevisit + d.attemptedNotTracked;
    return {
      district: d.district,
      label: d.districtLabel,
      tracked: d.tracked,
      untracked: rem,
      target: d.targetTotal,
      inData: d.targetTotal - d.notAttempted,
      totalSubmissions: existing?.totalSubmissions ?? 0,
    };
  });

  const baseline = applyCohortFrame(
    metrics.cohorts.baseline,
    baselineFrame,
    baselineDistricts
  );
  const newSample = applyCohortFrame(
    metrics.cohorts.newSample,
    newSampleFrame,
    newSampleDistricts
  );

  const cohortProgress = [
    {
      cohort: "Baseline",
      trackingGroup: "baseline" as TrackingCohort,
      tracked: baseline.totalTrackedGirls,
      remaining: baseline.remainingToSuccessTarget,
      target: baseline.successTarget,
      totalSubmissions: baseline.totalSubmissions,
    },
    {
      cohort: "New Sample",
      trackingGroup: "new-sample" as TrackingCohort,
      tracked: newSample.totalTrackedGirls,
      remaining: newSample.remainingToSuccessTarget,
      target: newSample.successTarget,
      totalSubmissions: newSample.totalSubmissions,
    },
  ];

  return {
    ...metrics,
    assignmentPool: frame.targetTotal,
    successTarget: frame.targetTotal,
    girlsToTrack: frame.targetTotal,
    totalTrackedGirls: frame.tracked,
    remainingToSuccessTarget: remaining,
    totalUntrackedGirls: remaining,
    untrackedInData: remaining,
    successRate,
    trackingRate: successRate,
    secondaryKpis: {
      ...metrics.secondaryKpis,
      uniqueGirlsAttempted: attempted,
      trackedGirls: frame.tracked,
      attemptedNotTracked: frame.attemptedNotTracked,
      successRate,
      dataCoverageRate:
        frame.targetTotal > 0 ? (attempted / frame.targetTotal) * 100 : 0,
    },
    cohorts: {
      baseline,
      newSample,
    },
    cohortProgress,
    trackedByDistrict,
  };
}
