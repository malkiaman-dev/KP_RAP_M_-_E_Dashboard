# Alliance of Excellence — Metrics Reference

This document explains every major metric shown in the **M&E Tracking Dashboard**: what it means, how it is calculated, and which survey fields drive the logic.

Data is loaded from CSV exports in the `Surveys/` folder (no live database). Metrics update when you apply **filters** (district, tracking group, session, enumerator, village, school, date range).

---

## 1. Core concepts

### Submission vs unique girl

| Term | Meaning |
|------|---------|
| **Submission** | One row in a CSV export — one visit or form attempt. |
| **Unique girl** | One assigned girl, identified by `girl_id`, `girl`, `girl_1`, `girl_2`, or `KEY`. Multiple submissions for the same girl are grouped before girl-level metrics are counted. |

Most **operational** KPIs count submissions. Most **outcome** KPIs count **unique girls**.

### Tracking group vs session

These are **different** dimensions:

| Dimension | Source | Values |
|-----------|--------|--------|
| **Tracking group** | Which export file the row came from | **Baseline** (`Tracking_Survey_Baseline.csv`) · **New Sample** (`Tracking_Survey_NewSample.csv`) |
| **Session** | Academic cohort year | **2022–2023** · **2023–2024** (from `batch`, listing ID pattern, or `session` field) |

A baseline girl and a new-sample girl can both appear in either session once session is present in the export.

### Protocol targets (KPRAP)

Fixed targets from `src/lib/data/protocol.ts`:

| Target | Value | Used for |
|--------|------:|----------|
| **Assignment pool** (all) | 4,860 | Field coverage % (all data) |
| **Baseline assignment pool** | 1,235 | Baseline field coverage |
| **New sample assignment pool** | 3,625 | New sample field coverage |
| **Success target** (all) | 4,250 | Success rate % (all data) |
| **Baseline success target** | ~1,080 | Baseline success rate (proportional share of 4,250) |
| **New sample success target** | ~3,170 | New sample success rate (proportional share of 4,250) |

When you filter by **Baseline** or **New Sample**, the dashboard uses that group’s assignment pool and success target.

---

## 2. Successfully tracked (master definition)

A girl counts as **successfully tracked** when **at least one** of her submissions meets **all** of these conditions:

```
household effectively located
  → house_found = 1
  OR Case 5: house_found = 2 AND family_whereabouts = 1
             AND family_moveadd_samevill = 1 AND house_found_1 = 1
AND girl_found = 1, 2, or 3
AND girl_found_confirm_enrolled is NOT 2 or 999
AND consent = 1
AND survey_status = 1
AND not a protocol terminal incomplete case (Cases 1–6 below)
```

**Formula (girl level):**

```
Successfully Tracked = count of unique girls where any submission passes the rules above
```

This is the same definition on the **Tracking** page and the main **Dashboard** (for tracking-type rows).

### Protocol cases (incomplete / no revisit)

| Case | Condition | Outcome |
|------|-----------|---------|
| **1** | `house_found = 1` and `girl_found` ∈ {4, 99, 999} | Incomplete, **no revisit** |
| **2** | `house_found = 1` and `girl_found` ∈ {1, 2, 3} and `girl_found_confirm_enrolled` ∈ {2, 999} | Incomplete, **no revisit**. Other confirm values (1, 888) may continue toward completion. |
| **3** | `house_found = 2` and `family_whereabouts` ∈ {2, 888, 999} | Incomplete, **no revisit** |
| **4** | `house_found = 2` and `family_whereabouts = 1` and `family_moveadd_samevill` ∈ {2, 888, 999} | Incomplete, **no revisit** |
| **5** | `house_found = 2` and `family_whereabouts = 1` and `family_moveadd_samevill = 1` | New address entered; re-apply location / girl logics via `house_found_1` (+ girl fields). Tracked only if new house located and girl/consent/status succeed. |
| **6** | `house_found = 3` | Incomplete, **no revisit** |

