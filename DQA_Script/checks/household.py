# =============================================================================
# Household Survey Data Quality – Implemented Features
#
# 1) Detects duplicate household submissions.
#    Example: the same submission ID appears more than once.
#
# 2) Identifies exact duplicate household records using identity and location information.
#    Example: same girl name, father name, address, and village repeated.
#
# 3) Detects conflicts where the same girl identifier is linked to different names.
#    Example: one girl ID appears with two different girl or father names.
#
# 4) Flags invalid school attendance values.
#    Example: days attended school entered as -1 or greater than 12.
#
# 5) Identifies households with no adult members.
#    Example: all listed household members are under 18 years of age.
#
# 6) Detects duplicate household members within the roster.
#    Example: same name, age, and gender listed more than once.
#
# 7) Flags biologically impossible family relationships.
#    Example: parent younger than child or parent-child age gap too small.
#
# 8) Validates sibling marriage information for consistency.
#    Example: marriage age greater than current age.
#
# 9) Checks consistency of education information.
#    Example: enrolled marked as “no” but grade is filled.
#
# 10) Detects negative age values.
#     Example: age entered as -2.
#
# 11) Compares reported age with date of birth.
#     Example: DOB implies age 10 but reported age is 16.
#
# 12) Validates reported household size against roster count.
#     Example: household size is 6 but only 4 members listed.
#
# 13) Flags extremely large households for review.
#     Example: household size greater than typical thresholds.
#
# 14) Detects dummy or placeholder names in household and sibling rosters.
#     Example: names like “test”, “aaaa”, or numeric-only values.
#
# 15) Detects dummy or placeholder identity and location fields.
#     Example: address, village, or respondent name entered as meaningless text.
#
# 16) Flags surveys completed unusually fast using start and end time.
#     Example: full household survey completed in a few minutes.
#
# 17) Identifies contradictions between electricity access and owned assets.
#     Example: no electricity reported but refrigerator is marked present.
#
# 18) Flags unlikely age–grade combinations.
#     Example: very young child reported in high grade or older child in very low grade.
#
# 19) Flags cases where the respondent role appears inappropriate.
#     Example: respondent marked as a child while adults exist in the household.
#
# 20) Allows multiple issues per submission while avoiding repeated reporting
#     of the same issue for the same field within a record.
#
# =============================================================================

# =============================================================================
# Household Survey Data Quality – Implemented Features + Protocol Extensions
#
# Includes original 20 checks plus new protocol and scheduling follow-up rules:
# - Consent implies required parent surveys (father/mother)
# - Both parents available + both consents => two surveys expected
# - Enumerator "consent not agreed" > threshold (default 5)
# - Temporary unavailability scheduling:
#     - reasons 1,2 always temporary
#     - reason 6 (Other) temporary only if text indicates temporary
#     - reasons 3,4,5 are NOT temporary, scheduling must not exist
# - Missed follow-up (CRITICAL): scheduled date passed, parent survey missing
# - Due soon tracker (NOT issues): scheduled date is today/next 24h, parent survey missing
#
# Tracker output: followup_tracker.csv (path configurable via col["followup_tracker_path"])
# =============================================================================

# =============================================================================
# Household Survey Data Quality – Implemented Features
#
# 1) Detects duplicate household submissions.
#    Example: the same submission ID appears more than once.
#
# 2) Identifies exact duplicate household records using identity and location information.
#    Example: same girl name, father name, address, and village repeated.
#
# 3) Detects conflicts where the same girl identifier is linked to different names.
#    Example: one girl ID appears with two different girl or father names.
#
# 4) Flags invalid school attendance values.
#    Example: days attended school entered as -1 or greater than 12.
#
# 5) Identifies households with no adult members.
#    Example: all listed household members are under 18 years of age.
#
# 6) Detects duplicate household members within the roster.
#    Example: same name, age, and gender listed more than once.
#
# 7) Flags biologically impossible family relationships.
#    Example: parent younger than child or parent-child age gap too small.
#
# 8) Validates sibling marriage information for consistency.
#    Example: marriage age greater than current age.
#
# 9) Checks consistency of education information.
#    Example: enrolled marked as “no” but grade is filled.
#
# 10) Detects negative age values.
#     Example: age entered as -2.
#
# 11) Compares reported age with date of birth.
#     Example: DOB implies age 10 but reported age is 16.
#
# 12) Validates reported household size against roster count.
#     Example: household size is 6 but only 4 members listed.
#
# 13) Flags extremely large households for review.
#     Example: household size greater than typical thresholds.
#
# 14) Detects dummy or placeholder names in household and sibling rosters.
#     Example: names like “test”, “aaaa”, or numeric-only values.
#
# 15) Detects dummy or placeholder identity and location fields.
#     Example: address, village, or respondent name entered as meaningless text.
#
# 16) Flags surveys completed unusually fast using start and end time.
#     Example: full household survey completed in a few minutes.
#
# 17) Identifies contradictions between electricity access and owned assets.
#     Example: no electricity reported but refrigerator is marked present.
#
# 18) Flags unlikely age–grade combinations.
#     Example: very young child reported in high grade or older child in very low grade.
#
# 19) Flags cases where the respondent role appears inappropriate.
#     Example: respondent marked as a child while adults exist in the household.
#
# 20) Allows multiple issues per submission while avoiding repeated reporting
#     of the same issue for the same field within a record.
#
# =============================================================================

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Iterable

import pandas as pd

from utils.logging import add_issue as log_add_issue
from checks.protocol_extras import run_household_protocol

YES_SET = {"yes", "y", "1", "true", "t"}
NO_SET = {"no", "n", "0", "false", "f", "none", "nan", ""}

# Values you told me should not be flagged as "dummy"
SPECIAL_SKIP_CODES = {"89", "99", "999"}

DEFAULT_DUMMY_NAME_TOKENS = {
    "na", "n/a", "none", "nil", "test", "dummy", "sample",
    "abc", "abcd", "abcde", "abcdef", "xyz",
    "asdf", "qwerty", "zxcv",
    "name", "girl", "student", "null", "xhxy",
    "-", "_", ".", "..", "...", "----", "____", "....", ".....",
    "0", "00", "000", "0000", "00000", "123",
    "aaaa", "bbb", "ccc", "ddd", "ssss", "yyyy", "zzzz", "hhhh", "kkkk", "llll",
}

# A slightly broader token set for address/landmark/village/comments style fields
DEFAULT_DUMMY_TEXT_TOKENS = DEFAULT_DUMMY_NAME_TOKENS | {
    "tbd", "dk", "don't know", "dont know", "unknown", "not sure",
    "same", "as above", "asabove", "ok", "yes", "no",
}

MAX_VALUE_LEN = 180
MAX_MSG_LEN = 220


def _df_map(frame: pd.DataFrame, func) -> pd.DataFrame:
    # replace deprecated applymap with per-series map
    return frame.apply(lambda s: s.map(func))


def _norm_str(x: Any) -> str:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return ""
    s = str(x).strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _clip(x: Any, n: int = MAX_VALUE_LEN) -> str:
    s = "" if x is None else str(x)
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) <= n:
        return s
    return s[: n - 3].rstrip() + "..."


def _msg(x: str) -> str:
    return _clip(x, MAX_MSG_LEN)


def _to_num(x: Any) -> float | None:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return None
    try:
        return float(x)
    except Exception:
        s = _norm_str(x)
        if s == "":
            return None
        m = re.search(r"(\d+(\.\d+)?)", s)
        return float(m.group(1)) if m else None


def _is_yes(x: Any) -> bool:
    return _norm_str(x) in YES_SET


def _is_no(x: Any) -> bool:
    return _norm_str(x) in NO_SET


def _col(col: dict, key: str, fallback: str | None = None) -> str | None:
    v = col.get(key)
    return v if v else fallback


def _find_existing(df: pd.DataFrame, candidates: Iterable[str]) -> str | None:
    for c in candidates:
        if c and c in df.columns:
            return c
    return None


def _pattern_cols(df: pd.DataFrame, prefix: str, max_n: int) -> list[str]:
    cols = []
    for i in range(1, max_n + 1):
        c = f"{prefix}{i}"
        if c in df.columns:
            cols.append(c)
    return cols


def _parse_date_any(x: Any, ref: datetime | None = None) -> datetime | None:
    """
    Robust date parser.
    Fixes common SurveyCTO DOB issue where "01-jan-65" can be interpreted as 2065.
    If parsed date ends up in the future by a large margin, shift back by 100 years.
    """
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return None
    s = str(x).strip()
    if s == "":
        return None

    ref_dt = ref or datetime.today()

    fmts = (
        "%b %d, %Y", "%B %d, %Y",
        "%Y-%m-%d",
        "%m/%d/%Y", "%d/%m/%Y",
        "%d-%b-%Y", "%d-%b-%y",
        "%d-%B-%Y", "%d-%B-%y",
        "%d-%m-%Y", "%d-%m-%y",
        "%d/%m/%y", "%m/%d/%y",
        "%d/%b/%Y", "%d/%b/%y",
    )
    for fmt in fmts:
        try:
            dt = datetime.strptime(s, fmt)
            if dt.year > ref_dt.year + 1:
                try:
                    dt = dt.replace(year=dt.year - 100)
                except Exception:
                    pass
            return dt
        except Exception:
            pass

    try:
        dt2 = pd.to_datetime(s, errors="coerce", dayfirst=True)
        if pd.isna(dt2):
            return None
        dt = dt2.to_pydatetime()  # type: ignore
        if dt.year > ref_dt.year + 1:
            try:
                dt = dt.replace(year=dt.year - 100)
            except Exception:
                pass
        return dt
    except Exception:
        return None


