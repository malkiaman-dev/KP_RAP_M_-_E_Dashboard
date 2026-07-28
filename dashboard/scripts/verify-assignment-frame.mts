/**
 * Manual verification: Tracking_Targets Excel vs survey CSVs vs protocol.
 * Run: node --import tsx scripts/verify-assignment-frame.mts
 */
import path from "path";
import { fileURLToPath } from "url";
import { loadTrackingSurvey } from "../src/lib/data/tracking-loader";
import { loadTrackingTargetGirls } from "../src/lib/data/tracking-targets-loader";
import { computeTrackingTargetGaps } from "../src/lib/data/tracking-target-gaps";
import { assignmentFrameCounts } from "../src/lib/data/tracking-target-gap-filters";
import { PROTOCOL } from "../src/lib/data/protocol";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, ".."));

const targets = loadTrackingTargetGirls();
const survey = loadTrackingSurvey();
const gaps = computeTrackingTargetGaps(survey);

console.log("=== EXCEL ASSIGNMENT FRAME (raw girlid rows) ===");
const byDistrictCohort = new Map<string, number>();
for (const t of targets) {
  const key = `${t.district}|${t.districtLabel}|${t.cohort}`;
  byDistrictCohort.set(key, (byDistrictCohort.get(key) || 0) + 1);
}
for (const [k, n] of [...byDistrictCohort.entries()].sort()) {
  console.log(`  ${k}: ${n}`);
}
console.log(`  TOTAL Excel girls: ${targets.length}`);

console.log("\n=== PROTOCOL CONSTANTS ===");
for (const [code, d] of Object.entries(PROTOCOL.DISTRICT_TRACKING_TARGETS)) {
  console.log(
    `  ${code} ${d.label}: baseline=${d.baseline} endline=${d.endline} total=${d.baseline + d.endline}`
  );
}
console.log(
  `  PROTOCOL totals: baseline=${PROTOCOL.BASELINE_SUCCESS_TARGET} endline=${PROTOCOL.ENDLINE_SUCCESS_TARGET} all=${PROTOCOL.GIRLS_TO_TRACK}`
);

console.log("\n=== GAP ANALYSIS (Excel × survey match) ===");
console.log(
  `  available=${gaps.available} targetTotal=${gaps.targetTotal} tracked=${gaps.tracked} notAttempted=${gaps.notAttempted} needsRevisit=${gaps.needsRevisit} attemptedNotTracked=${gaps.attemptedNotTracked} actionable=${gaps.actionable}`
);
console.log(
  `  check: tracked+notAttempted+needsRevisit+attemptedNotTracked = ${
    gaps.tracked +
    gaps.notAttempted +
    gaps.needsRevisit +
    gaps.attemptedNotTracked
  } (should equal ${gaps.targetTotal})`
);

console.log("\n=== PER DISTRICT (Excel frame) ===");
console.log(
  "district | target | tracked | notAttempted | needsRevisit | notTracked | remaining | tracked+remaining"
);
for (const d of gaps.byDistrict) {
  const remaining = d.notAttempted + d.needsRevisit + d.attemptedNotTracked;
  const sum = d.tracked + remaining;
  console.log(
    `${d.district} ${d.districtLabel} | ${d.targetTotal} | ${d.tracked} | ${d.notAttempted} | ${d.needsRevisit} | ${d.attemptedNotTracked} | ${remaining} | ${sum}${
      sum === d.targetTotal ? " OK" : " MISMATCH"
    }`
  );
}

console.log("\n=== TORGHAR DETAIL ===");
const torghar = gaps.byDistrict.find(
  (d) => d.district === "4" || /torghar/i.test(d.districtLabel)
);
console.log(torghar);
const torgharTargets = targets.filter(
  (t) => t.district === "4" || /torghar/i.test(t.districtLabel)
);
console.log(
  `Excel Torghar rows: baseline=${torgharTargets.filter((t) => t.cohort === "baseline").length} new-sample=${torgharTargets.filter((t) => t.cohort === "new-sample").length} total=${torgharTargets.length}`
);

console.log("\n=== EXCEL vs PROTOCOL DIFF ===");
for (const [code, proto] of Object.entries(PROTOCOL.DISTRICT_TRACKING_TARGETS)) {
  const excelB = targets.filter(
    (t) => t.district === code && t.cohort === "baseline"
  ).length;
  const excelN = targets.filter(
    (t) => t.district === code && t.cohort === "new-sample"
  ).length;
  console.log(
    `${code} ${proto.label}: excel B/N/T=${excelB}/${excelN}/${excelB + excelN} protocol B/N/T=${proto.baseline}/${proto.endline}/${proto.baseline + proto.endline} delta B=${excelB - proto.baseline} N=${excelN - proto.endline}`
  );
}

console.log(`\nSurvey rows loaded: ${survey.length}`);

console.log("\n=== FILTERED FRAME CHECKS (cohort × district) ===");
for (const cohort of ["all", "baseline", "new-sample"] as const) {
  for (const district of ["all", "1", "2", "3", "4"]) {
    const f = assignmentFrameCounts(gaps, { district, cohort });
    if (!f) continue;
    const remaining =
      f.notAttempted + f.attemptedNotTracked + f.needsRevisit;
    const ok = f.tracked + remaining === f.targetTotal;
    if (district === "all" || district === "4" || cohort === "all") {
      console.log(
        `cohort=${cohort} district=${district}: target=${f.targetTotal} tracked=${f.tracked} remaining=${remaining} (NA=${f.notAttempted} NT=${f.attemptedNotTracked} RV=${f.needsRevisit}) ${ok ? "OK" : "BAD"}`
      );
    }
  }
}
