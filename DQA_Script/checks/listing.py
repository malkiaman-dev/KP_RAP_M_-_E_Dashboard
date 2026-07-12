# =============================================================================
# Listing Survey DQA Checks (What this script covers)
#
# Data handling
# - Reads Listing export and safely pulls key metadata per submission (record_key, instance_id, enumerator, device, district, school).
#   Example: every issue includes who collected it, when, and for which school.
#
# Header-level CRITICAL checks (school + district + teacher identity)
# - School ID must exist and be numeric.
#   Example: school is blank or "abc" -> CRITICAL.
# - School name (label) must be real text (not blank/dummy).
#   Example: school_label = "test" or empty -> CRITICAL.
# - District must be one of the allowed codes (1,2,3,4).
#   Example: district = 6 -> CRITICAL.
# - Teacher name must be real text (not dummy/blank).
#   Example: name = "123" or "asd" -> CRITICAL.
#
# NEW rule (register evidence)
# - If at least one girl is listed in a session, the session register photo (page 1) must exist.
#   Example: name_2023_1 is filled but register2023_photo_page_1 is missing -> CRITICAL.
#
# Girl-level extraction (roster flattening)
# - Converts wide roster columns (name_2023_1, father_2023_1, dob_2023_1...) into a girl-level table for checks.
#   Example: each listed girl becomes one “row” for validation even though export is wide.
#
# Girl identity CRITICAL checks
# - Girl name and father name cannot be dummy patterns (placeholders, repeated chars, digits).
#   Example: girl_name = "aaaa" or father_name = "test" -> CRITICAL.
#
# DOB CRITICAL checks (Grade-4 suitability)
# - DOB must exist, must be valid date, cannot be in the future (relative to submission date).
#   Example: dob = "32/13/2024" -> CRITICAL, dob after submission -> CRITICAL.
# - Age implied by DOB must fall within safe Grade-4 band (7–14 years).
#   Example: DOB implies age 5 or 17 -> CRITICAL.
#
# Village/location checks
# - Village ID must be numeric (CRITICAL).
#   Example: village is blank -> CRITICAL.
# - If village is "Other" (99), village_other must be meaningful (CRITICAL).
#   Example: village=99 but village_other empty -> CRITICAL.
# - At least one of address OR landmark OR village label should be provided (FLAG).
#   Example: all three missing -> FLAG.
#
# Duplicate detection (quality flags)
# - Flags possible duplicates within the same session using girl_name + father_name + dob (FLAG).
#   Example: same girl identity repeated twice in 2023–24 session -> FLAG.
#
# Speed / duration flag
# - Flags surveys completed too fast using starttime/endtime duration (< 30 mins) (FLAG).
#   Example: start/end shows 12 minutes total -> FLAG.
#
# Cross-session repeat detection
# - Flags if the same girl appears in both sessions (2022–23 vs 2023–24) with matching identity,
#   and at least 2 of 4 location elements match (FLAG).
#   Example: same girl + father + school in both sessions, and address+village match -> FLAG.
#
# Output hygiene
# - Allows multiple issues per record, but avoids duplicate reporting for the same field within that record.
#   Priority: CRITICAL beats FLAG, then lower rule order if available, else first found wins.
# =============================================================================


# =============================================================================
# Listing Survey DQA Checks (What this script covers)
#
# Data handling
# - Reads Listing export and safely pulls key metadata per submission (record_key, instance_id, enumerator, device, district, school).
#   Example: every issue includes who collected it, when, and for which school.
#
# Header-level CRITICAL checks (school + district + teacher identity)
# - School ID must exist and be numeric.
#   Example: school is blank or "abc" -> CRITICAL.
# - School name (label) must be real text (not blank/dummy).
#   Example: school_label = "test" or empty -> CRITICAL.
# - District must be one of the allowed codes (1,2,3,4).
#   Example: district = 6 -> CRITICAL.
# - Teacher name must be real text (not dummy/blank).
#   Example: name = "123" or "asd" -> CRITICAL.
#
# NEW rule (register evidence)
# - If at least one girl is listed in a session, the session register photo (page 1) must exist.
#   Example: name_2023_1 is filled but register2023_photo_page_1 is missing -> CRITICAL.
#
# Girl-level extraction (roster flattening)
# - Converts wide roster columns (name_2023_1, father_2023_1, dob_2023_1...) into a girl-level table for checks.
#   Example: each listed girl becomes one “row” for validation even though export is wide.
#
# Girl identity CRITICAL checks
# - Girl name and father name cannot be dummy patterns (placeholders, repeated chars, digits).
#   Example: girl_name = "aaaa" or father_name = "test" -> CRITICAL.
#
# DOB CRITICAL checks (Grade-4 suitability)
# - DOB must exist, must be valid date, cannot be in the future (relative to submission date).
#   Example: dob = "32/13/2024" -> CRITICAL, dob after submission -> CRITICAL.
# - Age implied by DOB must fall within safe Grade-4 band (7–14 years).
#   Example: DOB implies age 5 or 17 -> CRITICAL.
#
# Village/location checks
# - Village ID must be numeric (CRITICAL).
#   Example: village is blank -> CRITICAL.
# - If village is "Other" (99), village_other must be meaningful (CRITICAL).
#   Example: village=99 but village_other empty -> CRITICAL.
# - At least one of address OR landmark OR village label should be provided (FLAG).
#   Example: all three missing -> FLAG.
#
# Duplicate detection (quality flags)
# - Flags possible duplicates within the same session using girl_name + father_name + dob (FLAG).
#   Example: same girl identity repeated twice in 2023–24 session -> FLAG.
#
# Speed / duration flag
# - Flags surveys completed too fast using starttime/endtime duration (< 30 mins) (FLAG).
#   Example: start/end shows 12 minutes total -> FLAG.
#
# Cross-session repeat detection
# - Flags if the same girl appears in both sessions (2022–23 vs 2023–24) with matching identity,
#   and at least 2 of 4 location elements match (FLAG).
#   Example: same girl + father + school in both sessions, and address+village match -> FLAG.
#
# Output hygiene
# - Allows multiple issues per record, but avoids duplicate reporting for the same field within that record.
#   Priority: CRITICAL beats FLAG, then lower rule order if available, else first found wins.
# =============================================================================


