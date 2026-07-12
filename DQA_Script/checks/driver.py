# =============================================================================
# Driver Survey Data Quality – Implemented Features
#
# 1) Generates data-quality issues with two severity levels: CRITICAL and FLAG.
#    Example: missing identifiers are CRITICAL, unusual values are FLAG.
#
# 2) Computes interview duration strictly from start and end time.
#    Example: ignores the duration column and recalculates time in minutes.
#
# 3) Flags interviews completed unusually fast.
#    Example: interview completed in less than 15 minutes.
#
# 4) Detects duplicate submissions using instance ID and record key.
#    Example: the same submission appears more than once in the export.
#
# 5) Detects exact duplicate records across all substantive fields.
#    Example: two rows contain the same answers for all driver-related questions.
#
# 6) Detects identity conflicts for drivers.
#    Example: the same driver ID is linked to different names.
#
# 7) Ensures core identifiers are present.
#    Example: missing record key, instance ID, or driver ID.
#
# 8) Validates timestamp fields for correct format and logical order.
#    Example: end time occurs before start time or cannot be parsed.
#
# 9) Validates daughter roster count against filled roster fields.
#    Example: roster count is 2 but only 1 daughter age is filled.
#
# 10) Flags negative or impossible numeric values.
#     Example: negative marriage duration or negative working hours.
#
# 11) Validates weekly work patterns.
#     Example: working days reported as 0 but working hours are filled.
#
# 12) Flags extreme or implausible working hours.
#     Example: more than 112 hours worked in a week.
#
# 13) Checks age values against expected bounds.
#     Example: driver age reported as 10 or 90.
#
# 14) Checks marital status consistency with spouse and marriage information.
#     Example: marked as single but wife age or marriage duration is filled.
#
# 15) Validates employment duration against age.
#     Example: employment duration exceeds driver age.
#
# 16) Checks consistency of secondary work information.
#     Example: secondary work marked as “No” but payment amount is filled.
#
# 17) Detects dummy or placeholder text in identity and location-related fields.
#     Example: names or school entered as “test”, “aaaa”, or keyboard patterns.
#
# 18) Validates phone number quality across multiple phone fields.
#     Example: invalid length or the same number used repeatedly.
#
# 19) Enforces protocol attempt logging for the driver survey (when fields exist).
#     Example: survey status must be recorded for each attempt, and a case should
#     not be marked as not completed/missed before 3 attempts.
#
# 20) Supports multiple issues per record while avoiding repeated reporting
#     of the same issue for the same field within a record.
#
# =============================================================================



# =============================================================================
# Driver Survey Data Quality – Implemented Features (Strengthened + Corrections)
#
# Notes on changes in this version:
# - Stronger ID normalization (fixes scientific-notation / .0 issues for IDs)
# - More robust datetime parsing (supports multiple SurveyCTO-like formats)
# - Exact-duplicate fingerprint excludes more volatile/export-only columns
# - DRV_CE_08 now reports: driver_id, driver name, school, district (as requested)
# - Keeps all existing rules and structure (candidates per row, per-field dedupe)
# =============================================================================

# =============================================================================
# Driver Survey Data Quality – Implemented Features (Strengthened + Corrections)
#
# Notes on changes in this version:
# - District is now ALWAYS included in each output issue (both "district" and "District")
# - DRV_CE_08 reports: driver_id, driver_name, school, district in bad_value (as requested)
# - Everything else remains the same logic-wise
# =============================================================================

# =============================================================================
# Driver Survey Data Quality – Implemented Features (Strengthened + Corrections)
#
# Fix in this version:
# - District is now passed into make_issue() for EVERY issue, so your Excel "District"
#   column will be filled by logging.py (issues_to_df uses df["district"])
#
# Also kept:
# - Strong ID normalization (fixes scientific-notation / .0 issues for IDs)
# - Robust datetime parsing (supports multiple SurveyCTO-like formats)
# - Exact-duplicate fingerprint excludes volatile/export-only columns
# - DRV_CE_08 reports driver_id, driver_name, school, district in value
# - Per-record per-field dedupe (keeps highest priority issue per field)
# =============================================================================

from __future__ import annotations

import re
from typing import Any

import pandas as pd

from utils.logging import make_issue



