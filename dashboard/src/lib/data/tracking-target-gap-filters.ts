import type { TrackingCohort } from "./tracking-metrics";
import type {
  TargetGapDistrictSummary,
  TargetGapGirl,
  TrackingTargetGaps,
} from "./tracking-target-gaps-types";

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
      const needle = filters.district.trim().toLowerCase();
      const code = g.district.trim().toLowerCase();
      const label = g.districtLabel.trim().toLowerCase();
      const labelCompact = label.replace(/\./g, "").replace(/\s+/g, "");
      const needleCompact = needle.replace(/\./g, "").replace(/\s+/g, "");
      if (
        code !== needle &&
        label !== needle &&
        labelCompact !== needleCompact &&
        !label.includes(needle) &&
        !needle.includes(labelCompact)
      ) {
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

  const notAttempted = filterTargetGapGirls(gaps.notAttemptedGirls, filters);
  const needsRevisit = filterTargetGapGirls(gaps.needsRevisitGirls, filters);
  const attemptedNotTracked = filterTargetGapGirls(
    gaps.attemptedNotTrackedGirls,
    filters
  );
  const tracked = filterTargetGapGirls(gaps.trackedGirls, filters);
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

  // Fast path: use pre-aggregated byDistrict when no cohort slice is needed.
  if (cohortAll) {
    return gaps.byDistrict.filter((d) => {
      if (districtAll) return true;
      const needle = filters.district!.trim().toLowerCase();
      return (
        d.district.trim().toLowerCase() === needle ||
        d.districtLabel.trim().toLowerCase().includes(needle)
      );
    });
  }

  const girls = [
    ...filterTargetGapGirls(gaps.trackedGirls, filters),
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
