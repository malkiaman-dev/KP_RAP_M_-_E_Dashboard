# Error Report — Metrics Reference

This document explains every metric on the **Error Report** page (`/surveys/errors`): what it means, how it is calculated, and a simple example.

The Error Report surfaces **data-quality issues** from the DQA script so the team can fix critical problems and hold enumerators accountable.

## Scope

| Included | Excluded |
|----------|----------|
| **Tracking** (baseline + new sample checked together) | Listing |
| **Household** | School |
| **Girls** | Driver |
| | Cross-survey rows (`Tracking vs Household`, `Household vs Girls`, etc.) |

Data is produced by `DQA_Script/run_dqa.py` into **`Error_log/Daily_Error_Log.xlsx`** (`errors` sheet). The dashboard reads that file and applies the scope filter above. Metrics respect the active **filters** (district, survey, severity, enumerator).

---

## 1. Data source

The `errors` sheet has one row per detected issue, with these columns:

| Column | Meaning |
|--------|---------|
| Survey | `Tracking`, `Household`, or `Girls` |
| District | District where the record originated |
| Record Key | Unique submission ID the error refers to |
| Severity | `CRITICAL` or `FLAG` |
| Rule ID | Validation rule code (e.g. `TRK_QF_05`) |
| Title | Short human-readable rule name |
| Message | Full explanation of the issue |
| Field / Value | The field and value that triggered the rule |
| Enumerator Name / ID | Responsible field enumerator |
| Device ID | Device that produced the submission |
| Submission Date / Created At | When the data was collected / when the log ran |

---

## 2. Core concepts

### Severity

| Severity | Label in dashboard | Meaning |
|----------|--------------------|---------|
| `CRITICAL` | **Critical** | Must-fix data integrity problem (e.g. visit date mismatch, insufficient attempts) |
| `FLAG` | **Quality** | A quality concern flagged for review (e.g. survey completed too fast) |

### Attributable vs cross-survey (excluded)

Cross-survey checks compare two datasets (e.g. *Tracking vs Household*) and have no single field enumerator. These rows are **filtered out** before any KPI, chart, or table is built. Listing / School / Driver rows are also dropped if present in an older log.

---

## 3. Headline KPIs

| KPI | Formula / logic | Example |
|-----|-----------------|---------|
| **Total Errors** | Count of scoped error rows | 495 |
| **Critical Errors** | Rows where Severity = `CRITICAL` | 154 |
| **Quality Errors** | Rows where Severity = `FLAG` | 341 |
| **Critical Rate %** | `(Critical ÷ Total) × 100` | — |
| **Enumerator Critical** | Critical errors with a named enumerator | — |
| **Affected Enumerators** | Distinct named enumerators with ≥ 1 error | — |
| **Rule Types** | Distinct Rule IDs triggered | — |

---

## 4. Charts

### Errors by Severity (donut)
Split of Critical (red) vs Quality (gold).

### Errors by District (stacked bar)
Critical + Quality issues per district.

### Top Critical Errors (horizontal bar)
The 10 most frequent **critical** rules, by Rule ID. Tooltip shows the rule title.

### Top Quality Errors (horizontal bar)
The 10 most frequent **quality-flag** rules.

### Errors by Survey (stacked bar)
Critical + Quality issues for **Tracking**, **Household**, and **Girls** only.

### Critical Errors by Enumerator (horizontal bar)
Named enumerators with the most **critical** errors (top 15). Tooltip shows district.

### Enumerator Quality Score (bar)
A 0–100 score per enumerator (lowest 15 shown = need most attention).

```
score = max(0, 100 − (critical × 4) − (quality × 1.5))
```

Color tiers: green ≥ 90, amber 75–89, red < 75.

---

## 5. Error Detail Log (table)

A searchable, paginated list of every scoped error row (50 at a time, “Load more” to extend).

| Column | Shows |
|--------|-------|
| Enumerator | Responsible enumerator |
| District | District |
| Rule | Rule ID |
| Title | Rule name + full message |
| Survey | Tracking / Household / Girls |
| Severity | Critical (red) / Quality (amber) badge |

**Search** matches title, rule ID, message, enumerator, survey, or district.

---

## 6. Filters

All metrics, charts, and the table recompute on filtered rows.

| Filter | Matches on |
|--------|------------|
| District | `District` |
| Survey | `Survey` (`Tracking`, `Household`, `Girls`) |
| Severity | `Severity` (Critical / Quality) |
| Enumerator | `Enumerator Name` |

---

## 7. Regenerating the log

From `DQA_Script/`:

```bash
python run_dqa.py
```

Reads CSVs from project `Surveys/` (preferred) or `DQA_Script/data_raw/`, then writes `Error_log/Daily_Error_Log.xlsx`.

---

## 8. Source code map

| Area | File |
|------|------|
| Error metrics & scope | `src/lib/data/error-metrics.ts` |
| Excel loading (xlsx) | `src/lib/data/error-loader.ts` |
| API route | `src/app/api/errors/route.ts` |
| Page | `src/app/surveys/errors/page.tsx` |
| KPI cards | `src/components/errors/error-kpis.tsx` |
| Charts | `src/components/errors/error-charts.tsx` |
| Filters | `src/components/errors/error-filters.tsx` |
| Detail table | `src/components/errors/error-table.tsx` |
| DQA generator | `../DQA_Script/run_dqa.py` |

---

*Last updated for Tracking + Household + Girls scope, matching `error-metrics.ts` and `DQA_Script/run_dqa.py`.*