**Field name notes**

| SurveyCTO list / question | Export column |
|---------------------------|---------------|
| `girlfound` | `girl_found` |
| `housefound` | `house_found` |
| enrollment confirm | `girl_found_confirm_enrolled` |
| family still in village | `family_whereabouts` |
| new address known | `family_moveadd_samevill` |
| house at new address | `house_found_1` |

Excel exports include protocol case, outcome, revisit needed, girl/house reason codes, elder/LHW/neighbour verification (`check_*`, names, numbers), visit comments, and survey comments for filtering.

---

## 3. Tracking page — primary KPIs

Shown in the top row of eight cards.

| Metric | Formula / logic | Notes |
|--------|-----------------|-------|
| **Total Submissions** | `count(rows after filters)` | Every CSV row in scope. |
| **Total Schools** | `count(distinct school names)` | Baseline: `school_label`. New sample: `new_school_label`. |
| **Total Villages** | `count(distinct resolved village name)` | Resolved from `village_label` (both files); baseline `village` is a numeric code and the new-sample file has no `village` column, so the name is the only shared key. |
| **Total Enumerators** | `count(distinct enumerator_id)` | |
| **Assignment Pool** | Protocol target for current filter | 4,860 (all) · 1,235 (baseline) · 3,625 (new sample) |
| **Successfully Tracked** | See §2 | Unique girls only. |
| **Remaining to Target** | `max(0, Success Target − Successfully Tracked)` | How many more successful trackings are needed to hit the protocol success target. |
| **Success Rate %** | `(Successfully Tracked ÷ Success Target) × 100` | Progress toward the **protocol outcome**, not “% of attempts that succeeded.” |

**Example (New Sample):** 69 tracked ÷ 3,170 target ≈ **2.2%** success rate.

---

## 4. Tracking page — cohort overview cards

One card each for **Baseline** and **New Sample** (when visible).

| Metric | Formula / logic |
|--------|-----------------|
| **Submissions** | Rows in that tracking group after filters |
| **Girls Attempted** | Unique girls in that group |
| **Successfully Tracked** | Unique girls meeting §2 in that group |
| **Success Rate** | `(Tracked in group ÷ Group success target) × 100` |
| **Assignment coverage** (progress bar) | `(Girls attempted ÷ Group assignment pool) × 100` |
| **Remaining to success target** | `Group success target − Successfully tracked` |
| **Untracked in data** | Unique girls attempted but **not** successfully tracked |

### Untracked breakdown (per cohort)

Each **untracked** girl is classified into **one** reason (priority order):

1. **House untraceable** — any submission has `house_found = 3` (Case 6)
2. **House not located** — household never effectively located (includes Cases 3–4 closed move paths)
3. **Girl not found** — household located but `girl_found` ∈ {4, 99, 999}, or girl never found positively at address
4. **Incomplete survey** — Case 2 (`girl_found_confirm_enrolled` 2/999), consent step not reached, or consent blank
5. **No consent** — consent step reached and `consent = 0` or `consent = 2` (explicit refusal only)

**Consent step reached** means:

- `girl_found` ∈ {1, 2, 3}, and
- `girl_found_confirm_enrolled` is not 2/999, and
- confirm is `1` or `888`, or `girl_found_confirm_dropped = 1` (baseline), or neither confirm field is set (legacy path).

Girls with `girl_found_confirm_enrolled = 2` or `999` are **Case 2 incomplete** — not “no consent”.

### Visit attempts and revisits (protocol)

Each tracking form records the attempt number in `visit_num`:

| `visit_num` | Meaning |
|-------------|---------|
| `1` | 1st attempt (counted in **Girls Attempted**, not in revisit metrics) |
| `2` | 2nd attempt (first revisit) |
| `3` | 3rd attempt (final revisit) |

