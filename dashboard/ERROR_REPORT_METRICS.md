# Error Report — Metrics Reference

This document explains every metric on the **Error Report** page (`/surveys/errors`): what it means, how it is calculated, and a simple example.

The Error Report surfaces **data-quality issues** in KPRAP field surveys, so the team can fix critical problems and hold enumerators accountable.

**Note:** Cross-survey integrity checks (survey names containing “ vs ”) are **excluded** from this dashboard for now.

Data comes from **`Error_log/Daily_Error_Log.xlsx`** (the `errors` sheet). Metrics respect the active **filters** (district, survey/check, severity, enumerator).

---

## 1. Data source

The `errors` sheet has one row per detected issue, with these columns:

| Column | Meaning |
|--------|---------|
| Survey | Which survey or cross-check produced the error (e.g. `Tracking`, `Tracking vs Household`) |
| District | District where the record originated |
| Record Key | Unique submission ID the error refers to |
| Severity | `CRITICAL` or `FLAG` |
| Rule ID | Validation rule code (e.g. `TRK_QF_05`) |
| Title | Short human-readable rule name |
| Message | Full explanation of the issue |
| Field / Value | The field and value that triggered the rule |
| Enumerator Name / ID | Responsible field enumerator (blank / `-` for cross-survey checks) |
| Device ID | Device that produced the submission |
| Submission Date / Created At | When the data was collected / when the log ran |

---

## 2. Core concepts

### Severity

| Severity | Label in dashboard | Meaning |
|----------|--------------------|---------|
| `CRITICAL` | **Critical** | Must-fix data integrity problem (e.g. ID conflict, missing linked record) |
| `FLAG` | **Quality** | A quality concern flagged for review (e.g. survey completed too fast) |

### Attributable vs cross-survey (excluded)

Cross-survey checks compare two datasets (e.g. *Tracking vs Household*) and have no single field enumerator. These rows are **filtered out** before any KPI, chart, or table is built.

| Type | Shown on dashboard? | Example |
|------|---------------------|---------|
| **Enumerator error** | Yes | `TRK_QF_05` (Survey completed too fast) by *Alia Khan* |
| **Cross-survey check** | No (hidden) | `LVT_CR_01` — listed girl missing in tracking |

---

## 3. Headline KPIs

| KPI | Formula / logic | Example |
|-----|-----------------|---------|
| **Total Errors** | Count of all error rows | 427 |
| **Critical Errors** | Rows where Severity = `CRITICAL` | 261 |
| **Quality Errors** | Rows where Severity = `FLAG` | 166 |
| **Critical Rate %** | `(Critical ÷ Total) × 100` | `9 ÷ 187 = 4.8%` |
| **Enumerator Critical** | Critical errors with a named enumerator | 9 |
| **Affected Enumerators** | Distinct named enumerators with ≥ 1 error | 30 |
| **Rule Types** | Distinct Rule IDs triggered | 20 |

---

## 4. Charts

### Errors by Severity (donut)
Split of Critical (red) vs Quality (gold).

### Errors by District (stacked bar)
Critical + Quality issues per district.
**Example:** Lakki 312, D.I. Khan 115.

### Top Critical Errors (horizontal bar)
The 10 most frequent **critical** rules, by Rule ID. Tooltip shows the rule title.
**Example:** `TRK_HH_CR_TRACKED_BUT_HH_MISSING` — 154.

### Top Quality Errors (horizontal bar)
The 10 most frequent **quality-flag** rules.
**Example:** `LST_QF_DUP_01` (Possible duplicate) — 56.

### Errors by Survey (stacked bar)
Critical + Quality issues per survey / cross-check.
**Example:** `Tracking vs Household` 154 (all critical); `Tracking` 55 (9 critical + 46 quality).

### Critical Errors by Enumerator (horizontal bar)
Named enumerators with the most **critical** errors (top 15). Tooltip shows district.
**Example:** *Muhammad Talha* — critical-error count.

### Enumerator Quality Score (bar)
A 0–100 score per enumerator (lowest 15 shown = need most attention).

```
score = max(0, 100 − (critical × 4) − (quality × 1.5))
```

Color tiers: green ≥ 90, amber 75–89, red < 75.

**Example:** An enumerator with 2 critical + 3 quality → `100 − 8 − 4.5 = 87.5 → 88` (amber).

---

## 5. Error Detail Log (table)

A searchable, paginated list of every error row (50 at a time, “Load more” to extend).

| Column | Shows |
|--------|-------|
| Enumerator | Responsible enumerator (`—` for cross-survey) |
| District | District |
| Rule | Rule ID |
| Title | Rule name + full message |
| Survey | Source survey / cross-check |
| Severity | Critical (red) / Quality (amber) badge |

**Search** matches title, rule ID, message, enumerator, survey, or district.

---

## 6. Filters

All metrics, charts, and the table recompute on filtered rows.

| Filter | Matches on |
|--------|------------|
| District | `District` |
| Survey / Check | `Survey` |
| Severity | `Severity` (Critical / Quality) |
| Enumerator | `Enumerator Name` |

**Example:** Filter **Severity = Critical** and **District = Lakki** → all KPIs and charts show only Lakki’s critical errors.

---

## 7. Source code map

| Area | File |
|------|------|
| Error metrics & logic | `src/lib/data/error-metrics.ts` |
| Excel loading (xlsx) | `src/lib/data/error-loader.ts` |
| API route | `src/app/api/errors/route.ts` |
| Page | `src/app/surveys/errors/page.tsx` |
| KPI cards | `src/components/errors/error-kpis.tsx` |
| Charts | `src/components/errors/error-charts.tsx` |
| Filters | `src/components/errors/error-filters.tsx` |
| Detail table | `src/components/errors/error-table.tsx` |

---

*Last updated to match dashboard logic in `error-metrics.ts` and the Error Report UI. If the error-log columns or severities change, update those files and this document together.*
