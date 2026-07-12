# =============================================================================
# Tracking Survey Data Quality – Features
#
# • Produces data-quality issues for Tracking survey submissions and classifies them as
#   CRITICAL (must be fixed) or FLAG (needs review).
#
# • Calculates interview duration using start and end time and flags interviews that are completed too quickly.
#   Example: interview finished in a few minutes.
#
# • Monitors enumerator activity and flags unusually high submission volume within a short time window.
#   Example: many forms submitted by the same enumerator in one hour.
#
# • Detects duplicate submissions and repeated records in the dataset.
#   Example: the same submission appears more than once.
#
# • Identifies dummy or placeholder village names.
#   Example: village entered as “test” or random letters.
#
# • Supports both repeated girl blocks and flat export formats by resolving available columns automatically.
#
# • Automatically adjusts the number of girl blocks if additional blocks are found in the data.
#   Example: data contains more girl entries than initially configured.
#
# • Flags dummy or placeholder text in girl names, father names, addresses, and landmarks.
#   Example: name entered as “aaaa” or address entered as “123”.
#
# • Requires at least one meaningful location detail for each actively tracked girl.
#   Example: both address and landmark are missing or meaningless.
#
# • Validates tracking outcome codes to ensure only allowed responses are used.
#   Example: an unexpected numeric code is selected.
#
# • Detects cases where a girl is marked as found but identity details do not match the original listing.
#   Example: father name differs from the listing record.
#
# • Flags possible spelling or identity inconsistencies when partial details match.
#   Example: father name matches but girl name differs slightly.
#
# • Detects duplicate girls within the same submission.
#   Example: the same girl is listed multiple times in one form.
#
# • Flags exact duplicate girl records and identifies conflicts where the same identifier is linked to different girls.
#   Example: one identifier appears with two different names.
#
# • Checks consistency between summary fields and detailed girl entries.
#   Example: summary indicates no girls, but girl details are filled.
#
# • Allows multiple issues per submission while avoiding repeated reporting of the same issue for the same field.
#
# =============================================================================


from __future__ import annotations

import re
import warnings
from difflib import SequenceMatcher
import pandas as pd
from utils.logging import add_issue

# =========================================================
# CONSTANTS
# =========================================================
BAD_TOKENS = {
    "asd", "asdf", "abc", "abcd", "xyz", "test", "testing", "dummy", "sample",
    "name", "girl", "student", "null", "na", "n/a", "none", "nil", "xx", "yy", "zz",
    "aaaa", "bbb", "ccc", "ddd", "sss", "ggg", "ttt", "ppp", "qqq", "xhxy",
    "0", "00", "000", "0000", "qwerty", "zxcv", "poiuy", "test123",
    "abcdef", "123", "test1", "test12", "test1234",
    "-", "_", ".", "..", "...", "----", "____", "....", ".....",
    "father", "xhyx", "yyyy", "zzzz", "hhhh", "kkkk", "llll",
}

# Codes you use across forms that should not be treated as dummy-text
SPECIAL_OK_CODES = {"89", "99", "999", "888"}

# =========================================================
# BASIC HELPERS
# =========================================================
def _norm(x) -> str:
    if pd.isna(x):
        return ""
    return str(x).strip()


def _parse_dt(series: pd.Series) -> pd.Series:
    """
    Parse datetimes with explicit formats first.
    Keep the flexible fallback (for odd values) but suppress the pandas warning,
    so the fast-survey duration rule still works and console stays clean.
    """
    s = series.astype(str).str.strip()

    # normalize common null-like values
    s = s.replace({"": None, "nan": None, "None": None, "NaN": None, "NULL": None, "null": None})

    dt = pd.Series(pd.NaT, index=series.index)
    remaining = s.notna()

    # SurveyCTO exports commonly use: Mar 16, 2026 11:05:35 AM
    # Older/manual exports may use: 17/01/2026 10:42
    formats = (
        "%b %d, %Y %I:%M:%S %p",
        "%b %d, %Y %I:%M %p",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
    )
    for fmt in formats:
        if not remaining.any():
            break
        parsed = pd.to_datetime(s, format=fmt, errors="coerce")
        mask = remaining & parsed.notna()
        if mask.any():
            dt.loc[mask] = parsed.loc[mask]
            remaining = s.notna() & dt.isna()

    # Fallback for remaining odd values (silence format-inference warning)
    if remaining.any():
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message="Could not infer format, so each element will be parsed individually*",
                category=UserWarning,
            )
            dt3 = pd.to_datetime(s[remaining], errors="coerce", dayfirst=True)
        dt.loc[remaining] = dt3

    return dt


def _parse_date_only(series: pd.Series) -> pd.Series:
    """
    Parse date-only fields used in tracking attempts (visit_date, visit_date_1, etc).
    Supports SurveyCTO style (Mar 16, 2026), 20-Jan-26, and safe fallbacks.
    """
    s = series.astype(str).str.strip()
    s = s.replace({"": None, "nan": None, "None": None, "NaN": None, "NULL": None, "null": None})

    dt = pd.Series(pd.NaT, index=series.index)
    remaining = s.notna()

    formats = (
        "%b %d, %Y",
        "%d-%b-%y",
        "%d-%b-%Y",
        "%d/%m/%Y",
        "%Y-%m-%d",
    )
    for fmt in formats:
        if not remaining.any():
            break
        parsed = pd.to_datetime(s, format=fmt, errors="coerce")
        mask = remaining & parsed.notna()
        if mask.any():
            dt.loc[mask] = parsed.loc[mask]
            remaining = s.notna() & dt.isna()

    if remaining.any():
        with warnings.catch_warnings():
            warnings.filterwarnings(
                "ignore",
                message="Could not infer format, so each element will be parsed individually*",
                category=UserWarning,
            )
            dt3 = pd.to_datetime(s[remaining], errors="coerce", dayfirst=True)
        dt.loc[remaining] = dt3

    return dt