**Revisit rule.** A revisit is required **only** when `house_found = 1` and the girl is **temporarily unavailable** (not found positively, and not a protocol terminal incomplete case). Maximum **two revisits** (attempts 2 and 3). Protocol Cases 1–6 above are always **Incomplete, no revisit**. Consent refused (`consent = 0` or `2`) also closes the case.

| Situation | Field signal | Revisit? |
|-----------|--------------|:--------:|
| Successfully tracked | See §2 | No |
| Structure located, girl temporarily unavailable | `house_found = 1` & girl blank / not 1–4/99/999 | **Yes** |
| Protocol Cases 1–6 | See table in §2 | No |
| Consent refused | `consent = 0` or `2` | No |

**`girl_found` codes** (SurveyCTO choice list `girlfound`; export column `girl_found`):

| Code | Label | Outcome |
|-----:|-------|---------|
| `1` | Yes | Girl found |
| `2` | Yes, girl name not correct | Girl found |
| `3` | Yes, father name not correct | Girl found |
| `4` | No, she married and moved away | **Case 1** — incomplete, **no revisit** |
| `99` | Other (Specify) | **Case 1** — incomplete, **no revisit** |
| `999` | Refused to answer | **Case 1** — incomplete, **no revisit** |

**`house_found` codes** (SurveyCTO `housefound`; export `house_found`):

| Code | Label | Outcome |
|-----:|-------|---------|
| `1` | Yes found the household/family | Continue girl logics |
| `2` | No, the family has moved away | Cases 3–5 via `family_whereabouts` / `family_moveadd_samevill` |
| `3` | No, could not trace family | **Case 6** — incomplete, **no revisit** |

**Follow-up KPIs** (operational metrics row):

| Metric | Formula |
|--------|---------|
| **Follow-up Attempts** | Submissions with `visit_num = 2` or `3` where a **prior visit exists**, the girl was **not yet tracked** before that form, and the prior visit still required follow-up (structure located `house_found = 1`, respondent temporarily unavailable, not a refusal or move). Hover for 2nd vs 3rd split. |
| **Girls Revisited** | Unique girls with at least one such follow-up submission. Hover for 2nd vs 3rd split. |

Forms with `visit_num = 2` or `3` but **no prior visit** in the data are **not** counted — the girl was not actually revisited. Forms after the girl was **already tracked** are also excluded.

| Scenario | Follow-up Attempts | Girls Revisited |
|----------|-------------------:|----------------:|
| 1st visit failed (girl not located), then 2nd visit submitted | 1 | 1 |
| 2nd visit failed, then 3rd visit submitted | 1 | 1 |
| 5 follow-up forms across 2 girls (mix of 2nd & 3rd) | 5 | 2 |
| Form shows `visit_num = 3` but no earlier visit for that girl | 0 | 0 |
| Girl tracked on 1st visit; later `visit_num = 3` form submitted | 0 | 0 |

---

## 5. Tracking page — operational metrics

Secondary KPI row. All respect active filters.

| Metric | Formula / logic | Level |
|--------|-----------------|-------|
| **Girls Attempted** | Unique girls in filtered data | Girl |
| **Tracked Girls** | Unique girls meeting the full tracking success criteria (see §2) | Girl |
| **Field Coverage %** | `(Girls Attempted ÷ Assignment Pool) × 100` | Girl |
| **Success Rate %** | `(Successfully Tracked ÷ Success Target) × 100` | Girl vs protocol target |
| **Not Tracked** | Unique girls attempted but not successfully tracked | Girl |
| **Girl Not Found** | Untracked breakdown: house located, girl not found | Girl |
| **No Consent** | Untracked breakdown: explicit consent refusal (`consent = 0` or `2`) | Girl |
| **Follow-up Attempts** | Protocol 2nd/3rd visit forms (`visit_num` 2 or 3) after a prior unsuccessful visit when follow-up was still required. Tooltip: 2nd vs 3rd counts | Submission |
| **Girls Revisited** | Unique girls with an actual follow-up visit (same rules). Tooltip: girls with 2nd vs 3rd revisit | Girl |
| **Girls 2024** | Unique girls with any submission inferred as the `2023-2024` listing (`batch = 2` / new-sample batch 2) | Girl |
| **Girls 2023** | All remaining attempted girls = `Girls Attempted − Girls 2024` (baseline girls + new-sample batch 1). Baseline rows carry no `batch`/year-coded ID, so they default to 2023 | Girl |

