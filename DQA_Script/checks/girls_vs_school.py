# checks/girls_vs_school.py
from __future__ import annotations

import warnings
import pandas as pd
from utils.logging import make_issue


def run(girls_df: pd.DataFrame, school_df: pd.DataFrame, col: dict) -> list[dict]:
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

    def is_conducted(df: pd.DataFrame, i, start_col: str | None, end_col: str | None, sub_col: str | None) -> bool:
        # Primary: valid start/end and end >= start
        if start_col and end_col and start_col in df.columns and end_col in df.columns:
            st = safe_dt_one(df.at[i, start_col])
            et = safe_dt_one(df.at[i, end_col])
            if st is not None and et is not None and et >= st:
                return True

        # Fallback: submission date exists
        if sub_col and sub_col in df.columns and not is_missing(df.at[i, sub_col]):
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
    # Column mapping (works with your exports)
    # ---------------------------------------------------------------------
    # Girls meta
    gk = cfg(girls_df, "record_key", "KEY", "key", "record_key")
    gi = cfg(girls_df, "instance_id", "instanceID", "instance_id")
    gs = cfg(girls_df, "submission_date", "SubmissionDate", "submission_date", "_submission_time")
    ge = cfg(girls_df, "enumerator", "enumerator")
    geid = cfg(girls_df, "enumerator_id", "enumerator_id", "enumeratorid")
    gd = cfg(girls_df, "deviceid", "deviceid", "device_id")
    gdist = cfg(girls_df, "district", "district", "district_id", "district_code")
    g_start = cfg(girls_df, "starttime", "starttime", "start_time")
    g_end = cfg(girls_df, "endtime", "endtime", "end_time")

    # Girls IDs
    ggirl = cfg(girls_df, "girls_girl", "girl", "girl_id")
    ggirl_label = cfg(girls_df, "girls_girl_label", "girlname_label", "girl_label", "name")

    # IMPORTANT: use enroll_school (most filled in your file)
    gschool = cfg(girls_df, "enroll_school", "enroll_school", "ay2425schoolid", "middleschool_id", "emis", "school_id")
    gschool_label = cfg(girls_df, "enroll_school_label", "ay2425schoolname", "middleschool_label", "school_label")

    # School meta
    sk = cfg(school_df, "record_key", "KEY", "key", "record_key")
    si = cfg(school_df, "instance_id", "instanceID", "instance_id")
    ss = cfg(school_df, "submission_date", "SubmissionDate", "submission_date", "_submission_time")
    sdist = cfg(school_df, "district", "district", "district_id", "district_code")
    s_start = cfg(school_df, "starttime", "starttime", "start_time")
    s_end = cfg(school_df, "endtime", "endtime", "end_time")

    # School ID
    sschool = cfg(school_df, "middleschool", "middleschool", "school", "emis", "school_id")

    # If required columns missing, exit safely
    if not ggirl or ggirl not in girls_df.columns:
        return issues
    if not gschool or gschool not in girls_df.columns:
        return issues
    if not sschool or sschool not in school_df.columns:
        return issues

    # ---------------------------------------------------------------------
    # Meta: keep record_key/instance_id/submission_date/district,
    # but FORCE enumerator fields to "-" for cross-survey issues.
    # ---------------------------------------------------------------------
    def meta_g_cross(i) -> dict:
        return dict(
            record_key=girls_df.at[i, gk] if gk else None,
            instance_id=girls_df.at[i, gi] if gi else None,
            enumerator="-",
            enumerator_id="-",
            deviceid="-",
            submission_date=girls_df.at[i, gs] if gs else None,
            district=girls_df.at[i, gdist] if gdist else None,
        )

    def meta_s_cross(j) -> dict:
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
    # Build "conducted school" indexes
    # ---------------------------------------------------------------------
    school_pairs: set[tuple[str | None, str]] = set()  # (district, school_id)
    school_by_id: set[str] = set()
    first_row_for_sid: dict[str, int] = {}

    for j in school_df.index:
        sid = norm_id(school_df.at[j, sschool])
        if not sid:
            continue

        if not is_conducted(school_df, j, s_start, s_end, ss):
            continue

        dist = norm_id(school_df.at[j, sdist]) if (sdist and sdist in school_df.columns) else None

        school_pairs.add((dist, sid))
        school_by_id.add(sid)
        if sid not in first_row_for_sid:
            first_row_for_sid[sid] = j

    strict_possible = (gdist and gdist in girls_df.columns) and (sdist and sdist in school_df.columns)

    # ---------------------------------------------------------------------
    # RULE 1 (CRITICAL): Girl completed but School missing
    # ---------------------------------------------------------------------
    for i in girls_df.index:
        gid = norm_id(girls_df.at[i, ggirl])
        if not gid:
            continue

        if not is_conducted(girls_df, i, g_start, g_end, gs):
            continue

        sid = norm_id(girls_df.at[i, gschool])
        if not sid:
            continue

        dist = norm_id(girls_df.at[i, gdist]) if (gdist and gdist in girls_df.columns) else None

        found = False
        if strict_possible:
            found = (dist, sid) in school_pairs
            if not found:
                found = sid in school_by_id
        else:
            found = sid in school_by_id

        if found:
            continue

        gname = (
            str(clean_scalar(girls_df.at[i, ggirl_label])).strip()
            if (ggirl_label and ggirl_label in girls_df.columns and not is_missing(girls_df.at[i, ggirl_label]))
            else None
        )
        slabel = (
            str(clean_scalar(girls_df.at[i, gschool_label])).strip()
            if (gschool_label and gschool_label in girls_df.columns and not is_missing(girls_df.at[i, gschool_label]))
            else None
        )

        m = meta_g_cross(i)
        value = fmt_kv(
            GirlID=gid,
            GirlName=gname if gname else "(not available)",
            SchoolID=sid,
            SchoolName=slabel if slabel else "(not available)",
            District=dist if dist else "(missing)",
        )

        issues.append(
            make_issue(
                "Girls vs School",
                "CRITICAL",
                "GVS_CE_01",
                "Girl exists but School survey missing",
                "Girls interview is completed for this girl, but no conducted School survey exists for her enrolled middle school.",
                gschool,
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

    # ---------------------------------------------------------------------
    # RULE 2 (CRITICAL): School conducted but no completed Girls linked to that school
    # ---------------------------------------------------------------------
    girls_done_sids: set[str] = set()
    girls_done_pairs: set[tuple[str | None, str]] = set()

    for i in girls_df.index:
        if not is_conducted(girls_df, i, g_start, g_end, gs):
            continue

        sid = norm_id(girls_df.at[i, gschool])
        if not sid:
            continue

        dist = norm_id(girls_df.at[i, gdist]) if (gdist and gdist in girls_df.columns) else None

        girls_done_sids.add(sid)
        girls_done_pairs.add((dist, sid))

    for (sd, sid) in sorted(school_pairs, key=lambda x: (str(x[0]), x[1])):
        if strict_possible:
            ok = (sd, sid) in girls_done_pairs or (sid in girls_done_sids)
        else:
            ok = sid in girls_done_sids

        if ok:
            continue

        j = first_row_for_sid.get(sid)
        m = meta_s_cross(j) if j is not None else dict(
            record_key=None,
            instance_id=None,
            enumerator="-",
            enumerator_id="-",
            deviceid="-",
            submission_date=None,
            district=None,
        )

        value = fmt_kv(
            SchoolID=sid,
            District=sd if sd else "(missing)",
        )

        issues.append(
            make_issue(
                "Girls vs School",
                "CRITICAL",
                "GVS_CE_02",
                "School exists but Girls survey missing",
                "A conducted School survey exists for this middle school, but no completed Girls interviews are linked to this middle school.",
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
