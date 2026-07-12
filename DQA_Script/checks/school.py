# ============================================================
# School Survey Data Quality – Implemented Features
#
# 1) Captures standard metadata for every issue.
#    Example: record key, instance ID, enumerator, device, submission date, district.
#
# 2) Detects consent contradictions.
#    Example: respondent does not fully understand or agree, while consent is expected.
#
# 3) Computes interview duration from start and end time.
#    Example: end time occurs before start time or time is missing.
#
# 4) Flags interviews completed unusually fast.
#    Example: full school interview completed in less than 30 minutes.
#
# 5) Flags unusually high enrollment counts.
#    Example: Grade 6 + 7 + 8 enrollment exceeds realistic limits.
#
# 6) Detects dummy or placeholder text in names and labels.
#    Example: teacher name or school label entered as “test” or “aaaa”.
#
# 7) Detects duplicate submissions and duplicate school records.
#    Example: same submission ID appears twice or same school submitted multiple times.
#
# 8) Allows at most two submissions per school and evaluates whether they represent
#    valid Teacher + Head Teacher cases.
#    Example: two Teacher submissions for the same school are flagged.
#
# 9) Detects school ID conflicts across districts.
#    Example: same school ID linked to different districts.
#
# 10) Detects exact duplicate records across almost all fields.
#     Example: two submissions have identical answers.
#
# 11) Validates distance-to-facility values.
#     Example: negative distance or zero distance with non-walking transport.
#
# 12) Checks consistency between reported teacher counts and teacher rosters.
#     Example: reported teachers = 5 but 8 teacher names are filled.
#
# 13) Validates new teacher counts against new teacher roster entries.
#     Example: new teacher count reported as 2 but 3 names are entered.
#
# 14) Checks realism of teacher age and experience.
#     Example: experience years exceed possible working age.
#
# 15) Flags missing teacher presence information.
#     Example: teacher name filled but presence not recorded.
#
# 16) Detects impossible absentee counts.
#     Example: absent teachers exceed total teachers.
#
# 17) Validates obtained and total marks.
#     Example: obtained marks exceed total marks.
#
# 18) Checks consistency between annual marks and verification totals.
#     Example: annual total does not match verified total.
#
# 19) Detects identical response patterns across different schools.
#     Example: multiple schools have exactly the same key answers.
#
# 20) Allows multiple issues per record while avoiding repeated reporting
#     of the same issue for the same field within a record.
#
# ============================================================


# checks/school.py
from __future__ import annotations

import re
import warnings
import pandas as pd
from utils.logging import make_issue


