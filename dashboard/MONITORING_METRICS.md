# Monitoring Module — Metrics Reference

This document explains every metric on the **Monitoring** page (`/monitoring`): what it means, how it is calculated, and a simple numeric example.

The Monitoring module measures **field productivity** — how well enumerators are performing against the protocol’s **daily target of 10 girls per enumerator per working day**.

Data comes from the same tracking CSV exports as the Tracking page. All metrics respect the active **filters** (district, tracking group, session, enumerator, village, school, date range).

---

## 1. Purpose

| Question | Where to look |
|----------|----------------|
| Are enumerators meeting the 10 girls/day target? | **Avg Tracked / Enum / Day**, **Target %**, **Status** |
| How productive was a specific day? | **Daily Tracking vs Target** chart |
| Who is performing well or falling behind? | **Enumerator Performance** table |
| Are we deploying enough staff vs output? | **Daily Field Activity** chart |

**Monitoring** focuses on **daily productivity and enumerator performance**.  
**Tracking** focuses on **study outcomes** (4,250 success target, cohort progress, untracked breakdown).

---

## 2. Daily target (protocol)

From `src/lib/data/protocol.ts`:

```
DAILY_TRACKING_TARGET_PER_ENUMERATOR = 10
```

**Meaning:** Each enumerator is expected to **successfully track 10 girls per day** they work in the field.

This target is used for:
- Expected daily totals (`active enumerators × 10`)
- Per-enumerator **Target %** columns
- Green / amber / red status colors

---

## 3. Core concepts

### Submission vs unique girl

| Term | Meaning |
|------|---------|
| **Submission** | One row in the CSV — one form/visit attempt. |
| **Unique girl** | One assigned girl (`girl_id`, `girl`, `girl_1`, `girl_2`, or `KEY`). Multiple submissions for the same girl count once for girl-level metrics. |

### Successfully tracked

A girl is **successfully tracked** when at least one submission meets **all** of:

```
house_found = 1 OR 2
AND girl_found = 1
AND consent = 1
AND survey_status = 1
```

See `METRICS.md` §2 for the full definition.

### Enumerator-day

One **enumerator-day** = one enumerator who submitted at least one form on one calendar date.

**Example:**  
Alia works on Mon, Tue, Wed → **3 enumerator-days**.  
9 enumerators each work 2 days → **18 enumerator-days**.

### Active enumerator (daily)

On a given date, an **active enumerator** is anyone who submitted at least one form that day.

**Example — 21-Jun-2026, D.I. Khan:**  
7 enumerators submitted → **7 active enumerators** → expected target for that day = `7 × 10 = 70` girls tracked.

### Expected tracked

How many girls **should** have been tracked given who actually worked:

```
Expected tracked (per day)     = Active enumerators that day × 10
Expected tracked (per enum)    = Active days for that enumerator × 10
Expected tracked (headline KPI)  = Total enumerator-days × 10
```

**Important:** Expected is based on **enumerators who actually submitted**, not the full assigned roster. If 7 of 9 assigned enumerators worked, the daily expected line is **70**, not 90.

---

## 4. Filters

Same as the Tracking page. Metrics are recomputed on **filtered rows only**.

| Filter | Matches on |
|--------|------------|
| District | `district` code |
| Tracking group | Baseline / New Sample (source file) |
| Session | 2022–2023 / 2023–2024 |
| Enumerator | `enumerator_id` |
| Village | `village` code |
| School | Resolved school name |
| Date range | `SubmissionDate` (inclusive end date) |

**Example:** Filter **District = D.I. Khan** and **Date = 21-Jun-2026 only** → all KPIs, table rows, and charts show only that district and day.

---

## 5. Headline KPIs (top row)

Eight cards at the top of the Monitoring page.

### Total Submissions

**Formula:** Count of all tracking form rows in the filtered data.

**Example:** 54 forms submitted on 21-Jun in D.I. Khan → **54**.

---

### Girls Attempted