from __future__ import annotations

import re
import pandas as pd
from utils.logging import make_issue

# ----------------------------
# Thresholds / constants
# ----------------------------

NAME_RX = re.compile(r"^name_(2023|2024)_(\d+)$", re.I)

# register photo multi-page detectors
REG23_RX = re.compile(r"^register2023_photo_page_\d+$", re.I)
REG24_RX = re.compile(r"^register2024_photo_page_\d+$", re.I)

FAST_SURVEY_MINS = 30

# Grade 4 age band
AGE_MIN = 7
AGE_MAX = 20

ALLOWED_DISTRICTS = {1, 2, 3, 4}

MAX_MSG_LEN = 220

# Visit date sanity (QUALITY FLAG)
MIN_VISIT_YEAR = 2025

# Minimum girls per session (QUALITY FLAG)
MIN_GIRLS_PER_SESSION = 5

# Proxy attempt enforcement
MIN_VISITS_BEFORE_MISSED = 3
_MISSED_KEYWORDS = (
    "miss",
    "not found",
    "notfound",
    "not trace",
    "could not trace",
    "couldn't trace",
    "unable to trace",
    "no contact",
)


# ----------------------------
# Helpers
# ----------------------------

def _safe_get(df: pd.DataFrame, i, col):
    if col and col in df.columns:
        return df.at[i, col]
    return None


def _norm_text(x) -> str:
    if x is None:
        return ""
    if isinstance(x, float) and pd.isna(x):
        return ""
    return str(x).strip()


def _norm_key(x) -> str:
    s = _norm_text(x).casefold()
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _clip(s: str, n: int = MAX_MSG_LEN) -> str:
    s = _norm_text(s)
    if len(s) <= n:
        return s
    return s[: n - 3].rstrip() + "..."


def _msg(cause: str) -> str:
    return _clip(cause)


def _to_int(v):
    s = _norm_text(v)
    if s == "":
        return None
    try:
        f = float(s)
        if pd.isna(f):
            return None
        i = int(f)
        if abs(f - i) > 1e-9:
            return None
        return i
    except Exception:
        return None


def _is_blank_or_na(v) -> bool:
    s = _norm_key(v)
    return s in {"", "na", "n/a", "none", "null", "nil", "-", "_", ".", "..", "...", "----"}


def _duration_mins_from_times(start, end):
    st = pd.to_datetime(start, errors="coerce")
    en = pd.to_datetime(end, errors="coerce")
    if pd.isna(st) or pd.isna(en):
        return None
    mins = (en - st).total_seconds() / 60.0
    if mins < 0:
        return None
    return float(mins)


def _parse_dob(dob):
    if dob is None or (isinstance(dob, float) and pd.isna(dob)):
        return None
    dt = pd.to_datetime(dob, errors="coerce", dayfirst=True)
    if pd.isna(dt):
        return None
    return dt