def _age_from_dob(dob: datetime, ref: datetime) -> float:
    return (ref - dob).days / 365.25


def _relation_text(val: Any, rel_map: dict | None) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return ""

    s = _norm_str(val)
    if s == "":
        return ""

    # numeric-like -> "2"
    n = _to_num(val)
    if n is not None and abs(n - round(n)) < 1e-9:
        s = str(int(round(n)))

    if rel_map:
        # rel_map keys are normalized strings after _norm_map_keys()
        if s in rel_map:
            return _norm_str(rel_map[s])
        
        # fallback: try "1.0" style
        s2 = _norm_str(s)
        if s2 in rel_map:
            return _norm_str(rel_map[s2])
        
        try:
            si = int(float(s))
            if si in rel_map:
                return _norm_str(rel_map[si])
        except Exception:
            pass

    return s


def _edu_text(val: Any, edu_map: dict | None) -> str:
    s = _norm_str(val)
    if s == "":
        return ""
    if edu_map and s in edu_map:
        return _norm_str(edu_map[s])
    return s


def _age_to_human(a: float) -> str:
    try:
        if a < 1:
            months = int(round(a * 12))
            return f"{months} month(s)"
        return f"{round(a, 1)} year(s)"
    except Exception:
        return str(a)


def _duration_minutes(row: pd.Series, start_col: str | None, end_col: str | None) -> float | None:
    """
    Returns survey duration in minutes.
    IMPORTANT: Uses starttime/endtime only (ignores any duration column).
    """
    if start_col and end_col and start_col in row.index and end_col in row.index:
        st = _parse_date_any(row[start_col])
        et = _parse_date_any(row[end_col])
        if st and et and et > st:
            return (et - st).total_seconds() / 60
    return None


def _grade_label(code: Any) -> str:
    n = _to_num(code)
    if n is None:
        return ""
    n = int(round(n))
    if n == 26:
        return "Nursery"
    if n == 27:
        return "Prep"
    return f"Class {n}"


def _grade_school_from_code(x: Any, grade_map: dict) -> int | None:
    s = _norm_str(x)
    if s == "":
        return None
    if s in grade_map:
        try:
            return int(grade_map[s])
        except Exception:
            return None
    return None


def _skip_special_codes(x: Any) -> bool:
    s = _norm_str(x)
    return s in SPECIAL_SKIP_CODES


def _is_dummy_name(name: Any, dummy_tokens: set[str]) -> bool:
    s = _norm_str(name)
    if s == "":
        return False
    if _skip_special_codes(s):
        return False

    if s in dummy_tokens:
        return True
    if re.fullmatch(r"\d+", s):
        return True
    if re.fullmatch(r"(.)\1{2,}", s):
        return True
    if any(tok in s for tok in ["asdf", "qwerty", "zxcv"]):
        return True
    if len(s) <= 1:
        return True
    return False


def _is_dummy_text(val: Any, dummy_tokens: set[str]) -> bool:
    """
    Broader dummy detection for identity + location fields.
    Keeps it conservative to avoid false positives on real addresses.
    """
    s = _norm_str(val)
    if s == "":
        return False
    if _skip_special_codes(s):
        return False

    if s in dummy_tokens:
        return True

    if re.fullmatch(r"[\W_]+", s):
        return True

    if re.fullmatch(r"(.)\1{3,}", s):
        return True

    if len(s) <= 2:
        return True

    if any(tok in s for tok in ["asdf", "qwerty", "zxcv"]):
        return True

    if re.fullmatch(r"\d{1,6}", s):
        return True

    return False


# =========================================================
# FINAL ISSUE SELECTION / DEDUPE (per record, per field)
# =========================================================
def _severity_rank(sev: Any) -> int:
    s = _norm_str(sev)
    if s == "critical":
        return 0
    if s == "flag":
        return 1
    return 2


def _rule_order_fallback(rule_id: Any) -> int:
    """
    If rule_order is not present in issue dicts, derive an order from rule_id like HH_CR_07.
    Lower = earlier = higher priority when severity ties.
    """
    s = _norm_str(rule_id)
    if s == "":
        return 10_000
    m = re.search(r"(\d+)$", s)
    return int(m.group(1)) if m else 10_000


def _get_issue_field_key(issue: dict) -> str:
    """
    Dedupe key must be the field name (bad_column).
    Support multiple possible keys safely, without crashing.
    If it contains "starttime,endtime", we treat it as one combined key as-is.
    """
    for k in ("bad_column", "bad_col", "column", "field"):
        if k in issue and issue.get(k) is not None:
            v = str(issue.get(k)).strip()
            if v != "":
                return v
    return ""


def _get_record_key(issue: dict) -> str:
    """
    Grouping key for 'within each record'.
    Use record_key first, then instance_id, else empty string.
    """
    for k in ("record_key", "recordID", "key", "KEY"):
        if k in issue and issue.get(k) is not None:
            v = str(issue.get(k)).strip()
            if v != "":
                return v
    for k in ("instance_id", "instanceID"):
        if k in issue and issue.get(k) is not None:
            v = str(issue.get(k)).strip()
            if v != "":
                return v
    return ""


def _dedupe_issues_per_record_per_field(issues: list[dict]) -> list[dict]:
    """
    Keep multiple issues per record, but only one issue per field within that record.
    Priority:
      1) CRITICAL beats FLAG
      2) If same severity: lower rule_order (if present), else earlier rule id order (parsed from suffix),
         if still tied: earlier appearance in list wins
    """
    if not issues:
        return issues

    indexed = list(enumerate(issues))

    by_record: dict[str, list[tuple[int, dict]]] = {}
    for idx, it in indexed:
        rec = _get_record_key(it)
        if rec == "":
            rec = f"__no_record__:{idx}"
        by_record.setdefault(rec, []).append((idx, it))

    out: list[tuple[int, dict]] = []

    for _, items in by_record.items():
        best_by_field: dict[str, tuple[int, dict]] = {}

        for idx, it in items:
            field_key = _get_issue_field_key(it)
            if field_key == "":
                unique_key = f"__no_field__:{idx}"
                best_by_field[unique_key] = (idx, it)
                continue

            if field_key not in best_by_field:
                best_by_field[field_key] = (idx, it)
                continue

            prev_idx, prev = best_by_field[field_key]

            r_new = _severity_rank(it.get("severity"))
            r_old = _severity_rank(prev.get("severity"))
            if r_new != r_old:
                if r_new < r_old:
                    best_by_field[field_key] = (idx, it)
                continue

            o_new = it.get("rule_order", None)
            o_old = prev.get("rule_order", None)

            n_new = int(o_new) if isinstance(o_new, (int, float)) and not pd.isna(o_new) else _rule_order_fallback(it.get("rule_id"))
            n_old = int(o_old) if isinstance(o_old, (int, float)) and not pd.isna(o_old) else _rule_order_fallback(prev.get("rule_id"))

            if n_new != n_old:
                if n_new < n_old:
                    best_by_field[field_key] = (idx, it)
                continue

            _ = prev_idx  # keep earlier issue (stable)

        out.extend(best_by_field.values())

    out.sort(key=lambda t: t[0])
    return [it for _, it in out]


# =========================================================
# FOLLOW UP TRACKER (separate CSV, NOT issues)
# =========================================================
UNAVAILABLE_REASON_MAP = {
    "1": "Gone for work within the village",
    "2": "Gone for work outside the village",
    "3": "Lives in another city",
    "4": "Lives in another country",
    "5": "Have passed away",
    "6": "Other (specify)",
}

AVAILABLE_DAYS_TIME_MAP = {
    "1": "Monday (7 am to 9 am)",
    "2": "Monday (9 am to 11 am)",
    "3": "Monday (11 am to 1 pm)",
    "4": "Monday (1 pm to 3 pm)",
    "5": "Monday (3 pm to 5 pm)",
    "6": "Tuesday (7 am to 9 am)",
    "7": "Tuesday (9 am to 11 am)",
    "8": "Tuesday (11 am to 1 pm)",
    "9": "Tuesday (1 pm to 3 pm)",
    "10": "Tuesday (3 pm to 5 pm)",
    "11": "Wednesday (7 am to 9 am)",
    "12": "Wednesday (9 am to 11 am)",
    "13": "Wednesday (11 am to 1 pm)",
    "14": "Wednesday (1 pm to 3 pm)",
    "15": "Wednesday (3 pm to 5 pm)",
    "16": "Thursday (7 am to 9 am)",
    "17": "Thursday (9 am to 11 am)",
    "18": "Thursday (11 am to 1 pm)",
    "19": "Thursday (1 pm to 3 pm)",
    "20": "Thursday (3 pm to 5 pm)",
    "21": "Friday (7 am to 9 am)",
    "22": "Friday (9 am to 11 am)",
    "23": "Friday (11 am to 1 pm)",
    "24": "Friday (1 pm to 3 pm)",
    "25": "Friday (3 pm to 5 pm)",
    "26": "Saturday (7 am to 9 am)",
    "27": "Saturday (9 am to 11 am)",
    "28": "Saturday (11 am to 1 pm)",
    "29": "Saturday (1 pm to 3 pm)",
    "30": "Saturday (3 pm to 5 pm)",
    "99": "Other (Specify)",
}