def run(df: pd.DataFrame, col: dict) -> list[dict]:
    issues: list[dict] = []

    # --------------------------
    # Column picking helpers
    # --------------------------
    def pick(df_: pd.DataFrame, *names: str) -> str | None:
        for n in names:
            if n and n in df_.columns:
                return n
        return None

    def cfg(key: str, *fallbacks: str) -> str | None:
        # Supports both col[key] and col["columns"][key]
        v = None
        if isinstance(col, dict):
            if key in col:
                v = col.get(key)
            elif isinstance(col.get("columns"), dict):
                v = col["columns"].get(key)

        if isinstance(v, str) and v.strip():
            vv = v.strip()
            return vv if vv in df.columns else pick(df, vv, *fallbacks)
        return pick(df, *fallbacks)

    # --------------------------
    # Expected columns (YAML + fallbacks)
    # --------------------------
    sub = cfg("submission_date", "_submission_time", "SubmissionDate", "submissiondate", "submission_time")
    start = cfg("starttime", "starttime", "StartTime", "start_time")
    end = cfg("endtime", "endtime", "EndTime", "end_time")

    key = cfg("record_key", "KEY", "key")
    inst = cfg("instance_id", "instanceID", "instanceid")

    enum = cfg("enumerator", "Enumerator", "enumerator")
    enum_name = cfg("enumerator_name", "Enumerator_name", "enumerator_name")
    enum_id = cfg("enumerator_id", "Enumerator_id", "enumerator_id")
    device = cfg("deviceid", "deviceid", "device_id")

    # Driver identity
    driver_id = cfg("driver_id", "driver", "driverid", "driver_code", "driver_uid")
    driver_name = cfg("driver_name", "driver_name", "Driver_name", "drivername")
    name = cfg("name", "name", "respondent_name")

    # Location fields
    schoolname = cfg("schoolname", "school", "schoolname", "schoolname_label", "school_name", "school_label")
    district = cfg("district", "District", "district_name", "district_label", "district_code")

    age = cfg("age", "age")
    marital_status = cfg("marital_status", "marital_status")
    marriage_duration = cfg("marriage_duration", "marriage_duration")
    wife_age = cfg("wife_age", "wife_age")
    employment_duration = cfg("employment_duration", "employment_duration")

    hours_work = cfg("hours_work", "hours_work")
    days_work = cfg("days_work", "days_work")

    secondary_work = cfg("secondary_work", "secondary_work")
    secondary_work1 = cfg("secondary_work1", "secondary_work1")
    other_secondary_work = cfg("other_secondary_work", "other_secondary_work")
    payment_secondary_work = cfg("payment_secondary_work", "payment_secondary_work")

    daughters_roster_count = cfg("daughters_roster_count", "daughters_roster_count")

    phone_1 = cfg("phonenumber", "phonenumber", "phone", "phone_1")
    phone_2 = cfg("number", "number", "phone2", "phone_2")
    driver_phone = cfg("driver_phone", "devicephonenum", "device_phone", "devicephonenum", "devicephoneno")

    # Protocol fields (if exist)
    attempt = cfg("attempt", "attempt")
    survey_status = cfg("survey_status", "survey_status")
    survey_status_othr = cfg("survey_status_othr", "survey_status_othr")
    survey_comments = cfg("survey_comments", "survey_comments")

    # collect daughter age columns (note spelling in your export: daughers_age_*)
    daughter_age_cols = [c for c in df.columns if re.fullmatch(r"daughers_age_\d+", str(c).strip())]

    # --------------------------
    # Formatting helpers
    # --------------------------
    def safe_str(x: Any) -> str:
        if pd.isna(x):
            return ""
        return str(x).strip()

    def fmt_kv(**kwargs: Any) -> str:
        parts: list[str] = []
        for k_, v_ in kwargs.items():
            if pd.isna(v_):
                continue
            vs = safe_str(v_)
            if vs == "":
                continue
            parts.append(f"{k_}={vs}")
        return ", ".join(parts) if parts else ""

    def fmt_minutes(mins: float | int | None) -> str:
        if mins is None:
            return ""
        try:
            v = float(mins)
        except Exception:
            return ""
        if pd.isna(v):
            return ""
        return f"{v:.1f} mins"

    def to_num(v: Any) -> float | None:
        x = pd.to_numeric(pd.Series([v]), errors="coerce").iloc[0]
        return None if pd.isna(x) else float(x)

    def is_blank(v: Any) -> bool:
        return safe_str(v) == ""

    # --------------------------
    # Strong ID normalization
    # --------------------------
    def norm_id(v: Any) -> str:
        s = safe_str(v)
        if s == "":
            return ""
        s2 = s.replace(",", "").strip()

        num = pd.to_numeric(pd.Series([s2]), errors="coerce").iloc[0]
        if pd.notna(num):
            try:
                if float(num).is_integer():
                    return str(int(float(num)))
            except Exception:
                pass

        if re.fullmatch(r"\d+\.0", s2):
            return s2[:-2]

        return s2

    # --------------------------
    # Robust datetime parsing
    # --------------------------
    def parse_dt_series(s: pd.Series) -> pd.Series:
        if s is None:
            return pd.Series([pd.NaT] * len(df), index=df.index)

        ss = s.astype(str).replace("nan", "").str.strip()

        fmts = [
            "%b %d, %Y %I:%M:%S %p",
            "%b %d, %Y %I:%M %p",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
        ]

        out = pd.to_datetime(pd.Series([pd.NaT] * len(ss), index=ss.index), errors="coerce")
        for f in fmts:
            parsed = pd.to_datetime(ss, errors="coerce", format=f)
            out = out.fillna(parsed)

        out = out.fillna(pd.to_datetime(ss, errors="coerce"))
        return out

    # --------------------------
    # Meta helper (per row)
    # --------------------------
    def meta(i) -> dict[str, Any]:
        enum_disp = None
        if enum_name and enum_name in df.columns:
            enum_disp = safe_str(df.at[i, enum_name]) or None
        if enum_disp is None and enum and enum in df.columns:
            enum_disp = safe_str(df.at[i, enum]) or None

        dist_val = safe_str(df.at[i, district]) if district and district in df.columns else None

        return {
            "record_key": safe_str(df.at[i, key]) if key and key in df.columns else safe_str(i),
            "instance_id": safe_str(df.at[i, inst]) if inst and inst in df.columns else None,
            "enumerator": enum_disp,
            "enumerator_id": norm_id(df.at[i, enum_id]) if enum_id and enum_id in df.columns else None,
            "deviceid": safe_str(df.at[i, device]) if device and device in df.columns else None,
            "submission_date": safe_str(df.at[i, sub]) if sub and sub in df.columns else None,
            "district": dist_val,
        }

    # --------------------------
    # Central issue builder (DISTRICT INCLUDED)
    # --------------------------
    def build_issue(
        i,
        severity: str,
        rule_id: str,
        title: str,
        message: str,
        bad_col: str,
        bad_val: str,
    ) -> dict:
        m = meta(i)
        return make_issue(
            survey="Driver",
            severity=severity,
            rule_id=rule_id,
            title=title,
            message=message,
            field=bad_col,
            value=bad_val,
            record_key=m["record_key"],
            instance_id=m["instance_id"],
            enumerator=m["enumerator"],
            enumerator_id=m["enumerator_id"],
            deviceid=m["deviceid"],
            submission_date=m["submission_date"],
            district=m["district"],  # ✅ THIS FIXES YOUR BLANK DISTRICT COLUMN
        )

    # --------------------------
    # Helper for DRV_CE_08 identity payload
    # --------------------------
    def driver_identity(i) -> dict[str, str]:
        did = norm_id(df.at[i, driver_id]) if driver_id and driver_id in df.columns else ""
        dname = safe_str(df.at[i, driver_name]) if driver_name and driver_name in df.columns else ""
        if dname == "" and name and name in df.columns:
            dname = safe_str(df.at[i, name])
        sch = safe_str(df.at[i, schoolname]) if schoolname and schoolname in df.columns else ""
        dist = safe_str(df.at[i, district]) if district and district in df.columns else ""
        return {"driver_id": did, "driver_name": dname, "school": sch, "district": dist}

    # --------------------------
    # Dummy text detection (FLAG)
    # --------------------------
    DUMMY_CFG = {
        "min_len_identity": 2,
        "min_len_location": 2,
        "no_vowel_min_len": 6,
        "allowed_numeric_codes": {"89", "99", "999"},
        "placeholder_tokens": {
            "na", "n/a", "none", "nil", "null", "missing", "unknown",
            "dont know", "don't know", "dk",
            "test", "testing", "dummy", "sample", "temp", "temporary", "placeholder",
            "abc", "abcd", "xyz", "xx", "xxx", "aaa", "bbb",
        },
        "keyboard_patterns": {"asdf", "qwerty", "zxcv", "poiuy", "lkjh"},
    }

    _re_symbol_only = re.compile(r"^[\s\-\._,;:/\\|]+$")
    _re_numeric_only = re.compile(r"^\d+$")

    def normalize_text(v: Any) -> str:
        s = safe_str(v).lower()
        s = re.sub(r"\s+", " ", s).strip()
        return s

    def dummy_reason(v: Any, field_type: str) -> str | None:
        s = normalize_text(v)
        if s == "":
            return None

        if s in DUMMY_CFG["allowed_numeric_codes"]:
            return None

        if _re_symbol_only.match(s):
            return "symbol-only placeholder"

        if s in DUMMY_CFG["placeholder_tokens"]:
            return "placeholder token"

        if _re_numeric_only.match(s):
            return "numeric-only value"

        if field_type == "identity":
            if len(s) < int(DUMMY_CFG["min_len_identity"]):
                return "too short"
        elif field_type == "location":
            if len(s) < int(DUMMY_CFG["min_len_location"]):
                return "too short"

        if len(s) >= 3 and len(set(s)) == 1:
            return "repeated character pattern"

        for pat in DUMMY_CFG["keyboard_patterns"]:
            if pat in s:
                return "keyboard pattern"

        if len(s) >= int(DUMMY_CFG["no_vowel_min_len"]):
            letters = re.sub(r"[^a-z]", "", s)
            if len(letters) >= int(DUMMY_CFG["no_vowel_min_len"]) and not re.search(r"[aeiou]", letters):
                return "no-vowel random string"

        return None

    # --------------------------
    # Priority config (for per-field dedupe ordering)
    # --------------------------
    SEV_RANK = {"CRITICAL": 0, "FLAG": 1}

    RULE_ORDER = {
        # CRITICAL
        "DRV_CE_01": 10,
        "DRV_CE_02": 20,
        "DRV_CE_03": 30,
        "DRV_CE_04": 40,
        "DRV_CE_05": 50,
        "DRV_CE_06": 60,
        "DRV_CE_07": 70,
        "DRV_CE_08": 80,
        "DRV_CE_09": 90,
        "DRV_CE_10": 100,
        "DRV_CE_11": 110,
        "DRV_CE_12": 120,
        "DRV_CE_13": 130,
        "DRV_CE_14": 140,

        # FLAGS
        "DRV_QF_01": 210,
        "DRV_QF_02": 220,
        "DRV_QF_03": 230,
        "DRV_QF_04": 240,
        "DRV_QF_05": 250,
        "DRV_QF_06": 260,
        "DRV_QF_07": 270,
        "DRV_QF_08": 280,
        "DRV_QF_09": 290,
        "DRV_QF_10": 300,
    }

    candidates: dict[Any, list[tuple[int, int, dict]]] = {}

    def add_candidate(i, issue: dict, severity: str, rule_id: str) -> None:
        sev_rank = SEV_RANK.get(severity, 9)
        order = RULE_ORDER.get(rule_id, 9999)
        candidates.setdefault(i, []).append((sev_rank, order, issue))

    # --------------------------
    # Precompute timestamps and computed duration
    # --------------------------
    dt_start = parse_dt_series(df[start]) if start and start in df.columns else None
    dt_end = parse_dt_series(df[end]) if end and end in df.columns else None

    computed_minutes = None
    if dt_start is not None and dt_end is not None:
        computed_minutes = (dt_end - dt_start).dt.total_seconds() / 60.0

    # --------------------------
    # Phones normalized
    # --------------------------
    def norm_phone_series(s: pd.Series) -> pd.Series:
        x = s.astype(str).str.replace(r"\D", "", regex=True).str.strip()
        x = x.replace({"nan": ""})
        return x

    p1 = norm_phone_series(df[phone_1]) if phone_1 and phone_1 in df.columns else None
    p2 = norm_phone_series(df[phone_2]) if phone_2 and phone_2 in df.columns else None
    pdev = norm_phone_series(df[driver_phone]) if driver_phone and driver_phone in df.columns else None

    repeated_phone = set()
    for s in [p1, p2, pdev]:
        if s is None:
            continue
        counts = s[s.str.len().ge(10)].value_counts()
        repeated_phone |= set(counts[counts >= 3].index)

    # --------------------------
    # Dataset-level duplicate checks (CRITICAL)
    # --------------------------
    def add_dup_issue(idx, rule_id: str, title: str, message: str, bad_col: str, bad_val: str) -> None:
        add_candidate(
            idx,
            build_issue(idx, "CRITICAL", rule_id, title, message, bad_col, bad_val),
            "CRITICAL",
            rule_id,
        )

    # DRV_CE_06: duplicate instanceID / KEY
    if inst and inst in df.columns:
        dup_mask = df[inst].astype(str).replace("nan", "").str.strip().ne("") & df[inst].duplicated(keep="first")
        for idx in df.index[dup_mask]:
            add_dup_issue(
                idx,
                "DRV_CE_06",
                "Duplicate instanceID",
                "instanceID is duplicated, this indicates duplicated submissions or export issues.",
                inst,
                safe_str(df.at[idx, inst]),
            )

    if key and key in df.columns:
        dup_mask = df[key].astype(str).replace("nan", "").str.strip().ne("") & df[key].duplicated(keep="first")
        for idx in df.index[dup_mask]:
            add_dup_issue(
                idx,
                "DRV_CE_06",
                "Duplicate KEY",
                "KEY is duplicated, this indicates duplicated submissions or export issues.",
                key,
                safe_str(df.at[idx, key]),
            )

    # DRV_CE_07: exact duplicate record (exclude volatile columns)
    meta_cols = {
        c
        for c in [
            sub, start, end, inst, key,
            "review_status", "review_quality", "review_comments", "review_corrections",
            attempt, survey_status, survey_status_othr, survey_comments,
            "device_info", "text_audit", "audio", "duration",
            "violation_list", "violation_count",
        ]
        if c
    }
    cols_for_dup = [c for c in df.columns if c not in meta_cols]
    if cols_for_dup:
        dup_mask = df[cols_for_dup].duplicated(keep="first")
        for idx in df.index[dup_mask]:
            add_dup_issue(
                idx,
                "DRV_CE_07",
                "Exact duplicate record",
                "This row is an exact duplicate of a previous submission (same values across key fields).",
                "duplicate_record",
                "matches a previous record",
            )

    # DRV_CE_08: same driver ID linked to different names
    if driver_id and driver_id in df.columns:
        did = df[driver_id].apply(norm_id)

        name_parts = []
        if driver_name and driver_name in df.columns:
            name_parts.append(df[driver_name].astype(str).replace("nan", "").str.strip())
        if name and name in df.columns:
            name_parts.append(df[name].astype(str).replace("nan", "").str.strip())

        if name_parts:
            sig = name_parts[0]
            for s in name_parts[1:]:
                sig = sig.where(s.eq(""), other=(sig + " | " + s).str.strip(" |"))

            tmp = pd.DataFrame({"did": did, "sig": sig})
            tmp = tmp[tmp["did"] != ""]
            grp = tmp[tmp["sig"] != ""].groupby("did")["sig"].nunique()
            conflict_ids = set(grp[grp > 1].index)

            for idx in df.index[did.isin(conflict_ids)]:
                ident = driver_identity(idx)
                add_dup_issue(
                    idx,
                    "DRV_CE_08",
                    "Driver ID conflict",
                    "Same driver ID is linked to different names across submissions, verify ID/name mapping.",
                    "driver_id",
                    fmt_kv(
                        driver_id=ident["driver_id"] or safe_str(df.at[idx, driver_id]),
                        driver_name=ident["driver_name"],
                        school=ident["school"],
                        district=ident["district"],
                    ),
                )

    # --------------------------
    # Row-level checks
    # --------------------------
    for i in df.index:
        # DRV_CE_09: Missing KEY / instanceID
        if key and key in df.columns and is_blank(df.at[i, key]):
            add_candidate(
                i,
                build_issue(
                    i,
                    "CRITICAL",
                    "DRV_CE_09",
                    "Missing KEY",
                    "KEY is blank, record cannot be reliably tracked or deduplicated.",
                    key,
                    "blank",
                ),
                "CRITICAL",
                "DRV_CE_09",
            )

        if inst and inst in df.columns and is_blank(df.at[i, inst]):
            add_candidate(
                i,
                build_issue(
                    i,
                    "CRITICAL",
                    "DRV_CE_09",
                    "Missing instanceID",
                    "instanceID is blank, record cannot be reliably tracked or deduplicated.",
                    inst,
                    "blank",
                ),
                "CRITICAL",
                "DRV_CE_09",
            )

        # DRV_CE_10: Missing driver ID
        if driver_id and driver_id in df.columns and is_blank(df.at[i, driver_id]):
            add_candidate(
                i,
                build_issue(
                    i,
                    "CRITICAL",
                    "DRV_CE_10",
                    "Missing driver ID",
                    "Driver ID is blank, record cannot be linked to the driver entity.",
                    driver_id,
                    "blank",
                ),
                "CRITICAL",
                "DRV_CE_10",
            )

        # DRV_CE_11: timestamps unparseable (if filled)
        if start and start in df.columns and dt_start is not None:
            raw_st = df.at[i, start]
            if not is_blank(raw_st) and pd.isna(dt_start.loc[i]):
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "CRITICAL",
                        "DRV_CE_11",
                        "Unparseable starttime",
                        "starttime is filled but cannot be parsed as a datetime, duration checks will be invalid.",
                        start,
                        safe_str(raw_st),
                    ),
                    "CRITICAL",
                    "DRV_CE_11",
                )

        if end and end in df.columns and dt_end is not None:
            raw_en = df.at[i, end]
            if not is_blank(raw_en) and pd.isna(dt_end.loc[i]):
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "CRITICAL",
                        "DRV_CE_11",
                        "Unparseable endtime",
                        "endtime is filled but cannot be parsed as a datetime, duration checks will be invalid.",
                        end,
                        safe_str(raw_en),
                    ),
                    "CRITICAL",
                    "DRV_CE_11",
                )

        # DRV_CE_12: roster count mismatch
        if daughters_roster_count and daughters_roster_count in df.columns and daughter_age_cols:
            rc = to_num(df.at[i, daughters_roster_count])
            if rc is not None and rc >= 0:
                filled_age_count = sum(0 if is_blank(df.at[i, c]) else 1 for c in daughter_age_cols)
                if int(rc) <= len(daughter_age_cols) and filled_age_count != int(rc):
                    add_candidate(
                        i,
                        build_issue(
                            i,
                            "CRITICAL",
                            "DRV_CE_12",
                            "Roster count mismatch",
                            "Roster count does not match number of filled daughter age fields, verify roster completeness.",
                            f"{daughters_roster_count},daughers_age_*",
                            f"roster_count={int(rc)}, filled_age_count={filled_age_count}",
                        ),
                        "CRITICAL",
                        "DRV_CE_12",
                    )

        # DRV_CE_13 / DRV_CE_14 protocol attempts
        att = to_num(df.at[i, attempt]) if attempt and attempt in df.columns else None
        ss = to_num(df.at[i, survey_status]) if survey_status and survey_status in df.columns else None

        if att is not None and att >= 1:
            if survey_status and survey_status in df.columns and is_blank(df.at[i, survey_status]):
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "CRITICAL",
                        "DRV_CE_13",
                        "Missing survey status for attempt",
                        "Attempt is recorded but survey status is blank. Status of each attempt must be recorded.",
                        f"{attempt},{survey_status}",
                        f"attempt={int(att)} with blank survey_status",
                    ),
                    "CRITICAL",
                    "DRV_CE_13",
                )

        if att is not None and att >= 1 and ss is not None:
            if int(ss) != 1 and att < 3:
                othr = safe_str(df.at[i, survey_status_othr]) if survey_status_othr and survey_status_othr in df.columns else ""
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "CRITICAL",
                        "DRV_CE_14",
                        "Marked not completed before 3 attempts",
                        "Protocol requires at least 3 attempts before flagging a case as missed/not completed.",
                        f"{attempt},{survey_status}",
                        f"attempt={int(att)}, survey_status={int(ss)}" + (f", other='{othr}'" if othr else ""),
                    ),
                    "CRITICAL",
                    "DRV_CE_14",
                )

        # DRV_CE_01: Negative marriage duration
        if marriage_duration and marriage_duration in df.columns:
            mdv = to_num(df.at[i, marriage_duration])
            if mdv is not None and mdv < 0:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "CRITICAL",
                        "DRV_CE_01",
                        "Negative marriage duration",
                        "Marriage duration cannot be negative, verify and correct.",
                        marriage_duration,
                        safe_str(df.at[i, marriage_duration]),
                    ),
                    "CRITICAL",
                    "DRV_CE_01",
                )

        # DRV_CE_02: Negative daughter age
        if daughter_age_cols:
            for c in daughter_age_cols:
                v = to_num(df.at[i, c])
                if v is not None and v < 0:
                    add_candidate(
                        i,
                        build_issue(
                            i,
                            "CRITICAL",
                            "DRV_CE_02",
                            "Negative daughter age",
                            "Daughter age cannot be negative, verify and correct.",
                            "daughers_age_*",
                            f"{c}={safe_str(df.at[i, c])}",
                        ),
                        "CRITICAL",
                        "DRV_CE_02",
                    )
                    break

        # DRV_CE_03: Invalid days_work (0..6)
        if days_work and days_work in df.columns:
            dw = to_num(df.at[i, days_work])
            if dw is not None and (dw < 0 or dw > 6):
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "CRITICAL",
                        "DRV_CE_03",
                        "Invalid working days",
                        "Working days in a typical week must be between 0 and 6.",
                        days_work,
                        safe_str(df.at[i, days_work]),
                    ),
                    "CRITICAL",
                    "DRV_CE_03",
                )

        # DRV_CE_04: Negative hours_work
        if hours_work and hours_work in df.columns:
            hw = to_num(df.at[i, hours_work])
            if hw is not None and hw < 0:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "CRITICAL",
                        "DRV_CE_04",
                        "Negative weekly working hours",
                        "Weekly working hours cannot be negative, verify and correct.",
                        hours_work,
                        safe_str(df.at[i, hours_work]),
                    ),
                    "CRITICAL",
                    "DRV_CE_04",
                )

        # DRV_CE_05: endtime < starttime
        if dt_start is not None and dt_end is not None:
            st = dt_start.loc[i]
            en = dt_end.loc[i]
            if pd.notna(st) and pd.notna(en) and en < st:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "CRITICAL",
                        "DRV_CE_05",
                        "Invalid timestamps",
                        "End time is earlier than start time, verify timestamps.",
                        f"{start},{end}",
                        f"start={st}, end={en}",
                    ),
                    "CRITICAL",
                    "DRV_CE_05",
                )

        # ---------------- FLAG checks ----------------

        # DRV_QF_01: Dummy/low quality text (one per row)
        dummy_fields: list[tuple[str, str, str]] = []
        if name and name in df.columns:
            dummy_fields.append((name, "identity", "respondent_name"))
        if driver_name and driver_name in df.columns:
            dummy_fields.append((driver_name, "identity", "driver_name"))
        if other_secondary_work and other_secondary_work in df.columns:
            dummy_fields.append((other_secondary_work, "location", "other_secondary_work"))

        for colname, ftype, label in dummy_fields:
            reason = dummy_reason(df.at[i, colname], field_type=ftype)
            if reason:
                raw = safe_str(df.at[i, colname])
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_01",
                        "Dummy or low-quality text",
                        "Text looks like a placeholder or low-quality input, verify.",
                        colname,
                        f"{label}='{raw}' ({reason})",
                    ),
                    "FLAG",
                    "DRV_QF_01",
                )
                break

        # DRV_QF_02: Short duration (<15 mins) ONLY from start/end
        if computed_minutes is not None and start and end and start in df.columns and end in df.columns:
            mins = computed_minutes.loc[i]
            if pd.notna(mins) and mins >= 0 and mins < 15:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_02",
                        "Short interview duration",
                        "Interview duration is unusually short, verify interview quality.",
                        f"{start},{end}",
                        fmt_minutes(mins),
                    ),
                    "FLAG",
                    "DRV_QF_02",
                )

        # DRV_QF_03: Age out of range
        if age and age in df.columns:
            a = to_num(df.at[i, age])
            if a is not None and (a < 15 or a > 80):
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_03",
                        "Age out of expected range",
                        "Driver age looks unusual, verify.",
                        age,
                        safe_str(df.at[i, age]),
                    ),
                    "FLAG",
                    "DRV_QF_03",
                )

        # DRV_QF_04: Extreme weekly hours (>112)
        if hours_work and hours_work in df.columns:
            hw = to_num(df.at[i, hours_work])
            if hw is not None and hw > 112:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_04",
                        "Extreme weekly working hours",
                        "Weekly working hours are extremely high, verify.",
                        hours_work,
                        safe_str(df.at[i, hours_work]),
                    ),
                    "FLAG",
                    "DRV_QF_04",
                )

        # DRV_QF_05: Days vs hours inconsistency
        if days_work and hours_work and days_work in df.columns and hours_work in df.columns:
            dw = to_num(df.at[i, days_work])
            hw = to_num(df.at[i, hours_work])
            if dw is not None and hw is not None:
                inconsistent = False
                if dw == 0 and hw > 0:
                    inconsistent = True
                elif dw > 0 and hw == 0:
                    inconsistent = True
                elif dw > 0 and hw < dw:
                    inconsistent = True

                if inconsistent:
                    add_candidate(
                        i,
                        build_issue(
                            i,
                            "FLAG",
                            "DRV_QF_05",
                            "Work days and hours inconsistent",
                            "Working days and weekly hours look inconsistent, verify.",
                            f"{days_work},{hours_work}",
                            fmt_kv(days_work=int(dw), hours_work=hw),
                        ),
                        "FLAG",
                        "DRV_QF_05",
                    )

        # DRV_QF_06: Basic roster inconsistency (0 vs filled)
        if daughters_roster_count and daughters_roster_count in df.columns and daughter_age_cols:
            rc = to_num(df.at[i, daughters_roster_count])
            any_age_filled = any((not is_blank(df.at[i, c])) for c in daughter_age_cols)
            if rc is not None:
                if rc == 0 and any_age_filled:
                    add_candidate(
                        i,
                        build_issue(
                            i,
                            "FLAG",
                            "DRV_QF_06",
                            "Roster inconsistency",
                            "Roster count is 0 but daughter ages are filled, verify roster entries.",
                            f"{daughters_roster_count},daughers_age_*",
                            "roster_count=0 but daughter ages filled",
                        ),
                        "FLAG",
                        "DRV_QF_06",
                    )
                elif rc > 0 and not any_age_filled:
                    add_candidate(
                        i,
                        build_issue(
                            i,
                            "FLAG",
                            "DRV_QF_06",
                            "Roster inconsistency",
                            "Roster count is greater than 0 but no daughter ages are filled, verify roster entries.",
                            f"{daughters_roster_count},daughers_age_*",
                            f"roster_count={int(rc)} but no daughter ages filled",
                        ),
                        "FLAG",
                        "DRV_QF_06",
                    )

        # DRV_QF_07: marital vs wife/marriage consistency
        ms = to_num(df.at[i, marital_status]) if marital_status and marital_status in df.columns else None
        wa = to_num(df.at[i, wife_age]) if wife_age and wife_age in df.columns else None
        mdv = to_num(df.at[i, marriage_duration]) if marriage_duration and marriage_duration in df.columns else None
        a = to_num(df.at[i, age]) if age and age in df.columns else None

        if ms is not None and int(ms) == 3:
            bad = []
            if wife_age and wife_age in df.columns and not is_blank(df.at[i, wife_age]) and (wa is None or wa != 0):
                bad.append(f"{wife_age}={safe_str(df.at[i, wife_age])}")
            if marriage_duration and marriage_duration in df.columns and not is_blank(df.at[i, marriage_duration]) and (mdv is None or mdv != 0):
                bad.append(f"{marriage_duration}={safe_str(df.at[i, marriage_duration])}")
            if bad:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_07",
                        "Marital status inconsistency",
                        "Marital status is Single but spouse/marriage fields are filled, verify.",
                        "marital_status",
                        f"marital_status=3 with filled: {', '.join(bad)}",
                    ),
                    "FLAG",
                    "DRV_QF_07",
                )

        if wa is not None:
            if wa < 12 or wa > 80:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_07",
                        "Wife age out of expected range",
                        "Wife age looks unusual, verify.",
                        wife_age,
                        safe_str(df.at[i, wife_age]),
                    ),
                    "FLAG",
                    "DRV_QF_07",
                )
            if a is not None and wa > a + 30:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_07",
                        "Wife age much higher than driver age",
                        "Wife age is much higher than driver age, verify.",
                        f"{wife_age},{age}",
                        fmt_kv(wife_age=wa, age=a),
                    ),
                    "FLAG",
                    "DRV_QF_07",
                )

        if mdv is not None:
            if mdv > 60:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_07",
                        "Marriage duration unusually high",
                        "Marriage duration looks unusually high, verify.",
                        marriage_duration,
                        safe_str(df.at[i, marriage_duration]),
                    ),
                    "FLAG",
                    "DRV_QF_07",
                )
            if a is not None and mdv > a:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_07",
                        "Marriage duration exceeds age",
                        "Marriage duration cannot exceed driver age, verify.",
                        f"{marriage_duration},{age}",
                        fmt_kv(marriage_duration=mdv, age=a),
                    ),
                    "FLAG",
                    "DRV_QF_07",
                )

        # DRV_QF_09: Employment duration sanity
        if employment_duration and employment_duration in df.columns:
            ed = to_num(df.at[i, employment_duration])
            if ed is not None:
                if ed < 0:
                    add_candidate(
                        i,
                        build_issue(
                            i,
                            "FLAG",
                            "DRV_QF_09",
                            "Negative employment duration",
                            "Employment duration cannot be negative, verify.",
                            employment_duration,
                            safe_str(df.at[i, employment_duration]),
                        ),
                        "FLAG",
                        "DRV_QF_09",
                    )
                if a is not None and ed > a:
                    add_candidate(
                        i,
                        build_issue(
                            i,
                            "FLAG",
                            "DRV_QF_09",
                            "Employment duration exceeds age",
                            "Employment duration cannot exceed driver age, verify.",
                            f"{employment_duration},{age}",
                            fmt_kv(employment_duration=ed, age=a),
                        ),
                        "FLAG",
                        "DRV_QF_09",
                    )

        # DRV_QF_10: Secondary work consistency
        if secondary_work and secondary_work in df.columns:
            sw = to_num(df.at[i, secondary_work])
            sw1_filled = secondary_work1 and secondary_work1 in df.columns and not is_blank(df.at[i, secondary_work1])
            pay_filled = payment_secondary_work and payment_secondary_work in df.columns and not is_blank(
                df.at[i, payment_secondary_work]
            )
            pay_val = to_num(df.at[i, payment_secondary_work]) if pay_filled else None

            if pay_val is not None and pay_val < 0:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_10",
                        "Negative secondary work payment",
                        "Secondary work payment cannot be negative, verify.",
                        payment_secondary_work,
                        safe_str(df.at[i, payment_secondary_work]),
                    ),
                    "FLAG",
                    "DRV_QF_10",
                )

            if sw is not None:
                if int(sw) == 0:
                    bad = []
                    if sw1_filled:
                        bad.append(f"{secondary_work1}={safe_str(df.at[i, secondary_work1])}")
                    if pay_filled and (pay_val is None or pay_val != 0):
                        bad.append(f"{payment_secondary_work}={safe_str(df.at[i, payment_secondary_work])}")
                    if bad:
                        add_candidate(
                            i,
                            build_issue(
                                i,
                                "FLAG",
                                "DRV_QF_10",
                                "Secondary work inconsistency",
                                "Secondary work is No but related fields are filled, verify.",
                                secondary_work,
                                f"secondary_work=0 with filled: {', '.join(bad)}",
                            ),
                            "FLAG",
                            "DRV_QF_10",
                        )
                elif int(sw) == 1:
                    if secondary_work1 and secondary_work1 in df.columns and not sw1_filled:
                        add_candidate(
                            i,
                            build_issue(
                                i,
                                "FLAG",
                                "DRV_QF_10",
                                "Secondary work missing details",
                                "Secondary work is Yes but detail field is blank, verify.",
                                secondary_work1,
                                "blank while secondary_work=1",
                            ),
                            "FLAG",
                            "DRV_QF_10",
                        )

        # DRV_QF_08: Phone quality
        def phone_issue_for(colname: str, series: pd.Series | None) -> tuple[bool, str]:
            if series is None:
                return False, ""
            digits = series.loc[i]
            if not isinstance(digits, str):
                digits = safe_str(digits)
            if digits == "" or digits.lower() == "nan":
                return False, ""
            if len(digits) < 10 or len(digits) > 13:
                return True, f"{colname}={digits} (invalid length)"
            if digits in repeated_phone:
                return True, f"{colname}={digits} (repeated in 3+ submissions)"
            return False, ""

        for cn, series in [
            (phone_1 or "phonenumber", p1),
            (phone_2 or "number", p2),
            (driver_phone or "devicephonenum", pdev),
        ]:
            ok, msg = phone_issue_for(cn, series)
            if ok:
                add_candidate(
                    i,
                    build_issue(
                        i,
                        "FLAG",
                        "DRV_QF_08",
                        "Phone number quality issue",
                        "Phone number looks suspicious, verify.",
                        cn,
                        msg,
                    ),
                    "FLAG",
                    "DRV_QF_08",
                )
                break

    # --------------------------
    # Final selection:
    # Keep multiple issues per record, but dedupe by field within each record
    # --------------------------
    def get_bad_col(issue: dict) -> str:
        for k in ["field", "bad_column", "bad_col", "badColumn", "column"]:
            v = issue.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        return "__unknown__"

    for i, cand_list in candidates.items():
        best_by_field: dict[str, tuple[int, int, dict]] = {}

        for sev_rank, order, issue in cand_list:
            bad_col = get_bad_col(issue)
            bad_col_norm = ",".join([c.strip() for c in bad_col.split(",") if c.strip()]) or bad_col

            current = best_by_field.get(bad_col_norm)
            if current is None or (sev_rank, order) < (current[0], current[1]):
                best_by_field[bad_col_norm] = (sev_rank, order, issue)

        for _, _, issue in sorted(best_by_field.values(), key=lambda t: (t[0], t[1])):
            issues.append(issue)

    return issues
