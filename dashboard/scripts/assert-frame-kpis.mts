/**
 * Assert overlay KPIs match Excel-frame ground truth.
 * Run: npx tsx scripts/assert-frame-kpis.mts
 */
import path from "path";
import { fileURLToPath } from "url";
import { loadTrackingSurvey } from "../src/lib/data/tracking-loader";
import { computeTrackingMetrics } from "../src/lib/data/tracking-metrics";
import { computeTrackingTargetGaps, toClientTrackingTargetGaps } from "../src/lib/data/tracking-target-gaps";
import { overlayMetricsWithAssignmentFrame } from "../src/lib/data/tracking-target-gap-filters";
import { DEFAULT_TRACKING_TARGETS } from "../src/lib/data/protocol";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, ".."));

const survey = loadTrackingSurvey();
const gaps = computeTrackingTargetGaps(survey);
const raw = computeTrackingMetrics(survey, DEFAULT_TRACKING_TARGETS, survey, {
  includeExportLists: false,
});
const m = overlayMetricsWithAssignmentFrame(raw, gaps);

const checks: [string, boolean, string][] = [];
const add = (name: string, ok: boolean, detail: string) =>
  checks.push([name, ok, detail]);

add(
  "pool",
  m.assignmentPool === 4333,
  `assignmentPool=${m.assignmentPool}`
);
add(
  "tracked",
  m.totalTrackedGirls === 3778,
  `totalTrackedGirls=${m.totalTrackedGirls}`
);
add(
  "remaining",
  m.remainingToSuccessTarget === 555,
  `remaining=${m.remainingToSuccessTarget}`
);
add(
  "pool=tracked+remaining",
  m.totalTrackedGirls + m.remainingToSuccessTarget === m.assignmentPool,
  `${m.totalTrackedGirls}+${m.remainingToSuccessTarget}=${m.assignmentPool}`
);
add(
  "cohortProgress baseline tracked",
  m.cohortProgress[0]?.tracked === 1036,
  `baseline tracked=${m.cohortProgress[0]?.tracked}`
);
add(
  "cohortProgress new-sample tracked",
  m.cohortProgress[1]?.tracked === 2742,
  `new-sample tracked=${m.cohortProgress[1]?.tracked}`
);
add(
  "cohortProgress baseline remaining",
  m.cohortProgress[0]?.remaining === 198,
  `baseline remaining=${m.cohortProgress[0]?.remaining}`
);
add(
  "cohortProgress new-sample remaining",
  m.cohortProgress[1]?.remaining === 357,
  `new-sample remaining=${m.cohortProgress[1]?.remaining}`
);
add(
  "baseline+newSample tracked",
  m.cohorts.baseline.totalTrackedGirls + m.cohorts.newSample.totalTrackedGirls ===
    m.totalTrackedGirls,
  `${m.cohorts.baseline.totalTrackedGirls}+${m.cohorts.newSample.totalTrackedGirls}`
);
add(
  "torghar district",
  m.trackedByDistrict.find((d) => d.district === "4")?.target === 146 &&
    m.trackedByDistrict.find((d) => d.district === "4")?.tracked === 144,
  JSON.stringify(m.trackedByDistrict.find((d) => d.district === "4"))
);

const dikhan = overlayMetricsWithAssignmentFrame(raw, gaps, { district: "1" });
add(
  "dikhan pool",
  dikhan.assignmentPool === 2170,
  `pool=${dikhan.assignmentPool}`
);
add(
  "dikhan tracked+remaining",
  dikhan.totalTrackedGirls + dikhan.remainingToSuccessTarget === 2170,
  `${dikhan.totalTrackedGirls}+${dikhan.remainingToSuccessTarget}`
);

const clientGaps = toClientTrackingTargetGaps(gaps);
add(
  "client gaps omit trackedGirls",
  !("trackedGirls" in clientGaps) && clientGaps.byCohortDistrict.length > 0,
  `byCohortDistrict=${clientGaps.byCohortDistrict.length}`
);
const mClient = overlayMetricsWithAssignmentFrame(raw, clientGaps);
add(
  "client overlay pool",
  mClient.assignmentPool === 4333,
  `assignmentPool=${mClient.assignmentPool}`
);
add(
  "client overlay tracked",
  mClient.totalTrackedGirls === 3778,
  `totalTrackedGirls=${mClient.totalTrackedGirls}`
);
add(
  "client baseline cohort",
  mClient.cohortProgress[0]?.tracked === 1036,
  `baseline=${mClient.cohortProgress[0]?.tracked}`
);

let failed = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
  if (!ok) failed += 1;
}
console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECKS FAILED`);
process.exit(failed === 0 ? 0 : 1);