def _decode_single_code(v: Any, mapping: dict[str, str]) -> str:
    s = _norm_str(v)
    if s == "":
        return ""
    n = _to_num(s)
    if n is not None:
        s = str(int(round(n)))
    return mapping.get(s, s)


def _decode_multiselect(v: Any, mapping: dict[str, str]) -> str:
    """
    SurveyCTO multi-select often exports as space-separated codes like "16 22 99".
    Return a readable joined string.
    """
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    s = str(v).strip()
    if not s:
        return ""
    parts = [p.strip() for p in re.split(r"[\s,;]+", s) if p.strip()]
    labels = []
    for p in parts:
        labels.append(_decode_single_code(p, mapping))

    seen = set()
    out = []
    for lab in labels:
        if lab in seen:
            continue
        seen.add(lab)
        out.append(lab)
    return " | ".join(out)


def _as_set(v: Any) -> set[str]:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return set()
    s = str(v).strip()
    if not s:
        return set()
    parts = [p.strip() for p in re.split(r"[\s,;]+", s) if p.strip()]
    return set(parts)


def _is_temp_other_text(other_text: Any) -> bool:
    """
    When unavailable_reason=Other, schedule only if the free text looks temporary.
    Keep conservative.
    """
    s = _norm_str(other_text)
    if s == "":
        return False
    temp_tokens = [
        "work", "job", "shift", "busy", "out", "outside", "within",
        "return", "back", "come", "visit", "travel", "trip", "later",
        "tomorrow", "next", "week", "day",
    ]
    return any(tok in s for tok in temp_tokens)


