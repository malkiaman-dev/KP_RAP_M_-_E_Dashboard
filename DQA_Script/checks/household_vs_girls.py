from __future__ import annotations

import warnings
import pandas as pd
from utils.logging import make_issue


def run(household_df: pd.DataFrame, girls_df: pd.DataFrame, col: dict) -> list[dict]:
    """
    Two-way mismatch checks:

    A) Household (COMPLETED) -> Girls (CONDUCTED)
       Flags girls who appear in a completed Household interview but have no conducted Girls survey.

    B) Girls (CONDUCTED) -> Household (COMPLETED)
       Flags girls who appear in a conducted Girls survey but have no completed Household interview.

    Matching strategy (same as your original):
      1) strict match: (village_id, girl_id) when village exists on both sides
      2) fallback: girl_id only

    Completed Household definition:
      - valid start/end time where end >= start, OR
      - valid SubmissionDate present

    Conducted Girls definition:
      - valid start/end time where end >= start, OR
      - valid SubmissionDate present, OR
      - KEY present, OR
      - instance_id present
    """

    issues: list[dict] = []

    # --------------------------
    # Helpers
    # --------------------------
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

    def clean_scalar(x):
        try:
            if hasattr(x, "item"):
                return x.item()
        except Exception:
            pass
        return x

    def is_missing(v) -> bool:
        return pd.isna(v) or (isinstance(v, str) and v.strip() == "")

    def norm_id(v) -> str | None:
        """Normalizes IDs like 14118.0 -> '14118', trims strings, returns None if missing."""
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
            return s if s != "" else None

    def safe_dt_one(x) -> pd.Timestamp | None:
        """Parse a single SurveyCTO datetime cell safely."""
        if is_missing(x):
            return None
        s = str(clean_scalar(x)).strip()

        # Common SurveyCTO style: "Oct 29, 2025 1:10:37 PM"
        primary_fmt = "%b %d, %Y %I:%M:%S %p"
        try:
            dt = pd.to_datetime(s, format=primary_fmt, errors="raise")
            if pd.isna(dt):
                return None
            return dt
        except Exception:
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", message="Could not infer format", category=UserWarning)
                dt = pd.to_datetime(s, errors="coerce")
            if pd.isna(dt):
                return None
            return dt

    def fmt_kv(**kwargs) -> str:
        parts = []
        for k, v in kwargs.items():
            v = clean_scalar(v)
            if is_missing(v):
                parts.append(f"{k}: (missing)")
            else:
                parts.append(f"{k}: {v}")
        return ", ".join(parts)

    def is_valid_interview_row(
        df: pd.DataFrame,
        i,
        start_col: str | None,
        end_col: str | None,
        sub_col: str | None,
    ) -> bool:
        """
        Determines if a row looks like a real, completed interview.
        Priority:
          - start/end parseable and end >= start
          - else SubmissionDate present
        """
        if start_col and end_col and start_col in df.columns and end_col in df.columns:
            st = safe_dt_one(df.at[i, start_col])
            et = safe_dt_one(df.at[i, end_col])
            if st is not None and et is not None and et >= st:
                return True

        if sub_col and sub_col in df.columns and not is_missing(df.at[i, sub_col]):
            return True

        return False

    def to_int_or_none(v):
        if is_missing(v):
            return None
        vv = clean_scalar(v)
        try:
            return int(float(vv))
        except Exception:
            return None

    # --------------------------
    # Household meta columns
    # --------------------------
    hk = cfg(household_df, "record_key", "KEY", "key", "record_key")
    hi = cfg(household_df, "instance_id", "instanceID", "instance_id")
    hs = cfg(household_df, "submission_date", "SubmissionDate", "submission_date")
    he = cfg(household_df, "enumerator", "enumerator")
    heid = cfg(household_df, "enumerator_id", "enumerator_id", "enumeratorid")
    hd = cfg(household_df, "deviceid", "deviceid", "device_id")
    hdist = cfg(household_df, "district", "district", "district_id", "district_code")

    h_start = cfg(household_df, "starttime", "starttime", "start_time")
    h_end = cfg(household_df, "endtime", "endtime", "end_time")

    # attempt counter (if present in exports)
    h_attempt = cfg(household_df, "attempt", "attempt", "visit_num", "visit_number")

    # --------------------------
    # Girls meta columns
    # --------------------------
    gk = cfg(girls_df, "record_key", "KEY", "key", "record_key")
    gi = cfg(girls_df, "instance_id", "instanceID", "instance_id")
    gs = cfg(girls_df, "submission_date", "SubmissionDate", "submission_date")
    ge = cfg(girls_df, "enumerator", "enumerator")
    geid = cfg(girls_df, "enumerator_id", "enumerator_id", "enumeratorid")
    gd = cfg(girls_df, "deviceid", "deviceid", "device_id")
    gdist = cfg(girls_df, "district", "district", "district_id", "district_code")

    g_start = cfg(girls_df, "starttime", "starttime", "start_time")
    g_end = cfg(girls_df, "endtime", "endtime", "end_time")

    # --------------------------
    # Matching columns
    # --------------------------
    hvillage = cfg(household_df, "household_village", "village")
    hgirl = cfg(household_df, "household_girl", "girl")

    hgirl_label = cfg(household_df, "household_girl_label", "girlname_label", "girl_label")
    hfather_label = cfg(
        household_df,
        "household_father_label",
        "fathername_label",
        "father_label",
        "father_name_label",
    )

    gvillage = cfg(girls_df, "girls_village", "village")
    ggirl = cfg(girls_df, "girls_girl", "girl")

    # If key columns are missing, don't crash the pipeline
    if not hgirl or hgirl not in household_df.columns:
        return issues
    if not ggirl or ggirl not in girls_df.columns:
        return issues

    def hh_meta(i):
        return dict(
            record_key=household_df.at[i, hk] if hk else None,
            instance_id=household_df.at[i, hi] if hi else None,
            enumerator=household_df.at[i, he] if he else None,
            enumerator_id=household_df.at[i, heid] if heid else None,
            deviceid=household_df.at[i, hd] if hd else None,
            submission_date=household_df.at[i, hs] if hs else None,
            district=household_df.at[i, hdist] if hdist else None,
        )

    def girls_meta(j):
        return dict(
            record_key=girls_df.at[j, gk] if gk else None,
            instance_id=girls_df.at[j, gi] if gi else None,
            enumerator=girls_df.at[j, ge] if ge else None,
            enumerator_id=girls_df.at[j, geid] if geid else None,
            deviceid=girls_df.at[j, gd] if gd else None,
            submission_date=girls_df.at[j, gs] if gs else None,
            district=girls_df.at[j, gdist] if gdist else None,
        )

    # --------------------------
    # Define conducted Girls rows (slightly broader than HH "completed")
    # --------------------------
    def is_conducted_girls_row(j) -> bool:
        # primary: start/end OR submission date
        if is_valid_interview_row(girls_df, j, g_start, g_end, gs):
            return True

        # secondary: KEY or instanceID present
        if gk and gk in girls_df.columns and not is_missing(girls_df.at[j, gk]):
            return True
        if gi and gi in girls_df.columns and not is_missing(girls_df.at[j, gi]):
            return True

        return False

    # --------------------------
    # Build index of conducted Girls
    # --------------------------
    girls_pairs: set[tuple[str | None, str]] = set()
    girls_by_id: set[str] = set()

    for j in girls_df.index:
        gid = norm_id(girls_df.at[j, ggirl])
        if not gid:
            continue

        if not is_conducted_girls_row(j):
            continue

        vill = norm_id(girls_df.at[j, gvillage]) if (gvillage and gvillage in girls_df.columns) else None
        girls_pairs.add((vill, gid))
        girls_by_id.add(gid)

    # --------------------------
    # Build index of completed Household
    # --------------------------
    hh_pairs: set[tuple[str | None, str]] = set()
    hh_by_id: set[str] = set()

    for i in household_df.index:
        gid = norm_id(household_df.at[i, hgirl])
        if not gid:
            continue

        if not is_valid_interview_row(household_df, i, h_start, h_end, hs):
            continue

        vill = norm_id(household_df.at[i, hvillage]) if (hvillage and hvillage in household_df.columns) else None
        hh_pairs.add((vill, gid))
        hh_by_id.add(gid)

    # Determine if strict matching is possible (both have village columns)
    strict_possible = (
        (gvillage and gvillage in girls_df.columns) and
        (hvillage and hvillage in household_df.columns)
    )

    # --------------------------
    # A) Household completed but Girls not conducted
    # --------------------------
    flagged_hh_missing_girls: set[tuple[str | None, str]] = set()

    for i in household_df.index:
        gid = norm_id(household_df.at[i, hgirl])
        if not gid:
            continue

        # ONLY consider completed household interviews
        if not is_valid_interview_row(household_df, i, h_start, h_end, hs):
            continue

        vill = norm_id(household_df.at[i, hvillage]) if (hvillage and hvillage in household_df.columns) else None

        found = False
        if strict_possible:
            found = (vill, gid) in girls_pairs
            if not found:
                found = gid in girls_by_id
        else:
            found = gid in girls_by_id

        if found:
            continue

        dedup_key = (vill, gid) if vill is not None else (None, gid)
        if dedup_key in flagged_hh_missing_girls:
            continue
        flagged_hh_missing_girls.add(dedup_key)

        gname = (
            str(clean_scalar(household_df.at[i, hgirl_label])).strip()
            if (hgirl_label and hgirl_label in household_df.columns and not is_missing(household_df.at[i, hgirl_label]))
            else None
        )

        fname = (
            str(clean_scalar(household_df.at[i, hfather_label])).strip()
            if (hfather_label and hfather_label in household_df.columns and not is_missing(household_df.at[i, hfather_label]))
            else None
        )

        attempts = None
        if h_attempt and h_attempt in household_df.columns:
            attempts = to_int_or_none(household_df.at[i, h_attempt])

        severity = "CRITICAL"
        code = "HVG_CE_01"
        title = "Girls survey missing after completed household"
        message = (
            "Household interview is completed for this girl, but no conducted Girls survey record exists. "
            "Please ensure the Girls interview is conducted and submitted."
        )

        if attempts is not None and attempts < 3:
            severity = "FLAG"
            code = "HVG_FL_01"
            title = "Girls survey missing (attempt window not yet completed)"
            message = (
                "Household interview is completed for this girl, but no conducted Girls survey record exists yet. "
                "Protocol requires at least 3 attempts before marking a case as missed. "
                "Please continue attempts and conduct the Girls interview."
            )

        m = hh_meta(i)

        value = fmt_kv(
            GirlID=gid,
            VillageID=vill if vill is not None else "(missing)",
            GirlName=gname if gname else "(not available)",
            FatherName=fname if fname else "(not available)",
            Attempt=attempts if attempts is not None else "(missing)",
        )

        issues.append(
            make_issue(
                "Household vs Girls",
                severity,
                code,
                title,
                message,
                hgirl,
                value,
                m["record_key"],
                m["instance_id"],
                m["enumerator"],
                m["enumerator_id"],
                m["deviceid"],
                m["submission_date"],
                m["district"],
            )
        )

    # --------------------------
    # B) Girls conducted but Household not completed
    # --------------------------
    flagged_girls_missing_hh: set[tuple[str | None, str]] = set()

    for j in girls_df.index:
        gid = norm_id(girls_df.at[j, ggirl])
        if not gid:
            continue

        if not is_conducted_girls_row(j):
            continue

        vill = norm_id(girls_df.at[j, gvillage]) if (gvillage and gvillage in girls_df.columns) else None

        found = False
        if strict_possible:
            found = (vill, gid) in hh_pairs
            if not found:
                found = gid in hh_by_id
        else:
            found = gid in hh_by_id

        if found:
            continue

        dedup_key = (vill, gid) if vill is not None else (None, gid)
        if dedup_key in flagged_girls_missing_hh:
            continue
        flagged_girls_missing_hh.add(dedup_key)

        m = girls_meta(j)

        severity = "CRITICAL"
        code = "GVH_CE_01"
        title = "Household survey missing after conducted girls interview"
        message = (
            "A conducted Girls survey record exists for this girl, but no completed Household interview record exists. "
            "Please ensure the Household interview is completed and submitted for this case."
        )

        value = fmt_kv(
            GirlID=gid,
            VillageID=vill if vill is not None else "(missing)",
            GirlsRecordKey=m["record_key"] if m["record_key"] is not None else "(missing)",
            GirlsInstanceID=m["instance_id"] if m["instance_id"] is not None else "(missing)",
        )

        # Note: for this reverse direction, the "field" is the girls identifier column
        issues.append(
            make_issue(
                "Girls vs Household",
                severity,
                code,
                title,
                message,
                ggirl,
                value,
                m["record_key"],
                m["instance_id"],
                m["enumerator"],
                m["enumerator_id"],
                m["deviceid"],
                m["submission_date"],
                m["district"],
            )
        )

    # --------------------------
    # C) Linked HH ↔ Girls identity mismatch (same girl ID, different names)
    # --------------------------
    gname_col = cfg(girls_df, "girl_label", "girlname_label", "girl_label", "name")
    if hgirl and ggirl and hgirl in household_df.columns and ggirl in girls_df.columns:
        hh_names: dict[str, set[str]] = {}
        for i in household_df.index:
            gid = norm_id(household_df.at[i, hgirl])
            if not gid:
                continue
            if hgirl_label and hgirl_label in household_df.columns and not is_missing(household_df.at[i, hgirl_label]):
                hh_names.setdefault(gid, set()).add(str(clean_scalar(household_df.at[i, hgirl_label])).strip().lower())

        gl_names: dict[str, set[str]] = {}
        gl_idxs: dict[str, list] = {}
        for j in girls_df.index:
            gid = norm_id(girls_df.at[j, ggirl])
            if not gid:
                continue
            gl_idxs.setdefault(gid, []).append(j)
            if gname_col and gname_col in girls_df.columns and not is_missing(girls_df.at[j, gname_col]):
                gl_names.setdefault(gid, set()).add(str(clean_scalar(girls_df.at[j, gname_col])).strip().lower())

        for gid, gset in gl_names.items():
            hset = hh_names.get(gid)
            if not hset or not gset:
                continue
            # Match if any normalized name overlaps; else flag mismatch
            if gset & hset:
                continue
            for j in gl_idxs.get(gid, []):
                m = girls_meta(j)
                issues.append(
                    make_issue(
                        "Household vs Girls",
                        "FLAG",
                        "HVG_QF_IDENTITY_MISMATCH",
                        "Girl name mismatch between Household and Girls surveys",
                        (
                            f"Girl ID {gid} is linked in both surveys, but girl names do not match "
                            f"(HH={sorted(hset)}; Girls={sorted(gset)}). Verify the correct identity before analysis."
                        ),
                        ggirl if ggirl else hgirl,
                        fmt_kv(GirlID=gid, HH_names=",".join(sorted(hset)), Girls_names=",".join(sorted(gset))),
                        m["record_key"],
                        m["instance_id"],
                        m["enumerator"],
                        m["enumerator_id"],
                        m["deviceid"],
                        m["submission_date"],
                        m["district"],
                    )
                )

    return issues
