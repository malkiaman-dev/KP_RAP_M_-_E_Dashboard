# DQA Script — KPRAP Data Quality

Runs enumerator-attributable data-quality checks for the active survey modules and writes Excel error logs for the Tracking Dashboard Error Report page.

## Active surveys

| Survey | Source files |
|--------|----------------|
| **Tracking** | `Tracking_Survey_NewSample.csv` + `Tracking_Survey_Baseline.csv` (checked together) |
| **Household** | `Household_Survey.csv` |
| **Girls** | `Girls_Survey.csv` |

Listing, School, and Driver checks are **not** run.

Cross-survey integrity checks still generated (optional for review; dashboard hides them):

- Tracking vs Household
- Household vs Girls

## Run

1. Keep daily SurveyCTO exports in the project `Surveys/` folder (preferred), or copy them into `DQA_Script/data_raw/` using the filenames above.
2. From `DQA_Script/`:

```bash
python run_dqa.py
```

Or from `dashboard/`:

```bash
npm run dqa
```

The Error Report page also auto-runs DQA in the background when `Surveys/` files are newer than `Error_log/Daily_Error_Log.xlsx`. Publish live regenerates first when the log is stale.

## Outputs

Written to both:

- `Error_log/` (consumed by the dashboard at `/surveys/errors`)
- `DQA_Script/outputs/` (local copy; gitignored)

Files:

- `Daily_Error_Log.xlsx` — sheets: `errors`, `by_survey`, `by_enumerator`
- `Weekly_QA_Summary.xlsx`
- `Enumerator_Performance.xlsx`
