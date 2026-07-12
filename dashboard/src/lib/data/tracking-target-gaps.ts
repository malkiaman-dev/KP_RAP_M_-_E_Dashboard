import {
  classifyUntrackedGirl,
  getGirlSubmissions,
  girlIsTrackedAcrossAttempts,
  girlKey,
  girlPendingRevisit,
  type TrackingRow,
} from "./tracking-metrics";
import {
  loadTrackingTargetGirls,
  trackingTargetsAvailable,
  type TrackingTargetGirl,
} from "./tracking-targets-loader";
import { PROTOCOL } from "./protocol";
import type {
  TargetGapDistrictSummary,
  TargetGapGirl,
  TargetGapStatus,
  TrackingTargetGaps,
} from "./tracking-target-gaps-types";

export type {
  TargetGapDistrictSummary,
  TargetGapGirl,
  TargetGapStatus,
  TrackingTargetGaps,
} from "./tracking-target-gaps-types";

const UNTRACKED_REASON_LABEL: Record<string, string> = {
  girlNotFound: "Girl not found",
  noConsent: "No consent",
  houseUntraceable: "House untraceable",
  houseNotLocated: "House not located",
  incomplete: "Incomplete / closed path",
};

const STATUS_LABEL: Record<TargetGapStatus, string> = {
  tracked: "Successfully tracked",
  not_attempted: "Not attempted",
  needs_revisit_2nd: "Needs 2nd attempt",
  needs_revisit_3rd: "Needs 3rd attempt",
  attempted_not_tracked: "Attempted — not tracked",
};

function districtLabel(code: string, fallback = ""): string {
  const fromProtocol =
    PROTOCOL.DISTRICT_TRACKING_TARGETS[
      code as keyof typeof PROTOCOL.DISTRICT_TRACKING_TARGETS
    ]?.label;
  return fromProtocol || fallback || `District ${code}`;
}

/** Index survey rows by every plausible listing-ID field. */
function buildSubmissionIndex(
  rows: TrackingRow[]
): Map<string, TrackingRow[]> {
  const index = new Map<string, TrackingRow[]>();

  const add = (raw: string | undefined, row: TrackingRow) => {
    const key = String(raw || "").trim();
    if (!key) return;
    const list = index.get(key);
    if (list) list.push(row);
    else index.set(key, [row]);
  };

  for (const row of rows) {
    add(girlKey(row), row);
    add(row.girl_id, row);
    add(row.girl_1, row);
    add(row.girl_2, row);
    const girl = String(row.girl || "").trim();
    if (/^\d+$/.test(girl) || girl.includes("-")) add(girl, row);
  }

  return index;
}

function dedupeRows(rows: TrackingRow[]): TrackingRow[] {
  const byKey = new Map<string, TrackingRow>();
  for (const row of rows) {
    if (row.KEY) byKey.set(row.KEY, row);
  }
  return [...byKey.values()];
}

function classifyTargetGirl(
  target: TrackingTargetGirl,
  allRows: TrackingRow[],
  index: Map<string, TrackingRow[]>
): TargetGapGirl {
  const matched = dedupeRows(index.get(target.girlId) ?? []);
  // Prefer chronological helpers keyed by girlKey when we have matches.
  const primaryKey = matched[0] ? girlKey(matched[0]) : target.girlId;
  const subs =
    matched.length > 0
      ? getGirlSubmissions(allRows, primaryKey)
      : [];

  const attempts = subs.length;
  let status: TargetGapStatus = "not_attempted";
  let reason = "No tracking submission yet";

  if (attempts > 0) {
    if (girlIsTrackedAcrossAttempts(allRows, primaryKey)) {
      status = "tracked";
      reason = "Successfully tracked";
    } else {
      const pending = girlPendingRevisit(subs, allRows);
      if (pending === "2nd") {
        status = "needs_revisit_2nd";
        reason = "2nd attempt still needed";
      } else if (pending === "3rd") {
        status = "needs_revisit_3rd";
        reason = "3rd attempt still needed";
      } else {
        status = "attempted_not_tracked";
        reason =
          UNTRACKED_REASON_LABEL[classifyUntrackedGirl(subs)] ||
          "Attempted but not successfully tracked";
      }
    }
  }

  return {
    girlId: target.girlId,
    girlName: target.girlName,
    fatherName: target.fatherName,
    district: target.district,
    districtLabel: districtLabel(target.district, target.districtLabel),
    village: target.village,
    school: target.school,
    contact: target.contact,
    address: target.address,
    landmark: target.landmark,
    cohort: target.cohort,
    batch: target.batch,
    status,
    statusLabel: STATUS_LABEL[status],
    reason,
    attempts,
  };
}

export function computeTrackingTargetGaps(
  surveyRows: TrackingRow[]
): TrackingTargetGaps {
  if (!trackingTargetsAvailable()) {
    return {
      available: false,
      targetTotal: 0,
      tracked: 0,
      notAttempted: 0,
      needsRevisit: 0,
      attemptedNotTracked: 0,
      actionable: 0,
      byDistrict: [],
      actionableGirls: [],
      notAttemptedGirls: [],
      needsRevisitGirls: [],
    };
  }

  const targets = loadTrackingTargetGirls();
  const index = buildSubmissionIndex(surveyRows);
  const classified = targets.map((t) =>
    classifyTargetGirl(t, surveyRows, index)
  );

  const notAttemptedGirls = classified.filter(
    (g) => g.status === "not_attempted"
  );
  const needsRevisitGirls = classified.filter(
    (g) =>
      g.status === "needs_revisit_2nd" || g.status === "needs_revisit_3rd"
  );
  const actionableGirls = [...notAttemptedGirls, ...needsRevisitGirls].sort(
    (a, b) =>
      a.districtLabel.localeCompare(b.districtLabel) ||
      a.village.localeCompare(b.village) ||
      a.girlName.localeCompare(b.girlName)
  );

  const tracked = classified.filter((g) => g.status === "tracked").length;
  const attemptedNotTracked = classified.filter(
    (g) => g.status === "attempted_not_tracked"
  ).length;

  const districtCodes = [
    ...new Set(classified.map((g) => g.district).filter(Boolean)),
  ].sort();

  const byDistrict: TargetGapDistrictSummary[] = districtCodes.map((code) => {
    const rows = classified.filter((g) => g.district === code);
    const notAttempted = rows.filter((g) => g.status === "not_attempted").length;
    const needsRevisit = rows.filter(
      (g) =>
        g.status === "needs_revisit_2nd" || g.status === "needs_revisit_3rd"
    ).length;
    return {
      district: code,
      districtLabel: districtLabel(code, rows[0]?.districtLabel),
      targetTotal: rows.length,
      tracked: rows.filter((g) => g.status === "tracked").length,
      notAttempted,
      needsRevisit,
      attemptedNotTracked: rows.filter(
        (g) => g.status === "attempted_not_tracked"
      ).length,
      actionable: notAttempted + needsRevisit,
    };
  });

  return {
    available: true,
    targetTotal: classified.length,
    tracked,
    notAttempted: notAttemptedGirls.length,
    needsRevisit: needsRevisitGirls.length,
    attemptedNotTracked,
    actionable: actionableGirls.length,
    byDistrict,
    actionableGirls,
    notAttemptedGirls,
    needsRevisitGirls,
  };
}

