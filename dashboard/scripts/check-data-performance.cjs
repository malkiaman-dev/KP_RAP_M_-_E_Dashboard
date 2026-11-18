/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const ts = require("typescript");
const Papa = require("papaparse");

// Use the project's compiler and aliases without another test dependency.
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolveFilename.call(this, request.startsWith("@/") ? path.resolve("src", request.slice(2)) : request, ...args);
};
require.extensions[".ts"] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};

const { loadAllSurveys, loadDashboardMetricsForClient } = require("../src/lib/data/survey-loader.ts");
const { computeMetrics, applyFilters, createDefaultDashboardFilters, getFilterOptions } = require("../src/lib/data/survey-metrics.ts");
const { slimDashboardRows } = require("../src/lib/data/survey-serialization.ts");
const { parseFlexibleDate } = require("../src/lib/utils.ts");
const { FIELD_PERIOD_START } = require("../src/lib/data/field-period.ts");
const { loadTrackingSurvey } = require("../src/lib/data/tracking-loader.ts");
const { loadHhGirlsSurveys } = require("../src/lib/data/hh-girls-loader.ts");
const { computeHhGirlsMetrics } = require("../src/lib/data/hh-girls-metrics.ts");

const started = performance.now();
function readFullRows(filename, surveyType) {
  return Papa.parse(fs.readFileSync(path.join("..", "Surveys", filename), "utf8"), {
    header: true, skipEmptyLines: true,
  }).data.map((row) => ({ ...row, survey_type: surveyType }));
}
const rawHouseholds = readFullRows("Household_Survey.csv", "household");
const rawGirls = readFullRows("Girls_Survey.csv", "girls");
const fullParseMs = Math.round(performance.now() - started);
const rows = [
  ...loadTrackingSurvey().map((row) => ({ ...row, survey_type: "tracking" })),
  ...rawHouseholds,
  ...rawGirls,
];
assert.ok(rows.length > 0, "Survey data is available for parity checks");
const slimRows = slimDashboardRows(rows);
const selectedParseStarted = performance.now();
const loadedRows = loadAllSurveys();
const selectedParseMs = Math.round(performance.now() - selectedParseStarted);
assert.deepEqual(slimDashboardRows(loadedRows), slimRows, "Selected CSV columns preserve every dashboard field");
const selected = loadHhGirlsSurveys();
function aggregateHhMetrics(household, girls) {
  return Object.fromEntries(Object.entries(computeHhGirlsMetrics(household, girls)).filter(([key]) => key !== "allHousehold" && key !== "allGirls"));
}
assert.deepEqual(aggregateHhMetrics(selected.household, selected.girls), aggregateHhMetrics(rawHouseholds, rawGirls), "Selected CSV columns preserve every HH/Girls metric and export list");
assert.equal(slimRows.length, rows.length, "Every submission is retained");
const clientMetrics = loadDashboardMetricsForClient();
const defaults = createDefaultDashboardFilters(FIELD_PERIOD_START);
const options = getFilterOptions(rows);
const filters = [
  defaults,
  createDefaultDashboardFilters(),
  ...options.districts.map(({ value }) => ({ ...defaults, district: [value] })),
  ...["tracking", "household", "girls"].map((type) => ({ ...defaults, surveyType: [type] })),
  ...["complete", "incomplete", "revisit"].map((status) => ({ ...defaults, status })),
  ...options.enumerators.slice(0, 3).map(({ value }) => ({ ...defaults, enumerator: value })),
  { ...defaults, dateFrom: "", dateTo: FIELD_PERIOD_START },
  { ...defaults, dateFrom: "2099-01-01" },
];

for (const filter of filters) {
  const fullFiltered = applyFilters(rows, filter);
  const slimFiltered = applyFilters(slimRows, filter);
  assert.deepEqual(slimFiltered.map((row) => row.KEY), fullFiltered.map((row) => row.KEY), "Filters retain the same submission keys");
  const { allSubmissions: fullSubmissions, ...full } = computeMetrics(fullFiltered, { allRows: rows, trackingFrame: clientMetrics.trackingFrame });
  const { allSubmissions: slimSubmissions, ...slim } = computeMetrics(slimFiltered, { allRows: slimRows, trackingFrame: clientMetrics.trackingFrame });
  assert.deepEqual(slim, full, "All KPI values, charts, and filter options match full survey records");
  assert.deepEqual(slimSubmissions.map((row) => row.KEY), fullSubmissions.map((row) => row.KEY), "Submission ordering is preserved");

  const households = fullFiltered.filter((row) => row.survey_type === "household");
  const girls = new Set(households.map((row) => row.girl).filter(Boolean));
  const bothParents = [...girls].filter((girl) => {
    const respondents = new Set(households.filter((row) => row.girl === girl).map((row) => row.respondent));
    return respondents.has("1") && respondents.has("2");
  }).length;
  assert.equal(slim.household.bothParent, bothParents, "Indexed household counts match the original calculation");
}

for (const raw of ["2026-11-18", "2026-11-18 14:30:00", "Jul 8, 2026 11:48:57 PM", "08-07-26 23:48", "25-07-26 0:59"]) {
  const first = parseFlexibleDate(raw);
  assert.ok(first, `${raw} parses`);
  const timestamp = first.getTime();
  first.setFullYear(2000);
  assert.equal(parseFlexibleDate(raw).getTime(), timestamp, "Cached dates cannot be mutated by callers");
}
assert.equal(parseFlexibleDate("31-02-26 0:59"), null);
assert.equal(parseFlexibleDate("not a date"), null);
assert.equal(parseFlexibleDate("not a date"), null);
assert.equal(parseFlexibleDate(" "), null);

const originalBytes = Buffer.byteLength(JSON.stringify({ ...clientMetrics, allSubmissions: rows }));
const compactBytes = Buffer.byteLength(JSON.stringify(clientMetrics));
assert.ok(compactBytes < originalBytes / 5, "The dashboard payload is at least 80% smaller");
console.log(JSON.stringify({ submissions: rows.length, filterCases: filters.length, originalBytes, compactBytes, reductionPercent: Number(((1 - compactBytes / originalBytes) * 100).toFixed(1)), surveyParseMs: { full: fullParseMs, selected: selectedParseMs }, durationMs: Math.round(performance.now() - started), result: "All metrics and filtering checks passed" }, null, 2));
