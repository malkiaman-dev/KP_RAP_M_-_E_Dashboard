# checks/school_vs_driver.py
from __future__ import annotations

import warnings
import pandas as pd
from utils.logging import make_issue


def run(school_df: pd.DataFrame, driver_df: pd.DataFrame, col: dict) -> list[dict]:
    issues: list[dict] = []

    # ---------------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------------
    def pick(df: pd.DataFrame, *names: str) -> str | None:
        for n in names:
            if n and n in df.columns:
                return n
        return None

    def cfg(df: pd.DataFrame, key: str, *fallbacks: str) -> str | None:
        v = col.get(key)
        if isinstance(v, str) and v in df.columns:
            return v
        return pick(df, *fallbacks)

    def is_missing(v) -> bool:
        return pd.isna(v) or (isinstance(v, str) and v.strip() == "")

    def clean_scalar(x):
        try:
            if hasattr(x, "item"):
                return x.item()
        except Exception:
            pass
        return x

    def norm_id(v) -> str | None:
        """Normalize IDs like 14118.0 -> '14118'."""
        if is_missing(v):
            return None
        vv = clean_scalar(v)
        try:
            f = float(vv)
            if f.is_integer():
                return str(int(f))
            return str(f).strip()
        except Exception:
            s = str(vv).strip()
            return s if s else None

    def safe_dt_one(x) -> pd.Timestamp | None:
        if is_missing(x):
            return None
        s = str(clean_scalar(x)).strip()
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="Could not infer format", category=UserWarning)
            dt = pd.to_datetime(s, errors="coerce")
        if pd.isna(dt):
            return None
        return dt

    def is_conducted(
        df: pd.DataFrame,
        i,
        start_col: str | None,
        end_col: str | None,
        sub_col: str | None,
        key_col: str | None,
        inst_col: str | None,
    ) -> bool:
        # 1) valid start/end
        if start_col and end_col and start_col in df.columns and end_col in df.columns:
            st = safe_dt_one(df.at[i, start_col])
            et = safe_dt_one(df.at[i, end_col])
            if st is not None and et is not None and et >= st:
                return True

        # 2) submission date present
        if sub_col and sub_col in df.columns and not is_missing(df.at[i, sub_col]):
            return True

        # 3) KEY / instanceID present
        if key_col and key_col in df.columns and not is_missing(df.at[i, key_col]):
            return True
        if inst_col and inst_col in df.columns and not is_missing(df.at[i, inst_col]):
            return True

        return False

    def fmt_kv(**kwargs) -> str:
        parts = []
        for k, v in kwargs.items():
            v = clean_scalar(v)
            if is_missing(v):
                parts.append(f"{k}: (missing)")
            else:
                parts.append(f"{k}: {v}")
        return ", ".join(parts)

    # ---------------------------------------------------------------------
    # School columns (your School_Survey.csv)
    # ---------------------------------------------------------------------
    sk = cfg(school_df, "record_key", "KEY", "key", "record_key")
    si = cfg(school_df, "instance_id", "instanceID", "instance_id")
    ss = cfg(school_df, "submission_date", "SubmissionDate", "submission_date", "_submission_time")
    se = cfg(school_df, "enumerator", "enumerator", "Enumerator")
    seid = cfg(school_df, "enumerator_id", "enumerator_id", "Enumerator_id", "enumeratorid")
    sdv = cfg(school_df, "deviceid", "deviceid", "device_id")
    sdist = cfg(school_df, "district", "district", "district_id", "district_code")
    s_start = cfg(school_df, "starttime", "starttime", "start_time")
    s_end = cfg(school_df, "endtime", "endtime", "end_time")

    # school id in School survey
    sschool = cfg(school_df, "middleschool", "middleschool", "school", "school_id", "emis")
    if not sschool or sschool not in school_df.columns:
        return issues

    # ---------------------------------------------------------------------
    # Driver columns (your Driver_Survey.csv)
    # ---------------------------------------------------------------------
    dk = cfg(driver_df, "record_key", "KEY", "key", "record_key")
    di = cfg(driver_df, "instance_id", "instanceID", "instance_id")
    ds = cfg(driver_df, "submission_date", "SubmissionDate", "submission_date", "_submission_time")
    ddist = cfg(driver_df, "district", "district", "district_id", "district_code")
    d_start = cfg(driver_df, "starttime", "starttime", "start_time")
    d_end = cfg(driver_df, "endtime", "endtime", "end_time")

    # school id in Driver survey (your file uses "school")
    dschool = cfg(driver_df, "school", "school", "middleschool", "school_id", "emis")
    if not dschool or dschool not in driver_df.columns:
        return issues

    def meta_school(j) -> dict:
        # IMPORTANT: This is a cross-survey issue, not an enumerator error.
        # So we force enumerator fields to "-" to avoid misleading performance stats.
        return dict(
            record_key=school_df.at[j, sk] if sk else None,
            instance_id=school_df.at[j, si] if si else None,
            enumerator="-",
            enumerator_id="-",
            deviceid="-",
            submission_date=school_df.at[j, ss] if ss else None,
            district=school_df.at[j, sdist] if sdist else None,
        )

    # ---------------------------------------------------------------------
    # Build Driver index: conducted driver submissions by school (and district)
    # ---------------------------------------------------------------------
    driver_by_id: set[str] = set()
    driver_pairs: set[tuple[str | None, str]] = set()

    for i in driver_df.index:
        sid = norm_id(driver_df.at[i, dschool])
        if not sid:
            continue

        if not is_conducted(driver_df, i, d_start, d_end, ds, dk, di):
            continue

        dist = norm_id(driver_df.at[i, ddist]) if (ddist and ddist in driver_df.columns) else None
        driver_by_id.add(sid)
        driver_pairs.add((dist, sid))

    strict_possible = (sdist and sdist in school_df.columns) and (ddist and ddist in driver_df.columns)

    # ---------------------------------------------------------------------
    # RULE (CRITICAL): School conducted but Driver missing
    # ---------------------------------------------------------------------
    issued: set[tuple[str | None, str]] = set()

    for j in school_df.index:
        sid = norm_id(school_df.at[j, sschool])
        if not sid:
            continue

        if not is_conducted(school_df, j, s_start, s_end, ss, sk, si):
            continue

        dist = norm_id(school_df.at[j, sdist]) if (sdist and sdist in school_df.columns) else None

        found = False
        if strict_possible:
            found = (dist, sid) in driver_pairs
            if not found:
                found = sid in driver_by_id
        else:
            found = sid in driver_by_id

        if found:
            continue

        # avoid duplicate issue per (district, school)
        dedup_key = (dist, sid)
        if dedup_key in issued:
            continue
        issued.add(dedup_key)

        m = meta_school(j)

        value = fmt_kv(
            SchoolID=sid,
            District=dist if dist else "(missing)",
        )

        issues.append(
            make_issue(
                "School vs Driver",
                "CRITICAL",
                "SVD_CE_01",
                "Driver survey missing after School survey",
                "A conducted School survey exists for this middle school, but no conducted Driver survey record was found for the same school.",
                sschool,
                value,
                m["record_key"],
                m["instance_id"],
                m["enumerator"],       # "-"
                m["enumerator_id"],    # "-"
                m["deviceid"],         # "-"
                m["submission_date"],
                m["district"],
            )
        )

    return issues