**Formula:** Count of **unique girls** in the filtered data.

**Example:** 54 submissions covering 54 different girls → **54**.

---

### Successfully Tracked

**Formula:** Count of **unique girls** who meet the successfully tracked definition (§3).

**Example:** 50 of 54 girls fully tracked → **50**.

---

### Active Enumerators

**Formula:** Count of **distinct enumerators** who submitted in the filtered data.

**Example:** Shazia, Chashm Gul, Irum, … (7 names) → **7**.

---

### Field Days

**Formula:** Count of **distinct submission dates** with any activity in the filtered data.

**Example:** Data only on 21-Jun and 22-Jun → **2**.

---

### Avg Tracked / Enum / Day

**Formula:**

```
Avg Tracked / Enum / Day = Successfully Tracked ÷ Total enumerator-days
```

**Color:** Green if ≥ 10, red if &lt; 10.

**Example:**  
- 100 girls tracked across 14 enumerator-days  
- `100 ÷ 14 = 7.1` → **7.1** (red — below target)

---

### Target Achievement %

**Formula:**

```
Target Achievement % = (Successfully Tracked ÷ Expected tracked) × 100

where Expected tracked = enumerator-days × 10
```

**Example:**  
- 100 tracked, 14 enumerator-days → expected = `14 × 10 = 140`  
- `(100 ÷ 140) × 100 = 71.4%` → **71.4%**

---

### Days Meeting Target %

**Formula:**

```
Days Meeting Target % = (Enumerator-days with ≥ 10 girls tracked ÷ Total enumerator-days) × 100
```

For each enumerator-day, count how many **unique girls were successfully tracked that day**. If that count is **≥ 10**, that day “meets target.”

**Example:**  
- 14 enumerator-days total  
- On 5 of those days, the enumerator tracked ≥ 10 girls  
- `(5 ÷ 14) × 100 = 35.7%` → **35.7%**

**Note:** This measures **consistency day-by-day**, not overall totals. An enumerator could have a good **Target Achievement %** but a low **Days Meeting Target %** if a few very strong days offset many weak days.

---

## 6. Summary line (below KPIs)

Example text:

```
9 active enumerators · 14 enumerator-days · 140 girls expected at target · 100 actually tracked · Top: Shazia Bibi (17 tracked)
```

| Part | Meaning |
|------|---------|
| 9 active enumerators | Distinct enumerators in filtered data |
| 14 enumerator-days | Sum of working days across all enumerators |
| 140 girls expected | `14 × 10` |
| 100 actually tracked | Successfully tracked girls |
| Top performer | Enumerator with most tracked girls in view |

---

## 7. Enumerator Performance table

One row per enumerator. Scroll horizontally to see submission-based columns. **Status** stays pinned on the right.

### Submissions

**Formula:** Total form rows submitted by this enumerator.

**Example:** Shazia submitted 18 forms → **18**.

---

### Girls

**Formula:** Unique girls this enumerator attempted.

**Example:** 18 submissions, 18 different girls → **18**.

---

### Tracked

**Formula:** Unique girls this enumerator **successfully tracked**.

**Example:** 17 of 18 girls tracked → **17** (shown in teal).

---

### Success %

**Formula:**

```
Success % = (Tracked ÷ Girls) × 100
```

**Example:** `17 ÷ 18 × 100 = 94%` → **94%**.

**Note:** This is **tracking yield** (of girls visited, how many were fully tracked). It is **not** the same as **Target %** or the Tracking page **Success Rate %** (which uses the 4,250 study target).

---

### Days

**Formula:** Distinct dates this enumerator submitted at least one form.

**Example:** Worked on 21-Jun and 22-Jun → **2**.

---

### Avg/Day (Tracked)

**Formula:**

```
Avg/Day (Tracked) = Tracked ÷ Days
```

**Color:** Green if ≥ 10, red if &lt; 10.

**Example:** 17 tracked over 2 days → `17 ÷ 2 = 8.5` → **8.5** (red).