def run(df: pd.DataFrame, col: dict) -> list[dict]:
    issues: list[dict] = []

    # meta columns
    key = _col(col, "record_key", "KEY")
    inst = _col(col, "instance_id", "instanceID")
    sub = _col(col, "submission_date", "SubmissionDate")
    enum = _col(col, "enumerator", "enumerator")
    enum_id = _col(col, "enumerator_id", "enumerator_id")
    device = _col(col, "deviceid", "deviceid")

    # district column
    district = _col(col, "district", "district")

    # duration should be calculated from start/end only
    start_col = _find_existing(df, ["starttime", "start_time"])
    end_col = _find_existing(df, ["endtime", "end_time"])

    # optional
    hh_size = _col(col, "hh_size", None)
    if not hh_size or hh_size not in df.columns:
        hh_size = _find_existing(df, ["hh_size", "household_size", "hh_members", "num_members", "hh_members_count"])

    # thresholds
    parent_gap_min = float(col.get("min_parent_child_gap_years", 12) or 12)
    dob_age_tol = float(col.get("dob_age_tolerance_years", 2) or 2)
    large_hh_thr = float(col.get("large_household_threshold", 20) or 20)

    ROSTER_MAX = int(col.get("hh_roster_max", 14) or 14)
    SIBLING_MAX = int(col.get("sibling_roster_max", 11) or 11)
    EDU_MAX = int(col.get("edu_roster_max", 11) or 11)

    def _norm_map_keys(m: Any) -> dict[str, str] | None:
        if not isinstance(m, dict):
            return None
        out: dict[str, str] = {}
        for k, v in m.items():
            nk = _norm_str(k)
            if nk == "":
                continue
            out[nk] = _norm_str(v)
        return out


    relation_value_map = _norm_map_keys(col.get("relation_value_map"))
    edu_value_map = _norm_map_keys(col.get("edu_value_map"))
    marital_value_map = _norm_map_keys(col.get("marital_value_map"))

    # grade mapping
    raw_grade_map = col.get("grade_value_map", {}) or {}
    grade_value_map = {str(k).strip().lower(): v for k, v in raw_grade_map.items()}

    # dummy tokens
    dummy_tokens_cfg = col.get("dummy_name_tokens") or []
    dummy_name_tokens = set(DEFAULT_DUMMY_NAME_TOKENS)
    for t in dummy_tokens_cfg:
        dummy_name_tokens.add(_norm_str(t))

    dummy_text_tokens_cfg = col.get("dummy_text_tokens") or []
    dummy_text_tokens = set(DEFAULT_DUMMY_TEXT_TOKENS)
    for t in dummy_text_tokens_cfg:
        dummy_text_tokens.add(_norm_str(t))

    # assets
    electricity = _col(col, "electricity", "electricity_connection")
    if electricity not in df.columns:
        electricity = _find_existing(df, ["electricity_connection", "electricity", "has_electricity"])

    asset_cols = col.get("asset_cols")
    if not asset_cols:
        asset_cols = [
            "refrigerator",
            "tv_vcr",
            "washingmachine_dryer",
            "air_conditioner",
            "computer_laptop",
            "freezer",
            "cookingrange_oven",
            "internet_connection",
        ]
    asset_cols = [a for a in asset_cols if a in df.columns]
    alt_power_cols = [c for c in ["generator_ups_solarpanel"] if c in df.columns]

    respondent_role = _find_existing(df, ["relationship_resp", "respondent", "respondent_name"])

    # Identity/location fields
    girl_id = _find_existing(df, ["girl", "girl_id", "gid"])
    girl_name_label = _find_existing(df, ["girlname_label", "girl_name_label", "girl_label", "girlname"])
    father_name_label = _find_existing(df, ["fathername_label", "father_name_label", "father_label", "fathername"])
    address_label = _find_existing(df, ["address_label", "girl_address_label"])
    landmark_label = _find_existing(df, ["landmark_label", "girl_landmark_label"])
    village_label = _find_existing(df, ["village_label", "village", "village_name", "village_name_label"])

    respondent_name = _find_existing(df, ["respondent_name", "resp_name", "resp_name1", "respondent_full_name"])
    respondent_address = _find_existing(df, ["Address", "address", "respondent_address"])
    respondent_landmark = _find_existing(df, ["landmark", "respondent_landmark"])

    days_school = _find_existing(df, ["days_school", "days_attended_school", "attendance_days"])

    sub_col_for_ref = sub if (sub and sub in df.columns) else None

    def meta(i: Any) -> dict:
        return dict(
            record_key=df.at[i, key] if key and key in df.columns else None,
            instance_id=df.at[i, inst] if inst and inst in df.columns else None,
            enumerator=df.at[i, enum] if enum and enum in df.columns else None,
            enumerator_id=df.at[i, enum_id] if enum_id and enum_id in df.columns else None,
            deviceid=df.at[i, device] if device and device in df.columns else None,
            submission_date=df.at[i, sub] if sub and sub in df.columns else None,
            district=df.at[i, district] if district and district in df.columns else None,
        )

    def add_issue(i: Any, severity: str, rule_id: str, title: str, message: str, field: str, value: Any) -> None:
        m = meta(i)
        log_add_issue(
            issues,
            survey="Household",
            severity=severity,
            rule_id=rule_id,
            title=title,
            cause=_msg(message),
            field=field,
            value=_clip(value),
            record_key=m["record_key"],
            instance_id=m["instance_id"],
            enumerator=m["enumerator"],
            enumerator_id=m["enumerator_id"],
            deviceid=m["deviceid"],
            submission_date=m["submission_date"],
            district=m["district"],
        )

    # -------------------------------------------------------------------------
    # Availability / respondent / consent fields
    # -------------------------------------------------------------------------
    available_col = _find_existing(df, ["available", "hh_available"])
    respondent_code_col = _find_existing(df, ["respondent"])
    consent_father_col = _find_existing(df, ["agree_consent_father"])
    consent_mother_col = _find_existing(df, ["agree_consent_mother"])

    # -------------------------------------------------------------------------
    # HH_AVAIL_RESP_*: If only one parent marked available, respondent should match that parent
    # -------------------------------------------------------------------------
    if available_col and available_col in df.columns:
        for i, row in df.iterrows():
            av = _as_set(row.get(available_col))
            if not av:
                continue

            resp_code = row.get(respondent_code_col) if (respondent_code_col and respondent_code_col in df.columns) else None
            resp_code_s = _norm_str(resp_code)

            yes_f = _is_yes(row.get(consent_father_col)) if (consent_father_col and consent_father_col in df.columns) else False
            yes_m = _is_yes(row.get(consent_mother_col)) if (consent_mother_col and consent_mother_col in df.columns) else False

            if av == {"1"}:
                if resp_code_s == "2" or (yes_m and not yes_f):
                    add_issue(
                        i,
                        "CRITICAL",
                        "HH_AVAIL_RESP_MISMATCH_FATHER",
                        "Availability and respondent mismatch",
                        "Father is marked as available, but the interview appears to be conducted with the mother (or mother consent is captured).",
                        f"{available_col},respondent",
                        f"available={row.get(available_col)}; respondent={resp_code_s}; agree_consent_father={row.get(consent_father_col) if consent_father_col and consent_father_col in df.columns else None}; agree_consent_mother={row.get(consent_mother_col) if consent_mother_col and consent_mother_col in df.columns else None}",
                    )

            if av == {"2"}:
                if resp_code_s == "1" or (yes_f and not yes_m):
                    add_issue(
                        i,
                        "CRITICAL",
                        "HH_AVAIL_RESP_MISMATCH_MOTHER",
                        "Availability and respondent mismatch",
                        "Mother is marked as available, but the interview appears to be conducted with the father (or father consent is captured).",
                        f"{available_col},respondent",
                        f"available={row.get(available_col)}; respondent={resp_code_s}; agree_consent_father={row.get(consent_father_col) if consent_father_col and consent_father_col in df.columns else None}; agree_consent_mother={row.get(consent_mother_col) if consent_mother_col and consent_mother_col in df.columns else None}",
                    )

            if av == {"3"}:
                if yes_f or yes_m:
                    add_issue(
                        i,
                        "FLAG",
                        "HH_NONE_AVAILABLE_BUT_PARENT_CONSENT",
                        "Parent consent captured although none marked available",
                        "Both parents are marked as unavailable, but a parent consent field is filled. Verify the availability selection and the interview path.",
                        f"{available_col},agree_consent_father,agree_consent_mother",
                        f"available={row.get(available_col)}; agree_consent_father={row.get(consent_father_col) if consent_father_col and consent_father_col in df.columns else None}; agree_consent_mother={row.get(consent_mother_col) if consent_mother_col and consent_mother_col in df.columns else None}",
                    )

    # -------------------------------------------------------------------------
    # Parent survey expectation logic (RESTORED)
    # -------------------------------------------------------------------------
    gid_col = girl_id if (girl_id and girl_id in df.columns) else _col(col, "girl_id", "girl")
    if gid_col and gid_col in df.columns and respondent_code_col and respondent_code_col in df.columns:
        cols = [gid_col, respondent_code_col]
        if available_col and available_col in df.columns:
            cols.append(available_col)
        if consent_father_col and consent_father_col in df.columns:
            cols.append(consent_father_col)
        if consent_mother_col and consent_mother_col in df.columns:
            cols.append(consent_mother_col)

        g = df[cols].copy()

        def _group_expected(subdf: pd.DataFrame) -> tuple[bool, bool]:
            exp_f = False
            exp_m = False

            if consent_father_col and consent_father_col in subdf.columns:
                exp_f = subdf[consent_father_col].apply(_is_yes).any()
            if consent_mother_col and consent_mother_col in subdf.columns:
                exp_m = subdf[consent_mother_col].apply(_is_yes).any()

            # if both parents marked available and both consent fields exist, expect both
            if available_col and available_col in subdf.columns and (consent_father_col and consent_mother_col):
                for v in subdf[available_col].dropna().astype(str).tolist():
                    sset = _as_set(v)
                    if "1" in sset and "2" in sset:
                        exp_f = True
                        exp_m = True
                        break

            return exp_f, exp_m

        def _group_present(subdf: pd.DataFrame) -> tuple[bool, bool]:
            r = subdf[respondent_code_col].astype(str).str.strip()
            has_f = (r == "1").any()
            has_m = (r == "2").any()
            return has_f, has_m

        for gid, subdf in g.groupby(gid_col, dropna=False):
            gid_s = _norm_str(gid)
            if gid_s == "":
                continue

            exp_f, exp_m = _group_expected(subdf)
            has_f, has_m = _group_present(subdf)

            if exp_f and not has_f:
                idxs = df.index[df[gid_col] == gid].tolist()
                for i in idxs:
                    add_issue(
                        i,
                        "CRITICAL",
                        "HH_PARENT_CONSENT_MISSING_FATHER_SURVEY",
                        "Father consent taken but father survey missing",
                        "Father consent is marked as agreed, but there is no corresponding father household submission (respondent=1) for this girl.",
                        f"{gid_col},{respondent_code_col},{consent_father_col}",
                        f"girl={gid}; expected_father=1; found_father={has_f}",
                    )

            if exp_m and not has_m:
                idxs = df.index[df[gid_col] == gid].tolist()
                for i in idxs:
                    add_issue(
                        i,
                        "CRITICAL",
                        "HH_PARENT_CONSENT_MISSING_MOTHER_SURVEY",
                        "Mother consent taken but mother survey missing",
                        "Mother consent is marked as agreed, but there is no corresponding mother household submission (respondent=2) for this girl.",
                        f"{gid_col},{respondent_code_col},{consent_mother_col}",
                        f"girl={gid}; expected_mother=1; found_mother={has_m}",
                    )

    # -------------------------------------------------------------------------
    # HH_ENUM_NONCONSENT_GT5: enumerator has >5 "consent not agreed" cases
    # -------------------------------------------------------------------------
    enum_key_col = None
    if enum_id and enum_id in df.columns:
        enum_key_col = enum_id
    elif enum and enum in df.columns:
        enum_key_col = enum

    if enum_key_col and respondent_code_col and respondent_code_col in df.columns and (
        (consent_father_col and consent_father_col in df.columns) or (consent_mother_col and consent_mother_col in df.columns)
    ):
        def _row_nonconsent(row: pd.Series) -> bool:
            resp = _norm_str(row.get(respondent_code_col))
            if resp == "1" and consent_father_col and consent_father_col in row.index:
                return _is_no(row.get(consent_father_col))
            if resp == "2" and consent_mother_col and consent_mother_col in row.index:
                return _is_no(row.get(consent_mother_col))
            f_no = _is_no(row.get(consent_father_col)) if (consent_father_col and consent_father_col in row.index) else False
            m_no = _is_no(row.get(consent_mother_col)) if (consent_mother_col and consent_mother_col in row.index) else False
            return f_no or m_no

        nonconsent_mask = df.apply(_row_nonconsent, axis=1)
        if nonconsent_mask.any():
            counts = df.loc[nonconsent_mask, enum_key_col].map(_norm_str).replace("", pd.NA).dropna().value_counts()
            bad_enums = set(counts[counts > 5].index.tolist())
            if bad_enums:
                for i in df.index[nonconsent_mask]:
                    ek = _norm_str(df.at[i, enum_key_col])
                    if ek in bad_enums:
                        add_issue(
                            i,
                            "FLAG",
                            "HH_ENUM_NONCONSENT_GT5",
                            "High number of non-consent cases",
                            "This enumerator has more than 5 cases where consent was not agreed. Review field practices and data.",
                            enum_key_col,
                            f"{ek} (nonconsent_count={int(counts.get(ek, 0))})",
                        )

    # roster columns
    name_cols = _pattern_cols(df, "name_", ROSTER_MAX)
    age_cols = _pattern_cols(df, "age_", ROSTER_MAX)
    gender_cols = _pattern_cols(df, "gender_", ROSTER_MAX)
    rel_cols = _pattern_cols(df, "relation_", ROSTER_MAX)
    dob_cols = _pattern_cols(df, "date_of_birth_", ROSTER_MAX)

    sib_name_cols = _pattern_cols(df, "name_sibling_", SIBLING_MAX)
    sib_age_cols = _pattern_cols(df, "age_sibling_", SIBLING_MAX)
    sib_marriage_age_cols = _pattern_cols(df, "marriage_age_", SIBLING_MAX)

    sib_dob_cols = _pattern_cols(df, "date_of_birth_sibling_", SIBLING_MAX)
    if not sib_dob_cols:
        sib_dob_cols = _pattern_cols(df, "dob_sibling_", SIBLING_MAX)
    if not sib_dob_cols:
        sib_dob_cols = _pattern_cols(df, "date_of_birth_sib_", SIBLING_MAX)

    edu_background_cols = _pattern_cols(df, "edu_background_", EDU_MAX)
    grade_2425_cols = _pattern_cols(df, "grade_24_25_", EDU_MAX)

    # =========================================================
    # HH_CR_09: Duplicate submission IDs (KEY, instanceID)
    # =========================================================
    for id_col, label in [(key, "record_key"), (inst, "instance_id")]:
        if not id_col or id_col not in df.columns:
            continue
        s = df[id_col].map(_norm_str)
        dup_mask = (s != "") & s.duplicated(keep=False)
        if dup_mask.any():
            for i in df.index[dup_mask]:
                val = s.loc[i]
                cnt = int((s == val).sum())
                add_issue(
                    i,
                    "CRITICAL",
                    "HH_CR_09",
                    "Duplicate submission ID",
                    f"Duplicate {label} found. Each submission must be unique.",
                    id_col,
                    f"{val} (count={cnt})",
                )

    # =========================================================
    # HH_CR_11: ID conflict (same girl id mapped to different identity)
    # =========================================================
    if gid_col and gid_col in df.columns:
        id_series = df[gid_col].map(_norm_str)
        name_series = df[girl_name_label].map(_norm_str) if (girl_name_label and girl_name_label in df.columns) else pd.Series("", index=df.index)
        father_series = df[father_name_label].map(_norm_str) if (father_name_label and father_name_label in df.columns) else pd.Series("", index=df.index)

        keep = (id_series != "")
        if keep.any():
            tmp = pd.DataFrame({"gid": id_series, "gname": name_series, "fname": father_series})
            tmp = tmp[keep].copy()

            def _uniq_nonempty(x: pd.Series) -> set[str]:
                return {v for v in x.tolist() if v != ""}

            conflict_set: set[str] = set()
            for gid, g2 in tmp.groupby("gid"):
                gn = _uniq_nonempty(g2["gname"])
                fn = _uniq_nonempty(g2["fname"])
                if len(gn) > 1 or len(fn) > 1:
                    conflict_set.add(gid)

            if conflict_set:
                bad_idx = tmp.index[tmp["gid"].isin(conflict_set)]
                cols_for_field = ", ".join([c for c in [gid_col, girl_name_label, father_name_label] if c])
                for i in bad_idx:
                    gidv = id_series.loc[i]
                    add_issue(
                        i,
                        "CRITICAL",
                        "HH_CR_11",
                        "Girl ID conflict",
                        "Same girl id appears with different girl or father names, this breaks linkage across surveys.",
                        cols_for_field,
                        f"girl={gidv}, girlname={_clip(df.at[i, girl_name_label]) if girl_name_label else ''}, father={_clip(df.at[i, father_name_label]) if father_name_label else ''}",
                    )

    # =========================================================
    # HH_CR_10: Exact duplicate records (identity + location), ONLY IF SAME RESPONDENT
    # =========================================================
    sig_cols = [c for c in [district, gid_col, girl_name_label, father_name_label, address_label, landmark_label, village_label] if c and c in df.columns]
    dup_key_cols = list(sig_cols)

    if respondent_code_col and respondent_code_col in df.columns:
        dup_key_cols = dup_key_cols + [respondent_code_col]

    if dup_key_cols:
        sig_df = df[dup_key_cols].copy()
        for c in dup_key_cols:
            sig_df[c] = sig_df[c].map(_norm_str)

        any_filled = (sig_df[sig_cols] != "").any(axis=1) if sig_cols else sig_df.any(axis=1)
        if any_filled.any():
            dup_mask = sig_df[any_filled].duplicated(keep=False)
            dup_idx = sig_df[any_filled].index[dup_mask]
            if len(dup_idx):
                dup_groups = sig_df.loc[dup_idx].groupby(dup_key_cols, dropna=False).groups
                for _, idxs in dup_groups.items():
                    idxs = list(idxs)
                    if len(idxs) < 2:
                        continue
                    for i in idxs:
                        add_issue(
                            i,
                            "CRITICAL",
                            "HH_CR_10",
                            "Exact duplicate record",
                            "Duplicate household record detected for the same respondent (same identity and location fields, and same respondent code).",
                            ", ".join(dup_key_cols),
                            "; ".join([f"{c}={_clip(df.at[i, c])}" for c in dup_key_cols[:7]]),
                        )

    # =========================================================
    # HH_CR_12: days_school range check (0-12)
    # =========================================================
    if days_school and days_school in df.columns:
        ds = pd.to_numeric(df[days_school], errors="coerce")
        bad = ds.notna() & ((ds < 0) | (ds > 12))
        for i in df.index[bad]:
            add_issue(
                i,
                "CRITICAL",
                "HH_CR_12",
                "Invalid school attendance days",
                "Days attended school in the past two weeks must be between 0 and 12.",
                days_school,
                _norm_str(df.at[i, days_school]),
            )

    # -------------------------------------------------
    # HH_QF_03: dummy/placeholder names (roster + siblings)
    # -------------------------------------------------
    check_name_cols = [*name_cols, *sib_name_cols]
    if check_name_cols:
        for i in df.index:
            bad = []
            for c in check_name_cols:
                v = df.at[i, c]
                if _is_dummy_name(v, dummy_name_tokens):
                    bad.append((c, _norm_str(v)))

            if bad:
                fields = ", ".join([c for c, _ in bad])
                ev = "; ".join([f"{c}={v}" for c, v in bad[:6]])
                if len(bad) > 6:
                    ev += f"; +{len(bad) - 6} more"

                add_issue(
                    i,
                    "FLAG",
                    "HH_QF_03",
                    "Dummy or placeholder name",
                    "One or more roster or sibling names look like dummy or placeholder text, verify.",
                    fields,
                    ev,
                )

    # -------------------------------------------------
    # HH_QF_04: dummy/placeholder identity + location fields
    # -------------------------------------------------
    identity_location_cols = [c for c in [
        girl_name_label,
        father_name_label,
        respondent_name,
        address_label,
        landmark_label,
        village_label,
        respondent_address,
        respondent_landmark,
    ] if c and c in df.columns]

    if identity_location_cols:
        for i in df.index:
            bad = []
            for c in identity_location_cols:
                v = df.at[i, c]
                if _is_dummy_text(v, dummy_text_tokens):
                    bad.append((c, _norm_str(v)))

            if bad:
                fields = ", ".join([c for c, _ in bad])
                ev = "; ".join([f"{c}={v}" for c, v in bad[:6]])
                if len(bad) > 6:
                    ev += f"; +{len(bad) - 6} more"

                add_issue(
                    i,
                    "FLAG",
                    "HH_QF_04",
                    "Dummy or placeholder identity/location",
                    "One or more key identity or location fields look like dummy or placeholder text, verify.",
                    fields,
                    ev,
                )

    # -------------------------------------------------
    # HH_CR_05: no adult
    # -------------------------------------------------
    if age_cols:
        ages = _df_map(df[age_cols], _to_num)
        member_present = ages.notna()
        if name_cols:
            nm_present = _df_map(df[name_cols], lambda x: _norm_str(x) != "")
            member_present = member_present | nm_present

        any_member = member_present.any(axis=1)
        any_adult = (ages >= 18).fillna(False).any(axis=1)

        bad = any_member & (~any_adult)
        for i in df.index[bad]:
            row_ages = pd.Series(ages.loc[i]).dropna()
            min_age = float(row_ages.min()) if len(row_ages) else None
            count_members = int(member_present.loc[i].sum())

            add_issue(
                i,
                "CRITICAL",
                "HH_CR_05",
                "No adult in household roster",
                "All listed household members appear to be under 18, verify roster completeness and ages.",
                ",".join(age_cols),
                f"min_age≈{min_age}, members={count_members}",
            )

    # -------------------------------------------------
    # HH_CR_01: duplicates (name+age+gender)
    # -------------------------------------------------
    if name_cols and age_cols and gender_cols:
        ndf = _df_map(df[name_cols], _norm_str)
        adf = _df_map(df[age_cols], _to_num)
        gdf = _df_map(df[gender_cols], _norm_str)

        for i in df.index:
            seen: set[tuple[str, Any, str]] = set()
            dup: list[tuple[int, str, Any, str]] = []

            max_pos = min(ROSTER_MAX, len(name_cols), len(age_cols), len(gender_cols))
            for pos in range(1, max_pos + 1):
                nm = ndf.at[i, f"name_{pos}"] if f"name_{pos}" in ndf.columns else ""
                ag = adf.at[i, f"age_{pos}"] if f"age_{pos}" in adf.columns else None
                gd = gdf.at[i, f"gender_{pos}"] if f"gender_{pos}" in gdf.columns else ""
                if nm == "" and ag is None and gd == "":
                    continue
                if nm and (ag is not None) and gd:
                    sig = (nm, ag, gd)
                    if sig in seen:
                        dup.append((pos, nm, ag, gd))
                    else:
                        seen.add(sig)

            if dup:
                fields = []
                ev_parts = []
                for pos, nm, ag, gd in dup[:4]:
                    fields.extend([f"name_{pos}", f"age_{pos}", f"gender_{pos}"])
                    ev_parts.append(f"#{pos}:{nm}, age={ag}, gender={gd}")
                if len(dup) > 4:
                    ev_parts.append(f"+{len(dup) - 4} more")

                add_issue(
                    i,
                    "CRITICAL",
                    "HH_CR_01",
                    "Duplicate household members",
                    "Same household member appears more than once (same name, age, gender).",
                    ", ".join(dict.fromkeys(fields)) if fields else ",".join(name_cols + age_cols + gender_cols),
                    "; ".join(ev_parts),
                )

    # -------------------------------------------------
    # HH_CR_02: impossible relationships
    # -------------------------------------------------
   
    if age_cols and rel_cols:
        adf = _df_map(df[age_cols], _to_num)
        rdf = _df_map(df[rel_cols], lambda x: _relation_text(x, relation_value_map))

        def is_parent(rel_text: Any, rel_raw: Any) -> bool:
            # numeric fallback (works even if mapping is missing/broken)
            n = _to_num(rel_raw)
            if n is not None and abs(n - round(n)) < 1e-9:
                code = str(int(round(n)))
                # your codes: 1=Father/Step-Father, 2=Mother/Step-Mother
                if code in {"1", "2"}:
                    return True

            # text-based detection (works when mapping is present)
            r = _norm_str(rel_text)
            return ("mother" in r) or ("father" in r) or ("parent" in r)

        def is_child(rel_text: Any) -> bool:
            r = _norm_str(rel_text)
            return any(w in r for w in ["son", "daughter", "child"])

        for i in df.index:
            members: list[dict[str, Any]] = []

            max_pos = min(ROSTER_MAX, len(age_cols), len(rel_cols))
            for pos in range(1, max_pos + 1):
                age = adf.at[i, f"age_{pos}"] if f"age_{pos}" in adf.columns else None

                rel_raw = df.at[i, f"relation_{pos}"] if f"relation_{pos}" in df.columns else None
                rel_txt = rdf.at[i, f"relation_{pos}"] if f"relation_{pos}" in rdf.columns else ""

                nm = _norm_str(df.at[i, f"name_{pos}"]) if f"name_{pos}" in df.columns else ""

                # if the roster row is completely empty, skip
                if age is None and rel_txt == "" and nm == "":
                    continue

                members.append(
                    {
                        "pos": pos,
                        "age": age,
                        "rel_raw": rel_raw,
                        "rel_txt": rel_txt,
                        "name": nm,
                    }
                )

            parents = [m for m in members if m["age"] is not None and is_parent(m["rel_txt"], m["rel_raw"])]
            children = [m for m in members if m["age"] is not None and is_child(m["rel_txt"])]

            if not parents or not children:
                continue

            for p in parents:
                for c in children:
                    if p["age"] is None or c["age"] is None:
                        continue

                    fcols = ",".join(
                        [
                            f"relation_{p['pos']}",
                            f"age_{p['pos']}",
                            f"relation_{c['pos']}",
                            f"age_{c['pos']}",
                        ]
                    )

                    if p["age"] <= c["age"]:
                        add_issue(
                            i,
                            "CRITICAL",
                            "HH_CR_02",
                            "Impossible relationships",
                            "Parent is younger than or same age as child, biologically unrealistic.",
                            fcols,
                            f"parent#{p['pos']} age={p['age']} ({_norm_str(p['rel_txt'])}), child#{c['pos']} age={c['age']} ({_norm_str(c['rel_txt'])})",
                        )
                        break

                    gap = p["age"] - c["age"]
                    if gap < parent_gap_min:
                        add_issue(
                            i,
                            "CRITICAL",
                            "HH_CR_02",
                            "Impossible relationships",
                            f"Parent-child age gap is too small (expected ≥ {parent_gap_min} years).",
                            fcols,
                            f"gap≈{round(gap,1)}y (parent#{p['pos']} age={p['age']}, child#{c['pos']} age={c['age']})",
                        )
                        break


    # -------------------------------------------------
    # HH_CR_13: parent age unrealistically low (absolute)
    # -------------------------------------------------
    
    MIN_PARENT_AGE_YEARS = float(col.get("min_parent_age_years", 12) or 12)
    if age_cols and rel_cols:
        adf = _df_map(df[age_cols], _to_num)
        rdf = _df_map(df[rel_cols], lambda x: _relation_text(x, relation_value_map))

        def is_parent(rel_text: Any, rel_raw: Any) -> bool:
            # numeric fallback (works even if mapping is missing/broken)
            n = _to_num(rel_raw)
            if n is not None and abs(n - round(n)) < 1e-9:
                code = str(int(round(n)))
                # your codes: 1=Father/Step-Father, 2=Mother/Step-Mother
                if code in {"1", "2"}:
                    return True

            # text-based detection (works when mapping is present)
            r = _norm_str(rel_text)
            return ("mother" in r) or ("father" in r) or ("parent" in r)

        for i in df.index:
            bad_parents: list[tuple[int, str, str, float]] = []
            fields: list[str] = []

            max_pos = min(ROSTER_MAX, len(age_cols), len(rel_cols))
            for pos in range(1, max_pos + 1):
                age = adf.at[i, f"age_{pos}"] if f"age_{pos}" in adf.columns else None

                rel_raw = df.at[i, f"relation_{pos}"] if f"relation_{pos}" in df.columns else None
                rel_txt = rdf.at[i, f"relation_{pos}"] if f"relation_{pos}" in rdf.columns else ""

                nm = _norm_str(df.at[i, f"name_{pos}"]) if f"name_{pos}" in df.columns else ""

                if age is None:
                    continue

                if not is_parent(rel_txt, rel_raw):
                    continue

                if age < MIN_PARENT_AGE_YEARS:
                    bad_parents.append((pos, nm, _norm_str(rel_txt), float(age)))
                    fields.extend([f"relation_{pos}", f"age_{pos}", f"name_{pos}"])

            if bad_parents:
                ev = "; ".join(
                    [
                        f"#{pos}: {name or 'parent'} ({rel}) age={_age_to_human(age)}"
                        for pos, name, rel, age in bad_parents[:4]
                    ]
                )
                if len(bad_parents) > 4:
                    ev += f"; +{len(bad_parents) - 4} more"

                add_issue(
                    i,
                    "CRITICAL",
                    "HH_CR_13",
                    "Parent age unrealistically low",
                    f"Roster member marked as a parent but age is below {MIN_PARENT_AGE_YEARS} years.",
                    ", ".join(dict.fromkeys([c for c in fields if c in df.columns])),
                    ev,
                )


    # -------------------------------------------------
    # HH_CR_03: invalid sibling marriage info
    # -------------------------------------------------
    if sib_age_cols and sib_marriage_age_cols:
        for i in df.index:
            bad_rows = []
            field_cols = []
            for pos in range(1, min(SIBLING_MAX, len(sib_age_cols), len(sib_marriage_age_cols)) + 1):
                age = _to_num(df.at[i, f"age_sibling_{pos}"]) if f"age_sibling_{pos}" in df.columns else None
                m_age = _to_num(df.at[i, f"marriage_age_{pos}"]) if f"marriage_age_{pos}" in df.columns else None
                m_status_raw = df.at[i, f"marital_status_sibling_{pos}"] if f"marital_status_sibling_{pos}" in df.columns else None
                m_status = _norm_str(m_status_raw)
                if marital_value_map and m_status in marital_value_map:
                    m_status = _norm_str(marital_value_map[m_status])

                if age is None and m_age is None and m_status == "":
                    continue

                bad = False
                if age is not None and m_age is not None and m_age > age:
                    bad = True
                if m_status and ("never" in m_status or "single" in m_status) and m_age is not None:
                    bad = True

                if bad:
                    bad_rows.append((pos, age, m_age, m_status))
                    field_cols.extend([f"age_sibling_{pos}", f"marriage_age_{pos}", f"marital_status_sibling_{pos}"])

            if bad_rows:
                ev = "; ".join([f"#{pos}: age={age}, marriage_age={m_age}, status={m_status}" for pos, age, m_age, m_status in bad_rows[:4]])
                if len(bad_rows) > 4:
                    ev += f"; +{len(bad_rows) - 4} more"

                add_issue(
                    i,
                    "CRITICAL",
                    "HH_CR_03",
                    "Invalid sibling information",
                    "Sibling marriage details inconsistent (marriage age > current age or status mismatch).",
                    ", ".join(dict.fromkeys(field_cols)) if field_cols else ",".join(sib_age_cols + sib_marriage_age_cols),
                    ev,
                )

    # -------------------------------------------------
    # HH_CR_04: education roster inconsistencies
    # -------------------------------------------------
    if edu_background_cols:
        for i in df.index:
            problems = []
            fields = []
            for pos in range(1, EDU_MAX + 1):
                eb_col = f"edu_background_{pos}"
                en_col = f"enroll_24_25_{pos}"
                gr_col = f"grade_24_25_{pos}"
                rn_col = f"reason_neverattended_{pos}"

                if eb_col not in df.columns and en_col not in df.columns and gr_col not in df.columns and rn_col not in df.columns:
                    continue

                edu_bg = _edu_text(df.at[i, eb_col], edu_value_map) if eb_col in df.columns else ""
                enroll = df.at[i, en_col] if en_col in df.columns else None
                grade_raw = df.at[i, gr_col] if gr_col in df.columns else None
                reason_never = df.at[i, rn_col] if rn_col in df.columns else None

                grade_filled = _norm_str(grade_raw) != ""
                enroll_no = _is_no(enroll)
                enroll_yes = _is_yes(enroll)

                issue = None
                if enroll_no and grade_filled:
                    issue = "enrolled=no but grade filled"
                else:
                    never_attended = ("never" in edu_bg) or (reason_never is not None and _norm_str(reason_never) != "")
                    if never_attended and grade_filled:
                        issue = "never attended but grade present"
                    elif enroll_yes and (not grade_filled):
                        issue = "enrolled=yes but grade missing"

                if issue:
                    problems.append((pos, issue, _norm_str(enroll), _norm_str(grade_raw)))
                    fields.extend([eb_col, en_col, gr_col, rn_col])

            if problems:
                ev = "; ".join([f"#{pos}: {issue} (enroll={en}, grade={gr})" for pos, issue, en, gr in problems[:4]])
                if len(problems) > 4:
                    ev += f"; +{len(problems) - 4} more"

                add_issue(
                    i,
                    "CRITICAL",
                    "HH_CR_04",
                    "Education roster inconsistencies",
                    "Education responses contradict each other (enrollment, grade, never-attended indicators).",
                    ", ".join(dict.fromkeys([f for f in fields if f in df.columns])),
                    ev,
                )

    # -------------------------------------------------
    # HH_CR_08: negative age (roster + siblings)
    # -------------------------------------------------
    neg_age_cols: list[str] = []
    neg_age_cols.extend(age_cols)
    neg_age_cols.extend(sib_age_cols)

    if neg_age_cols:
        ages_all = _df_map(df[neg_age_cols], _to_num)
        neg_any = (ages_all < 0).fillna(False).any(axis=1)

        for i in df.index[neg_any]:
            bad_cells = []
            for c in neg_age_cols:
                v = _to_num(df.at[i, c])
                if v is not None and v < 0:
                    bad_cells.append((c, v))

            fields = ", ".join([c for c, _ in bad_cells]) if bad_cells else ", ".join(neg_age_cols)
            ev = "; ".join([f"{c}={v}" for c, v in bad_cells[:6]])
            if len(bad_cells) > 6:
                ev += f"; +{len(bad_cells) - 6} more"

            add_issue(
                i,
                "CRITICAL",
                "HH_CR_08",
                "Negative age",
                "Age is negative (invalid). Usually caused by incorrect entry or future DOB.",
                fields,
                ev if ev else "negative age values present",
            )

    # -------------------------------------------------
    # HH_CR_07: DOB vs age mismatch (roster)
    # -------------------------------------------------
    if dob_cols and age_cols:
        for i in df.index:
            ref_dt = _parse_date_any(df.at[i, sub_col_for_ref]) if (sub_col_for_ref and sub_col_for_ref in df.columns) else None
            if ref_dt is None:
                ref_dt = datetime.today()

            mism = []
            fields = []
            for pos in range(1, min(ROSTER_MAX, len(dob_cols), len(age_cols)) + 1):
                dob_raw = df.at[i, f"date_of_birth_{pos}"] if f"date_of_birth_{pos}" in df.columns else None
                age_raw = df.at[i, f"age_{pos}"] if f"age_{pos}" in df.columns else None
                dob_dt = _parse_date_any(dob_raw, ref=ref_dt)
                age = _to_num(age_raw)
                if dob_dt is None or age is None:
                    continue
                if age < 0:
                    continue

                calc = _age_from_dob(dob_dt, ref_dt)
                if calc < 0 or abs(calc - age) > dob_age_tol:
                    mism.append((pos, age, round(calc, 2), _norm_str(dob_raw)))
                    fields.extend([f"date_of_birth_{pos}", f"age_{pos}"])

            if mism:
                ev = "; ".join([f"#{pos}: age={age}, dob_age≈{calc}, dob={dob}" for pos, age, calc, dob in mism[:4]])
                if len(mism) > 4:
                    ev += f"; +{len(mism) - 4} more"

                add_issue(
                    i,
                    "CRITICAL",
                    "HH_CR_07",
                    "DOB vs age mismatch",
                    f"Reported age does not match DOB (difference > {dob_age_tol} years) or DOB is in the future.",
                    ", ".join(dict.fromkeys(fields)),
                    ev,
                )

    # -------------------------------------------------
    # HH_CR_07: DOB vs age mismatch (siblings)
    # -------------------------------------------------
    if sib_dob_cols and sib_age_cols:
        for i in df.index:
            ref_dt = _parse_date_any(df.at[i, sub_col_for_ref]) if (sub_col_for_ref and sub_col_for_ref in df.columns) else None
            if ref_dt is None:
                ref_dt = datetime.today()

            mism = []
            fields2: list[str] = []
            for pos in range(1, SIBLING_MAX + 1):
                dob_col = f"date_of_birth_sibling_{pos}"
                if dob_col not in df.columns:
                    if pos - 1 < len(sib_dob_cols):
                        dob_col = sib_dob_cols[pos - 1]
                    else:
                        continue

                age_col = f"age_sibling_{pos}"
                if age_col not in df.columns:
                    continue

                dob_raw = df.at[i, dob_col]
                age_raw = df.at[i, age_col]
                dob_dt = _parse_date_any(dob_raw, ref=ref_dt)
                age = _to_num(age_raw)

                if dob_dt is None or age is None:
                    continue
                if age < 0:
                    continue

                calc = _age_from_dob(dob_dt, ref_dt)
                if calc < 0 or abs(calc - age) > dob_age_tol:
                    mism.append((pos, dob_col, _norm_str(dob_raw), age_col, age, round(calc, 2)))
                    fields2.extend([dob_col, age_col])

            if mism:
                ev = "; ".join([f"#{pos}: {age_col}={age}, dob_age≈{calc}, {dob_col}={dob}" for pos, dob_col, dob, age_col, age, calc in mism[:4]])
                if len(mism) > 4:
                    ev += f"; +{len(mism) - 4} more"

                add_issue(
                    i,
                    "CRITICAL",
                    "HH_CR_07",
                    "DOB vs age mismatch",
                    f"Sibling age does not match sibling DOB (difference > {dob_age_tol} years) or DOB is in the future.",
                    ", ".join(dict.fromkeys(fields2)),
                    ev,
                )

    # -------------------------------------------------
    # HH_CR_06: household size mismatch (if hh_size exists)
    # -------------------------------------------------
    if hh_size and hh_size in df.columns and (name_cols or age_cols):
        hh_s = pd.to_numeric(df[hh_size], errors="coerce")
        if name_cols:
            nm_present = _df_map(df[name_cols], lambda x: _norm_str(x) != "")
            roster_count = nm_present.sum(axis=1).astype(float)
        else:
            ages2 = _df_map(df[age_cols], _to_num)
            roster_count = ages2.notna().sum(axis=1).astype(float)

        bad = hh_s.notna() & roster_count.notna() & (hh_s != roster_count)
        for i in df.index[bad]:
            add_issue(
                i,
                "CRITICAL",
                "HH_CR_06",
                "Household size mismatch",
                "Reported household size does not match roster member count, roster may be incomplete.",
                hh_size,
                f"reported={_norm_str(df.at[i, hh_size])}, roster_count={int(roster_count.loc[i])}",
            )

    # -------------------------------------------------
    # HH_QF_01: extremely large household
    # -------------------------------------------------
    if hh_size and hh_size in df.columns:
        s = pd.to_numeric(df[hh_size], errors="coerce")
        bad = s.notna() & (s > large_hh_thr)
        for i in df.index[bad]:
            add_issue(
                i,
                "FLAG",
                "HH_QF_01",
                "Extremely large household",
                f"Household size is unusually large (>{large_hh_thr}), verify.",
                hh_size,
                _norm_str(df.at[i, hh_size]),
            )

    # -------------------------------------------------
    # HH_QF_07: survey completed too quickly (start/end only)
    # -------------------------------------------------
    MIN_DURATION_MIN = float(col.get("min_survey_duration_minutes", 30) or 30)

    if start_col and end_col:
        for i in df.index:
            mins = _duration_minutes(df.loc[i], start_col, end_col)
            if mins is None:
                continue

            if mins < MIN_DURATION_MIN:
                field = f"{start_col},{end_col}"
                add_issue(
                    i,
                    "FLAG",
                    "HH_QF_07",
                    "Survey completed too quickly",
                    f"Household survey should take at least {MIN_DURATION_MIN} minutes. Observed duration is {round(mins,1)} minutes (<{MIN_DURATION_MIN}).",
                    field,
                    f"{round(mins,1)} mins",
                )

    # -------------------------------------------------
    # HH_QF_02: asset contradictions
    # -------------------------------------------------
    if electricity and electricity in df.columns and asset_cols:
        elec = df[electricity].map(_norm_str)
        no_elec = elec.isin(NO_SET)

        alt_ok = pd.Series(False, index=df.index)
        for c in alt_power_cols:
            alt_ok = alt_ok | df[c].map(_is_yes)

        for a in asset_cols:
            has_asset = df[a].map(_is_yes)
            bad = no_elec & has_asset & (~alt_ok)
            for i in df.index[bad.fillna(False)]:
                add_issue(
                    i,
                    "FLAG",
                    "HH_QF_02",
                    "Asset contradiction",
                    "No electricity reported but asset present, verify answers.",
                    f"{electricity},{a}",
                    f"electricity={_norm_str(df.at[i, electricity])}, {a}={_norm_str(df.at[i, a])}",
                )

    # -------------------------------------------------
    # HH_QF_05: grade vs age plausibility (PERSON-LEVEL, matched by index)
    # -------------------------------------------------
    PREPRIMARY_MIN = float(col.get("preprimary_min_age_years", 2.0) or 2.0)
    PREPRIMARY_MAX = float(col.get("preprimary_max_age_years", 6.5) or 6.5)

    if grade_2425_cols and (age_cols or sib_age_cols):
        for i in df.index:
            flagged: list[dict] = []

            for pos in range(1, EDU_MAX + 1):
                gr_col = f"grade_24_25_{pos}"
                if gr_col not in df.columns:
                    continue

                if f"age_sibling_{pos}" in df.columns:
                    age_col = f"age_sibling_{pos}"
                elif f"age_{pos}" in df.columns:
                    age_col = f"age_{pos}"
                else:
                    continue

                age_val = _to_num(df.at[i, age_col])
                grade_raw = df.at[i, gr_col]
                grade_num = _to_num(grade_raw)

                if age_val is None or grade_num is None:
                    continue

                grade_num = int(round(grade_num))

                name_col = None
                if f"name_sibling_{pos}" in df.columns:
                    name_col = f"name_sibling_{pos}"
                elif f"name_{pos}" in df.columns:
                    name_col = f"name_{pos}"

                person_name = _norm_str(df.at[i, name_col]) if name_col else ""
                person = f"{person_name} (#{pos})" if person_name else f"Person #{pos}"

                if grade_num in (26, 27):
                    if age_val < PREPRIMARY_MIN or age_val > PREPRIMARY_MAX:
                        flagged.append(
                            {
                                "pos": pos,
                                "person": person,
                                "age_col": age_col,
                                "age": round(float(age_val), 2),
                                "grade_col": gr_col,
                                "grade": _grade_label(grade_num),
                                "note": f"Expected age {PREPRIMARY_MIN}-{PREPRIMARY_MAX} years",
                            }
                        )
                    continue

                grade_mapped = _grade_school_from_code(str(grade_num), grade_value_map)
                if grade_mapped is None:
                    continue

                if grade_mapped >= 6 and age_val < 9:
                    flagged.append(
                        {
                            "pos": pos,
                            "person": person,
                            "age_col": age_col,
                            "age": round(float(age_val), 2),
                            "grade_col": gr_col,
                            "grade": _grade_label(grade_mapped),
                            "note": "High class for young age",
                        }
                    )

                if grade_mapped <= 2 and age_val > 16:
                    flagged.append(
                        {
                            "pos": pos,
                            "person": person,
                            "age_col": age_col,
                            "age": round(float(age_val), 2),
                            "grade_col": gr_col,
                            "grade": _grade_label(grade_mapped),
                            "note": "Low class for older age",
                        }
                    )

            if flagged:
                seen = set()
                uniq = []
                for f in flagged:
                    sig = (f["pos"], f["age_col"], f["grade_col"], f["note"])
                    if sig in seen:
                        continue
                    seen.add(sig)
                    uniq.append(f)

                fields = []
                ev_parts = []
                for f in uniq[:5]:
                    ev_parts.append(
                        f'{f["person"]}: {f["age_col"]}={_age_to_human(float(f["age"]))}, '
                        f'{f["grade_col"]}={f["grade"]} ({f["note"]})'
                    )
                    fields.extend([f["age_col"], f["grade_col"]])

                if len(uniq) > 5:
                    ev_parts.append(f"+{len(uniq) - 5} more")

                add_issue(
                    i,
                    "FLAG",
                    "HH_QF_05",
                    "Grade vs age plausibility",
                    "Age and grade combination looks unusual, verify.",
                    ", ".join(dict.fromkeys(fields)),
                    " | ".join(ev_parts),
                )

    # -------------------------------------------------
    # HH_QF_06: respondent role needs review (heuristic)
    # -------------------------------------------------
    if respondent_role and respondent_role in df.columns and age_cols:
        relr = df[respondent_role].map(_norm_str)
        ages = _df_map(df[age_cols], _to_num)
        any_adult = (ages >= 18).fillna(False).any(axis=1)

        child_resp = relr.str.contains(r"\b(?:child|daughter|son)\b", regex=True, na=False)
        bad = child_resp & any_adult
        for i in df.index[bad.fillna(False)]:
            add_issue(
                i,
                "FLAG",
                "HH_QF_06",
                "Respondent role needs review",
                "Respondent marked as child while adults exist in household, verify who answered.",
                respondent_role,
                _norm_str(df.at[i, respondent_role]),
            )

    # =========================================================
    # TEMPORARY UNAVAILABILITY FOLLOW UP + TRACKER OUTPUT
    # =========================================================
    followup_rows: list[dict] = []

    schedule_date_col = _find_existing(df, ["available_date", "schedule_date", "availability_date", "date_available", "avail_date"])
    slot_col_generic = _find_existing(df, ["available_days_time", "available_days_time_father", "available_days_time_mother"])
    slot_col_father = _find_existing(df, ["schedule_spouse", "available_days_time_father", "available_days_time"])
    slot_col_mother = _find_existing(df, ["schedule_resp", "available_days_time_mother", "available_days_time"])

    father_unavail_col = _find_existing(df, ["father_unavailable1", "father_unavailable_reason", "unavailable_reason_father"])
    father_unavail_other_col = _find_existing(df, ["father_unavailable_other", "father_unavailable_reason_other", "unavailable_reason_father_other"])
    mother_unavail_col = _find_existing(df, ["mother_unavailable1", "mother_unavailable_reason", "unavailable_reason_mother"])
    mother_unavail_other_col = _find_existing(df, ["mother_unavailable_other", "mother_unavailable_reason_other", "unavailable_reason_mother_other"])

    now = datetime.now()
    due_soon_until = now + timedelta(hours=24)

    # build quick "has father/mother survey" lookup by girl id
    has_parent_by_gid: dict[str, tuple[bool, bool]] = {}
    if gid_col and gid_col in df.columns and respondent_code_col and respondent_code_col in df.columns:
        for gid, subdf in df.groupby(df[gid_col].map(_norm_str), dropna=False):
            if _norm_str(gid) == "":
                continue
            r = subdf[respondent_code_col].astype(str).str.strip()
            has_parent_by_gid[_norm_str(gid)] = ((r == "1").any(), (r == "2").any())

    def _emit_tracker_row(i: int, parent: str, unavail_code: Any, schedule_dt: datetime | None, slot_raw: Any) -> None:
        m = meta(i)
        gidv = _norm_str(df.at[i, gid_col]) if (gid_col and gid_col in df.columns) else ""
        row = {
            "enumerator": m["enumerator"],
            "enumerator_id": m["enumerator_id"],
            "record_key": m["record_key"],
            "district": m["district"],
            "girl_id": gidv,
            "parent": parent,
            "unavailable_reason": _decode_single_code(unavail_code, UNAVAILABLE_REASON_MAP),
            "schedule_date": schedule_dt.date().isoformat() if schedule_dt else "",
            "available_days_time": _decode_multiselect(slot_raw, AVAILABLE_DAYS_TIME_MAP) if slot_raw is not None else "",
            "submission_date": _clip(m["submission_date"]),
            "instance_id": df.at[i, inst] if inst and inst in df.columns else None,
            "deviceid": df.at[i, device] if device and device in df.columns else None,
        }
        followup_rows.append(row)

    def _process_parent_followup(i: int, parent: str) -> None:
        if not gid_col or gid_col not in df.columns:
            return

        gidv = _norm_str(df.at[i, gid_col])
        if gidv == "":
            return

        has_f, has_m = has_parent_by_gid.get(gidv, (False, False))
        parent_missing = (not has_f) if parent == "father" else (not has_m)

        if parent == "father":
            reason_col = father_unavail_col
            other_col = father_unavail_other_col
            slot_col = slot_col_father or slot_col_generic
        else:
            reason_col = mother_unavail_col
            other_col = mother_unavail_other_col
            slot_col = slot_col_mother or slot_col_generic

        if not reason_col or reason_col not in df.columns:
            return

        reason_raw = df.at[i, reason_col]
        reason_code = _decode_single_code(reason_raw, UNAVAILABLE_REASON_MAP)
        reason_num = _to_num(reason_raw)
        reason_num_s = str(int(round(reason_num))) if reason_num is not None else _norm_str(reason_raw)

        other_text = df.at[i, other_col] if (other_col and other_col in df.columns) else None

        slot_raw = df.at[i, slot_col] if (slot_col and slot_col in df.columns) else None
        sched_raw = df.at[i, schedule_date_col] if (schedule_date_col and schedule_date_col in df.columns) else None
        sched_dt = _parse_date_any(sched_raw) if (schedule_date_col and schedule_date_col in df.columns) else None

        schedule_required = False
        if reason_num_s in {"1", "2"}:
            schedule_required = True
        elif reason_num_s == "6" and _is_temp_other_text(other_text):
            schedule_required = True

        schedule_forbidden = reason_num_s in {"3", "4", "5"}

        # forbidden scheduling but fields present
        if schedule_forbidden:
            has_any_schedule = (sched_dt is not None) or (_norm_str(slot_raw) != "")
            if has_any_schedule:
                add_issue(
                    i,
                    "FLAG",
                    "HH_SCHED_SHOULD_NOT_EXIST",
                    "Scheduling should not be recorded for this unavailability reason",
                    "This unavailability reason should not have scheduling details. Remove/verify scheduled date/slot.",
                    ",".join([c for c in [reason_col, schedule_date_col, slot_col] if c]),
                    f"unavailable_reason={reason_code}; schedule_date={_clip(sched_raw)}; slot={_clip(slot_raw)}",
                )
            return

        # (Optional) required scheduling but missing slot/date
        # left commented as in your original, keeping behavior unchanged:
        # if schedule_required:
        #     missing_slot = (_norm_str(slot_raw) == "")
        #     missing_date = (sched_dt is None)
        #     if missing_slot or missing_date:
        #         add_issue(
        #             i,
        #             "FLAG",
        #             "HH_SCHED_REQUIRED_MISSING",
        #             "Temporary unavailability needs scheduling",
        #             "Parent is temporarily unavailable, a schedule date and time slot should be recorded for follow up.",
        #             ",".join([c for c in [reason_col, schedule_date_col, slot_col] if c]),
        #             f"unavailable_reason={reason_code}; schedule_date={_clip(sched_raw)}; slot={_clip(slot_raw)}",
        #         )
        #         return

        # missed follow up: schedule date passed and parent survey still missing
        if parent_missing and sched_dt and sched_dt.date() < now.date():
            add_issue(
                i,
                "CRITICAL",
                "HH_MISSED_FOLLOWUP",
                "Missed follow up for unavailable parent",
                "A follow up date was scheduled and has already passed, but the parent's survey is still missing.",
                ",".join([c for c in [gid_col, reason_col, schedule_date_col, slot_col, respondent_code_col] if c]),
                f"girl={gidv}; parent={parent}; scheduled={sched_dt.date().isoformat()}; slot={_decode_multiselect(slot_raw, AVAILABLE_DAYS_TIME_MAP)}; parent_survey_missing=1",
            )

        # due soon tracker: today or within 24h AND parent survey missing
        if parent_missing and sched_dt and ((now <= sched_dt <= due_soon_until) or (sched_dt.date() == now.date())):
            _emit_tracker_row(i, parent, reason_raw, sched_dt, slot_raw)

        # (not used now, but kept for clarity)
        _ = schedule_required

    if gid_col and gid_col in df.columns:
        for i in df.index:
            _process_parent_followup(i, "father")
            _process_parent_followup(i, "mother")

    # write tracker CSV (always create a file, even if empty)
    tracker_df = pd.DataFrame(
        followup_rows,
        columns=[
            "enumerator",
            "enumerator_id",
            "record_key",
            "district",
            "girl_id",
            "parent",
            "unavailable_reason",
            "schedule_date",
            "available_days_time",
            "submission_date",
            "instance_id",
            "deviceid",
        ],
    )
    try:
        tracker_df.to_csv("/mnt/data/followup_tracker.csv", index=False)
    except Exception:
        # do not crash data quality run if filesystem is not writable
        pass

    # =========================================================
    # Protocol extras: roster / schooling / transport / duration / dummy phones
    # =========================================================
    issues.extend(run_household_protocol(df, col, meta))

    # =========================================================
    # FINAL: allow multiple issues per record, but dedupe within record per field
    # =========================================================
    issues = _dedupe_issues_per_record_per_field(issues)
    return issues