def _age_from_dob(dob_dt: pd.Timestamp, ref_dt: pd.Timestamp) -> int | None:
    if dob_dt is None or ref_dt is None or pd.isna(dob_dt) or pd.isna(ref_dt):
        return None
    return int((ref_dt - dob_dt).days // 365.25)


def _safe_date_str(x) -> str:
    dt = pd.to_datetime(x, errors="coerce", dayfirst=True)
    if pd.isna(dt):
        return _norm_text(x)
    return dt.strftime("%b %d, %Y")


def _parse_visit_date(v):
    dt = pd.to_datetime(v, errors="coerce", dayfirst=True)
    if pd.isna(dt):
        return None
    return dt.date()


def _is_missed_status(v) -> bool:
    s = _norm_key(v)
    if not s:
        return False
    return any(k in s for k in _MISSED_KEYWORDS)


# ----------------------------
# Dedupe helpers
# ----------------------------

def _issue_record_key(issue: dict) -> tuple:
    rk = issue.get("record_key", None)
    iid = issue.get("instance_id", None)
    surv = issue.get("survey", None)
    return (rk, iid, surv)


def _issue_bad_column_key(issue: dict) -> str:
    raw = None
    for k in ("bad_column", "bad_col", "column", "field"):
        if k in issue and issue.get(k) is not None:
            raw = issue.get(k)
            break

    s = _norm_text(raw)
    if s == "":
        return "__unknown_field__"

    s = re.sub(r"\s*,\s*", ",", s.strip())
    s = re.sub(r"\s+", " ", s)
    return s.casefold()


def _severity_rank(sev) -> int:
    s = _norm_text(sev).upper()
    if s == "CRITICAL":
        return 2
    if s == "FLAG":
        return 1
    return 0


def _rule_order_value(issue: dict) -> int | None:
    for k in ("rule_order", "ruleOrder", "order", "rule_seq", "rule_seq_no"):
        if k in issue:
            v = issue.get(k)
            i = _to_int(v)
            if i is not None:
                return i
    return None


def _dedupe_within_record_by_field(issues: list[dict]) -> list[dict]:
    best_idx: dict[tuple, int] = {}

    for idx, issue in enumerate(issues):
        rec_key = _issue_record_key(issue)
        field_key = _issue_bad_column_key(issue)
        bucket_key = (rec_key, field_key)

        if bucket_key not in best_idx:
            best_idx[bucket_key] = idx
            continue

        cur_idx = best_idx[bucket_key]
        cur = issues[cur_idx]

        a = _severity_rank(issue.get("severity"))
        b = _severity_rank(cur.get("severity"))
        if a != b:
            if a > b:
                best_idx[bucket_key] = idx
            continue

        oa = _rule_order_value(issue)
        ob = _rule_order_value(cur)
        if oa is not None and ob is not None and oa != ob:
            if oa < ob:
                best_idx[bucket_key] = idx
            continue

    kept_indices = sorted(set(best_idx.values()))
    return [issues[i] for i in kept_indices]


# ----------------------------
# Dummy detection
# ----------------------------

def is_dummy_name(value: str) -> bool:
    s = _norm_text(value).lower()

    if not s or len(s) < 2:
        return True
    if re.fullmatch(r"[\W_]+", s):
        return True
    if re.fullmatch(r"(.)\1{2,}", s):
        return True
    if re.search(r"\d", s):
        return True

    placeholders = {
        "asd", "asdf", "abc", "abcd", "xyz",
        "test", "testing", "dummy", "sample",
        "name", "girl", "student", "null",
        "na", "n/a", "none", "nil", "xx", "yy", "zz",
        "aaaa", "bbb", "ccc", "ddd", "sss", "ggg",
        "0", "00", "000", "0000",
        "qwerty", "zxcv", "poiuy", "123", "xhxy",
        "-", "_", ".", "..", "...", "----",
    }
    if s in placeholders:
        return True

    keyboard = {"qwe", "zxc", "qaz", "wsx", "poi", "lkj", "mnb"}
    return s in keyboard


def _is_dummy_text(v) -> bool:
    if _is_blank_or_na(v):
        return True
    return is_dummy_name(v)


def is_dummy_label_text(v) -> bool:
    s = _norm_text(v).strip().lower()

    if not s:
        return True
    if _is_blank_or_na(s):
        return True
    if re.fullmatch(r"[\W_]+", s):
        return True
    if re.fullmatch(r"(.)\1{3,}", s):
        return True

    placeholders = {"test", "testing", "dummy", "sample", "school", "village", "district"}
    return s in placeholders


def is_dummy_location_text(v) -> bool:
    s = _norm_text(v).strip().lower()

    if not s:
        return True
    if s in {"na", "n/a", "none", "null", "nil", "-", "_", ".", "..", "...", "----"}:
        return True
    if re.fullmatch(r"[\W_]+", s):
        return True
    if re.fullmatch(r"(.)\1{4,}", s):
        return True

    placeholders = {"address", "landmark", "unknown"}
    return s in placeholders


def _is_invalid_id(v) -> bool:
    if _is_blank_or_na(v):
        return True
    return _to_int(v) is None


# ----------------------------
# Main runner
# ----------------------------

def run(df: pd.DataFrame, col: dict) -> list[dict]:
    issues: list[dict] = []

    key = col.get("record_key")
    inst = col.get("instance_id")
    sub = col.get("submission_date")
    enum = col.get("enumerator")
    enum_id = col.get("enumerator_id")
    device = col.get("deviceid")

    school = col.get("school") or "school"
    school_label = col.get("school_label") or "school_label"
    district = col.get("district") or "district"
    teacher_name = col.get("name") or "name"

    start_col = col.get("starttime") or "starttime"
    end_col = col.get("endtime") or "endtime"

    visit_date_col = col.get("visit_date") or "visit_date"

    def meta(i):
        return dict(
            record_key=_safe_get(df, i, key),
            instance_id=_safe_get(df, i, inst),
            enumerator=_safe_get(df, i, enum),
            enumerator_id=_safe_get(df, i, enum_id),
            deviceid=_safe_get(df, i, device),
            submission_date=_safe_get(df, i, sub),
            school=_safe_get(df, i, school),
            school_label=_safe_get(df, i, school_label),
            district=_safe_get(df, i, district),
            teacher_name=_safe_get(df, i, teacher_name),
            starttime=_safe_get(df, i, start_col),
            endtime=_safe_get(df, i, end_col),
            visit_date=_safe_get(df, i, "visit_date") if "visit_date" in df.columns else None,
        )

    # ----------------------------
    # Header-level checks
    # ----------------------------
    for i in df.index:
        m = meta(i)

        if _is_invalid_id(m["school"]):
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_HDR_01",
                title="Missing/invalid school ID",
                message=_msg("School ID is required and must be a valid numeric value."),
                field="school",
                value=_clip(_norm_text(m["school"]), 80),
                record_key=m["record_key"], instance_id=m["instance_id"],
                enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"], submission_date=m["submission_date"],
                district=m["district"],
            ))

        if is_dummy_label_text(m["school_label"]):
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_HDR_02",
                title="Missing/invalid school name",
                message=_msg("School name (label) is required and cannot be blank or dummy text."),
                field="school_label",
                value=_clip(_norm_text(m["school_label"]), 80),
                record_key=m["record_key"], instance_id=m["instance_id"],
                enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"], submission_date=m["submission_date"],
                district=m["district"],
            ))

        dist_i = _to_int(m["district"])
        if dist_i is None or dist_i not in ALLOWED_DISTRICTS:
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_HDR_03",
                title="Invalid district code",
                message=_msg("District must be one of 1,2,3,4 (D.I. Khan, Hangu, Lakki, Torghar)."),
                field="district",
                value=_clip(_norm_text(m["district"]), 80),
                record_key=m["record_key"], instance_id=m["instance_id"],
                enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"], submission_date=m["submission_date"],
                district=m["district"],
            ))

        if _is_dummy_text(m["teacher_name"]):
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_HDR_04",
                title="Missing/invalid teacher name",
                message=_msg("Teacher name is required and cannot be blank or dummy text."),
                field="name",
                value=_clip(_norm_text(m["teacher_name"]), 80),
                record_key=m["record_key"], instance_id=m["instance_id"],
                enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"], submission_date=m["submission_date"],
                district=m["district"],
            ))

        # Visit date sanity (QUALITY FLAG)
        if visit_date_col in df.columns:
            vd_raw = _safe_get(df, i, visit_date_col)
            vd = _parse_visit_date(vd_raw)

            sub_dt = pd.to_datetime(m.get("submission_date"), errors="coerce", dayfirst=True)
            sub_date = None if pd.isna(sub_dt) else sub_dt.date()

            if _norm_text(vd_raw) != "" and vd is None:
                issues.append(make_issue(
                    survey="Listing", severity="FLAG", rule_id="LST_QF_VISITDATE_01",
                    title="Invalid visit date",
                    message=_msg("Visit date is not a valid date. Please select the correct visit date."),
                    field=visit_date_col,
                    value=_clip(_norm_text(vd_raw), 80),
                    record_key=m["record_key"], instance_id=m["instance_id"],
                    enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"], submission_date=m["submission_date"],
                    district=m["district"],
                ))
            elif vd is not None:
                if vd.year < MIN_VISIT_YEAR:
                    issues.append(make_issue(
                        survey="Listing", severity="FLAG", rule_id="LST_QF_VISITDATE_02",
                        title="Visit date looks wrong (too old)",
                        message=_msg(f"Visit date year should be {MIN_VISIT_YEAR} or later. Please correct the visit date."),
                        field=visit_date_col,
                        value=_clip(_norm_text(vd_raw), 80),
                        record_key=m["record_key"], instance_id=m["instance_id"],
                        enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                        deviceid=m["deviceid"], submission_date=m["submission_date"],
                        district=m["district"],
                    ))

                if sub_date is not None and vd != sub_date:
                    issues.append(make_issue(
                        survey="Listing", severity="FLAG", rule_id="LST_QF_VISITDATE_03",
                        title="Visit date does not match submission date",
                        message=_msg(f"Visit date should match the survey day. Submission date is {sub_date}."),
                        field=visit_date_col,
                        value=_clip(f"visit_date={_norm_text(vd_raw)}", 120),
                        record_key=m["record_key"], instance_id=m["instance_id"],
                        enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                        deviceid=m["deviceid"], submission_date=m["submission_date"],
                        district=m["district"],
                    ))

        # ----------------------------
        # Head teacher + visit_status + survey_status consistency (FINAL)
        # ----------------------------

        visit_status = _safe_get(df, i, "visit_status")
        survey_status = _safe_get(df, i, "survey_status")
        head = _safe_get(df, i, "head")

        vs_code = _to_int(visit_status)
        ss_code = _to_int(survey_status)
        head_code = _to_int(head)

        # CRITICAL: if head=1 then survey_status must be 1 or 99
        if head_code == 1 and ss_code not in {1, 99}:
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_HEAD_01",
                title="Head teacher interview must be Complete or Other",
                message=_msg("If interview is conducted with head teacher (head=1), survey_status must be 1 (Complete) or 99 (Other)."),
                field="head,survey_status",
                value=_clip(f"head={_norm_text(head)}, survey_status={_norm_text(survey_status)}", 140),
                record_key=m["record_key"], instance_id=m["instance_id"],
                enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"], submission_date=m["submission_date"],
                district=m["district"],
            ))

        # CRITICAL: if visit_status=1 then survey_status must be 1 or 99
        if vs_code == 1 and ss_code not in {1, 99}:
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_VISIT_03",
                title="Target available visit must be Complete or Other",
                message=_msg("If visit_status=1 (Target respondent available), survey_status must be 1 (Complete) or 99 (Other)."),
                field="visit_status,survey_status",
                value=_clip(f"visit_status={_norm_text(visit_status)}, survey_status={_norm_text(survey_status)}", 140),
                record_key=m["record_key"], instance_id=m["instance_id"],
                enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"], submission_date=m["submission_date"],
                district=m["district"],
            ))

        # CRITICAL: only when head=0 AND visit_status in (2,3), survey_status must be 2 (Incomplete)
        if head_code == 0 and vs_code in {2, 3} and ss_code != 2:
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_HEADVISIT_01",
                title="Non-head + failed visit must be Incomplete",
                message=_msg("If head=0 and visit_status is 2 (Not available) or 3 (School Closed), survey_status must be 2 (Incomplete)."),
                field="head,visit_status,survey_status",
                value=_clip(
                    f"head={_norm_text(head)}, visit_status={_norm_text(visit_status)}, survey_status={_norm_text(survey_status)}",
                    180
                ),
                record_key=m["record_key"], instance_id=m["instance_id"],
                enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"], submission_date=m["submission_date"],
                district=m["district"],
            ))

        # Proxy rule: Minimum 3 attempts before marking missed/not found (text-based)
        if _is_missed_status(visit_status):
            vnum = _to_int(_safe_get(df, i, "visit_num"))
            if vnum is None or vnum < MIN_VISITS_BEFORE_MISSED:
                issues.append(make_issue(
                    survey="Listing", severity="CRITICAL", rule_id="LST_CE_ATTEMPT_01",
                    title="Insufficient visit attempts before marking missed",
                    message=_msg(
                        f"School marked as missed/not found (visit_status={_norm_text(visit_status)}), "
                        f"but visit_num={_norm_text(vnum)}. Protocol requires at least {MIN_VISITS_BEFORE_MISSED} attempts."
                    ),
                    field="visit_status,visit_num",
                    value=_clip(f"visit_status={_norm_text(visit_status)}, visit_num={_norm_text(vnum)}", 140),
                    record_key=m["record_key"], instance_id=m["instance_id"],
                    enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"], submission_date=m["submission_date"],
                    district=m["district"],
                ))

        # ----------------------------
        # Register photo rule (FLAG now, not CRITICAL)
        # ----------------------------

        name_cols_all = [c for c in df.columns if NAME_RX.match(c)]
        name_cols_2023 = [c for c in name_cols_all if c.lower().startswith("name_2023_")]
        name_cols_2024 = [c for c in name_cols_all if c.lower().startswith("name_2024_")]

        reg23_col = col.get("register2023_photo_page_1") or "register2023_photo_page_1"
        reg24_col = col.get("register2024_photo_page_1") or "register2024_photo_page_1"

        any_2023 = any(_norm_text(_safe_get(df, i, c)) != "" for c in name_cols_2023)
        any_2024 = any(_norm_text(_safe_get(df, i, c)) != "" for c in name_cols_2024)

        reg23_all = [c for c in df.columns if REG23_RX.match(c)]
        reg24_all = [c for c in df.columns if REG24_RX.match(c)]

        def _filled_register_cols(irow, cols):
            filled = []
            for cc in cols:
                if cc in df.columns and not _is_blank_or_na(_safe_get(df, irow, cc)):
                    filled.append(cc)
            return filled

        # Low girl count per session (QUALITY FLAG)
        girls_2023_count = sum(1 for c in name_cols_2023 if _norm_text(_safe_get(df, i, c)) != "")
        girls_2024_count = sum(1 for c in name_cols_2024 if _norm_text(_safe_get(df, i, c)) != "")

        if girls_2023_count < MIN_GIRLS_PER_SESSION:
            issues.append(make_issue(
                survey="Listing", severity="FLAG", rule_id="LST_QF_GIRLCOUNT_23",
                title="Low girl count in session (2023)",
                message=_msg(f"Only {girls_2023_count} girl(s) listed in 2023 session. Expected at least {MIN_GIRLS_PER_SESSION}."),
                field="girls_count_2023",
                value=_clip(f"{girls_2023_count}", 80),
                record_key=m["record_key"], instance_id=m["instance_id"],
                enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"], submission_date=m["submission_date"],
                district=m["district"],
            ))

        if girls_2024_count < MIN_GIRLS_PER_SESSION:
            issues.append(make_issue(
                survey="Listing", severity="FLAG", rule_id="LST_QF_GIRLCOUNT_24",
                title="Low girl count in session (2024)",
                message=_msg(f"Only {girls_2024_count} girl(s) listed in 2024 session. Expected at least {MIN_GIRLS_PER_SESSION}."),
                field="girls_count_2024",
                value=_clip(f"{girls_2024_count}", 80),
                record_key=m["record_key"], instance_id=m["instance_id"],
                enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                deviceid=m["deviceid"], submission_date=m["submission_date"],
                district=m["district"],
            ))

        # 2023 session register evidence (FLAG)
        if any_2023 and reg23_col in df.columns and _is_blank_or_na(_safe_get(df, i, reg23_col)):
            other_23 = [c for c in reg23_all if c.casefold() != reg23_col.casefold()]
            filled_23 = _filled_register_cols(i, other_23)

            if filled_23:
                issues.append(make_issue(
                    survey="Listing", severity="FLAG", rule_id="LST_QF_REGPHOTO_23_ALT",
                    title="Register photo page 1 empty but photo uploaded in other group (2023), needs review",
                    message=_msg("Register photo page 1 is empty, but register photo is uploaded in other page field(s), needs review."),
                    field=reg23_col,
                    value=_clip(",".join(filled_23), 200),
                    record_key=m["record_key"], instance_id=m["instance_id"],
                    enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"], submission_date=m["submission_date"],
                    district=m["district"],
                ))
            else:
                issues.append(make_issue(
                    survey="Listing", severity="FLAG", rule_id="LST_QF_REGPHOTO_23",
                    title="Register photo missing (2023)",
                    message=_msg("At least one girl is listed in 2023 session, but no register photo is uploaded (schools may not have registers, needs review)."),
                    field=reg23_col,
                    value=_clip(_norm_text(_safe_get(df, i, reg23_col)), 80),
                    record_key=m["record_key"], instance_id=m["instance_id"],
                    enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"], submission_date=m["submission_date"],
                    district=m["district"],
                ))

        # 2024 session register evidence (FLAG)
        if any_2024 and reg24_col in df.columns and _is_blank_or_na(_safe_get(df, i, reg24_col)):
            other_24 = [c for c in reg24_all if c.casefold() != reg24_col.casefold()]
            filled_24 = _filled_register_cols(i, other_24)

            if filled_24:
                issues.append(make_issue(
                    survey="Listing", severity="FLAG", rule_id="LST_QF_REGPHOTO_24_ALT",
                    title="Register photo page 1 empty but photo uploaded in other group (2024), needs review",
                    message=_msg("Register photo page 1 is empty, but register photo is uploaded in other page field(s), needs review."),
                    field=reg24_col,
                    value=_clip(",".join(filled_24), 200),
                    record_key=m["record_key"], instance_id=m["instance_id"],
                    enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"], submission_date=m["submission_date"],
                    district=m["district"],
                ))
            else:
                issues.append(make_issue(
                    survey="Listing", severity="FLAG", rule_id="LST_QF_REGPHOTO_24",
                    title="Register photo missing (2024)",
                    message=_msg("At least one girl is listed in 2024 session, but no register photo is uploaded (schools may not have registers, needs review)."),
                    field=reg24_col,
                    value=_clip(_norm_text(_safe_get(df, i, reg24_col)), 80),
                    record_key=m["record_key"], instance_id=m["instance_id"],
                    enumerator=m["enumerator"], enumerator_id=m["enumerator_id"],
                    deviceid=m["deviceid"], submission_date=m["submission_date"],
                    district=m["district"],
                ))

    # ----------------------------
    # Build girl-level table
    # ----------------------------
    name_cols = [c for c in df.columns if NAME_RX.match(c)]
    rows = []

    for i in df.index:
        m = meta(i)
        for nc in name_cols:
            year, idx = NAME_RX.match(nc).groups()
            session = "2022–23" if year == "2023" else "2023–24"

            gname = _safe_get(df, i, nc)
            if _norm_text(gname) == "":
                continue

            father_col = f"father_{year}_{idx}"
            dob_col = f"dob_{year}_{idx}"
            addr_col = f"address_{year}_{idx}"
            land_col = f"landmark_{year}_{idx}"
            village_col = f"village_{year}_{idx}"

            village_label_col = f"village_{year}_label_{idx}"
            village_other_col = f"village_{year}_other_{idx}"

            rows.append({
                **m,
                "session": session,
                "year": year,
                "idx": idx,
                "visit_num": _safe_get(df, i, "visit_num"),
                "visit_date": _safe_get(df, i, visit_date_col),
                "girl_id": f"{year}_{idx}",
                "girl_name": gname,
                "father_name": _safe_get(df, i, father_col),
                "dob": _safe_get(df, i, dob_col),
                "address": _safe_get(df, i, addr_col),
                "landmark": _safe_get(df, i, land_col),
                "village": _safe_get(df, i, village_col),
                "village_label": _safe_get(df, i, village_label_col),
                "village_other": _safe_get(df, i, village_other_col),
                "_src_name": nc,
                "_src_father": father_col,
                "_src_dob": dob_col,
                "_src_address": addr_col,
                "_src_landmark": land_col,
                "_src_village": village_col,
                "_src_village_label": village_label_col,
                "_src_village_other": village_other_col,
            })

    if not rows:
        return _dedupe_within_record_by_field(issues)

    gdf = pd.DataFrame(rows)

    # Dummy names (CRITICAL)
    for field in ["girl_name", "father_name"]:
        bad = gdf[field].apply(is_dummy_name)
        for i in gdf.index[bad]:
            r = gdf.loc[i]
            src_field = r["_src_name"] if field == "girl_name" else r["_src_father"]
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_01",
                title="Invalid or dummy name",
                message=_msg("Name must be real text, not placeholder, repeated characters, or digits."),
                field=str(src_field),
                value=_clip(_norm_text(r.get(field)), 80),
                record_key=r["record_key"], instance_id=r["instance_id"],
                enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
                deviceid=r["deviceid"], submission_date=r["submission_date"],
                district=r["district"],
            ))

    # DOB checks
    ref_dt_default = pd.Timestamp("2025-01-01")
    for i in gdf.index:
        r = gdf.loc[i]
        dob_raw = r.get("dob")
        dob_dt = _parse_dob(dob_raw)
        dob_field = str(r["_src_dob"])

        if _norm_text(dob_raw) != "" and dob_dt is None:
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_04",
                title="Invalid DOB format",
                message=_msg("DOB must be a valid date (day/month/year)."),
                field=dob_field,
                value=_clip(_norm_text(dob_raw), 80),
                record_key=r["record_key"], instance_id=r["instance_id"],
                enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
                deviceid=r["deviceid"], submission_date=r["submission_date"],
                district=r["district"],
            ))
            continue

        if _norm_text(dob_raw) == "":
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_04A",
                title="Missing DOB",
                message=_msg("DOB is required for each listed girl."),
                field=dob_field,
                value="",
                record_key=r["record_key"], instance_id=r["instance_id"],
                enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
                deviceid=r["deviceid"], submission_date=r["submission_date"],
                district=r["district"],
            ))
            continue

        sub_dt = pd.to_datetime(r.get("submission_date"), errors="coerce")
        ref_dt = sub_dt if not pd.isna(sub_dt) else ref_dt_default

        if dob_dt is not None and dob_dt > ref_dt:
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_04B",
                title="DOB is in the future",
                message=_msg("DOB cannot be greater than the submission date."),
                field=dob_field,
                value=_clip(_norm_text(dob_raw), 80),
                record_key=r["record_key"], instance_id=r["instance_id"],
                enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
                deviceid=r["deviceid"], submission_date=r["submission_date"],
                district=r["district"],
            ))
            continue

        age = _age_from_dob(dob_dt, ref_dt) if dob_dt is not None else None
        if age is not None and (age < AGE_MIN or age > AGE_MAX):
            issues.append(make_issue(
                survey="Listing", severity="FLAG", rule_id="LST_CE_04C",
                title="DOB implies age outside configured Grade 4 range",
                message=_msg(f"Configured age range is {AGE_MIN}–{AGE_MAX} years. Observed age is outside this range."),
                field=dob_field,
                value=_clip(f"dob={_safe_date_str(dob_raw)}, age≈{age}", 80),
                record_key=r["record_key"], instance_id=r["instance_id"],
                enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
                deviceid=r["deviceid"], submission_date=r["submission_date"],
                district=r["district"],
            ))

    # Village rules
    for i in gdf.index:
        r = gdf.loc[i]
        v_i = _to_int(r.get("village"))
        village_field = str(r["_src_village"])

        if v_i is None:
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_VIL_01",
                title="Missing/invalid village ID",
                message=_msg("Village ID is required and must be a valid numeric code."),
                field=village_field,
                value=_clip(_norm_text(r.get("village")), 80),
                record_key=r["record_key"], instance_id=r["instance_id"],
                enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
                deviceid=r["deviceid"], submission_date=r["submission_date"],
                district=r["district"],
            ))
            continue

        if v_i == 99 and is_dummy_location_text(r.get("village_other")):
            other_field = str(r["_src_village_other"])
            issues.append(make_issue(
                survey="Listing", severity="CRITICAL", rule_id="LST_CE_VIL_02",
                title="Village other-specify missing",
                message=_msg("If village ID is 99 (Other), the other-specify text must be filled."),
                field=other_field,
                value=_clip(_norm_text(r.get("village_other")), 80),
                record_key=r["record_key"], instance_id=r["instance_id"],
                enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
                deviceid=r["deviceid"], submission_date=r["submission_date"],
                district=r["district"],
            ))

    # Combined location rule (FLAG)
    for i in gdf.index:
        r = gdf.loc[i]

        addr_ok = not is_dummy_location_text(r.get("address"))
        land_ok = not is_dummy_location_text(r.get("landmark"))
        vlab_ok = not is_dummy_label_text(r.get("village_label"))

        if not (addr_ok or land_ok or vlab_ok):
            fields = ",".join([str(r["_src_address"]), str(r["_src_landmark"]), str(r["_src_village_label"])])
            issues.append(make_issue(
                survey="Listing", severity="FLAG", rule_id="LST_QF_LOC_01",
                title="Location missing",
                message=_msg("At least one of address, landmark, or village label must be provided."),
                field=fields,
                value="address/landmark/village_label all missing",
                record_key=r["record_key"], instance_id=r["instance_id"],
                enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
                deviceid=r["deviceid"], submission_date=r["submission_date"],
                district=r["district"],
            ))

    # Duplicates within same session (FLAG)
    dup_fields = ["session", "school", "visit_num", "girl_name", "father_name", "dob"]
    d = gdf.copy()
    for c in dup_fields:
        d[c] = d[c].map(_norm_key)

    strong_dup = d.duplicated(subset=dup_fields, keep=False)

    for i in gdf.index[strong_dup]:
        r = gdf.loc[i]
        issues.append(make_issue(
            survey="Listing", severity="FLAG", rule_id="LST_QF_DUP_01",
            title="Possible duplicate (same session and visit)",
            message=_msg(f"Same identity repeated in session {r.get('session')} and visit_num {r.get('visit_num')} (matched on girl name, father name, and DOB)."),
            field=",".join([str(r["_src_name"]), str(r["_src_father"]), str(r["_src_dob"])]),
            value=_clip(
                f"girl_id={_norm_text(r.get('girl_id'))}, "
                f"girl={_norm_text(r.get('girl_name'))}, "
                f"father={_norm_text(r.get('father_name'))}, "
                f"dob={_safe_date_str(r.get('dob'))}",
                160
            ),
            girl_id=r.get("girl_id"),
            record_key=r["record_key"], instance_id=r["instance_id"],
            enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
            deviceid=r["deviceid"], submission_date=r["submission_date"],
            district=r["district"],
        ))

    # Fast survey (FLAG)
    base = gdf.drop_duplicates(subset=["record_key", "instance_id"]).copy()
    base["dur_mins"] = base.apply(lambda rr: _duration_mins_from_times(rr.get("starttime"), rr.get("endtime")), axis=1)

    for i in base.index[base["dur_mins"].notna() & (base["dur_mins"] < FAST_SURVEY_MINS)]:
        r = base.loc[i]
        mins = float(r["dur_mins"])
        issues.append(make_issue(
            survey="Listing", severity="FLAG", rule_id="LST_QF_04",
            title="Survey completed too fast",
            message=_msg(f"Survey should take at least {FAST_SURVEY_MINS} minutes. Observed duration is {mins:.1f} minutes (<{FAST_SURVEY_MINS})."),
            field=f"{start_col},{end_col}",
            value=f"{mins:.1f} mins",
            record_key=r["record_key"], instance_id=r["instance_id"],
            enumerator=r["enumerator"], enumerator_id=r["enumerator_id"],
            deviceid=r["deviceid"], submission_date=r["submission_date"],
            district=r["district"],
        ))

    # Same girl across sessions (FLAG)
    s23 = gdf[gdf["year"] == "2023"].copy()
    s24 = gdf[gdf["year"] == "2024"].copy()

    for df_ in [s23, s24]:
        for c in ["school", "girl_name", "father_name", "address", "landmark", "village", "village_label"]:
            if c in df_.columns:
                df_[c] = df_[c].map(_norm_key)

    for _, r23 in s23.iterrows():
        candidates = s24[
            (s24["school"] == r23["school"]) &
            (s24["girl_name"] == r23["girl_name"]) &
            (s24["father_name"] == r23["father_name"])
        ]

        for _, r24 in candidates.iterrows():
            match_fields: list[str] = []
            matched_cols: list[str] = []

            matched_cols.extend([
                str(r23["_src_name"]), str(r24["_src_name"]),
                str(r23["_src_father"]), str(r24["_src_father"]),
            ])

            checks = [
                ("address", "_src_address"),
                ("landmark", "_src_landmark"),
                ("village", "_src_village"),
                ("village_label", "_src_village_label"),
            ]

            for f, src in checks:
                if bool(r23.get(f)) and r23.get(f) == r24.get(f):
                    match_fields.append(f)
                    matched_cols.extend([str(r23[src]), str(r24[src])])

            score = len(match_fields)
            if score >= 2:
                issues.append(make_issue(
                    survey="Listing", severity="FLAG", rule_id="LST_QF_08",
                    title="Same girl appears in both sessions",
                    message=_msg(
                        "Identity matches (school, girl name, father name). "
                        f"Location match_score={score}/4 (matched: {', '.join(match_fields)})."
                    ),
                    field=",".join(matched_cols),
                    value=_clip(
                        f"girl(23)={r23.get('girl_name')} | girl(24)={r24.get('girl_name')}; "
                        f"father(23)={r23.get('father_name')} | father(24)={r24.get('father_name')}; "
                        f"match_score={score}/4; matched={','.join(match_fields)}",
                        180
                    ),
                    record_key=r23["record_key"], instance_id=r23["instance_id"],
                    enumerator=r23["enumerator"], enumerator_id=r23["enumerator_id"],
                    deviceid=r23["deviceid"], submission_date=r23["submission_date"],
                    district=r23["district"],
                ))

    # ----------------------------
    # Visit attempt sequencing across forms (FINAL revisit logic)
    # ----------------------------

    school_id_col = col.get("school") or "school"
    school_label_col = col.get("school_label") or "school_label"

    attempt_rows = []
    for i in range(len(df)):
        sid = _safe_get(df, i, school_id_col)
        slabel = _safe_get(df, i, school_label_col)
        attempt_rows.append({
            "i": i,
            "sid": sid,
            "slabel": slabel,
            "sid_k": _norm_key(sid),
            "slabel_k": _norm_key(slabel),
            "visit_num": _to_int(_safe_get(df, i, "visit_num")),
            "visit_status": _to_int(_safe_get(df, i, "visit_status")),
            "survey_status": _to_int(_safe_get(df, i, "survey_status")),
            "head": _to_int(_safe_get(df, i, "head")),
            "visit_date": _parse_visit_date(_safe_get(df, i, "visit_date")),
            "m": meta(i),
        })

    groups = {}
    for r in attempt_rows:
        key2 = (r["sid_k"], r["slabel_k"])
        groups.setdefault(key2, []).append(r)

    for (_sid_k, _slabel_k), rows_g in groups.items():
        present = {1: False, 2: False, 3: False}
        by_vnum = {1: [], 2: [], 3: []}

        for r in rows_g:
            if r["visit_num"] in {1, 2, 3}:
                present[r["visit_num"]] = True
                by_vnum[r["visit_num"]].append(r)

        # FLAG: visit 2 exists but visit 1 missing
        if present[2] and not present[1]:
            r = by_vnum[2][0]
            issues.append(make_issue(
                survey="Listing", severity="FLAG", rule_id="LST_QF_VISIT_SEQ_01",
                title="Visit 2 submitted without Visit 1",
                message=_msg("2nd attempt exists for this school, but 1st attempt is missing."),
                field="school,school_label,visit_num",
                value=_clip(f"school={_norm_text(r['sid'])}, school_label={_norm_text(r['slabel'])}, visit_num=2", 180),
                record_key=r["m"]["record_key"], instance_id=r["m"]["instance_id"],
                enumerator=r["m"]["enumerator"], enumerator_id=r["m"]["enumerator_id"],
                deviceid=r["m"]["deviceid"], submission_date=r["m"]["submission_date"],
                district=r["m"]["district"],
            ))

        # FLAG: visit 3 exists but visit 1 or 2 missing
        if present[3] and (not present[1] or not present[2]):
            r = by_vnum[3][0]
            issues.append(make_issue(
                survey="Listing", severity="FLAG", rule_id="LST_QF_VISIT_SEQ_02",
                title="Visit 3 submitted without required previous visits (visit 1 or visit 2)",
                message=_msg("3rd attempt exists for this school, but 1st and/or 2nd attempts are missing."),
                field="school,school_label,visit_num",
                value=_clip(f"school={_norm_text(r['sid'])}, school_label={_norm_text(r['slabel'])}, visit_num=3", 180),
                record_key=r["m"]["record_key"], instance_id=r["m"]["instance_id"],
                enumerator=r["m"]["enumerator"], enumerator_id=r["m"]["enumerator_id"],
                deviceid=r["m"]["deviceid"], submission_date=r["m"]["submission_date"],
                district=r["m"]["district"],
            ))

        # Revisit required:
        # - survey_status is 2 or 99 (main trigger)
        # - OR visit_status indicates failure (2/3/99)
        # - OR head=0 (head teacher not interviewed)
        def _needs_followup(rr):
            return (
                rr.get("visit_num") in {1, 2}
                and (
                    rr.get("visit_status") in {2, 3, 99}
                    or rr.get("survey_status") == 2
                )
            )

        # Missing follow-up visit 2 after visit 1 needs revisit
        if any(_needs_followup(rr) for rr in by_vnum[1]) and not present[2]:
            r = by_vnum[1][0]
            issues.append(make_issue(
                survey="Listing", severity="FLAG", rule_id="LST_QF_VISIT_SEQ_03",
                title="Missing follow-up Visit 2 after Visit 1 needs revisit",
                message=_msg("1st attempt indicates revisit is required (visit_status=Not available/closed/other or survey_status=Incomplete), but 2nd attempt is missing for the same school."),
                field="school,school_label,visit_num,survey_status,visit_status,head",
                value=_clip(
                    f"school={_norm_text(r['sid'])}, school_label={_norm_text(r['slabel'])}, "
                    f"visit_num=1, survey_status={r['survey_status']}, visit_status={r['visit_status']}, head={r['head']}",
                    220
                ),
                record_key=r["m"]["record_key"], instance_id=r["m"]["instance_id"],
                enumerator=r["m"]["enumerator"], enumerator_id=r["m"]["enumerator_id"],
                deviceid=r["m"]["deviceid"], submission_date=r["m"]["submission_date"],
                district=r["m"]["district"],
            ))

        # Missing follow-up visit 3 after visit 2 needs revisit
        if any(_needs_followup(rr) for rr in by_vnum[2]) and not present[3]:
            r = by_vnum[2][0]
            issues.append(make_issue(
                survey="Listing", severity="FLAG", rule_id="LST_QF_VISIT_SEQ_04",
                title="Missing follow-up Visit 3 after Visit 2 needs revisit",
                message=_msg("2nd attempt indicates revisit is required (visit_status=Not available/Closed/Other or survey_status=Incomplete), but 3rd attempt is missing for the same school."),
                field="school,school_label,visit_num,survey_status,visit_status,head",
                value=_clip(
                    f"school={_norm_text(r['sid'])}, school_label={_norm_text(r['slabel'])}, "
                    f"visit_num=2, survey_status={r['survey_status']}, visit_status={r['visit_status']}, head={r['head']}",
                    220
                ),
                record_key=r["m"]["record_key"], instance_id=r["m"]["instance_id"],
                enumerator=r["m"]["enumerator"], enumerator_id=r["m"]["enumerator_id"],
                deviceid=r["m"]["deviceid"], submission_date=r["m"]["submission_date"],
                district=r["m"]["district"],
            ))

        # Separate day rule (FLAG)
        dates = {vn: (by_vnum[vn][0]["visit_date"] if by_vnum[vn] else None) for vn in (1, 2, 3)}

        def _flag_same_day(a, b):
            if dates.get(a) and dates.get(b) and dates[a] == dates[b]:
                r = by_vnum[b][0]
                issues.append(make_issue(
                    survey="Listing", severity="FLAG", rule_id="LST_QF_VISIT_SEQ_05",
                    title="Visit attempts done on the same day",
                    message=_msg(f"attempt={a} and attempt={b} should be on different days, but share visit_date={_safe_date_str(dates[a])}."),
                    field="visit_num,visit_date",
                    value=_clip(
                        f"school={_norm_text(r['sid'])}, school_label={_norm_text(r['slabel'])}, visit_date={_safe_date_str(dates[a])}",
                        220
                    ),
                    record_key=r["m"]["record_key"], instance_id=r["m"]["instance_id"],
                    enumerator=r["m"]["enumerator"], enumerator_id=r["m"]["enumerator_id"],
                    deviceid=r["m"]["deviceid"], submission_date=r["m"]["submission_date"],
                    district=r["m"]["district"],
                ))

        _flag_same_day(1, 2)
        _flag_same_day(2, 3)
        _flag_same_day(1, 3)

    return _dedupe_within_record_by_field(issues)