---

### Target % (Tracked)

**Formula:**

```
Target % (Tracked) = (Tracked ÷ (Days × 10)) × 100
```

Shown with a progress bar (teal ≥ 100%, amber 70–99%, red &lt; 70%).

**Example:** 17 tracked, 2 days → expected = 20 → `(17 ÷ 20) × 100 = 85%` → **85%** (amber bar).

---

### Avg/Day (Subs)

**Formula:**

```
Avg/Day (Subs) = Submissions ÷ Days
```

**Color:** Green if ≥ 10, red if &lt; 10.

**Example:** 18 submissions over 2 days → `18 ÷ 2 = 9.0` → **9.0** (red).

**Difference from Avg/Day (Tracked):** Counts **all forms submitted**, including revisits and unsuccessful attempts — a measure of **field activity / workload**, not outcome.

---

### Target % (Subs)

**Formula:**

```
Target % (Subs) = (Submissions ÷ (Days × 10)) × 100
```

**Example:** 18 submissions, 2 days → expected = 20 → `(18 ÷ 20) × 100 = 90%` → **90%** (amber bar).

---

### Status (pinned column)

A **single badge** whose color follows the **Target %** progress bar currently in view:

| Scroll position | Badge reflects |
|---------------|----------------|
| Default (Tracked columns visible) | **Target % (Tracked)** |
| Scrolled right (Subs columns visible) | **Target % (Subs)** |

**Badge labels and colors** (same thresholds as progress bars):

| Target % | Label | Color |
|----------|-------|-------|
| ≥ 100% | On track | Teal |
| 70–99% | Near target | Amber |
| &lt; 70% | Below | Red |

**Example:**  
- **Target % (Tracked) = 67%** → badge shows **Below** (red)  
- Scroll right; **Target % (Subs) = 70%** → badge switches to **Near target** (amber)

Header shows **Status (Tracked)** or **Status (Subs)** to indicate which metric the badge is using.

---

## 8. Charts

### Daily Tracking vs Target

**What it shows:** Girls **successfully tracked** each day (teal bars) vs the **expected daily target** (yellow dashed line).

**Expected line formula:**

```
Expected (per day) = Active enumerators that day × 10
```

**Example — 21-Jun-2026:**

| Metric | Value |
|--------|------:|
| Active enumerators | 7 |
| Expected line | 70 |
| Girls tracked (bar) | 54 |
| Gap | 16 below target |

**How to read:** If the bar is below the dashed line, the team tracked fewer girls than the daily target for that day.

---

### Daily Field Activity

**What it shows:** Two metrics on **different Y-axes** (left vs right scale):

| Series | Axis | Meaning |
|--------|------|---------|
| Purple bars | Left | **Submissions** that day |
| Teal line | Right | **Active enumerators** that day |

**Example — 22-Jun-2026:**

| Submissions | Active enumerators |
|------------:|-------------------:|
| 110 | 21 |

**How to read:**  
- High enumerators + high submissions = strong deployment and output.  
- High enumerators + low submissions = many people in field but low output per person.  
- The line and bar **visually crossing** has no special meaning — they use different scales.

---

### Avg Girls Tracked / Day by Enumerator

**What it shows:** Each enumerator’s average tracked girls per working day (top 15 by avg).

| Visual | Meaning |
|--------|---------|
| Yellow dashed line at 10 | Daily target |
| Green bar | Avg ≥ 10 (meets target) |
| Red bar | Avg &lt; 10 (below target) |

**Tooltip:** `Enumerator name · District` and avg tracked/day.

**Example — Shazia Bibi · D.I. Khan:**  
17 tracked over 2 days → **8.5** avg (red bar, below dashed line).

---

### Submissions vs Tracked by Enumerator

**What it shows:** Side-by-side bars per enumerator (top 15 by submissions).

| Bar | Meaning |
|-----|---------|
| Purple | Total **submissions** (workload) |
| Teal | Total **tracked** girls (outcome) |