> **Note:** Girls 2023 and Girls 2024 are a strict partition of attempted girls, so **`Girls 2023 + Girls 2024 = Girls Attempted`** always holds.
| **Untraceable HH** | Unique girls whose household was never located (`house_found = 3`) **and** who were never successfully tracked. Girls untraceable on one visit but tracked on a revisit are excluded | Girl |
| **Family Moved** | Unique girls whose household had moved (`house_found = 2`) and who were **never** successfully tracked (mirrors Untraceable HH; a girl tracked on a later visit is excluded) | Girl |
| **Consent Rate %** | `(Unique girls with consent = 1 among located households ÷ Unique girls with located household) × 100` | Girl |
| **Form Completion %** | `(Submissions with survey_status = 1 ÷ Total submissions) × 100` | Submission |
| **Incomplete / Other** | Submissions with `survey_status = 2` or `99` | Submission |
| **Duplicate Visits** | Count of girl + visit combinations submitted more than once | Submission groups |
| **Girls / Enumerator** | `Girls Attempted ÷ Total Enumerators` | Average |

### Form Completion % vs Success Rate %

| | Form Completion % | Success Rate % |
|--|-------------------|----------------|
| **Question** | How many forms were marked complete? | How close are we to the study target? |
| **Numerator** | Submissions with `survey_status = 1` | Successfully tracked girls |
| **Denominator** | All submissions | Protocol success target (4,250 or cohort share) |
| **Can be 100% while success is low?** | Yes — a form can be “complete” even if the girl was not found or not fully tracked. | — |

---

## 6. Tracking page — charts

| Chart | What it shows |
|-------|----------------|
| **Top Villages with Untracked Girls** | Villages with the most unique girls not successfully tracked |
| **Tracked by District** | Successfully tracked girls per district |
| **Untracked Girls by District** | Unique girls present in the (filtered) data who were not successfully tracked, per district |
| **Why Girls Remain Untracked** | Bar chart of untracked breakdown reasons (§4) |
| **Tracking Trend Over Time** | Cumulative count of successfully tracked girls by submission date |
| **Tracked Girls (Enrolled vs Dropped Out)** | Among successfully tracked girls: **Enrolled** vs **Dropped Out**. Baseline uses `enrollstat_label`; new sample uses `girl_found_confirm_enrolled` / `girl_found_confirm_dropped` when the listing label is absent |
| **Baseline vs New Sample Progress** | Stacked bars: tracked vs remaining to each group’s success target |
| **Untracked Girls Rate by Enumerator (%)** | Per enumerator: `(untracked girls ÷ assigned girls) × 100` |

**Enumerator untracked rate:**

```
Rate % = (Untracked girls for enumerator ÷ Total girls for enumerator) × 100
```

---

## 7. Main dashboard metrics

The home **Dashboard** combines Tracking, Household, and Girls survey CSVs.

| Metric | Formula / logic |
|--------|-----------------|
| **Total Submissions** | All survey rows after filters |
| **Girls Tracked** | Unique tracking girls meeting §2 |
| **Total Enumerators** | Distinct enumerators across all survey types |
| **Survey Completion Rate** | `(All submissions with survey_status = 1 ÷ All submissions) × 100` |
| **Tracking Success Rate** | `(Successfully tracked girls ÷ Unique tracking girls attempted) × 100` |
| **HH Completion Rate** | `(Girls with both mother and father household forms ÷ Unique household girls) × 100` |

**Note:** Main-dashboard **Tracking Success Rate** is different from Tracking-page **Success Rate %**:

| | Dashboard “Tracking Success Rate” | Tracking page “Success Rate %” |
|--|-----------------------------------|--------------------------------|
| Denominator | Girls attempted in export | Protocol success target (4,250, etc.) |
| Use | Operational yield on field attempts | Progress toward study outcome target |

---

## 8. Survey field reference

Common SurveyCTO fields used in logic:

| Field | Typical values | Meaning in dashboard |
|-------|----------------|----------------------|
| `house_found` | `1` located · `2` moved · `3` untraceable | Household location outcome |
| `girl_found` | `1`/`2`/`3` found · `4`/`99`/`999` permanent not-found (incomplete, no revisit) · empty temporary | Whether the girl was found (SurveyCTO list: `girlfound`) |
| `girl_found_confirm_enrolled` | `1` enrolled · `2` not enrolled | New sample — whether interview reached consent |
| `girl_found_confirm_dropped` | `1` / `2` | Baseline enrollment confirmation |
| `consent` | `1` yes · `0`/`2` no/refused · empty not recorded | Consent outcome |
| `survey_status` | `1` complete · `2` incomplete · `99` refusal | Form completion status |
| `visit_num` | `1`, `2`, `3` | Attempt number (1st / 2nd / 3rd). Follow-up KPIs count protocol 2nd & 3rd visits only — see §4.1 |
| `enrollstat_label` | e.g. Enrolled, Dropped Out | Listing enrollment at tracking |

### School name resolution

```
school name = school_label (baseline)
           OR new_school_label (new sample)
           OR school (if not a numeric ID only)
```

---

## 9. Filters — how they affect metrics

All metrics are recomputed on **filtered** rows only.

| Filter | Matches on |
|--------|------------|
| District | `district` code |
| Tracking group | Export cohort (`baseline` / `new-sample`) |
| Session | Inferred session (`2022-2023` / `2023-2024`). The whole **baseline** cohort resolves to **2022-2023** (the baseline export has no `batch`/year-coded ID). New-sample rows resolve by `batch` (`1` → 2022-2023, `2` → 2023-2024) or listing-ID year pattern. This does not affect the Girls 2023/2024 KPIs. |
| Enumerator | `enumerator_id` |
| Village | Resolved village **name** (`village_label`) — shared across both export files |
| School | Resolved school name (see §8) |
| Date range | `SubmissionDate` (inclusive end date) |

---

## 9b. Monitoring page — enumerator performance vs daily target

> **Full reference with examples:** see [`MONITORING_METRICS.md`](./MONITORING_METRICS.md).

The **Monitoring** module tracks field productivity against the protocol's
per-enumerator **daily tracking target of 10 girls/day**
(`DAILY_TRACKING_TARGET_PER_ENUMERATOR` in `protocol.ts`). All metrics respect
the same filters as the Tracking page and are computed by
`computeMonitoringMetrics()`.

**Key definitions**

- **Enumerator-day** = one distinct (enumerator × submission date) pair. An
  enumerator active on 4 days contributes 4 enumerator-days.
- **Expected tracked** = `enumerator-days × 10` — how many girls *should* have
  been tracked given the days actually worked.

### Headline KPIs

| Metric | Formula / logic |
|--------|-----------------|
| **Total Submissions** | Tracking forms in filtered data |
| **Girls Attempted** | Unique girls visited |
| **Successfully Tracked** | Unique girls meeting the §2 success criteria |
| **Active Enumerators** | Distinct enumerators who submitted |
| **Field Days** | Distinct submission dates with activity |
| **Avg Tracked / Enum / Day** | `Successfully Tracked ÷ Enumerator-days` (green if ≥ 10) |
| **Target Achievement %** | `(Successfully Tracked ÷ Expected tracked) × 100` |
| **Days Meeting Target %** | `(Enumerator-days with ≥ 10 girls tracked ÷ Enumerator-days) × 100` |

### Per-enumerator table

