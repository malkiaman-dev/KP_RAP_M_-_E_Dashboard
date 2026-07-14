from __future__ import annotations

import re
import warnings
import inspect
import pandas as pd
from utils.logging import make_issue


def run(df: pd.DataFrame, col: dict) -> list[dict]:
    issues: list[dict] = []

    # --------------------------
    # Helpers
    # --------------------------
    def pick(*names: str) -> str | None:
        for n in names:
            if n and n in df.columns:
                return n
        return None

    def cfg(name: str, *fallbacks: str) -> str | None:
        c = col.get(name) if isinstance(col, dict) else None
        if isinstance(c, str) and c in df.columns:
            return c
        return pick(*fallbacks)

    def to_num(s: pd.Series) -> pd.Series:
        return pd.to_numeric(s, errors="coerce")

    def clean_scalar(x):
        try:
            if hasattr(x, "item"):
                return x.item()
        except Exception:
            pass
        return x

    def is_missing(v) -> bool:
        return pd.isna(v) or (isinstance(v, str) and v.strip() == "")

    def is_missing_series(s: pd.Series) -> pd.Series:
        """
        Series version of is_missing:
        - NaN
        - empty / whitespace-only strings
        - common string NaNs like "nan", "null", "none"
        """
        if s is None:
            return pd.Series(True, index=df.index)
        x = s.astype(str)
        stripped = x.str.strip()
        lowered = stripped.str.lower()
        return s.isna() | (stripped == "") | lowered.isin(["nan", "null", "none"])

    def fmt_kv(**kwargs) -> str:
        parts = []
        for k, v in kwargs.items():
            v = clean_scalar(v)
            if is_missing(v):
                parts.append(f"{k}: (missing)")
            else:
                parts.append(f"{k}: {v}")
        return ", ".join(parts)

    def safe_to_datetime(s: pd.Series) -> pd.Series:
        """
        Your export uses timestamps like:
          "22-01-26 14:24"
        Try multiple explicit formats first, then fallback.
        """
        if s is None:
            return pd.Series(pd.NaT, index=df.index)

        fmts = [
            "%d-%m-%y %H:%M",
            "%d-%m-%Y %H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%b %d, %Y %I:%M:%S %p",
        ]

        out = pd.Series(pd.NaT, index=s.index)
        remaining = s.notna()

        for fmt in fmts:
            if not remaining.any():
                break
            parsed = pd.to_datetime(s[remaining], format=fmt, errors="coerce", utc=False)
            filled = parsed.notna()
            out.loc[remaining[remaining].index[filled]] = parsed.loc[filled]
            remaining = remaining & out.isna()

        if remaining.any():
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore",
                    message="Could not infer format",
                    category=UserWarning,
                )
                parsed2 = pd.to_datetime(s[remaining], errors="coerce", utc=False)
            out.loc[remaining] = parsed2

        return out

    def looks_like_other(v) -> bool:
        if pd.isna(v):
            return False
        if isinstance(v, str):
            return "other" in v.strip().lower()
        try:
            iv = int(float(v))
        except Exception:
            return False
        return iv in (97, 98, 99)

    def _is_yes(v) -> bool:
        if is_missing(v):
            return False
        if isinstance(v, (int, float)) and not pd.isna(v):
            try:
                return int(v) == 1
            except Exception:
                return False
        s = str(v).strip().lower()
        return s in {"1", "yes", "y", "true", "t"}

    def transport_label(v) -> str:
        m = {
            1: "Walking",
            2: "Car",
            3: "Motorbike",
            4: "Rickshaw",
            5: "Bus",
            6: "Van",
            7: "Qingchi",
            8: "Bicycle",
            9: "Other",
        }
        if is_missing(v):
            return "(missing)"
        try:
            iv = int(float(v))
            return m.get(iv, str(clean_scalar(v)))
        except Exception:
            s = str(v).strip()
            return s if s else "(missing)"

    # --------------------------
    # Meta columns
    # --------------------------
    key = cfg("record_key", "KEY")
    inst = cfg("instance_id", "instanceID")
    sub = cfg("submission_date", "SubmissionDate")
    enum = cfg("enumerator", "enumerator")
    enum_id = cfg("enumerator_id", "enumerator_id")
    device = cfg("deviceid", "deviceid")
    district = cfg("district", "district")

    starttime = cfg("starttime", "starttime")
    endtime = cfg("endtime", "endtime")
    duration_col = cfg("duration", "duration")

    crit_fast_min = float(col.get("critical_fast_duration_minutes", 10) or 10)
    min_survey_min = float(col.get("min_survey_duration_minutes", 15) or 15)

    # Decide once how to call make_issue safely
    _make_issue_sig = None
    _make_issue_has_varargs = False
    _make_issue_has_varkw = False
    _make_issue_params_len = None
    try:
        _make_issue_sig = inspect.signature(make_issue)
        params = list(_make_issue_sig.parameters.values())
        _make_issue_has_varargs = any(p.kind == p.VAR_POSITIONAL for p in params)
        _make_issue_has_varkw = any(p.kind == p.VAR_KEYWORD for p in params)
        _make_issue_params_len = len(params)
    except Exception:
        _make_issue_sig = None

    def meta(i):
        return dict(
            record_key=df.at[i, key] if key else None,
            instance_id=df.at[i, inst] if inst else None,
            enumerator=df.at[i, enum] if enum else None,
            enumerator_id=df.at[i, enum_id] if enum_id else None,
            deviceid=df.at[i, device] if device else None,
            submission_date=df.at[i, sub] if sub else None,
            district=df.at[i, district] if district else None,
        )

    def add_issue(i, severity: str, code: str, title: str, desc: str, column: str, value):
        m = meta(i)

        base_args = [
            "Girls",
            severity,
            code,
            title,
            desc,
            column,
            value,
            m["record_key"],
            m["instance_id"],
            m["enumerator"],
            m["enumerator_id"],
            m["deviceid"],
            m["submission_date"],
        ]

        try:
            if m["district"] is not None and not is_missing(m["district"]):
                if _make_issue_has_varargs:
                    issues.append(make_issue(*base_args, m["district"]))
                    return
                if _make_issue_has_varkw:
                    issues.append(make_issue(*base_args, district=m["district"]))
                    return
                if isinstance(_make_issue_params_len, int) and _make_issue_params_len >= (len(base_args) + 1):
                    issues.append(make_issue(*base_args, m["district"]))
                    return
        except Exception:
            pass

        issues.append(make_issue(*base_args))

    def active_duration_minutes(i) -> float | None:
        """Prefer SurveyCTO duration (seconds); fall back to start/end wall-clock."""
        if duration_col and duration_col in df.columns:
            raw = to_num(pd.Series([df.at[i, duration_col]])).iloc[0]
            if pd.notna(raw) and float(raw) >= 0:
                r = float(raw)
                return r / 60.0 if r > 500 else r
        if starttime and endtime and starttime in df.columns and endtime in df.columns:
            st = safe_to_datetime(pd.Series([df.at[i, starttime]], index=[i])).iloc[0]
            et = safe_to_datetime(pd.Series([df.at[i, endtime]], index=[i])).iloc[0]
            if pd.notna(st) and pd.notna(et) and et > st:
                return (et - st).total_seconds() / 60.0
        return None

    def retain_recommendation(idxs) -> str:
        """Recommend the latest SubmissionDate (else starttime) KEY among a duplicate group."""
        idxs = list(idxs)
        best_i = idxs[0]
        best_dt = None
        for i in idxs:
            dt = None
            if sub and sub in df.columns:
                dt = safe_to_datetime(pd.Series([df.at[i, sub]], index=[i])).iloc[0]
            if (dt is None or pd.isna(dt)) and starttime and starttime in df.columns:
                dt = safe_to_datetime(pd.Series([df.at[i, starttime]], index=[i])).iloc[0]
            if dt is not None and not pd.isna(dt) and (best_dt is None or dt > best_dt):
                best_dt = dt
                best_i = i
        keep_key = clean_scalar(df.at[best_i, key]) if (key and key in df.columns) else None
        keep_dt = best_dt.strftime("%Y-%m-%d %H:%M") if best_dt is not None and not pd.isna(best_dt) else "(unknown)"
        if keep_key is not None and not is_missing(keep_key):
            return f"Retain KEY={keep_key} (latest SubmissionDate/start={keep_dt}); void or correct other duplicates after supervisor review."
        return f"Retain the latest submission (by SubmissionDate/start={keep_dt}); void or correct other duplicates after supervisor review."

    # --------------------------
    # Survey columns
    # --------------------------
    village = cfg("village", "village")
    village_label = cfg("village_label", "village_label")

    girl = cfg("girl_id", "girl")
    girlname_label = cfg("girl_label", "girlname_label", "girl_label", "girls_label")
    name_col = cfg("name", "name")

    age = cfg("girl_age", "age")

    marital_status = cfg("marital_status", "marital_status")
    marriage_age = cfg("marriage_age", "marriage_age", "marriage_age1", "marriage_age2")

    monthly_income = cfg("monthly_income", "monthly_income")
    how_far = cfg("how_far", "how_far")
    mode_transport = cfg("mode_transport", "mode_transport")

    class_size = cfg("class_size", "class_size")
    enroll_24_25 = cfg("enroll_24_25", "enroll_24_25", "school_enroll")
    enroll_school = cfg("enroll_school", "enroll_school", "ay2425schoolid", "middleschool_id")
    enroll_school_label = cfg("enroll_school_label", "ay2425schoolname", "middleschool_label")

    teacherid = cfg("teacherid", "teacherid", "teacher_id")
    teacher_name = cfg("teacher_name", "teacher_name")

    currently_studying = cfg("currently_studying", "currently_studying")

    worked_for_pay = cfg("worked_for_pay", "worked_for_pay")  # kept
    hours_week = cfg("hours_week", "hours_week")
    months = cfg("months", "months")
    earning = cfg("earning", "earrning", "earning")

    specify_mode_transport = cfg("specify_mode_transport", "specify_mode_transport")

    # Consent fields in export
    p_consent_understand = cfg("parental_consent_understand", "parenal_consent_understand", "parental_consent_understand")
    p_consent_copy = cfg("parental_consent_copy", "parental_consent_copy")
    p_consent_agree = cfg("parental_consent_agree", "parental_consent_agree")

    c_consent_understand = cfg("child_consent_understand", "child_consent_understand")
    c_consent_copy = cfg("child_consent_copy", "child_consent_copy")
    c_consent_agree = cfg("child_consent_agree", "child_consent_agree")

    survey_comments = cfg("survey_comments", "survey_comments")

    # --------------------------
    # 0) Duplicates: KEY and instanceID (CRITICAL)
    # --------------------------
    if key and key in df.columns:
        dup = df[key].notna() & df.duplicated(subset=[key], keep=False)
        for i in df.index[dup]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_DUP_KEY",
                "Duplicate KEY",
                "The same KEY appears more than once. This is usually a duplicate submission or export issue.",
                key,
                f"KEY={clean_scalar(df.at[i, key])}",
            )

    if inst and inst in df.columns:
        dup = df[inst].notna() & df.duplicated(subset=[inst], keep=False)
        for i in df.index[dup]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_DUP_INSTANCE",
                "Duplicate instanceID",
                "The same instanceID appears more than once. This is usually a duplicate submission or export issue.",
                inst,
                f"instanceID={clean_scalar(df.at[i, inst])}",
            )

    # --------------------------
    # 1) Missing linkage IDs (CRITICAL)
    # --------------------------
    if village and village in df.columns:
        bad = is_missing_series(df[village])
        for i in df.index[bad]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_12",
                "Missing village ID",
                "Village ID is missing. This record cannot be linked reliably.",
                village,
                "Village ID is missing",
            )

    if girl and girl in df.columns:
        bad = is_missing_series(df[girl])
        for i in df.index[bad]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_13",
                "Missing girl ID",
                "Girl ID is missing. This record cannot be linked reliably.",
                girl,
                "Girl ID is missing",
            )

    # --------------------------
    # 2) Duplicate girl within village (CRITICAL) + ID conflict inside duplicates (CRITICAL)
    # --------------------------
    if village and girl and village in df.columns and girl in df.columns:
        v_miss = is_missing_series(df[village])
        g_miss = is_missing_series(df[girl])

        dup_mask = (~v_miss) & (~g_miss) & df.duplicated(subset=[village, girl], keep=False)
        if dup_mask.any():
            tmp = df.loc[dup_mask, [village, girl]].copy()
            for (_, _), subg in tmp.groupby([village, girl], dropna=False):
                idxs = list(subg.index)
                retain_msg = retain_recommendation(idxs)
                for i in idxs:
                    add_issue(
                        i,
                        "CRITICAL",
                        "GL_CE_14",
                        "Duplicate girl record in the same village",
                        (
                            "The same girl ID appears more than once within the same village. "
                            "This looks like a duplicate record. "
                            + retain_msg
                        ),
                        f"{village},{girl}",
                        fmt_kv(Village=df.at[i, village], Girl=df.at[i, girl]),
                    )

        name_cols_for_conflict = [c for c in [girlname_label, name_col] if c and c in df.columns]
        if name_cols_for_conflict:
            grp = df.loc[(~v_miss) & (~g_miss), [village, girl] + name_cols_for_conflict].copy()
            for c in name_cols_for_conflict:
                grp[c] = (
                    grp[c]
                    .astype(str)
                    .str.strip()
                    .str.lower()
                    .replace({"nan": "", "none": "", "null": ""})
                )

            conflicts = []
            gb = grp.groupby([village, girl], dropna=True)
            for c in name_cols_for_conflict:
                nunique_nonempty = gb[c].apply(lambda s: len([x for x in s.unique().tolist() if x != ""]))
                bad_keys = nunique_nonempty[nunique_nonempty > 1]
                for (v, g), k in bad_keys.items():
                    conflicts.append((v, g, f"{c} has {int(k)} values"))

            if conflicts:
                reason = {}
                for v, g, r in conflicts:
                    reason.setdefault((v, g), []).append(r)
                reason = {k: "; ".join(v) for k, v in reason.items()}

                conflict_df = pd.DataFrame(
                    [(v, g, rsn) for (v, g), rsn in reason.items()],
                    columns=[village, girl, "__conflict_reason__"],
                )

                tmp = df[[village, girl]].copy()
                tmp["__idx__"] = df.index
                merged = tmp.merge(conflict_df, on=[village, girl], how="inner")

                for _, row in merged.iterrows():
                    i = row["__idx__"]
                    v = df.at[i, village]
                    g = df.at[i, girl]
                    group_idxs = df.index[(df[village] == v) & (df[girl] == g)].tolist()
                    retain_msg = retain_recommendation(group_idxs) if group_idxs else ""
                    add_issue(
                        i,
                        "CRITICAL",
                        "GL_CE_ID_CONFLICT",
                        "ID conflict within duplicates",
                        (
                            "Same (village, girl) appears multiple times but identity text differs across records. "
                            "Please keep only the correct one and fix the rest. "
                            + retain_msg
                        ),
                        f"{village},{girl}",
                        f"(village={clean_scalar(v)}, girl={clean_scalar(g)}), {row['__conflict_reason__']}",
                    )

    # --------------------------
    # 2b) Duplicate girl ID across villages (CRITICAL) + name mismatch
    # --------------------------
    if girl and girl in df.columns:
        g_miss = is_missing_series(df[girl])
        id_dup = (~g_miss) & df.duplicated(subset=[girl], keep=False)
        if id_dup.any():
            compare_cols = [c for c in [girlname_label, name_col, village, village_label, age] if c and c in df.columns]
            for gid, subg in df.loc[id_dup].groupby(girl, dropna=False):
                idxs = list(subg.index)
                if len(idxs) < 2:
                    continue
                # Only flag girl-id-only when not already same-village (covered by GL_CE_14)
                if village and village in df.columns:
                    villages = {clean_scalar(df.at[i, village]) for i in idxs if not is_missing(df.at[i, village])}
                    if len(villages) <= 1:
                        continue
                mismatched = []
                for c in compare_cols:
                    vals = set()
                    for i in idxs:
                        v = df.at[i, c]
                        if is_missing(v):
                            continue
                        vals.add(str(clean_scalar(v)).strip().lower())
                    if len(vals) > 1:
                        mismatched.append(c)
                retain_msg = retain_recommendation(idxs)
                code = "GL_CE_DUP_GIRL_MISMATCH" if mismatched else "GL_CE_DUP_GIRL_ID"
                title = (
                    "Duplicate girl ID with conflicting fields"
                    if mismatched
                    else "Duplicate girl ID across villages"
                )
                desc = (
                    f"Girl ID {clean_scalar(gid)} appears more than once across different villages"
                    + (f", and fields differ ({', '.join(mismatched)})" if mismatched else "")
                    + ". "
                    + retain_msg
                )
                for i in idxs:
                    add_issue(
                        i,
                        "CRITICAL",
                        code,
                        title,
                        desc,
                        girl,
                        fmt_kv(Girl=df.at[i, girl], Village=df.at[i, village] if village else None),
                    )

    # --------------------------
    # 3) Exact duplicate records (CRITICAL)
    # - Exact duplicates do NOT require KEY/instanceID to match other fields
    # --------------------------
    def is_excluded_for_exact_dup(cname: str) -> bool:
        c = cname.lower().strip()

        # Always exclude IDs so duplicates can be detected even if IDs differ
        if c in {"key", "instanceid"}:
            return True

        direct = {
            "text_audit",
            "duration",
            "submissiondate",
            "starttime",
            "endtime",
            "audio",
            "image",
            "video",
            "deviceid",
            "devicephonenum",
            "device_info",
            "violation_list",
            "violation_count",
        }
        if c in direct:
            return True

        patterns = [
            r"audit",
            r"^device",
            r"^submission",
            r"time$",
            r"timestamp",
            r"^gps",
            r"^meta",
            r"^review",
            r"^note",
        ]
        for p in patterns:
            if re.search(p, c):
                return True
        return False

    exclude_cols = {c for c in df.columns if is_excluded_for_exact_dup(c)}
    dup_subset = [c for c in df.columns if c not in exclude_cols]

    if len(dup_subset) >= 5:
        exact_dup = df.duplicated(subset=dup_subset, keep=False)
        for i in df.index[exact_dup]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_EXACT_DUP",
                "Exact duplicate record",
                "This record is an exact duplicate of another record (same values across almost all fields). Please remove or confirm why it exists.",
                "multiple_columns",
                "Exact duplicate detected",
            )

    # --------------------------
    # 4) Label completeness (FLAG)
    # --------------------------
    if village and village_label and village in df.columns and village_label in df.columns:
        bad = (~is_missing_series(df[village])) & is_missing_series(df[village_label])
        for i in df.index[bad]:
            add_issue(
                i,
                "FLAG",
                "GL_QF_30",
                "Missing village name",
                "Village ID is present, but village name is missing. Please confirm label export.",
                village_label,
                "Village name is missing",
            )

    if girl and girlname_label and girl in df.columns and girlname_label in df.columns:
        bad = (~is_missing_series(df[girl])) & is_missing_series(df[girlname_label])
        for i in df.index[bad]:
            add_issue(
                i,
                "FLAG",
                "GL_QF_31",
                "Missing girl name label",
                "Girl ID is present, but girl name label is missing. Please confirm label export.",
                girlname_label,
                "Girl name label is missing",
            )

    # --------------------------
    # 5) Consent checks
    # Parental agree is kept (validity). Child consent / schedule / other-specify
    # are enforced by SurveyCTO required+relevance — not re-checked here.
    # Status contradictions (refused but Complete) are DQA-critical.
    # --------------------------
    girl_available_col = cfg("girl_available", "girl_available")
    survey_status_col = cfg("survey_status", "survey_status")
    harassment_presence_col = cfg("harassment_presence", "harassment_presence")
    time_school_hours = cfg("time_school_hours", "time_school_hours")
    time_school_mins = cfg("time_school_mins", "time_school_mins")

    def _girl_is_available(i) -> bool:
        if not girl_available_col or girl_available_col not in df.columns:
            return True
        return _is_yes(df.at[i, girl_available_col])

    def _codeset(v) -> set[str]:
        if is_missing(v):
            return set()
        return {p.strip() for p in re.split(r"[\s,;]+", str(v).strip()) if p.strip()}

    if p_consent_agree and p_consent_agree in df.columns:
        for i in df.index:
            if not _girl_is_available(i):
                continue
            if _is_yes(df.at[i, p_consent_agree]):
                continue
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_CONSENT_PARENT",
                "Parental consent not confirmed",
                (
                    "Girl is available but parental consent (agree) is missing or not accepted. "
                    "Interview is not valid without parental consent."
                ),
                p_consent_agree,
                f"parental_consent_agree={clean_scalar(df.at[i, p_consent_agree])}",
            )

        for i in df.index:
            if not _girl_is_available(i):
                continue
            if not _is_yes(df.at[i, p_consent_agree]):
                continue
            if p_consent_understand and p_consent_understand in df.columns and is_missing(
                df.at[i, p_consent_understand]
            ):
                add_issue(
                    i,
                    "FLAG",
                    "GL_QF_CONSENT_PARENT_UNDERSTAND",
                    "Parental consent understand is missing",
                    "Parental consent was agreed, but the understanding confirmation is missing.",
                    p_consent_understand,
                    "missing",
                )
            if p_consent_copy and p_consent_copy in df.columns and is_missing(
                df.at[i, p_consent_copy]
            ):
                add_issue(
                    i,
                    "FLAG",
                    "GL_QF_CONSENT_PARENT_COPY",
                    "Parental consent copy is missing",
                    "Parental consent was agreed, but the consent copy confirmation is missing.",
                    p_consent_copy,
                    "missing",
                )

    if survey_status_col and survey_status_col in df.columns:
        for i in df.index:
            if str(clean_scalar(df.at[i, survey_status_col]) or "").strip() != "1":
                continue
            parent_no = (
                p_consent_agree
                and p_consent_agree in df.columns
                and (not is_missing(df.at[i, p_consent_agree]))
                and (not _is_yes(df.at[i, p_consent_agree]))
            )
            child_no = (
                c_consent_agree
                and c_consent_agree in df.columns
                and (not is_missing(df.at[i, c_consent_agree]))
                and (not _is_yes(df.at[i, c_consent_agree]))
            )
            if not (parent_no or child_no):
                continue
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_CONSENT_REFUSED_COMPLETE",
                "Consent refused but survey marked complete",
                (
                    "Parental and/or child consent was refused, but survey_status is Complete. "
                    "Instructions require Incomplete when any consent is refused."
                ),
                survey_status_col,
                "survey_status=1 with refused consent",
            )

    # --------------------------
    # 6) Time consistency and fast interview (one rule GL_CE_FAST_10)
    # Prefer SurveyCTO `duration` (active seconds). Wall-clock start/end is fallback.
    # CRITICAL if under 10 minutes; FLAG if under 15 minutes.
    # --------------------------
    if starttime and endtime and starttime in df.columns and endtime in df.columns:
        st = safe_to_datetime(df[starttime])
        et = safe_to_datetime(df[endtime])
        dur_sec = (et - st).dt.total_seconds()

        bad_time = dur_sec.notna() & (dur_sec < 0)
        for i in df.index[bad_time]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_TIME_NEG",
                "End time is before start time",
                "endtime is earlier than starttime, so duration is negative. Please verify device time or submission timestamps.",
                f"{starttime},{endtime}",
                fmt_kv(starttime=df.at[i, starttime], endtime=df.at[i, endtime]),
            )

    dur_field = ",".join([c for c in [duration_col, starttime, endtime] if c])
    for i in df.index:
        mins = active_duration_minutes(i)
        if mins is None:
            continue
        # Implausible duration (ANOMALY) — not Critical/Quality.
        # Filling demographics + learning (72 word items) + math in under 10–15 minutes
        # is rarely feasible even when skipping; often a duration/device anomaly.
        if mins < min_survey_min:
            thr = crit_fast_min if mins < crit_fast_min else min_survey_min
            add_issue(
                i,
                "ANOMALY",
                "GL_AN_FAST_DURATION",
                "Implausibly short Girls interview duration",
                (
                    f"Active duration is {round(mins, 1)} minutes (under {thr:.0f}). "
                    "The Girls form includes consent, modules, and a reading/math assessment "
                    "(dozens of items). Completing a submitted interview this quickly is often "
                    "technically implausible — check tablet duration/clock before treating as rushing."
                ),
                dur_field or "duration",
                f"{round(mins, 1)} mins",
            )

    # --------------------------
    # 7) Dummy / placeholder text detection (FLAG)
    # --------------------------
    dd_cfg = col.get("dummy_detection") if isinstance(col, dict) else None
    dd_min_len = 2
    dd_no_vowel_len = 6
    dd_extra_placeholders = []
    dd_extra_allow = []
    dd_fields = []

    if isinstance(dd_cfg, dict):
        dd_min_len = int(dd_cfg.get("min_len", 2) or 2)
        dd_no_vowel_len = int(dd_cfg.get("no_vowel_len", 6) or 6)
        dd_extra_placeholders = dd_cfg.get("extra_placeholders", []) or []
        dd_extra_allow = dd_cfg.get("extra_allow", []) or []
        dd_fields = dd_cfg.get("fields", []) or []

    PLACEHOLDERS = {
        "na", "n/a", "none", "nil", "null", "not available", "not applicable",
        "test", "dummy", "sample", "temp", "placeholder",
        "abc", "xyz", "tbd", "dk"
    }
    PLACEHOLDERS |= {str(x).strip().lower() for x in dd_extra_placeholders if str(x).strip()}

    ALLOW_WORDS = {"swabi", "bannu", "dont know", "don't know", "do not know", "refuse", "refused"}
    ALLOW_WORDS |= {str(x).strip().lower() for x in dd_extra_allow if str(x).strip()}

    ALLOW_CODES = {"89", "99", "999"}

    SYMBOL_ONLY = {"-", "_", ".", "..", "..."}
    KEYBOARD_PATTERNS = ("asdf", "qwerty", "zxcv", "poiuy", "lkjh", "mnbv")

    def _norm(s: str) -> str:
        s = str(s).strip().lower()
        s = re.sub(r"\s+", " ", s)
        return s

    def detect_dummy_text(v) -> tuple[bool, str]:
        if is_missing(v):
            return False, ""

        s = _norm(v)

        if s in ALLOW_CODES:
            return False, ""
        if s in ALLOW_WORDS:
            return False, ""

        if s in SYMBOL_ONLY:
            return True, "placeholder symbol"

        if re.fullmatch(r"[\W_]+", s) and len(s) <= 6:
            return True, "punctuation-only placeholder"

        if s in PLACEHOLDERS:
            return True, f"placeholder token '{s}'"

        compact = re.sub(r"[^a-z0-9]", "", s)
        if compact in {"na", "none", "nil", "null", "test", "dummy", "tbd", "dk"}:
            return True, "placeholder token variant"

        if re.fullmatch(r"\d+", s):
            if s in {"0", "00", "000", "0000"}:
                return True, "zero-like numeric placeholder"
            return True, "numeric-only value"

        if re.fullmatch(r"([a-z0-9])\1{2,}", s):
            return True, "repeated single-character pattern"

        joined = s.replace(" ", "")
        for pat in KEYBOARD_PATTERNS:
            if pat in joined:
                return True, f"keyboard pattern '{pat}'"

        if len(s) <= dd_min_len:
            return True, f"too short (<= {dd_min_len})"

        letters_only = re.sub(r"[^a-z]", "", s)
        if len(letters_only) >= dd_no_vowel_len and not any(ch in "aeiou" for ch in letters_only):
            return True, f"no vowels (len >= {dd_no_vowel_len})"

        return False, ""

    dummy_targets: list[str] = []

    if isinstance(dd_fields, list):
        for f in dd_fields:
            if not isinstance(f, dict):
                continue
            c = f.get("col")
            if not isinstance(c, str):
                continue
            if c == "girl_label" and girlname_label:
                c = girlname_label
            if c in df.columns:
                dummy_targets.append(c)

    for c in [girlname_label, name_col, village_label, teacher_name, enroll_school_label, survey_comments]:
        if c and c in df.columns:
            dummy_targets.append(c)

    seen = set()
    dummy_targets = [x for x in dummy_targets if x and (x not in seen and not seen.add(x))]

    for cname in dummy_targets:
        not_na_idx = df.index[df[cname].notna()]
        for i in not_na_idx:
            v = df.at[i, cname]
            is_dummy, reason = detect_dummy_text(v)
            if is_dummy:
                add_issue(
                    i,
                    "FLAG",
                    "GL_QF_DUMMY",
                    "Possible dummy or placeholder text",
                    f"Value looks like dummy or low-quality input in '{cname}' ({reason}). Please verify and correct it.",
                    cname,
                    str(clean_scalar(v)),
                )

    # --------------------------
    # 8) Age rule (CRITICAL): expected 10–17
    # --------------------------
    if age and age in df.columns:
        a = to_num(df[age])
        bad_age = a.notna() & ((a < 10) | (a > 17))
        for i in df.index[bad_age]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_00",
                "Age outside expected range",
                "For Grade 6–8 target girls, age should be between 10 and 17 years. Please verify the age value.",
                age,
                f"{int(a.loc[i])} years",
            )

    # --------------------------
    # 9) Marital status validation (CRITICAL) + low-age married-type (FLAG)
    # --------------------------
    if marital_status and marital_status in df.columns:
        ms_raw = df[marital_status]
        ms_num = to_num(ms_raw)

        label_map = {
            "unmarried": 1,
            "unmarried, but nikkah": 2,
            "unmarried but nikkah": 2,
            "married": 3,
            "separated": 4,
            "widowed": 5,
            "divorced": 6,
        }

        def to_ms(v, parsed):
            if pd.notna(parsed):
                try:
                    return int(parsed)
                except Exception:
                    return None
            if isinstance(v, str):
                s = re.sub(r"\s+", " ", v.strip().lower())
                return label_map.get(s)
            return None

        ms = ms_raw.combine(ms_num, to_ms)

        allowed = {1, 2, 3, 4, 5, 6}
        bad = ms.notna() & (~ms.isin(list(allowed)))
        for i in df.index[bad]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_15",
                "Invalid marital status code",
                "Marital status must be one of 1,2,3,4,5,6. Please correct the value.",
                marital_status,
                f"marital_status={clean_scalar(df.at[i, marital_status])}",
            )

        if age and age in df.columns:
            a = to_num(df[age])
            married_type = {3, 4, 5, 6}
            bad = a.notna() & ms.notna() & (a < 10) & ms.isin(list(married_type))
            for i in df.index[bad]:
                add_issue(
                    i,
                    "FLAG",
                    "GL_QF_32",
                    "Married-type status for a very young age",
                    "Age is very low, but marital status indicates Married/Separated/Widowed/Divorced. Please review and confirm.",
                    f"{age},{marital_status}",
                    fmt_kv(Age=df.at[i, age], MaritalStatus=df.at[i, marital_status]),
                )

    # --------------------------
    # 10) Marriage age logic (CRITICAL)
    # --------------------------
    if marriage_age and marriage_age in df.columns and age and age in df.columns:
        ma = to_num(df[marriage_age])
        a = to_num(df[age])

        bad = ma.notna() & a.notna() & (ma > a)
        for i in df.index[bad]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_09",
                "Marriage age is greater than current age",
                "Marriage age cannot be greater than current age. Please correct the entry.",
                f"{marriage_age},{age}",
                fmt_kv(MarriageAge=df.at[i, marriage_age], Age=df.at[i, age]),
            )

        bad = ma.notna() & ((ma < 0) | (ma < 5))
        for i in df.index[bad]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_10",
                "Marriage age is too low",
                "Marriage age is extremely low or negative and likely entered incorrectly. Please verify.",
                marriage_age,
                f"marriage_age={clean_scalar(df.at[i, marriage_age])}",
            )

    # --------------------------
    # 11) Class size plausibility (FLAG)
    # --------------------------
    if class_size and class_size in df.columns:
        cs = to_num(df[class_size])

        nonnum = df[class_size].notna() & cs.isna()
        for i in df.index[nonnum]:
            add_issue(
                i,
                "FLAG",
                "GL_QF_34",
                "Class size is not a number",
                "Class size is filled but not a valid number. Please correct the entry.",
                class_size,
                f"class_size={clean_scalar(df.at[i, class_size])}",
            )

        bad = cs.notna() & (cs <= 0)
        for i in df.index[bad]:
            add_issue(
                i,
                "FLAG",
                "GL_QF_35",
                "Class size is zero or negative",
                "Class size is zero or negative. Please verify.",
                class_size,
                f"class_size={int(cs.loc[i])}",
            )

        bad = cs.notna() & (cs > 200)
        for i in df.index[bad]:
            add_issue(
                i,
                "FLAG",
                "GL_QF_36",
                "Class size is unusually high",
                "Class size is very high and may be a data entry mistake. Please verify.",
                class_size,
                f"class_size={int(cs.loc[i])}",
            )

    # --------------------------
    # 12) Enrolment vs school info (CRITICAL)
    # --------------------------
    if enroll_24_25 and enroll_24_25 in df.columns:
        en = to_num(df[enroll_24_25])
        enrolled = en == 1

        school_id_series = df[enroll_school] if enroll_school and enroll_school in df.columns else None
        school_lab_series = df[enroll_school_label] if enroll_school_label and enroll_school_label in df.columns else None

        if school_id_series is not None:
            id_missing = is_missing_series(school_id_series)
            id_is_99 = school_id_series.astype(str).str.strip() == "99"
        else:
            id_missing = pd.Series(True, index=df.index)
            id_is_99 = pd.Series(False, index=df.index)

        if school_lab_series is not None:
            lab_missing = is_missing_series(school_lab_series)
        else:
            lab_missing = pd.Series(True, index=df.index)

        bad_both_missing = enrolled & id_missing & lab_missing & (~id_is_99)
        for i in df.index[bad_both_missing]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_06",
                "Enrolled but school info is missing",
                "The girl is marked as enrolled (2024-25), but both school ID and school name are missing. Provide either school ID (or 99) or school name.",
                f"{enroll_school},{enroll_school_label}",
                "school id and school name both missing",
            )

    # --------------------------
    # 13) Teacher section
    # IMPORTANT CHANGE YOU REQUESTED:
    # - Removed GL_CE_TEACHER_MISSING logic completely
    # - Kept only: if teacherid indicates Other, teacher_name must be present
    # --------------------------
    if teacherid and teacherid in df.columns and teacher_name and teacher_name in df.columns:
        is_other_teacher = df[teacherid].apply(looks_like_other)
        bad2 = is_other_teacher & df[teacher_name].apply(is_missing)
        for i in df.index[bad2]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_TEACHER_OTHER_NO_NAME",
                "Teacher is Other but name is missing",
                "Teacher was selected as Other, but teacher name was not entered. Please enter the teacher name clearly.",
                f"{teacherid},{teacher_name}",
                "teacherid=Other, teacher_name missing",
            )

    # --------------------------
    # 14) Negative values sanity checks (CRITICAL)
    # --------------------------
    if monthly_income and monthly_income in df.columns:
        inc = to_num(df[monthly_income])
        bad = inc.notna() & (inc < 0)
        for i in df.index[bad]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_INCOME_NEG",
                "Monthly income is negative",
                "Monthly income cannot be negative. Please correct the value.",
                monthly_income,
                f"monthly_income={clean_scalar(df.at[i, monthly_income])}",
            )

    if how_far and how_far in df.columns:
        dist = to_num(df[how_far])

        bad = dist.notna() & (dist < 0)
        for i in df.index[bad]:
            add_issue(
                i,
                "CRITICAL",
                "GL_CE_DIST_NEG",
                "Distance to school is negative",
                "Distance cannot be negative. Please correct the value.",
                how_far,
                f"distance={float(dist.loc[i])}",
            )

        if mode_transport and mode_transport in df.columns:
            mt = to_num(df[mode_transport])

            bad = dist.notna() & (dist == 0) & mt.notna() & (mt != 1)
            for i in df.index[bad]:
                add_issue(
                    i,
                    "FLAG",
                    "GL_QF_DIST_MODE",
                    "Distance is 0 but transport mode suggests travel",
                    "Distance is 0 but a non-walking transport mode is selected. This may be fine, but please verify.",
                    f"{how_far},{mode_transport}",
                    f"Distance: {float(dist.loc[i])}, mode_transport: {transport_label(df.at[i, mode_transport])}",
                )

    # --------------------------
    # 15) Work hours and months plausibility (FLAG)
    # --------------------------
    if hours_week and hours_week in df.columns:
        hw = to_num(df[hours_week])
        bad = hw.notna() & (hw > 100)
        for i in df.index[bad]:
            add_issue(
                i,
                "FLAG",
                "GL_QF_12",
                "Working hours per week are unusually high",
                "Working hours per week are very high. Please verify the entry.",
                hours_week,
                f"{int(hw.loc[i])} hours/week",
            )

    if months and months in df.columns:
        mo = to_num(df[months])
        bad = mo.notna() & ((mo < 1) | (mo > 12))
        for i in df.index[bad]:
            add_issue(
                i,
                "FLAG",
                "GL_QF_13",
                "Months value is out of range",
                "Months should usually be between 1 and 12. Please verify the entry.",
                months,
                f"months={clean_scalar(df.at[i, months])}",
            )

    # --------------------------
    # 16) “Other specify” completeness (FLAG)
    # --------------------------
    if mode_transport and specify_mode_transport and mode_transport in df.columns and specify_mode_transport in df.columns:
        bad = df[mode_transport].apply(looks_like_other) & df[specify_mode_transport].apply(is_missing)
        for i in df.index[bad]:
            add_issue(
                i,
                "FLAG",
                "GL_QF_08",
                "Transport mode is Other but details are missing",
                "Transport mode is marked as Other, but the specify field is empty. Please fill the details.",
                f"{mode_transport},{specify_mode_transport}",
                "mode_transport=Other, specify_mode_transport is empty",
            )

    # --------------------------
    # 18) Time-use total > 24 hours (FLAG)
    # --------------------------
    tu_cols = [
        ("looking_after_children_hours", "looking_after_children_mins"),
        ("domestic_chores_hours", "domestic_chores_mins"),
        ("leisure_hours", "leisure_mins"),
    ]
    if any((h in df.columns) for h, _ in tu_cols):
        for i in df.index:
            total_mins = 0.0
            any_filled = False
            for h_col, m_col in tu_cols:
                if h_col in df.columns and not is_missing(df.at[i, h_col]):
                    hv = to_num(pd.Series([df.at[i, h_col]])).iloc[0]
                    if pd.notna(hv):
                        any_filled = True
                        total_mins += float(hv) * 60.0
                if m_col in df.columns and not is_missing(df.at[i, m_col]):
                    mv = to_num(pd.Series([df.at[i, m_col]])).iloc[0]
                    if pd.notna(mv):
                        any_filled = True
                        total_mins += float(mv)
            if not any_filled or total_mins <= 24 * 60 + 1e-6:
                continue
            add_issue(
                i,
                "FLAG",
                "GL_QF_TIME_USE_OVER_24",
                "Yesterday time-use exceeds 24 hours",
                (
                    "Looking-after + domestic chores + leisure total more than 24 hours. "
                    "Verify hours/minutes with the girl."
                ),
                ",".join(c for pair in tu_cols for c in pair if c in df.columns),
                f"total_hours={total_mins / 60.0:.1f}",
            )

    # --------------------------
    # 19) Harassment privacy guidance (FLAG)
    # Form note: harassment must be private; group opens only when presence includes
    # "No one else present" (code 6). Flag complete consented interviews that were
    # not alone for this module.
    # --------------------------
    if harassment_presence_col and harassment_presence_col in df.columns:
        for i in df.index:
            parent_ok = (
                p_consent_agree
                and p_consent_agree in df.columns
                and _is_yes(df.at[i, p_consent_agree])
            )
            child_ok = (
                c_consent_agree
                and c_consent_agree in df.columns
                and _is_yes(df.at[i, c_consent_agree])
            )
            if not (parent_ok and child_ok):
                continue
            presence = df.at[i, harassment_presence_col]
            if is_missing(presence):
                continue
            codes = _codeset(presence)
            # Also check expanded binary columns
            if "harassment_presence_6" in df.columns:
                if str(df.at[i, "harassment_presence_6"]).strip() in {"1", "true", "yes"}:
                    codes.add("6")
            if "6" in codes:
                continue
            add_issue(
                i,
                "FLAG",
                "GL_QF_HARASSMENT_NOT_PRIVATE",
                "Harassment section not conducted in private",
                (
                    "Form guidance requires the harassment module in private "
                    "('No one else present'). Room presence was not alone — verify field practice."
                ),
                harassment_presence_col,
                f"harassment_presence={clean_scalar(presence)}",
            )

    # --------------------------
    # 20) Travel time vs distance plausibility (FLAG)
    # --------------------------
    if how_far and how_far in df.columns and (
        (time_school_hours and time_school_hours in df.columns)
        or (time_school_mins and time_school_mins in df.columns)
    ):
        for i in df.index:
            if currently_studying and currently_studying in df.columns:
                if not _is_yes(df.at[i, currently_studying]):
                    continue
            dist = to_num(pd.Series([df.at[i, how_far]])).iloc[0]
            if pd.isna(dist):
                continue
            th = (
                to_num(pd.Series([df.at[i, time_school_hours]])).iloc[0]
                if time_school_hours and time_school_hours in df.columns
                else 0
            )
            tm = (
                to_num(pd.Series([df.at[i, time_school_mins]])).iloc[0]
                if time_school_mins and time_school_mins in df.columns
                else 0
            )
            th = 0.0 if pd.isna(th) else float(th)
            tm = 0.0 if pd.isna(tm) else float(tm)
            mins = th * 60.0 + tm
            if mins <= 0:
                continue
            # ≥3 km but under 5 minutes, or ≤0.5 km but over 90 minutes
            far_fast = float(dist) >= 3 and mins < 5
            near_slow = float(dist) <= 0.5 and mins > 90
            if not (far_fast or near_slow):
                continue
            add_issue(
                i,
                "FLAG",
                "GL_QF_TRAVEL_TIME_DISTANCE",
                "School travel time inconsistent with distance",
                (
                    "Reported travel time to school does not match distance. "
                    "Verify how_far and time_school with the girl."
                ),
                ",".join(
                    c
                    for c in [how_far, time_school_hours, time_school_mins]
                    if c and c in df.columns
                ),
                f"how_far={float(dist)}; time_mins={mins:.0f}",
            )

    # --------------------------
    # FINAL STEP: dedupe issues per record, per field
    # --------------------------
    def _get_first_key(d: dict, keys: list[str]):
        for k in keys:
            if k in d and not is_missing(d.get(k)):
                return d.get(k)
        return None

    def _norm_field_key(x) -> str:
        if x is None:
            return ""
        return str(x).strip()

    def _sev_rank(v) -> int:
        s = str(v or "").strip().upper()
        if s == "CRITICAL":
            return 3
        if s == "FLAG":
            return 2
        if s == "ANOMALY":
            return 1
        return 0

    _record_key_keys = ["record_key", "KEY", "key", "recordid", "record_id"]
    _instance_keys = ["instance_id", "instanceID", "instanceid"]
    _field_keys = ["bad_column", "bad_col", "column", "col", "field", "bad_field"]
    _severity_keys = ["severity", "level", "issue_level", "type"]

    best_by_record_and_field: dict[tuple[str, str], dict] = {}

    for idx, issue in enumerate(issues):
        if not isinstance(issue, dict):
            continue

        rkey = _get_first_key(issue, _record_key_keys)
        ikey = _get_first_key(issue, _instance_keys)

        record_token = (
            str(rkey) if not is_missing(rkey)
            else (str(ikey) if not is_missing(ikey) else f"__noid__:{idx}")
        )

        field_raw = _get_first_key(issue, _field_keys)
        field_token = _norm_field_key(field_raw)
        if field_token == "":
            field_token = f"__nofield__:{idx}"

        sev_val = _get_first_key(issue, _severity_keys)
        sev = _sev_rank(sev_val)

        k = (record_token, field_token)

        if k not in best_by_record_and_field:
            issue["__order__"] = idx
            best_by_record_and_field[k] = issue
            continue

        cur = best_by_record_and_field[k]
        cur_sev = _sev_rank(_get_first_key(cur, _severity_keys))

        if sev > cur_sev:
            issue["__order__"] = idx
            best_by_record_and_field[k] = issue

    deduped = list(best_by_record_and_field.values())
    deduped.sort(key=lambda d: d.get("__order__", 10**18))

    for d in deduped:
        if isinstance(d, dict) and "__order__" in d:
            d.pop("__order__", None)

    return deduped