**Example — Chashm Gul:**  
31 submissions, 31 tracked → bars equal height (high yield).  
An enumerator with 20 submissions but 15 tracked → purple bar taller than teal (some attempts did not result in full tracking).

**Tooltip:** `Enumerator name · District`.

---

## 9. Color coding summary

| Element | Green / Teal | Amber | Red |
|---------|----------------|-------|-----|
| Avg/Day columns | ≥ 10 | — | &lt; 10 |
| Target % progress bar | ≥ 100% | 70–99% | &lt; 70% |
| Status badge | On track | Near target | Below |
| Avg tracked/day chart bars | ≥ 10 | — | &lt; 10 |

---

## 10. Worked example (full enumerator row)

**Shazia Bibi · D.I. Khan** — filtered to 21–22 Jun:

| Field | Calculation | Result |
|-------|-------------|--------|
| Submissions | 18 forms | 18 |
| Girls | 18 unique girls | 18 |
| Tracked | 17 successfully tracked | 17 |
| Success % | 17 ÷ 18 × 100 | 94% |
| Days | 2 working days | 2 |
| Avg/Day (Tracked) | 17 ÷ 2 | 8.5 |
| Target % (Tracked) | 17 ÷ (2×10) × 100 | 85% |
| Avg/Day (Subs) | 18 ÷ 2 | 9.0 |
| Target % (Subs) | 18 ÷ (2×10) × 100 | 90% |
| Status (Tracked view) | 85% → tier | Near target (amber) |

---

## 11. Metrics comparison (avoid confusion)

| Metric | Numerator | Denominator | Use |
|--------|-----------|-------------|-----|
| **Success %** (table) | Tracked girls | Girls attempted | Yield per enumerator |
| **Target % (Tracked)** | Tracked girls | Days × 10 | vs daily productivity target |
| **Target % (Subs)** | Submissions | Days × 10 | vs daily activity target |
| **Target Achievement %** (KPI) | All tracked | All enumerator-days × 10 | Team-wide productivity |
| **Tracking Success Rate** (not on Monitoring page) | Tracked | Girls attempted | Operational yield |
| **Success Rate %** (Tracking page) | Tracked | 4,250 protocol target | Study outcome progress |

---

## 12. Source code map

| Area | File |
|------|------|
| Daily target constant | `src/lib/data/protocol.ts` |
| Monitoring calculations | `computeMonitoringMetrics()` in `src/lib/data/tracking-metrics.ts` |
| Successfully tracked logic | `isTrackedSubmission()` in `src/lib/data/tracking-metrics.ts` |
| Monitoring page | `src/app/monitoring/page.tsx` |
| Headline KPIs | `src/components/monitoring/monitoring-kpis.tsx` |
| Enumerator table | `src/components/monitoring/monitoring-enumerator-table.tsx` |
| Charts | `src/components/monitoring/monitoring-charts.tsx` |
| Filters (shared with Tracking) | `src/components/tracking/tracking-filters.tsx` |
| General tracking metrics | `METRICS.md` |

---

## 13. Quick reference

| You want to know… | Use this |
|-------------------|----------|
| Did we hit the daily target on a specific date? | **Daily Tracking vs Target** chart |
| How many enumerators worked each day? | **Daily Field Activity** (teal line) |
| Is an enumerator meeting 10/day on average? | **Avg/Day (Tracked)** or **Target % (Tracked)** |
| How much paperwork vs successful tracking? | Compare **Avg/Day (Subs)** vs **Avg/Day (Tracked)** |
| Who tracked the most girls? | Sort table by **Tracked** |
| Who is most consistent day-to-day? | **Days Meeting Target %** (headline KPI) |
| Team-wide productivity vs target | **Target Achievement %** |

---

*Last updated to match dashboard logic in `tracking-metrics.ts`, `protocol.ts`, and Monitoring UI components. If targets or calculations change in code, update this document together.*