def run(df: pd.DataFrame, col: dict) -> list[dict]:
    issues: list[dict] = []

    # --------------------------
    # Defensive: normalize column names
    # --------------------------
    df = df.copy()
    df.columns = [str(c).strip().lstrip("\ufeff") for c in df.columns]

    # --------------------------
    # Helpers
    # --------------------------
    def cfg(keyname: str, *fallbacks: str) -> str | None:
        """
        Resolve a YAML-mapped column safely, with fallbacks.
        - If YAML has key and it exists in df, use it
        - Else try fallbacks that exist in df
        - Else None
        """
        v = col.get(keyname)
        if isinstance(v, str) and v and v in df.columns:
            return v
        for fb in fallbacks:
            if fb and fb in df.columns:
                return fb
        return None

    def as_str(x) -> str:
        if x is None:
            return ""
        if isinstance(x, float) and pd.isna(x):
            return ""
        if pd.isna(x):
            return ""
        s = str(x).strip()
        return "" if s.lower() == "nan" else s

    def is_filled(x) -> bool:
        return as_str(x) != ""

    def fmt_scalar(v, *, keep_float: bool = False) -> str:
        if v is None or (isinstance(v, float) and pd.isna(v)) or pd.isna(v):
            return ""
        try:
            if isinstance(v, (int, float)) and not keep_float:
                fv = float(v)
                if fv.is_integer():
                    return str(int(fv))
                return str(fv)
        except Exception:
            pass

        s = as_str(v)
        if s == "":
            return ""

        if not keep_float:
            try:
                fv = float(s)
                if fv.is_integer():
                    return str(int(fv))
                return str(fv)
            except Exception:
                return s

        return s

    def issue_value(*pairs) -> str:
        out = []
        for k, v in pairs:
            vv = fmt_scalar(v, keep_float=False)
            out.append(f"{k}: {vv if vv != '' else '[blank]'}")
        return ", ".join(out)

    def to_num_series(s: pd.Series) -> pd.Series:
        return pd.to_numeric(s, errors="coerce")

    def to_num(x):
        return pd.to_numeric(pd.Series([x]), errors="coerce").iloc[0]

    def parse_dt_series(s: pd.Series) -> pd.Series:
        try:
            return pd.to_datetime(s, errors="coerce", format="mixed")
        except TypeError:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                return pd.to_datetime(s, errors="coerce")

    def norm_id(val) -> str:
        """
        Normalize IDs from Excel exports:
        - "14118.0" -> "14118"
        - trims whitespace
        """
        s = as_str(val)
        if s == "":
            return ""
        try:
            fv = float(s)
            if fv.is_integer():
                return str(int(fv))
        except Exception:
            pass
        return s.strip()

    # --------------------------
    # Meta columns (YAML mapped + fallbacks for your export)
    # --------------------------
    key = cfg("record_key", "KEY", "key")
    inst = cfg("instance_id", "instanceID", "instance_id")
    sub = cfg("submission_date", "SubmissionDate", "_submission_time", "submission_time", "submissiondate")

    enum = cfg("enumerator", "enumerator")
    enum_id = cfg("enumerator_id", "enumerator_id")
    device = cfg("deviceid", "deviceid")

    start_col = cfg("starttime", "starttime")
    end_col = cfg("endtime", "endtime")

    # In your export, district is present as `district`
    district_col = cfg("district", "district", "District")

    def meta(i):
        return dict(
            record_key=df.at[i, key] if key else None,
            instance_id=df.at[i, inst] if inst else None,
            enumerator=df.at[i, enum] if enum else None,
            enumerator_id=df.at[i, enum_id] if enum_id else None,
            deviceid=df.at[i, device] if device else None,
            submission_date=df.at[i, sub] if sub else None,
            district=df.at[i, district_col] if district_col else None,
        )

    def filled_slots(row: pd.Series, cols: list[str], prefix_label: str) -> tuple[int, str]:
        idxs: list[int] = []
        for c in cols:
            if c in row.index and is_filled(row[c]):
                m = pd.Series([c]).str.extract(r"(\d+)$", expand=False).iloc[0]
                if m is not None and m != "":
                    idxs.append(int(m))
        idxs_sorted = sorted(idxs)
        if len(idxs_sorted) == 0:
            return 0, f"{prefix_label} rows: none"
        return len(idxs_sorted), f"{prefix_label} rows: " + ",".join(str(x) for x in idxs_sorted)

    # --------------------------
    # Dummy / placeholder detection (no double-flagging)
    # --------------------------
    DUMMY_TOKENS = {
        "test", "testing", "dummy", "sample", "abcd", "abc", "qwerty", "asdf", "xxxx", "xxxxx",
        "n/a", "na", "none", "null", "nil", "dontknow", "don't know", "dk", "tbd", "unknown",
        "-", "--", "0",
    }
    ALLOW_TOKENS = {"bb"}

    def normalize_text(s: str) -> str:
        s = s.lower().strip()
        s = re.sub(r"\s+", " ", s)
        return s

    def is_dummy_text(val) -> bool:
        s0 = as_str(val)
        if s0 == "":
            return False

        s = normalize_text(s0)
        tokens = [t for t in re.split(r"[\s,./;:_\-()]+", s) if t]
        tokens_wo_allow = [t for t in tokens if t not in ALLOW_TOKENS]

        if re.fullmatch(r"\d+", s):
            return True
        if s in DUMMY_TOKENS:
            return True
        if len(tokens_wo_allow) == 1 and tokens_wo_allow[0] in DUMMY_TOKENS:
            return True
        if len(s) >= 4 and len(set(s)) == 1:
            return True
        if any(tok in {"qwerty", "asdf", "zxcv"} for tok in tokens_wo_allow):
            return True
        if len(s.replace(" ", "")) >= 4:
            short_tokens = [t for t in tokens_wo_allow if len(t) <= 2]
            if len(short_tokens) == len(tokens_wo_allow) and len(tokens_wo_allow) >= 2:
                return True

        vowels = set("aeiou")
        for t in tokens_wo_allow:
            if len(t) >= 3 and any(ch in vowels for ch in t):
                return False

        if "test" in s or "dummy" in s:
            return True
        return False

    flagged_dummy_cells: set[tuple[int, str]] = set()

    def flag_dummy(i: int, colname: str, label: str):
        if (i, colname) in flagged_dummy_cells:
            return
        flagged_dummy_cells.add((i, colname))
        m = meta(i)
        issues.append(
            make_issue(
                "School",
                "FLAG",
                "SCH_QF_09",
                f"Dummy/placeholder text in {label}",
                f"{label} contains dummy/placeholder text. Please correct with a real value.",
                colname,
                issue_value((label, df.at[i, colname] if colname in df.columns else "")),
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
    # Stable export columns (use export-first, then YAML if needed)
    # --------------------------
    c_school = cfg("middleschool", "middleschool")
    c_district = cfg("district", "district")

    c_teachers = cfg("teachers", "teachers")
    c_new_teacher_yesno = cfg("new_teacher", "new_teacher")
    c_new_teachers_count = cfg("new_teachers", "new_teachers")
    c_new_teachers_roster_count = cfg("new_teachers_roster_count", "new_teachers_roster_count")

    c_g6 = cfg("grade6_enrollment", "grade6_enrollment")
    c_g7 = cfg("grade7_enrollment", "grade7_enrollment")
    c_g8 = cfg("grade8_enrollment", "grade8_enrollment")

    teacher_name_cols = [f"teacher_{k}" for k in range(1, 6) if f"teacher_{k}" in df.columns]
    presence_cols = [f"presence_{k}" for k in range(1, 6) if f"presence_{k}" in df.columns]

    teacher_age_cols = [f"teacher_age_{k}" for k in range(1, 6) if f"teacher_age_{k}" in df.columns]
    teacher_exp_yrs_cols = [f"teacher_experience_yrs_{k}" for k in range(1, 6) if f"teacher_experience_yrs_{k}" in df.columns]
    teacher_exp_mnts_cols = [f"teacher_experiance_mnts_{k}" for k in range(1, 6) if f"teacher_experiance_mnts_{k}" in df.columns]

    new_teacher_name_cols = [f"teacher_name_new_{k}" for k in range(1, 9) if f"teacher_name_new_{k}" in df.columns]

    driver_name_cols = [c for c in df.columns if re.match(r"driver_name_\d+$", c)]
    school_label_cols = [c for c in df.columns if re.match(r"school_label_\d+$", c)]
    district_label_cols = [c for c in df.columns if re.match(r"district_label_\d+$", c)]

    # --------------------------
    # Teacher special codes
    # --------------------------
    TEACHERS_SPECIAL_CODES = {89, 99, 999}

    def teachers_valid_series(raw: pd.Series) -> pd.Series:
        num = pd.to_numeric(raw, errors="coerce")
        special_mask = num.round(0).isin(list(TEACHERS_SPECIAL_CODES))
        return num.mask(special_mask)

    def short_roster_value(
        teachers_used_total: float | None,
        roster_total: int,
        roster_existing: int,
        roster_new: int,
        mode: str,
        teachers_existing_only: float | None,
        teachers_new_only: float | None,
    ) -> str:
        if teachers_existing_only is None or pd.isna(teachers_existing_only):
            te_str = "Teachers=0"
        else:
            te_str = f"Teachers={int(round(float(teachers_existing_only)))}"

        if teachers_new_only is None or pd.isna(teachers_new_only):
            tn_str = "New Teacher=0"
        else:
            tn_str = f"New Teacher={int(round(float(teachers_new_only)))}"

        if teachers_used_total is None or pd.isna(teachers_used_total):
            diff_str = ""
        else:
            t_int = int(round(float(teachers_used_total)))
            if mode == "under":
                diff = t_int - roster_total
                diff_str = f", Missing≈{diff}" if diff >= 0 else ", Missing≈0"
            else:
                diff = roster_total - t_int
                diff_str = f", Overflow={diff}" if diff >= 0 else ", Overflow=0"

        return f"{te_str}, {tn_str}, Roster={roster_total} (Existing={roster_existing}, New={roster_new}){diff_str}"

    def short_new_mismatch_value(reported: float | None, filled: int, slots_text: str) -> str:
        rep = "" if reported is None or pd.isna(reported) else str(int(round(float(reported))))
        slots_short = slots_text.replace("New-teacher roster rows: ", "rows:")
        return f"NewCount={rep if rep != '' else '?'}, NewNames={filled} [{slots_short}]"

    # ============================================================
    # 0) DUPLICATES
    # ============================================================
    # A) Duplicate submission IDs (CRITICAL)
    for idcol, code in [(key, "SCH_CE_01"), (inst, "SCH_CE_02")]:
        if idcol and idcol in df.columns:
            s = df[idcol].astype("string").fillna("").map(as_str)
            vc = s[s != ""].value_counts()
            dup_vals = set(vc[vc >= 2].index)
            if dup_vals:
                for i in df.index[s.isin(dup_vals)]:
                    m = meta(i)
                    issues.append(
                        make_issue(
                            "School",
                            "CRITICAL",
                            code,
                            f"Duplicate {idcol}",
                            f"{idcol} should be unique, but this value appears multiple times.",
                            idcol,
                            issue_value((idcol, df.at[i, idcol])),
                            m["record_key"],
                            m["instance_id"],
                            m["enumerator"],
                            m["enumerator_id"],
                            m["deviceid"],
                            m["submission_date"],
                            m["district"],
                        )
                    )

    # B) Same school submissions logic (<=2 allowed with Teacher+HeadTeacher pattern)
    def pick_role_column() -> str | None:
        candidates = [
            "respondent",      # present in your export
            "resp_label",      # present in your export
            "respondent_role",
            "respondent_type",
            "interview_type",
            "submission_type",
            "role",
            "teacher_or_head",
            "teacher_head",
            "is_head_teacher",
            "head_teacher",
            "headteacher",
            "head_teacher_yesno",
        ]
        for c in candidates:
            if c in df.columns:
                return c
        for c in df.columns:
            cl = c.lower()
            if "head" in cl and ("teacher" in cl or "ht" in cl) and ("role" in cl or "type" in cl or "is_" in cl):
                return c
        return None

    def role_label_from_value(v) -> str | None:
        if pd.isna(v):
            return None
        s = as_str(v)
        if s == "":
            return None

        n = to_num(v)
        if pd.notna(n):
            ni = int(round(float(n)))
            if ni == 1:
                return "teacher"
            if ni == 2:
                return "head"

        sl = s.lower()
        if "head" in sl or "hm" in sl or "headteacher" in sl or "head teacher" in sl:
            return "head"
        if "teacher" in sl:
            return "teacher"
        return None

    def role_pair_is_clearly_same(r1: str | None, r2: str | None) -> bool:
        return r1 is not None and r2 is not None and r1 == r2

    if c_school:
        sch = df[c_school].map(norm_id).astype("string").fillna("").str.strip()
        sch_counts = sch[sch != ""].value_counts()

        # >2 submissions always FLAG
        over2 = set(sch_counts[sch_counts > 2].index)
        if over2:
            for i in df.index[sch.isin(over2)]:
                m = meta(i)
                school_id = norm_id(df.at[i, c_school])
                cnt = int(sch_counts.get(school_id, 0))

                # ---------------------------------------------------------
                # UPDATE REQUEST: include district column in SCH_QF_10 logic
                # - bad_column now includes both middleschool and district
                # - value now includes district too
                # ---------------------------------------------------------
                district_val = df.at[i, c_district] if c_district and c_district in df.columns else (m["district"] or "")

                issues.append(
                    make_issue(
                        "School",
                        "FLAG",
                        "SCH_QF_10",
                        "Too many submissions for same school",
                        "Same school should not have more than 2 submissions. Two are allowed only for Teacher + Head Teacher. Review duplicates.",
                        f"{c_school},{c_district}" if c_district else c_school,
                        issue_value(
                            ("middleschool", school_id),
                            ("district", district_val),
                            ("submissions_for_school", cnt),
                        ),
                        m["record_key"],
                        m["instance_id"],
                        m["enumerator"],
                        m["enumerator_id"],
                        m["deviceid"],
                        m["submission_date"],
                        m["district"],
                    )
                )

        # exactly 2 submissions: check Teacher + Head Teacher situation if we can infer safely
        exactly2 = set(sch_counts[sch_counts == 2].index)
        if exactly2:
            role_col = pick_role_column()

            for school_id in exactly2:
                idxs = df.index[sch == school_id].tolist()
                if len(idxs) != 2:
                    continue

                if role_col:
                    r1 = role_label_from_value(df.at[idxs[0], role_col])
                    r2 = role_label_from_value(df.at[idxs[1], role_col])
                else:
                    hint_cols = [c for c in df.columns if any(k in c.lower() for k in ["respondent", "role", "type", "head", "teacher"])]
                    hint_cols = hint_cols[:6]

                    def infer_from_hints(ii: int) -> str | None:
                        for c in hint_cols:
                            val = as_str(df.at[ii, c])
                            if val == "":
                                continue
                            rl = role_label_from_value(val)
                            if rl is not None:
                                return rl
                        return None

                    r1 = infer_from_hints(idxs[0])
                    r2 = infer_from_hints(idxs[1])

                if role_pair_is_clearly_same(r1, r2):
                    for i in idxs:
                        m = meta(i)
                        issues.append(
                            make_issue(
                                "School",
                                "FLAG",
                                "SCH_QF_25",
                                "Two submissions appear to be the same type",
                                "Two submissions exist for this school, but they look like the same respondent type. Two submissions are allowed only for Teacher + Head Teacher. Please verify.",
                                f"{c_school}" + (f",{role_col}" if role_col else ""),
                                issue_value(("middleschool", school_id), ("submission_types", f"{r1},{r2}")),
                                m["record_key"],
                                m["instance_id"],
                                m["enumerator"],
                                m["enumerator_id"],
                                m["deviceid"],
                                m["submission_date"],
                                m["district"],
                            )
                        )

    # C) School ID conflict: same middleschool with different district (FLAG)
    if c_school and c_district:
        tmp = df[[c_school, c_district]].copy()
        tmp[c_school] = tmp[c_school].map(norm_id).astype("string").fillna("").str.strip()
        tmp[c_district] = tmp[c_district].map(norm_id).astype("string").fillna("").str.strip()
        grp = tmp[tmp[c_school] != ""].groupby(c_school)[c_district].nunique(dropna=True)
        conflict_sch = set(grp[grp >= 2].index)
        if conflict_sch:
            for i in df.index[tmp[c_school].isin(conflict_sch)]:
                m = meta(i)
                issues.append(
                    make_issue(
                        "School",
                        "FLAG",
                        "SCH_QF_11",
                        "School ID conflict",
                        "Same school ID appears with different district values. One side is wrong (school ID or district).",
                        f"{c_school},{c_district}",
                        issue_value(("middleschool", df.at[i, c_school]), ("district", df.at[i, c_district])),
                        m["record_key"],
                        m["instance_id"],
                        m["enumerator"],
                        m["enumerator_id"],
                        m["deviceid"],
                        m["submission_date"],
                        m["district"],
                    )
                )

    # D) Exact duplicate rows (FLAG)
    meta_exclude = {key, inst, sub, enum, enum_id, device, start_col, end_col, "duration", "audio", "text_audit", None}
    cols_for_exact = [c for c in df.columns if c not in meta_exclude]
    if len(cols_for_exact) >= 10:
        sig_df = df[cols_for_exact].copy()
        for c in cols_for_exact:
            sig_df[c] = sig_df[c].astype("string").fillna("").str.strip()

        exact_sig = pd.util.hash_pandas_object(sig_df, index=False).astype("string")
        exact_counts = exact_sig.value_counts(dropna=False)
        dup_exact = set(exact_counts[exact_counts >= 2].index)
        if dup_exact:
            for i in df.index[exact_sig.isin(dup_exact)]:
                m = meta(i)
                group_size = int(exact_counts.loc[exact_sig.loc[i]])
                issues.append(
                    make_issue(
                        "School",
                        "FLAG",
                        "SCH_QF_12",
                        "Exact duplicate record",
                        "This submission is an exact duplicate of another submission (same answers). Review and keep only the correct one.",
                        "signature",
                        issue_value(("middleschool", df.at[i, c_school] if c_school else ""), ("duplicate_group_size", group_size)),
                        m["record_key"],
                        m["instance_id"],
                        m["enumerator"],
                        m["enumerator_id"],
                        m["deviceid"],
                        m["submission_date"],
                        m["district"],
                    )
                )

    # ============================================================
    # 2) DURATION FROM START/END (FLAG)
    # ============================================================
    if start_col and end_col and start_col in df.columns and end_col in df.columns:
        st = parse_dt_series(df[start_col])
        en = parse_dt_series(df[end_col])
        dur_min = (en - st).dt.total_seconds() / 60.0

        invalid = st.isna() | en.isna() | dur_min.isna() | (dur_min < 0)
        for i in df.index[invalid.fillna(False)]:
            m = meta(i)
            issues.append(
                make_issue(
                    "School",
                    "FLAG",
                    "SCH_QF_03",
                    "Duration invalid (start/end time)",
                    "One start or end time is missing/invalid, or endtime is before starttime.",
                    f"{start_col},{end_col}",
                    issue_value(("starttime", df.at[i, start_col]), ("endtime", df.at[i, end_col])),
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

        short = dur_min.notna() & (dur_min >= 0) & (dur_min < 30)
        for i in df.index[short.fillna(False)]:
            m = meta(i)
            dur_val = round(float(dur_min.loc[i]), 1) if pd.notna(dur_min.loc[i]) else None
            dur_txt = f"{dur_val} mins" if dur_val is not None else "[blank]"
            issues.append(
                make_issue(
                    "School",
                    "FLAG",
                    "SCH_QF_04",
                    "Interview completed too quickly",
                    "Computed duration is less than 30 minutes. Review for rushing or incomplete verification.",
                    f"{start_col},{end_col}",
                    dur_txt,
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

    # ============================================================
    # 3) ENROLLMENT HIGH (FLAG)
    # ============================================================
    if c_g6 and c_g7 and c_g8 and c_g6 in df.columns and c_g7 in df.columns and c_g8 in df.columns:
        g6 = to_num_series(df[c_g6]).fillna(0)
        g7 = to_num_series(df[c_g7]).fillna(0)
        g8 = to_num_series(df[c_g8]).fillna(0)
        total_enroll = g6 + g7 + g8

        bad = total_enroll > 700
        for i in df.index[bad.fillna(False)]:
            m = meta(i)
            issues.append(
                make_issue(
                    "School",
                    "FLAG",
                    "SCH_QF_01",
                    "Enrollment unusually high",
                    "Computed total enrollment (Grade 6 + Grade 7 + Grade 8) is unusually high. Verify with school record.",
                    f"{c_g6},{c_g7},{c_g8}",
                    issue_value(
                        ("Grade 6 enrollment", df.at[i, c_g6]),
                        ("Grade 7 enrollment", df.at[i, c_g7]),
                        ("Grade 8 enrollment", df.at[i, c_g8]),
                        ("Computed total", int(total_enroll.loc[i]) if pd.notna(total_enroll.loc[i]) else ""),
                    ),
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

    # ============================================================
    # 4) DUMMY DETECTION (FLAG)
    # ============================================================
    dummy_targets: list[tuple[str, str]] = []
    for c in teacher_name_cols:
        dummy_targets.append((c, "Teacher name"))
    for c in new_teacher_name_cols:
        dummy_targets.append((c, "New teacher name"))
    for c in driver_name_cols:
        dummy_targets.append((c, "Driver name"))
    for c in school_label_cols:
        dummy_targets.append((c, "School label"))
    for c in district_label_cols:
        dummy_targets.append((c, "District label"))

    for colname, label in dummy_targets:
        if colname not in df.columns:
            continue
        mask = df[colname].map(lambda x: is_filled(x) and is_dummy_text(x))
        for i in df.index[mask.fillna(False)]:
            flag_dummy(i, colname, label)

    # ============================================================
    # 5) TEACHER ROSTER CONSISTENCY (CRITICAL/FLAG)
    # ============================================================
    if c_teachers and c_teachers in df.columns:
        teachers_only = teachers_valid_series(df[c_teachers])

        if c_new_teachers_count and c_new_teachers_count in df.columns:
            new_teachers_num = teachers_valid_series(df[c_new_teachers_count]).fillna(0)
            teachers_used = teachers_only.fillna(0) + new_teachers_num
        else:
            new_teachers_num = pd.Series(0, index=df.index, dtype="float")
            teachers_used = teachers_only

        existing_count = (
            df[teacher_name_cols].apply(lambda c: c.map(is_filled)).sum(axis=1)
            if teacher_name_cols else pd.Series(0, index=df.index)
        )

        new_gate = pd.Series(True, index=df.index)
        if c_new_teacher_yesno and c_new_teacher_yesno in df.columns:
            nt_yes = to_num_series(df[c_new_teacher_yesno])
            new_gate = nt_yes.notna() & (nt_yes == 1)
        elif c_new_teachers_count and c_new_teachers_count in df.columns:
            nt_cnt = to_num_series(df[c_new_teachers_count])
            new_gate = nt_cnt.notna() & (nt_cnt >= 1)

        new_count_raw = (
            df[new_teacher_name_cols].apply(lambda c: c.map(is_filled)).sum(axis=1)
            if new_teacher_name_cols else pd.Series(0, index=df.index)
        )
        new_count = new_count_raw.where(new_gate, 0)
        captured_total = existing_count + new_count

        overflow = teachers_used.notna() & (captured_total > teachers_used)
        for i in df.index[overflow.fillna(False)]:
            m = meta(i)
            val = short_roster_value(
                teachers_used.loc[i],
                int(captured_total.loc[i]),
                int(existing_count.loc[i]),
                int(new_count.loc[i]),
                mode="over",
                teachers_existing_only=teachers_only.loc[i],
                teachers_new_only=new_teachers_num.loc[i],
            )
            issues.append(
                make_issue(
                    "School",
                    "CRITICAL",
                    "SCH_CE_04",
                    "Teacher roster overflow",
                    "Reported total teachers (teachers + new_teachers) is less than the number of teacher names entered in the roster. One side is wrong.",
                    f"{c_teachers}" + (f",{c_new_teachers_count}" if c_new_teachers_count and c_new_teachers_count in df.columns else "") + "," + ",".join(teacher_name_cols + new_teacher_name_cols),
                    val,
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

        under_capture = teachers_used.notna() & (teachers_used >= 10) & ((teachers_used - captured_total) >= 5)
        for i in df.index[under_capture.fillna(False)]:
            m = meta(i)
            val = short_roster_value(
                teachers_used.loc[i],
                int(captured_total.loc[i]),
                int(existing_count.loc[i]),
                int(new_count.loc[i]),
                mode="under",
                teachers_existing_only=teachers_only.loc[i],
                teachers_new_only=new_teachers_num.loc[i],
            )
            issues.append(
                make_issue(
                    "School",
                    "FLAG",
                    "SCH_QF_05",
                    "Teacher roster under-captured",
                    "Reported total teachers (teachers + new_teachers) is much higher than the number of teacher names entered in the roster.",
                    f"{c_teachers}" + (f",{c_new_teachers_count}" if c_new_teachers_count and c_new_teachers_count in df.columns else "") + "," + ",".join(teacher_name_cols + new_teacher_name_cols),
                    val,
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

        if c_new_teachers_roster_count and c_new_teachers_roster_count in df.columns and new_teacher_name_cols:
            new_reported = to_num_series(df[c_new_teachers_roster_count])
            mismatch = new_gate & new_reported.notna() & (new_count != new_reported)
            for i in df.index[mismatch.fillna(False)]:
                row = df.loc[i]
                m = meta(i)
                _, nw_slots = filled_slots(row, new_teacher_name_cols, "New-teacher roster")
                val = short_new_mismatch_value(new_reported.loc[i], int(new_count.loc[i]), nw_slots)
                issues.append(
                    make_issue(
                        "School",
                        "FLAG",
                        "SCH_QF_06",
                        "New teacher count mismatch",
                        "Reported new-teacher count does not match how many new-teacher names were entered.",
                        f"{c_new_teachers_roster_count}," + ",".join(new_teacher_name_cols),
                        val,
                        m["record_key"],
                        m["instance_id"],
                        m["enumerator"],
                        m["enumerator_id"],
                        m["deviceid"],
                        m["submission_date"],
                        m["district"],
                    )
                )

    # ============================================================
    # 6) TEACHER AGE + EXPERIENCE REALISM (FLAG)
    # ============================================================
    AGE_SPECIAL = {99, 999}

    def age_valid(x) -> float | None:
        n = to_num(x)
        if pd.isna(n):
            return None
        if int(round(float(n))) in AGE_SPECIAL:
            return None
        return float(n)

    def exp_yrs_valid(x) -> float | None:
        n = to_num(x)
        if pd.isna(n):
            return None
        if int(round(float(n))) in {99, 999}:
            return None
        return float(n)

    def exp_mnts_valid(x) -> float | None:
        n = to_num(x)
        if pd.isna(n):
            return None
        if int(round(float(n))) in {99, 999}:
            return None
        return float(n)

    if teacher_age_cols and teacher_exp_yrs_cols:
        offenders_cols: dict[int, list[tuple[str, str]]] = {}
        offenders_labels: dict[int, list[str]] = {}

        for k in range(1, 6):
            name_c = f"teacher_{k}"
            age_c = f"teacher_age_{k}"
            yrs_c = f"teacher_experience_yrs_{k}"
            if name_c not in df.columns or age_c not in df.columns or yrs_c not in df.columns:
                continue

            for i in df.index[df[name_c].apply(is_filled).fillna(False)]:
                if not (is_filled(df.at[i, age_c]) and is_filled(df.at[i, yrs_c])):
                    continue

                age = age_valid(df.at[i, age_c])
                yrs = exp_yrs_valid(df.at[i, yrs_c])
                if age is None or yrs is None:
                    continue

                max_reasonable = max(0.0, age - 15.0)
                if yrs > max_reasonable + 0.01:
                    offenders_cols.setdefault(i, []).append((age_c, yrs_c))
                    age_i = int(round(float(age)))
                    yrs_i = int(round(float(yrs)))
                    service_age = age_i - yrs_i
                    offenders_labels.setdefault(i, []).append(
                        f"age={age_i}, experience(yrs)={yrs_i}, service age={service_age}"
                    )

        for i, pairs in offenders_cols.items():
            m = meta(i)
            cols_join = ",".join([f"{a},{b}" for a, b in pairs])
            label_join = "; ".join(offenders_labels.get(i, []))
            issues.append(
                make_issue(
                    "School",
                    "FLAG",
                    "SCH_QF_15",
                    "Teacher experience exceeds age",
                    "Experience years cannot exceed (age - 15). Verify age or experience.",
                    cols_join,
                    label_join,
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

    # Existing teachers 1..5
    for k in range(1, 6):
        name_c = f"teacher_{k}"
        age_c = f"teacher_age_{k}"
        yrs_c = f"teacher_experience_yrs_{k}"
        mnts_c = f"teacher_experiance_mnts_{k}"

        if name_c not in df.columns:
            continue

        for i in df.index[df[name_c].apply(is_filled).fillna(False)]:
            m = meta(i)

            if age_c in df.columns and is_filled(df.at[i, age_c]):
                age = age_valid(df.at[i, age_c])
                if age is not None and (age < 15 or age > 100):
                    issues.append(
                        make_issue(
                            "School",
                            "FLAG",
                            "SCH_QF_13",
                            "Teacher age unrealistic",
                            "Teacher age must be between 15 and 100.",
                            age_c,
                            issue_value((f"teacher_{k}", df.at[i, name_c]), ("age", df.at[i, age_c])),
                            m["record_key"],
                            m["instance_id"],
                            m["enumerator"],
                            m["enumerator_id"],
                            m["deviceid"],
                            m["submission_date"],
                            m["district"],
                        )
                    )

            if yrs_c in df.columns and is_filled(df.at[i, yrs_c]):
                yrs = exp_yrs_valid(df.at[i, yrs_c])
                if yrs is not None and yrs < 0:
                    issues.append(
                        make_issue(
                            "School",
                            "FLAG",
                            "SCH_QF_14",
                            "Teacher experience years invalid",
                            "Experience years cannot be negative.",
                            yrs_c,
                            issue_value((f"teacher_{k}", df.at[i, name_c]), ("exp_years", df.at[i, yrs_c])),
                            m["record_key"],
                            m["instance_id"],
                            m["enumerator"],
                            m["enumerator_id"],
                            m["deviceid"],
                            m["submission_date"],
                            m["district"],
                        )
                    )

            if mnts_c in df.columns and is_filled(df.at[i, mnts_c]):
                mm = exp_mnts_valid(df.at[i, mnts_c])
                if mm is not None and (mm < 0 or mm > 12):
                    issues.append(
                        make_issue(
                            "School",
                            "FLAG",
                            "SCH_QF_16",
                            "Teacher experience months invalid",
                            "Experience months must be 1..12 if filled (not negative, not 0, not >12).",
                            mnts_c,
                            issue_value((f"teacher_{k}", df.at[i, name_c]), ("exp_months", df.at[i, mnts_c])),
                            m["record_key"],
                            m["instance_id"],
                            m["enumerator"],
                            m["enumerator_id"],
                            m["deviceid"],
                            m["submission_date"],
                            m["district"],
                        )
                    )

    # ============================================================
    # 7) ABSENTEES + PRESENCE (CRITICAL/FLAG)
    # ============================================================
    if c_teachers and c_teachers in df.columns and presence_cols:
        if c_new_teachers_count and c_new_teachers_count in df.columns:
            teachers_only = teachers_valid_series(df[c_teachers])
            new_teachers_num = teachers_valid_series(df[c_new_teachers_count]).fillna(0)
            teachers_used_abs = teachers_only.fillna(0) + new_teachers_num
        else:
            teachers_used_abs = teachers_valid_series(df[c_teachers])

        pres = df[presence_cols].apply(pd.to_numeric, errors="coerce")
        absentees = (pres == 0).sum(axis=1, min_count=1)
        present_cnt = (pres == 1).sum(axis=1, min_count=1)

        bad = teachers_used_abs.notna() & absentees.notna() & (absentees > teachers_used_abs)
        for i in df.index[bad.fillna(False)]:
            m = meta(i)
            issues.append(
                make_issue(
                    "School",
                    "CRITICAL",
                    "SCH_CE_05",
                    "Absentees impossible",
                    "Computed absentees exceed reported total teachers. Verify teacher count or presence entries.",
                    f"{c_teachers}," + (f"{c_new_teachers_count}," if c_new_teachers_count and c_new_teachers_count in df.columns else "") + ",".join(presence_cols),
                    issue_value(
                        ("Teachers+New", int(round(float(teachers_used_abs.loc[i])))),
                        ("Present(calc)", int(present_cnt.loc[i]) if pd.notna(present_cnt.loc[i]) else ""),
                        ("Absent(calc)", int(absentees.loc[i]) if pd.notna(absentees.loc[i]) else ""),
                    ),
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

        for k in range(1, 6):
            tn = f"teacher_{k}"
            pc = f"presence_{k}"
            if tn in df.columns and pc in df.columns:
                bad_row = df[tn].apply(is_filled) & df[pc].isna()
                for i in df.index[bad_row.fillna(False)]:
                    m = meta(i)
                    issues.append(
                        make_issue(
                            "School",
                            "FLAG",
                            "SCH_QF_07",
                            "Teacher presence missing",
                            "Teacher name is filled but presence value is missing. Complete the presence field.",
                            f"{tn},{pc}",
                            issue_value(("Teacher name", df.at[i, tn]), ("Presence", df.at[i, pc])),
                            m["record_key"],
                            m["instance_id"],
                            m["enumerator"],
                            m["enumerator_id"],
                            m["deviceid"],
                            m["submission_date"],
                            m["district"],
                        )
                    )

    # ============================================================
    # 8) MARKS VALIDATION (CRITICAL/FLAG)
    # ============================================================
    colset = set(df.columns)
    total_cols = [c for c in df.columns if re.match(r".+_total_\d+_\d+$", c)]

    for tcol in total_cols:
        ocol = tcol.replace("_total_", "_obtained_")
        if ocol not in colset:
            continue

        t = to_num_series(df[tcol])
        o = to_num_series(df[ocol])

        bad = t.notna() & o.notna() & (o > t)
        for i in df.index[bad.fillna(False)]:
            m = meta(i)
            issues.append(
                make_issue(
                    "School",
                    "CRITICAL",
                    "SCH_CE_06",
                    "Marks invalid",
                    "Obtained marks exceed total marks. One of the values is incorrect.",
                    f"{tcol},{ocol}",
                    issue_value(("Total marks", df.at[i, tcol]), ("Obtained marks", df.at[i, ocol])),
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

        not_taught_violation = t.notna() & (t == 0) & o.notna() & (o > 0)
        for i in df.index[not_taught_violation.fillna(False)]:
            m = meta(i)
            issues.append(
                make_issue(
                    "School",
                    "CRITICAL",
                    "SCH_CE_08",
                    "Subject marked as not taught but obtained marks entered",
                    "Protocol requires total=0 and obtained=0 if a subject is not taught. Obtained marks must be 0 when total is 0.",
                    f"{tcol},{ocol}",
                    issue_value(("Total marks", df.at[i, tcol]), ("Obtained marks", df.at[i, ocol])),
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

        bad_ob = o.notna() & (o < 0)
        for i in df.index[bad_ob.fillna(False)]:
            m = meta(i)
            issues.append(
                make_issue(
                    "School",
                    "CRITICAL",
                    "SCH_CE_07",
                    "Obtained marks invalid",
                    "Obtained marks cannot be negative.",
                    ocol,
                    issue_value(("Obtained marks", df.at[i, ocol])),
                    m["record_key"],
                    m["instance_id"],
                    m["enumerator"],
                    m["enumerator_id"],
                    m["deviceid"],
                    m["submission_date"],
                    m["district"],
                )
            )

    suffixes = sorted({re.search(r"(\d+_\d+)$", c).group(1) for c in total_cols})
    for suf in suffixes:
        annual_t = f"annual_total_{suf}"
        annual_o = f"annual_obtained_{suf}"
        if annual_t not in colset or annual_o not in colset:
            continue

        ann_t = to_num_series(df[annual_t])
        ann_o = to_num_series(df[annual_o])

        verify_total = f"total_total_verify_1_{suf}"
        verify_obt = f"total_obtained_verify_1_{suf}"

        if verify_total in colset:
            vtot = to_num_series(df[verify_total])
            bad_ann = ann_t.notna() & vtot.notna() & (ann_t != vtot)
            for i in df.index[bad_ann.fillna(False)]:
                m = meta(i)
                issues.append(
                    make_issue(
                        "School",
                        "FLAG",
                        "SCH_QF_23",
                        "Annual total mismatch",
                        "Annual total does not match total_total_verify_1_* for this record. Verify annual or verify total.",
                        f"{annual_t},{verify_total}",
                        issue_value(("annual_total", df.at[i, annual_t]), ("total_total_verify", df.at[i, verify_total])),
                        m["record_key"],
                        m["instance_id"],
                        m["enumerator"],
                        m["enumerator_id"],
                        m["deviceid"],
                        m["submission_date"],
                        m["district"],
                    )
                )

        if verify_obt in colset:
            vob = to_num_series(df[verify_obt])
            bad_ann_ob = ann_o.notna() & vob.notna() & (ann_o != vob)
            for i in df.index[bad_ann_ob.fillna(False)]:
                m = meta(i)
                issues.append(
                    make_issue(
                        "School",
                        "FLAG",
                        "SCH_QF_24",
                        "Annual obtained mismatch",
                        "Annual obtained does not match total_obtained_verify_1_* for this record. Verify annual or verify obtained.",
                        f"{annual_o},{verify_obt}",
                        issue_value(("annual_obtained", df.at[i, annual_o]), ("total_obtained_verify", df.at[i, verify_obt])),
                        m["record_key"],
                        m["instance_id"],
                        m["enumerator"],
                        m["enumerator_id"],
                        m["deviceid"],
                        m["submission_date"],
                        m["district"],
                    )
                )

    # ============================================================
    # 9) COPY-PASTE SIGNATURE ACROSS SCHOOLS (FLAG)
    # ============================================================
    signature_fields: list[str] = []
    for f in [
        c_district,
        c_school,
        c_g6,
        c_g7,
        c_g8,
        c_teachers,
        "school_close_days",
        "flood_yesno",
        "service_available",
        "transport_presence",
        "satisfied_transport",
        "frequency_ride",
        "driver_on_time",
        "respectful_driver",
        "safe",
        "chaperone",
    ]:
        if f and f in df.columns:
            signature_fields.append(f)

    if len(signature_fields) >= 6 and c_school and c_school in df.columns:
        sig_df = df[signature_fields].copy()
        for c in signature_fields:
            sig_df[c] = sig_df[c].astype("string").fillna("").str.strip()

        sig_series = pd.util.hash_pandas_object(sig_df, index=False).astype("string")
        counts = sig_series.value_counts(dropna=False)
        dup_sigs = set(counts[counts >= 2].index)

        if dup_sigs:
            schools = df[c_school].map(norm_id).astype("string").fillna("")
            for sig in dup_sigs:
                idxs = df.index[sig_series == sig]
                if len(idxs) < 2:
                    continue
                involved_schools = set(schools.loc[idxs].tolist())
                if len(involved_schools) < 2:
                    continue

                for i in idxs:
                    m = meta(i)
                    issues.append(
                        make_issue(
                            "School",
                            "FLAG",
                            "SCH_QF_08",
                            "Identical responses across schools",
                            "Multiple schools have exactly the same key responses (possible copy-paste). Review these submissions.",
                            ",".join(signature_fields),
                            issue_value(
                                ("Signature fields used", "; ".join(signature_fields)),
                                ("Schools in this duplicate group", ", ".join(sorted(involved_schools))[:300]),
                            ),
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
    # De-duplicate / select issues
    # --------------------------
    def _get(it: dict, *keys: str):
        for k in keys:
            if k in it and it.get(k) not in (None, ""):
                return it.get(k)
        return None

    def _severity_rank(v) -> int:
        s = (str(v).strip().upper()) if v is not None else ""
        if s == "CRITICAL":
            return 0
        if s == "FLAG":
            return 1
        return 9

    def _safe_int(v):
        try:
            if v is None or (isinstance(v, float) and pd.isna(v)):
                return None
            s = str(v).strip()
            if s == "":
                return None
            return int(float(s))
        except Exception:
            return None

    def _field_key(it: dict) -> str:
        fk = _get(it, "bad_column", "bad_col", "column", "columns", "Columns")
        if fk is None:
            code = _get(it, "code", "Code", "check", "check_code") or ""
            title = _get(it, "title", "Title") or ""
            msg = _get(it, "message", "Message") or ""
            return f"__no_field__:{code}:{title}:{msg}"
        return str(fk).strip()

    def _record_key(it: dict) -> tuple:
        rk = _get(it, "record_key", "KEY", "Record Key")
        iid = _get(it, "instance_id", "instanceID", "Instance ID")
        if rk in (None, "") and iid in (None, ""):
            return ("__no_record__", id(it))
        return (rk, iid)

    def _rule_order(it: dict) -> int | None:
        ro = _get(it, "rule_order", "ruleOrder", "order", "rule_priority", "priority")
        return _safe_int(ro)

    def _code_key(it: dict) -> str:
        c = _get(it, "code", "Code", "check", "check_code")
        return str(c).strip() if c is not None else ""

    seen_exact: set[tuple] = set()
    unique_issues: list[dict] = []

    for it in issues:
        survey = _get(it, "survey", "Survey")
        severity = _get(it, "severity", "Severity")
        code = _get(it, "code", "Code", "check", "check_code")
        rk, iid = _record_key(it)
        cols = _get(it, "columns", "Columns", "bad_column", "bad_col", "column")
        value = _get(it, "value", "Value")
        title = _get(it, "title", "Title")
        message = _get(it, "message", "Message")

        sig = (survey, severity, code, rk, iid, cols, value, title, message)
        if sig in seen_exact:
            continue
        seen_exact.add(sig)
        unique_issues.append(it)

    best_by_record_field: dict[tuple, dict[str, dict]] = {}

    def _better(a: dict, b: dict) -> bool:
        sa = _severity_rank(_get(a, "severity", "Severity"))
        sb = _severity_rank(_get(b, "severity", "Severity"))
        if sa != sb:
            return sa < sb

        roa = _rule_order(a)
        rob = _rule_order(b)
        if roa is not None and rob is not None and roa != rob:
            return roa < rob
        if roa is not None and rob is None:
            return True
        if roa is None and rob is not None:
            return False

        return _code_key(a) < _code_key(b)

    for it in unique_issues:
        rec = _record_key(it)
        fk = _field_key(it)
        per_field = best_by_record_field.setdefault(rec, {})
        if fk not in per_field:
            per_field[fk] = it
        else:
            if _better(it, per_field[fk]):
                per_field[fk] = it

    selected_ids: set[int] = set()
    final_issues: list[dict] = []

    for it in unique_issues:
        rec = _record_key(it)
        fk = _field_key(it)
        chosen = best_by_record_field.get(rec, {}).get(fk)
        if chosen is None:
            continue
        if id(chosen) in selected_ids:
            continue
        if it is chosen:
            selected_ids.add(id(chosen))
            final_issues.append(chosen)

    for rec, per_field in best_by_record_field.items():
        for fk, chosen in per_field.items():
            if id(chosen) in selected_ids:
                continue
            selected_ids.add(id(chosen))
            final_issues.append(chosen)

    return final_issues