def _pick_existing(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for c in candidates:
        if c and c in df.columns:
            return c
    return None


def _as_code(x) -> str:
    """
    Convert numeric-like codes (1, 1.0) into clean strings ("1").
    Keep non-numeric strings as cleaned string.
    """
    s = _norm(x)
    if not s:
        return ""
    try:
        f = float(s)
        if f.is_integer():
            return str(int(f))
        return s
    except Exception:
        return s


def _is_found_positive(code_val) -> bool:
    """
    girl_found_*:
    1 = Yes (found household/family)
    2 = Yes, girl name not correct
    3 = Yes, father name not correct
    4 = No (married moved away)
    99 = Other (specify)
    999 = Refused
    """
    c = _as_code(code_val)
    return c in {"1", "2", "3"}


# =========================================================
# TEXT NORMALIZATION
# =========================================================
def _clean_basic(x) -> str:
    s = _norm(x).lower()
    s = re.sub(r"[^a-z0-9\s']", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _clean_name_letters(x) -> str:
    s = _norm(x).lower()
    s = re.sub(r"[^a-z\s']", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _letters_only(s: str) -> str:
    return re.sub(r"[^a-z]", "", s)


# =========================================================
# DUMMY DETECTORS
# =========================================================
def _looks_like_repeated_letters(letters: str) -> bool:
    return bool(letters and len(letters) >= 3 and len(set(letters)) == 1)


def _no_vowels_long(letters: str, min_len: int) -> bool:
    if not letters or len(letters) < min_len:
        return False
    return sum(ch in "aeiou" for ch in letters) == 0


def _is_dummy_value(val) -> bool:
    """
    General dummy detection for free text (address/landmark/etc).
    """
    s = _clean_basic(val)
    if not s:
        return False

    if s in BAD_TOKENS:
        return True

    # numeric-only
    if re.fullmatch(r"\d+", s):
        return True

    letters = _letters_only(s)

    # allow very short entries (2 chars) because real abbreviations exist
    if len(s) <= 2:
        if s in {"x", "xx", "aa", "bb", "0", "00"}:
            return True
        if _looks_like_repeated_letters(letters):
            return True
        return False

    if _looks_like_repeated_letters(letters):
        return True

    # long consonant-only junk
    if _no_vowels_long(letters, min_len=6):
        return True

    if s in {"asdf", "qwerty", "zxcv", "poiuy"}:
        return True

    return False


def _is_dummy_name_strict(val) -> bool:
    """
    Dummy detection for names. Less aggressive on short names.
    """
    s = _clean_name_letters(val)
    if not s:
        return False

    if s in BAD_TOKENS:
        return True

    raw = _clean_basic(val)
    if raw and re.fullmatch(r"\d+", raw):
        return True

    letters = _letters_only(s)

    if len(letters) < 2:
        return True

    if _looks_like_repeated_letters(letters):
        return True

    if _no_vowels_long(letters, min_len=5):
        return True

    return False


def _is_dummy_location(val) -> bool:
    """
    Dummy detection for location fields (village_label/address/landmark).
    """
    s = _clean_basic(val)
    if not s:
        return False
    if s in BAD_TOKENS:
        return True
    if re.fullmatch(r"\d+", s):
        return True

    letters = _letters_only(s)
    if _looks_like_repeated_letters(letters):
        return True
    if s in {"asdf", "qwerty", "zxcv", "poiuy"}:
        return True
    return False


def _is_weak_location_series(s: pd.Series) -> pd.Series:
    v = s.astype(str).str.strip()
    vv = v.str.lower().str.replace(r"\s+", " ", regex=True).str.strip()
    empty = v.eq("") | vv.isin({"nan", "none", "null"})
    dummy = vv.apply(_is_dummy_location)
    return (empty | dummy).fillna(False)


# =========================================================
# COLUMN RESOLUTION (HANDLE YAML/EXPORT MISMATCHES SAFELY)
# =========================================================
def _resolve_block_cols(df: pd.DataFrame, k: int) -> dict[str, str | None]:
    """
    Prefer the final calculated fields when present.
    Fallback to new_* fields, then to older name_/father_name_ fields.

    Supports BOTH formats:
      - Old export: repeated blocks (girl_name_1 ... girl_name_N)
      - New field-test export: single flat fields (girl_name, girl_fathername, girl_found, house_found, etc.)
        Flat fields are treated as block k=1 only.
    """

    # For k==1, also allow non-suffixed column names as fallback.
    flat = (k == 1)

    girl_name = _pick_existing(
        df,
        [f"girl_name_{k}", f"girlname_{k}"]
        + (["girl_name", "girlname"] if flat else [])
        + [f"new_name_{k}"] + (["new_name"] if flat else [])
        + [f"name_{k}"] + (["name"] if flat else []),
    )

    girl_father = _pick_existing(
        df,
        [f"girl_fathername_{k}", f"girlfathername_{k}"]
        + (["girl_fathername", "girlfathername"] if flat else [])
        + [f"new_father_name_{k}"] + (["new_father_name"] if flat else [])
        + [f"father_name_{k}"] + (["father_name"] if flat else []),
    )

    girl_addr = _pick_existing(
        df,
        [f"girl_address_{k}"] + (["girl_address"] if flat else [])
        + [f"new_address_{k}"] + (["new_address"] if flat else [])
        + [f"address_{k}"] + (["address"] if flat else []),
    )

    girl_lmk = _pick_existing(
        df,
        [f"girl_landmark_{k}"] + (["girl_landmark"] if flat else [])
        + [f"new_landmark_{k}"] + (["new_landmark"] if flat else [])
        + [f"landmark_{k}"] + (["landmark"] if flat else []),
    )

    girl_found = _pick_existing(df, [f"girl_found_{k}"] + (["girl_found"] if flat else []))
    house_found = _pick_existing(df, [f"house_found_{k}"] + (["house_found"] if flat else []))

    girl_id = _pick_existing(
        df,
        [f"girl_id_{k}", f"girlid_{k}"] + (["girl_id", "girlid"] if flat else []),
    )

    # Kept from your file (even if not used in counting now)
    new_school = _pick_existing(
        df,
        [f"new_school_{k}", f"school_{k}", f"girl_school_{k}"]
        + (["new_school", "school", "girl_school"] if flat else []),
    )
    new_school_label = _pick_existing(
        df,
        [f"new_school_label_{k}", f"school_label_{k}", f"girl_school_label_{k}"]
        + (["new_school_label", "school_label", "girl_school_label"] if flat else []),
    )

    # Expected fields (some exports use name_*/father_name_* as the “expected” values)
    exp_name = _pick_existing(
        df,
        [f"expected_girl_name_{k}", f"expected_name_{k}"]
        + (["expected_girl_name", "expected_name"] if flat else [])
        + [f"name_{k}"] + (["name"] if flat else [])
    )
    exp_father = _pick_existing(
        df,
        [f"expected_girl_father_{k}", f"expected_father_{k}"]
        + (["expected_girl_father", "expected_father"] if flat else [])
        + [f"father_name_{k}"] + (["father_name"] if flat else [])
    )

    obs_new_name = _pick_existing(df, [f"new_name_{k}"] + (["new_name"] if flat else []))
    obs_new_father = _pick_existing(df, [f"new_father_name_{k}"] + (["new_father_name"] if flat else []))

    return {
        "girl_name": girl_name,
        "girl_father": girl_father,
        "girl_address": girl_addr,
        "girl_landmark": girl_lmk,
        "girl_found": girl_found,
        "house_found": house_found,
        "girl_id": girl_id,
        "new_school": new_school,
        "new_school_label": new_school_label,
        "exp_name": exp_name,
        "exp_father": exp_father,
        "obs_new_name": obs_new_name,
        "obs_new_father": obs_new_father,
    }


# =========================================================
# NEW: ATTEMPT COUNTING (PROTOCOL ENFORCEMENT)
# =========================================================
def _count_attempts_for_block(df: pd.DataFrame, row_i, k: int) -> int:
    """
    Count distinct attempt entries for a given girl block k in a single submission row.

    Supports:
      - Flat one-girl exports (current Baseline / New Sample):
          attempt 1 = visit_date / house_found / check_* (no suffix)
          attempt 2 = house_found_1 / check_*_1 / visit_comments_1
      - Older multi-girl block exports:
          fields end with _{k}, additional attempts use _{attempt}_{k}
    """
    attempt_fields = {
        "visit_num",
        "visit_date",
        "house_found",
        "check_imaam",
        "check_villageelder",
        "check_lhw",
        "check_neighbour",
        "visit_comments",
        "family_whereabouts",
        "family_moveadd_samevill",
        "moved_familyaddress",
        "girl_whereabouts",
        "girl_moveadd_samevill",
        "moved_girladdress",
        "moved_girl_address",
    }

    flat = (
        k == 1
        and ("girl_found" in df.columns or "girl_name" in df.columns)
        and f"girl_found_{k}" not in df.columns
    )

    groups: dict[int, list[str]] = {}

    if flat:
        # Attempt 0 = unsuffixed attempt fields
        for field in attempt_fields:
            if field in df.columns:
                groups.setdefault(0, []).append(field)

        # Attempt n = field_n (n >= 1), e.g. house_found_1
        for c in df.columns:
            if not isinstance(c, str):
                continue
            parts = c.rsplit("_", 1)
            if len(parts) != 2 or not parts[1].isdigit():
                continue
            base_field, attempt_id_s = parts
            if base_field not in attempt_fields:
                continue
            groups.setdefault(int(attempt_id_s), []).append(c)
    else:
        suffix = f"_{k}"
        for c in df.columns:
            if not isinstance(c, str):
                continue
            if not c.endswith(suffix):
                continue

            base = c[: -len(suffix)]
            if base in attempt_fields:
                groups.setdefault(0, []).append(c)
                continue

            parts = base.split("_")
            if len(parts) >= 2 and parts[-1].isdigit():
                attempt_id = int(parts[-1])
                base_field = "_".join(parts[:-1])
                if base_field in attempt_fields:
                    groups.setdefault(attempt_id, []).append(c)

    count = 0
    for _attempt_id, cols in groups.items():
        has_any = False
        for c in cols:
            v = _norm(df.at[row_i, c]) if c in df.columns else ""
            if v != "":
                has_any = True
                break
        if has_any:
            count += 1

    return count


# =========================================================
# MAIN RUN
# =========================================================
def run(df: pd.DataFrame, col: dict) -> list[dict]:
    issues: list[dict] = []

    # -----------------------------
    # META
    # -----------------------------
    key = col.get("record_key", "KEY")
    inst = col.get("instance_id", "instanceID")
    sub = col.get("submission_date", "SubmissionDate")
    enum = col.get("enumerator", "enumerator")
    enum_id = col.get("enumerator_id", "enumerator_id")
    device = col.get("deviceid", "deviceid")
    district_col = col.get("district")

    start_col = col.get("starttime", "starttime")
    end_col = col.get("endtime", "endtime")

    village_col = col.get("village", "village")
    village_label_col = col.get("village_label", "village_label")

    new_girls_found_col = col.get("new_girls_found", "new_girls_found")
    num_new_girls_col = col.get("num_new_girls", "num_new_girls")

    girl_found_confirm_enrolled = col.get("girl_found_confirm_enrolled", "girl_found_confirm_enrolled")

    def meta(i):
        return dict(
            record_key=df.at[i, key] if key in df.columns else None,
            instance_id=df.at[i, inst] if inst in df.columns else None,
            enumerator=df.at[i, enum] if enum in df.columns else None,
            enumerator_id=df.at[i, enum_id] if enum_id in df.columns else None,
            deviceid=df.at[i, device] if device in df.columns else None,
            submission_date=df.at[i, sub] if sub in df.columns else None,
            district=df.at[i, district_col] if district_col in df.columns else None,
        )

    # =========================================================
    # VISIT DATE MUST MATCH SUBMISSION DATE (NEW CHECK)
    # Logic: For any filled visit_date / visit_date_* column,
    # the date must match the submission date (date part).
    # Also flags invalid visit_date values when filled but unparseable.
    # =========================================================
    ref_dt = None
    ref_field = None

    if sub in df.columns:
        ref_dt = _parse_dt(df[sub])
        ref_field = sub
    elif start_col in df.columns:
        ref_dt = _parse_dt(df[start_col])
        ref_field = start_col

    if ref_dt is not None and ref_field is not None:
        ref_date = ref_dt.dt.date

        visit_date_cols: list[str] = []
        for c in df.columns:
            if not isinstance(c, str):
                continue
            if c == "visit_date" or c.startswith("visit_date_"):
                visit_date_cols.append(c)

        for vcol in visit_date_cols:
            raw = df[vcol].map(_norm)
            filled = raw.ne("")

            vdt = _parse_date_only(df[vcol])
            vdate = vdt.dt.date

            # (A) Filled but invalid date
            bad_parse = filled & vdt.isna()
            for i in df.index[bad_parse.fillna(False)]:
                m = meta(i)
                add_issue(
                    issues,
                    survey="Tracking",
                    severity="CRITICAL",
                    rule_id="TRK_CE_VISIT_DATE_INVALID",
                    title="Invalid visit date",
                    cause="visit_date is filled but not a valid date.",
                    field=vcol,
                    value=_norm(df.at[i, vcol]),
                    record_key=m["record_key"],
                    instance_id=m["instance_id"],
                    enumerator=m["enumerator"],
                    enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"],
                    submission_date=m["submission_date"],
                    district=m["district"],
                )

            # (B) Date mismatch with submission/start date
            comparable = filled & vdt.notna() & ref_dt.notna()
            mismatch = comparable & (vdate != ref_date)

            for i in df.index[mismatch.fillna(False)]:
                m = meta(i)
                ref_val = _norm(df.at[i, ref_field]) if ref_field in df.columns else ""
                add_issue(
                    issues,
                    survey="Tracking",
                    severity="CRITICAL",
                    rule_id="TRK_CE_VISIT_DATE_NOT_SAME_DAY",
                    title="Visit date does not match submission date",
                    cause="visit_date must be the same day as the submission date.",
                    field=",".join([vcol, ref_field]) if ref_field else vcol,
                    value=f"visit_date={_norm(df.at[i, vcol])}, submission_date={ref_val}",
                    record_key=m["record_key"],
                    instance_id=m["instance_id"],
                    enumerator=m["enumerator"],
                    enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"],
                    submission_date=m["submission_date"],
                    district=m["district"],
                )

    # =========================================================
    # FAST SUBMISSION (ALWAYS USE starttime/endtime)
    # =========================================================
    min_fast = float(col.get("min_duration_minutes", 5))

    if start_col in df.columns and end_col in df.columns:
        st = _parse_dt(df[start_col])
        et = _parse_dt(df[end_col])
        dur_min = (et - st).dt.total_seconds() / 60.0

        too_fast = dur_min.notna() & (dur_min < min_fast)
        for i in df.index[too_fast]:
            m = meta(i)
            observed = dur_min.at[i]
            observed_txt = "" if pd.isna(observed) else f"{int(round(observed))} mins"

            add_issue(
                issues,
                survey="Tracking",
                severity="FLAG",
                rule_id="TRK_QF_05",
                title="Survey completed too fast",
                cause=f"Tracking survey should take more than {min_fast} minutes.",
                field=f"{start_col},{end_col}",
                value=observed_txt,
                record_key=m["record_key"],
                instance_id=m["instance_id"],
                enumerator=m["enumerator"],
                enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"],
                submission_date=m["submission_date"],
                district=m["district"],
            )

    # =========================================================
    # ENUMERATOR RUSHING (KEEPING YOUR EXISTING LOGIC)
    # =========================================================
    rushing_threshold = int(col.get("rushing_per_hour_threshold", 25))
    if enum_id in df.columns and sub in df.columns:
        dt = _parse_dt(df[sub])
        hour = dt.dt.floor("h")

        tmp = pd.DataFrame({"enum_id": df[enum_id], "hour": hour}).dropna()
        counts = tmp.groupby(["enum_id", "hour"]).size()
        bad_keys = set(counts[counts >= rushing_threshold].index)

        for i, (eid, h) in enumerate(zip(df[enum_id], hour)):
            if (eid, h) in bad_keys:
                m = meta(i)
                add_issue(
                    issues,
                    survey="Tracking",
                    severity="FLAG",
                    rule_id="TRK_QF_02",
                    title="Enumerator rushing",
                    cause=f"Enumerator submitted {rushing_threshold}+ forms within one hour (possible rushing).",
                    field=sub,
                    value=_norm(df.at[i, sub]) if sub in df.columns else "",
                    record_key=m["record_key"],
                    instance_id=m["instance_id"],
                    enumerator=m["enumerator"],
                    enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"],
                    submission_date=m["submission_date"],
                    district=m["district"],
                )

    # =========================================================
    # VILLAGE DUMMY CHECKS
    # =========================================================
    if village_label_col in df.columns:
        mask = df[village_label_col].map(_norm).ne("") & df[village_label_col].apply(_is_dummy_location)
        for i in df.index[mask.fillna(False)]:
            m = meta(i)
            add_issue(
                issues,
                survey="Tracking",
                severity="FLAG",
                rule_id="TRK_QF_DUMMY_VILLAGE",
                title="Dummy village name",
                cause="Village label looks like dummy/placeholder text.",
                field=village_label_col,
                value=_norm(df.at[i, village_label_col]),
                record_key=m["record_key"],
                instance_id=m["instance_id"],
                enumerator=m["enumerator"],
                enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"],
                submission_date=m["submission_date"],
                district=m["district"],
            )

    # =========================================================
    # DUPLICATE SUBMISSIONS (INSTANCEID / KEY)
    # =========================================================
    if inst in df.columns:
        dup = df[inst].map(_norm)
        dup_mask = dup.ne("") & dup.duplicated(keep=False)
        for i in df.index[dup_mask.fillna(False)]:
            m = meta(i)
            add_issue(
                issues,
                survey="Tracking",
                severity="CRITICAL",
                rule_id="TRK_CE_DUP_INSTANCE",
                title="Duplicate submission (instanceID)",
                cause="Same instanceID appears more than once (duplicate export or re-submission).",
                field=inst,
                value=_norm(df.at[i, inst]),
                record_key=m["record_key"],
                instance_id=m["instance_id"],
                enumerator=m["enumerator"],
                enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"],
                submission_date=m["submission_date"],
                district=m["district"],
            )

    if key in df.columns:
        rk = df[key].map(_norm)
        rk_mask = rk.ne("") & rk.duplicated(keep=False)
        for i in df.index[rk_mask.fillna(False)]:
            m = meta(i)
            add_issue(
                issues,
                survey="Tracking",
                severity="FLAG",
                rule_id="TRK_QF_DUP_RECORD_KEY",
                title="Duplicate record key",
                cause="Same record key appears more than once.",
                field=key,
                value=_norm(df.at[i, key]),
                record_key=m["record_key"],
                instance_id=m["instance_id"],
                enumerator=m["enumerator"],
                enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"],
                submission_date=m["submission_date"],
                district=m["district"],
            )

    # =========================================================
    # BLOCK LEVEL CHECKS
    # =========================================================
    max_blocks = int(col.get("max_blocks", 20))

    detected_max = 0
    pat = re.compile(r"^(?:new_name|new_father_name|girl_name|girl_fathername)_(\d+)$")
    for c in df.columns:
        m = pat.match(c)
        if m:
            detected_max = max(detected_max, int(m.group(1)))
    if detected_max > max_blocks:
        max_blocks = detected_max

    girl_id_occ: dict[str, list[dict]] = {}

    for row_i in df.index:
        seen_in_row: set[str] = set()
        filled_blocks = 0

        for k in range(1, max_blocks + 1):
            cols = _resolve_block_cols(df, k)

            girl_name_col = cols["girl_name"]
            girl_father_col = cols["girl_father"]
            girl_found_col = cols["girl_found"]
            house_found_col = cols["house_found"]
            address_col = cols["girl_address"]
            landmark_col = cols["girl_landmark"]
            girl_id_col = cols["girl_id"]

            exp_name_col = cols["exp_name"]
            exp_father_col = cols["exp_father"]
            obs_new_name_col = cols["obs_new_name"]
            obs_new_father_col = cols["obs_new_father"]

            if girl_name_col and girl_father_col:
                name_val = _norm(df.at[row_i, girl_name_col])
                father_val = _norm(df.at[row_i, girl_father_col])
                active = (
                    name_val != ""
                    and father_val != ""
                    and not _is_dummy_name_strict(name_val)
                    and not _is_dummy_name_strict(father_val)
                )
            else:
                active = False

            if active:
                if girl_found_col:
                    gf_code = _as_code(df.at[row_i, girl_found_col])
                    if gf_code == "":
                        m = meta(row_i)
                        add_issue(
                            issues,
                            survey="Tracking",
                            severity="CRITICAL",
                            rule_id="TRK_CE_OUTCOME_MISSING",
                            title="Tracking outcome missing",
                            cause=f"Girl block is filled (name and father), but tracking outcome is missing (block {k}).",
                            field=girl_found_col,
                            value="",
                            record_key=m["record_key"],
                            instance_id=m["instance_id"],
                            enumerator=m["enumerator"],
                            enumerator_id=m["enumerator_id"],
                            deviceid=m["deviceid"],
                            submission_date=m["submission_date"],
                            district=m["district"],
                        )

                    if gf_code != "" and gf_code not in {"1", "2", "3"}:
                        attempts = _count_attempts_for_block(df, row_i, k)
                        if attempts < 3:
                            m = meta(row_i)
                            add_issue(
                                issues,
                                survey="Tracking",
                                severity="CRITICAL",
                                rule_id="TRK_CE_MIN_3_ATTEMPTS",
                                title="Less than 3 attempts before closing case",
                                cause=f"Tracking outcome is recorded but fewer than 3 attempts are documented (attempts={attempts}, block {k}).",
                                field=",".join([c for c in [girl_found_col] if c]),
                                value=f"girl_found={_norm(df.at[row_i, girl_found_col])}",
                                record_key=m["record_key"],
                                instance_id=m["instance_id"],
                                enumerator=m["enumerator"],
                                enumerator_id=m["enumerator_id"],
                                deviceid=m["deviceid"],
                                submission_date=m["submission_date"],
                                district=m["district"],
                            )

            def _val(primary_col: str | None, fallback_col: str | None) -> str:
                v1 = _norm(df.at[row_i, primary_col]) if primary_col else ""
                if v1 != "":
                    return v1
                v2 = _norm(df.at[row_i, fallback_col]) if fallback_col else ""
                return v2

            new_name_col = _pick_existing(df, [f"new_name_{k}"])
            new_father_col = _pick_existing(df, [f"new_father_name_{k}"])

            name_for_count = _val(girl_name_col, new_name_col)
            father_for_count = _val(girl_father_col, new_father_col)

            complete_for_count = (name_for_count != "" and father_for_count != "")

            if complete_for_count:
                filled_blocks += 1

            for colname, code, title, fn in [
                (girl_name_col, "TRK_QF_DUMMY_GIRL_NAME", "Dummy girl name", _is_dummy_name_strict),
                (girl_father_col, "TRK_QF_DUMMY_FATHER_NAME", "Dummy father name", _is_dummy_name_strict),
                (address_col, "TRK_QF_DUMMY_ADDRESS", "Dummy address", _is_dummy_value),
                (landmark_col, "TRK_QF_DUMMY_LANDMARK", "Dummy landmark", _is_dummy_value),
                (obs_new_name_col, "TRK_QF_DUMMY_NEW_GIRL_NAME", "Dummy new girl name", _is_dummy_name_strict),
                (obs_new_father_col, "TRK_QF_DUMMY_NEW_FATHER_NAME", "Dummy new father name", _is_dummy_name_strict),
            ]:
                if colname:
                    v = _norm(df.at[row_i, colname])
                    if v != "" and fn(v):
                        m = meta(row_i)
                        add_issue(
                            issues,
                            survey="Tracking",
                            severity="FLAG",
                            rule_id=code,
                            title=title,
                            cause=f"{title} looks like dummy/placeholder text (block {k}).",
                            field=colname,
                            value=v,
                            record_key=m["record_key"],
                            instance_id=m["instance_id"],
                            enumerator=m["enumerator"],
                            enumerator_id=m["enumerator_id"],
                            deviceid=m["deviceid"],
                            submission_date=m["submission_date"],
                            district=m["district"],
                        )

            if active and (address_col or landmark_col):
                hf_code = _as_code(df.at[row_i, house_found_col]) if house_found_col else ""
                if hf_code not in {"2", "3"}:
                    addr_bad = _is_weak_location_series(df[address_col]).at[row_i] if address_col else True
                    lnd_bad = _is_weak_location_series(df[landmark_col]).at[row_i] if landmark_col else True
                    if bool(addr_bad and lnd_bad):
                        m = meta(row_i)
                        addr_val = _norm(df.at[row_i, address_col]) if address_col else ""
                        lnd_val = _norm(df.at[row_i, landmark_col]) if landmark_col else ""
                        field_parts = [c for c in [address_col, landmark_col] if c]

                        add_issue(
                            issues,
                            survey="Tracking",
                            severity="CRITICAL",
                            rule_id="TRK_CE_02",
                            title="Unreliable address/landmark",
                            cause=f"Address or landmark is missing or dummy (block {k}). At least one should be reliable.",
                            field=",".join(field_parts),
                            value=f"address={addr_val}, landmark={lnd_val}",
                            record_key=m["record_key"],
                            instance_id=m["instance_id"],
                            enumerator=m["enumerator"],
                            enumerator_id=m["enumerator_id"],
                            deviceid=m["deviceid"],
                            submission_date=m["submission_date"],
                            district=m["district"],
                        )

            if girl_found_col:
                c = _as_code(df.at[row_i, girl_found_col])
                if c != "" and c not in {"1", "2", "3", "4", "99", "999"}:
                    m = meta(row_i)
                    add_issue(
                        issues,
                        survey="Tracking",
                        severity="FLAG",
                        rule_id="TRK_QF_INVALID_GIRL_FOUND",
                        title="Invalid girl_found code",
                        cause=f"girl_found_{k} has unexpected code. Allowed: 1,2,3,4,99,999.",
                        field=girl_found_col,
                        value=_norm(df.at[row_i, girl_found_col]),
                        record_key=m["record_key"],
                        instance_id=m["instance_id"],
                        enumerator=m["enumerator"],
                        enumerator_id=m["enumerator_id"],
                        deviceid=m["deviceid"],
                        submission_date=m["submission_date"],
                        district=m["district"],
                    )

            if girl_found_col and girl_father_col and exp_father_col:
                found_pos = _is_found_positive(df.at[row_i, girl_found_col])

                exp_f = _clean_name_letters(df.at[row_i, exp_father_col]) if exp_father_col else ""
                obs_f = _clean_name_letters(df.at[row_i, girl_father_col]) if girl_father_col else ""

                comparable = active and found_pos and exp_f != "" and obs_f != ""
                if comparable and exp_f != obs_f:
                    m = meta(row_i)
                    add_issue(
                        issues,
                        survey="Tracking",
                        severity="CRITICAL",
                        rule_id="TRK_CE_01",
                        title="Wrong girl tracked",
                        cause=f"Girl is marked as found, but father name does not match listing (block {k}).",
                        field=girl_father_col,
                        value=_norm(df.at[row_i, girl_father_col]),
                        record_key=m["record_key"],
                        instance_id=m["instance_id"],
                        enumerator=m["enumerator"],
                        enumerator_id=m["enumerator_id"],
                        deviceid=m["deviceid"],
                        submission_date=m["submission_date"],
                        district=m["district"],
                    )

            if girl_found_col and girl_name_col and exp_name_col and girl_father_col and exp_father_col:
                found_pos = _is_found_positive(df.at[row_i, girl_found_col])

                exp_f = _clean_name_letters(df.at[row_i, exp_father_col]) if exp_father_col else ""
                obs_f = _clean_name_letters(df.at[row_i, girl_father_col]) if girl_father_col else ""
                exp_g = _clean_name_letters(df.at[row_i, exp_name_col]) if exp_name_col else ""
                obs_g = _clean_name_letters(df.at[row_i, girl_name_col]) if girl_name_col else ""

                comparable = active and found_pos and exp_f != "" and obs_f != "" and exp_f == obs_f
                if comparable and exp_g != "" and obs_g != "" and exp_g != obs_g:
                    m = meta(row_i)
                    add_issue(
                        issues,
                        survey="Tracking",
                        severity="FLAG",
                        rule_id="TRK_QF_07",
                        title="Girl name mismatch",
                        cause=f"Father name matches listing, but girl name differs (block {k}).",
                        field=girl_name_col,
                        value=_norm(df.at[row_i, girl_name_col]),
                        record_key=m["record_key"],
                        instance_id=m["instance_id"],
                        enumerator=m["enumerator"],
                        enumerator_id=m["enumerator_id"],
                        deviceid=m["deviceid"],
                        submission_date=m["submission_date"],
                        district=m["district"],
                    )

            if active:
                v_village = _norm(df.at[row_i, village_col]) if village_col in df.columns else ""
                v_name = _clean_name_letters(df.at[row_i, girl_name_col]) if girl_name_col else ""
                v_father = _clean_name_letters(df.at[row_i, girl_father_col]) if girl_father_col else ""
                v_gid = _as_code(df.at[row_i, girl_id_col]) if girl_id_col else ""

                if v_gid:
                    ident_key = f"gid:{v_gid}"
                else:
                    ident_key = f"vf:{_clean_basic(v_village)}|n:{v_name}|f:{v_father}"

                if ident_key in seen_in_row:
                    m = meta(row_i)
                    add_issue(
                        issues,
                        survey="Tracking",
                        severity="FLAG",
                        rule_id="TRK_QF_DUP_GIRL_WITHIN_SUB",
                        title="Duplicate girl in same submission",
                        cause=f"Same girl appears multiple times in blocks within one submission (block {k}).",
                        field=",".join([c for c in [girl_id_col, girl_name_col, girl_father_col] if c]),
                        value=f"{v_gid or ''} {_norm(df.at[row_i, girl_name_col]) if girl_name_col else ''} / {_norm(df.at[row_i, girl_father_col]) if girl_father_col else ''}",
                        record_key=m["record_key"],
                        instance_id=m["instance_id"],
                        enumerator=m["enumerator"],
                        enumerator_id=m["enumerator_id"],
                        deviceid=m["deviceid"],
                        submission_date=m["submission_date"],
                        district=m["district"],
                    )
                else:
                    seen_in_row.add(ident_key)

            if girl_id_col:
                gid = _as_code(df.at[row_i, girl_id_col])
                if gid:
                    gname = _norm(df.at[row_i, girl_name_col]) if girl_name_col else ""
                    gfather = _norm(df.at[row_i, girl_father_col]) if girl_father_col else ""
                    gaddr = _norm(df.at[row_i, address_col]) if address_col else ""
                    glmk = _norm(df.at[row_i, landmark_col]) if landmark_col else ""
                    vlabel = _norm(df.at[row_i, village_label_col]) if village_label_col in df.columns else ""

                    girl_id_occ.setdefault(gid, []).append(
                        {
                            "row": int(row_i),
                            "block": k,
                            "village_label": vlabel,
                            "girl_name": gname,
                            "girl_father": gfather,
                            "girl_address": gaddr,
                            "girl_landmark": glmk,
                            "fields": ",".join([c for c in [girl_id_col, girl_name_col, girl_father_col] if c]),
                        }
                    )

        if new_girls_found_col in df.columns:
            ngf = _as_code(df.at[row_i, new_girls_found_col])

            if ngf == "0" and filled_blocks > 0:
                m = meta(row_i)
                add_issue(
                    issues,
                    survey="Tracking",
                    severity="FLAG",
                    rule_id="TRK_QF_NEW_GIRLS_FOUND_MISMATCH",
                    title="new_girls_found mismatch",
                    cause="new_girls_found is 0 but girl blocks contain filled names (possible inconsistent entry).",
                    field=new_girls_found_col,
                    value=_norm(df.at[row_i, new_girls_found_col]),
                    record_key=m["record_key"],
                    instance_id=m["instance_id"],
                    enumerator=m["enumerator"],
                    enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"],
                    submission_date=m["submission_date"],
                    district=m["district"],
                )

            if ngf == "1" and filled_blocks == 0:
                m = meta(row_i)
                add_issue(
                    issues,
                    survey="Tracking",
                    severity="FLAG",
                    rule_id="TRK_QF_NEW_GIRLS_FOUND_EMPTY",
                    title="new_girls_found without details",
                    cause="new_girls_found is 1 but no valid girl blocks are filled.",
                    field=new_girls_found_col,
                    value=_norm(df.at[row_i, new_girls_found_col]),
                    record_key=m["record_key"],
                    instance_id=m["instance_id"],
                    enumerator=m["enumerator"],
                    enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"],
                    submission_date=m["submission_date"],
                    district=m["district"],
                )

        if num_new_girls_col in df.columns:
            raw = _norm(df.at[row_i, num_new_girls_col])
            nn = None
            try:
                nn = int(float(raw)) if raw != "" else None
            except Exception:
                nn = None

            if nn is not None and nn >= 0 and filled_blocks != nn:
                m = meta(row_i)
                add_issue(
                    issues,
                    survey="Tracking",
                    severity="FLAG",
                    rule_id="TRK_QF_NUM_NEW_GIRLS_MISMATCH",
                    title="num_new_girls mismatch",
                    cause=f"num_new_girls={nn} but valid filled girl blocks={filled_blocks}.",
                    field=num_new_girls_col,
                    value=raw,
                    record_key=m["record_key"],
                    instance_id=m["instance_id"],
                    enumerator=m["enumerator"],
                    enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"],
                    submission_date=m["submission_date"],
                    district=m["district"],
                )

    def _sim(a: str, b: str) -> float:
        aa = _clean_name_letters(a)
        bb = _clean_name_letters(b)
        if not aa or not bb:
            return 0.0
        return SequenceMatcher(None, aa, bb).ratio()

    district_id_col = col.get("district_id", "district_id")
    village_id_col = col.get("village_id", "village_id")
    near_threshold = float(col.get("dup_name_similarity_threshold", 0.85))

    occ_by_key: dict[tuple[str, str, str], list[dict]] = {}

    for gid, occs in girl_id_occ.items():
        gid_code = _as_code(gid)
        if not gid_code:
            continue
        for rec in occs:
            i = rec.get("row")
            if i is None:
                continue
            dist_id = _as_code(df.at[i, district_id_col]) if district_id_col in df.columns else ""
            vill_id = _as_code(df.at[i, village_id_col]) if village_id_col in df.columns else ""
            if not dist_id or not vill_id:
                continue
            occ_by_key.setdefault((dist_id, vill_id, gid_code), []).append(rec)

    for (dist_id, vill_id, gid_code), recs in occ_by_key.items():
        if len(recs) < 2:
            continue

        base = recs[0]
        base_name = base.get("girl_name", "")
        base_father = base.get("girl_father", "")
        base_name_c = _clean_name_letters(base_name)
        base_father_c = _clean_name_letters(base_father)

        for rec in recs[1:]:
            i = rec.get("row")
            if i is None:
                continue
            m = meta(i)

            name = rec.get("girl_name", "")
            father = rec.get("girl_father", "")
            name_c = _clean_name_letters(name)
            father_c = _clean_name_letters(father)

            exact_name = (name_c != "" and name_c == base_name_c)
            exact_father = (father_c != "" and father_c == base_father_c)

            name_sim = _sim(name, base_name)
            father_sim = _sim(father, base_father)

            value = (
                f"district_id={dist_id}, village_id={vill_id}, girl_id={gid_code} | "
                f"{name} / {father}"
            )

            if exact_name and exact_father:
                add_issue(
                    issues,
                    survey="Tracking",
                    severity="FLAG",
                    rule_id="TRK_QF_DUP_GIRL_EXACT",
                    title="Duplicate girl (exact match)",
                    cause="Same district, village, and girl_id with exact same girl and father name.",
                    field=rec.get("fields", ""),
                    value=value,
                    record_key=m["record_key"],
                    instance_id=m["instance_id"],
                    enumerator=m["enumerator"],
                    enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"],
                    submission_date=m["submission_date"],
                    district=m["district"],
                )
                continue

            near = (
                (name_sim >= near_threshold and father_sim >= near_threshold)
                or (name_sim >= near_threshold and exact_father)
                or (father_sim >= near_threshold and exact_name)
            )
            if near:
                add_issue(
                    issues,
                    survey="Tracking",
                    severity="FLAG",
                    rule_id="TRK_QF_DUP_GIRL_NEAR_MISMATCH",
                    title="Duplicate girl (near mismatch)",
                    cause="Same district, village, and girl_id but girl name or father name differs slightly (possible spelling variation).",
                    field=rec.get("fields", ""),
                    value=value + f" [name_sim={name_sim:.2f}, father_sim={father_sim:.2f}]",
                    record_key=m["record_key"],
                    instance_id=m["instance_id"],
                    enumerator=m["enumerator"],
                    enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"],
                    submission_date=m["submission_date"],
                    district=m["district"],
                )
                continue

            add_issue(
                issues,
                survey="Tracking",
                severity="FLAG",
                rule_id="TRK_QF_DUP_GIRL_MISMATCH",
                title="Duplicate girl (mismatch)",
                cause="Same district, village, and girl_id but girl name or father name is different (possible wrong mapping or ID reuse).",
                field=rec.get("fields", ""),
                value=value + f" [name_sim={name_sim:.2f}, father_sim={father_sim:.2f}]",
                record_key=m["record_key"],
                instance_id=m["instance_id"],
                enumerator=m["enumerator"],
                enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"],
                submission_date=m["submission_date"],
                district=m["district"],
            )

    if girl_found_confirm_enrolled in df.columns:
        allowed = {"1", "2", "888", "999"}
        vals = df[girl_found_confirm_enrolled].map(_as_code)
        bad = vals.ne("") & ~vals.isin(allowed)
        for i in df.index[bad.fillna(False)]:
            m = meta(i)
            add_issue(
                issues,
                survey="Tracking",
                severity="FLAG",
                rule_id="TRK_QF_INVALID_ENROLLED_CODE",
                title="Invalid confirm_enrolled code",
                cause="girl_found_confirm_enrolled has unexpected code. Allowed: 1,2,888,999.",
                field=girl_found_confirm_enrolled,
                value=_norm(df.at[i, girl_found_confirm_enrolled]),
                record_key=m["record_key"],
                instance_id=m["instance_id"],
                enumerator=m["enumerator"],
                enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"],
                submission_date=m["submission_date"],
                district=m["district"],
            )

    def _sev_rank(s: str) -> int:
        return {"CRITICAL": 3, "FLAG": 2, "INFO": 1}.get(str(s).upper(), 0)

    def _safe_int(x, default: int = 10**9) -> int:
        try:
            if x is None:
                return default
            return int(float(str(x).strip()))
        except Exception:
            return default

    def _field_key(it: dict) -> str:
        for k in ("bad_column", "bad_col", "column", "field"):
            v = it.get(k)
            if v is None:
                continue
            s = str(v).strip()
            if s != "":
                return s
        return ""

    dummy_rules = {
        "TRK_QF_DUMMY_GIRL_NAME",
        "TRK_QF_DUMMY_FATHER_NAME",
        "TRK_QF_DUMMY_NEW_GIRL_NAME",
        "TRK_QF_DUMMY_NEW_FATHER_NAME",
    }

    has_dummy_by_rec = set()
    for it in issues:
        if it.get("rule_id") in dummy_rules:
            has_dummy_by_rec.add((it.get("record_key"), it.get("instance_id")))

    filtered: list[dict] = []
    for it in issues:
        rec_key = (it.get("record_key"), it.get("instance_id"))
        if it.get("rule_id") == "TRK_QF_NEW_GIRLS_FOUND_EMPTY" and rec_key in has_dummy_by_rec:
            continue
        filtered.append(it)

    best_by_rec_field: dict[tuple, dict[str, dict]] = {}
    best_idx_by_rec_field: dict[tuple, dict[str, int]] = {}

    for idx, it in enumerate(filtered):
        rec = (it.get("record_key"), it.get("instance_id"))
        fkey = _field_key(it)

        cand_sev = _sev_rank(it.get("severity", ""))
        cand_order = _safe_int(it.get("rule_order"), default=10**9)
        cand_key = (-cand_sev, cand_order, idx)

        prev = best_by_rec_field.get(rec, {}).get(fkey)
        if prev is None:
            best_by_rec_field.setdefault(rec, {})[fkey] = it
            best_idx_by_rec_field.setdefault(rec, {})[fkey] = idx
            continue

        prev_idx = best_idx_by_rec_field.get(rec, {}).get(fkey, 10**9)
        prev_sev = _sev_rank(prev.get("severity", ""))
        prev_order = _safe_int(prev.get("rule_order"), default=10**9)
        prev_key = (-prev_sev, prev_order, prev_idx)

        if cand_key < prev_key:
            best_by_rec_field.setdefault(rec, {})[fkey] = it
            best_idx_by_rec_field.setdefault(rec, {})[fkey] = idx

    chosen_indices = set()
    for rec, fmap in best_idx_by_rec_field.items():
        for fkey, idx in fmap.items():
            chosen_indices.add(idx)

    issues = [it for idx, it in enumerate(filtered) if idx in chosen_indices]

    return issues