| Column | Formula / logic |
|--------|-----------------|
| **Submissions** | Forms submitted by the enumerator |
| **Girls** | Unique girls attempted |
| **Tracked** | Unique girls successfully tracked |
| **Success %** | `(Tracked ÷ Girls) × 100` |
| **Days** | Distinct active days |
| **Avg/Day (Tracked)** | `Tracked ÷ Days` (green if ≥ 10) |
| **Target % (Tracked)** | `(Tracked ÷ (Days × 10)) × 100`, shown as a progress bar |
| **Avg/Day (Subs)** | `Submissions ÷ Days` (green if ≥ 10) |
| **Target % (Subs)** | `(Submissions ÷ (Days × 10)) × 100`, shown as a progress bar |
| **Status** | *On track* if tracked `Avg/Day ≥ 10`, else *Below* |

### Charts

| Chart | What it shows |
|-------|----------------|
| **Daily Tracking vs Target** | Bars of girls tracked per day vs a dashed expected line (`active enumerators × 10`) |
| **Daily Field Activity** | Submissions per day plus active enumerators per day |
| **Avg Girls Tracked / Day by Enumerator** | Per-enumerator average with a reference line at the daily target; green bars meet it |
| **Submissions vs Tracked by Enumerator** | Workload (submissions) against successful outcomes (tracked) |

---

## 9c. Error Report page — data-quality issues

> **Full reference with examples:** see [`ERROR_REPORT_METRICS.md`](./ERROR_REPORT_METRICS.md).

The **Error Report** (`/surveys/errors`) surfaces validation issues from
`Error_log/Daily_Error_Log.xlsx`, split into **Critical** (must-fix) and
**Quality** (flag for review) severities for **field enumerator** errors.
Cross-survey integrity checks (e.g. *Tracking vs Household*) are excluded for
now. Logic lives in `src/lib/data/error-metrics.ts`.

---

## 10. Source code map

| Area | File |
|------|------|
| Protocol targets | `src/lib/data/protocol.ts` |
| Tracking metrics & logic | `src/lib/data/tracking-metrics.ts` |
| Monitoring metrics & logic | `computeMonitoringMetrics()` in `src/lib/data/tracking-metrics.ts` |
| Main dashboard metrics | `src/lib/data/survey-metrics.ts` |
| CSV loading | `src/lib/data/tracking-loader.ts` · `survey-loader.ts` |
| Tracking KPI UI | `src/components/tracking/tracking-kpis.tsx` |
| Operational KPI UI | `src/components/tracking/tracking-secondary-kpis.tsx` |
| Monitoring UI | `src/components/monitoring/*` · `src/app/monitoring/page.tsx` |
| Monitoring metrics doc | `MONITORING_METRICS.md` |
| Error Report metrics & logic | `src/lib/data/error-metrics.ts` |
| Error log loading (xlsx) | `src/lib/data/error-loader.ts` |
| Error Report UI | `src/components/errors/*` · `src/app/surveys/errors/page.tsx` |
| Error Report metrics doc | `ERROR_REPORT_METRICS.md` |

---

## 11. Quick comparison table

| You want to know… | Use this metric |
|-------------------|-----------------|
| How many forms enumerators submitted | **Total Submissions** |
| How many girls we fully tracked (outcome) | **Successfully Tracked** |
| Progress toward the 4,250 study goal | **Success Rate %** |
| How much of the assignment list we’ve touched | **Field Coverage %** |
| How many forms were marked complete in SurveyCTO | **Form Completion %** |
| How many attempted girls failed full tracking | **Not Tracked** |
| Why girls weren’t tracked | **Untracked breakdown** / **Why Girls Remain Untracked** chart |
| Enumerator workload balance | **Girls / Enumerator** |
| Consent among located households | **Consent Rate %** |

---

*Last updated to match dashboard logic in `tracking-metrics.ts` and `protocol.ts`. If export columns or protocol targets change, update those files and this document together.*
