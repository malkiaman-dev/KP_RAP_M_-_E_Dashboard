from __future__ import annotations

from pathlib import Path

import pandas as pd

from utils.io import read_export, load_yaml
from utils.logging import (
    issues_to_df,
    rename_error_log_headers,
    rename_by_survey_headers,
    rename_by_enumerator_headers,
)
from utils.stats import (
    error_rate_by_enumerator,
    survey_issue_summary,
    enumerator_error_percentage_all_surveys,
)
from utils.context_enrich import enrich_issues_with_context

from checks import (
    tracking,
    household,
    girls,
    tracking_vs_household,
    household_vs_girls,
)

# Active survey modules only: Tracking (baseline + new sample), Household, Girls.
# Listing / School / Driver checks are intentionally excluded.
SURVEYS = [
    ("tracking", tracking),
    ("household", household),
    ("girls", girls),
]


def _resolve_input_files(cfg: dict, name: str) -> list[str]:
    """Support single input_file or a list of input_files (tracking cohorts)."""
    files = cfg.get("input_files")
    if isinstance(files, list) and files:
        return [str(f) for f in files]
    single = cfg.get("input_file")
    if single:
        return [str(single)]
    # Sensible defaults matching Surveys/ exports
    defaults = {
        "tracking": [
            "Tracking_Survey_NewSample.csv",
            "Tracking_Survey_Baseline.csv",
        ],
        "household": ["Household_Survey.csv"],
        "girls": ["Girls_Survey.csv"],
    }
    return defaults.get(name, [])


def _load_survey_frames(data_dirs: list[Path], filenames: list[str]) -> pd.DataFrame | None:
    frames: list[pd.DataFrame] = []
    for filename in filenames:
        path = next((d / filename for d in data_dirs if (d / filename).exists()), None)
        if path is None:
            print(f"  SKIP file not found in data dirs: {filename}")
            continue
        df = read_export(path)
        df = df.copy()
        df["_dqa_source_file"] = path.name
        print(f"  loaded {path.name} rows={len(df)} cols={len(df.columns)}")
        frames.append(df)
    if not frames:
        return None
    if len(frames) == 1:
        return frames[0]
    # Outer concat so baseline + new-sample column differences are preserved
    return pd.concat(frames, ignore_index=True, sort=False)


def _write_outputs(error_log_raw: pd.DataFrame, dfs: dict[str, pd.DataFrame], out_dirs: list[Path]) -> None:
    for out_dir in out_dirs:
        out_dir.mkdir(parents=True, exist_ok=True)

        daily_path = out_dir / "Daily_Error_Log.xlsx"
        with pd.ExcelWriter(daily_path, engine="openpyxl") as xw:
            rename_error_log_headers(error_log_raw).to_excel(xw, index=False, sheet_name="errors")

            by_survey = survey_issue_summary(error_log_raw)
            rename_by_survey_headers(by_survey).to_excel(xw, index=False, sheet_name="by_survey")

            by_enum = error_rate_by_enumerator(error_log_raw)
            rename_by_enumerator_headers(by_enum).to_excel(xw, index=False, sheet_name="by_enumerator")

        weekly_path = out_dir / "Weekly_QA_Summary.xlsx"
        with pd.ExcelWriter(weekly_path, engine="openpyxl") as xw:
            by_survey = survey_issue_summary(error_log_raw)
            rename_by_survey_headers(by_survey).to_excel(xw, index=False, sheet_name="by_survey")

            by_enum = error_rate_by_enumerator(error_log_raw)
            rename_by_enumerator_headers(by_enum).to_excel(xw, index=False, sheet_name="by_enumerator")

        perf_path = out_dir / "Enumerator_Performance.xlsx"
        with pd.ExcelWriter(perf_path, engine="openpyxl") as xw:
            by_enum = error_rate_by_enumerator(error_log_raw)
            rename_by_enumerator_headers(by_enum).to_excel(xw, index=False, sheet_name="performance")

            perf_pct = enumerator_error_percentage_all_surveys(error_log_raw, dfs)
            perf_pct.to_excel(xw, index=False, sheet_name="performance_pct")

        print(f"Wrote outputs -> {out_dir}")


def run_all(data_dirs: list[Path], config_dir: Path, out_dirs: list[Path]) -> None:
    issues_all: list[dict] = []
    dfs: dict[str, pd.DataFrame] = {}
    cfgs: dict[str, dict] = {}

    # -------------------------
    # 1) Single-survey checks
    # -------------------------
    for name, mod in SURVEYS:
        cfg_path = config_dir / f"{name}_columns.yaml"
        if not cfg_path.exists():
            print(f"[{name}] SKIP: missing config {cfg_path.name}")
            continue

        cfg = load_yaml(cfg_path)
        cfgs[name] = cfg

        filenames = _resolve_input_files(cfg, name)
        print(f"[{name}] loading {filenames}")
        df = _load_survey_frames(data_dirs, filenames)
        if df is None:
            print(f"[{name}] SKIP: no input files found")
            continue

        dfs[name] = df
        out = mod.run(df, cfg.get("columns", {}))
        print(f"[{name}] rows={len(df)} issues={len(out)}")
        issues_all.extend(out)

    # -------------------------
    # 2) Cross-survey: tracking vs household
    # -------------------------
    if "tracking" in dfs and "household" in dfs:
        linkage_cfg = (
            cfgs.get("tracking", {}).get("linkage", {})
            or cfgs.get("household", {}).get("linkage", {})
            or {}
        )
        if not linkage_cfg:
            linkage_cfg = {
                "tracking_name_prefix": "new_name_",
                "tracking_father_prefix": "new_father_name_",
                "tracking_school_prefix": "new_school_",
                "tracking_district_col": "district",
                "hh_name_prefix": "name_sibling_",
                "hh_gender_prefix": "gender_sibling_",
                "hh_listed_prefix": "listed_girl_",
                "hh_father_prefix": None,
                "hh_district_col": "district",
                "female_code": 2,
                "listed_yes": 1,
            }

        out = tracking_vs_household.run(dfs["tracking"], dfs["household"], linkage_cfg)
        print(f"[tracking_vs_household] issues={len(out)}")
        issues_all.extend(out)

    # -------------------------
    # 3) Cross-survey: household vs girls
    # -------------------------
    if "household" in dfs and "girls" in dfs:
        hvg_cfg = {
            "household_village": "village",
            "girls_village": "village",
            "household_girl": "girl",
            "girls_girl": "girl",
            "household_girl_label": "girlname_label",
        }
        out = household_vs_girls.run(dfs["household"], dfs["girls"], hvg_cfg)
        print(f"[household_vs_girls] issues={len(out)}")
        issues_all.extend(out)

    # -------------------------
    # 4) Attach girl / village / school context for Error Detail Log
    # -------------------------
    issues_all = enrich_issues_with_context(issues_all, dfs)

    # -------------------------
    # 5) Write Excel outputs
    # -------------------------
    print("TOTAL issues:", len(issues_all))
    error_log_raw = issues_to_df(issues_all)
    _write_outputs(error_log_raw, dfs, out_dirs)


def main():
    root = Path(__file__).resolve().parent
    project_root = root.parent

    # Prefer live dashboard exports in Surveys/, fall back to local data_raw/
    data_dirs = [
        project_root / "Surveys",
        root / "data_raw",
    ]

    # Dashboard reads Error_log/; keep a local copy under outputs/ too
    out_dirs = [
        project_root / "Error_log",
        root / "outputs",
    ]

    run_all(data_dirs, root / "config", out_dirs)


if __name__ == "__main__":
    main()
