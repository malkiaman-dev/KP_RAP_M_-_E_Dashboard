"""
High-frequency checks from partner Torghar review (HH + Girls).

Possible from current SurveyCTO exports (no text-audit media files, no backcheck file):
1. Reading-test internal consistency (word1–72 vs last_word vs incorrect)
2. Interview GPS: out of district / Mansehra, mid-survey jump, village clustering
3. Speed-warning counts and rushed consent fields (violation_list / violation_count)
4. Late-night start times and re-interview of an already-completed case
5. Impossible device years on start/end timestamps

Not possible here: question-level text-audit seconds, backcheck sibling-count comparison.
"""

from __future__ import annotations

import math
import re
from collections import defaultdict
from datetime import datetime
from typing import Any, Callable

import pandas as pd

from utils.logging import add_issue



# Approximate bounding boxes (lat_min, lat_max, lon_min, lon_max)
DISTRICT_BBOX: dict[str, tuple[float, float, float, float]] = {
    "1": (31.30, 32.60, 70.30, 71.60),  # D.I. Khan
    "2": (33.30, 33.80, 70.70, 71.40),  # Hangu
    "3": (32.20, 33.00, 70.30, 71.40),  # Lakki Marwat
    "4": (34.45, 34.85, 72.55, 73.05),  # Torghar
}
DISTRICT_LABEL = {"1": "D.I. Khan", "2": "Hangu", "3": "Lakki Marwat", "4": "Torghar"}
# Mansehra city / valley — used in the Torghar GPS finding
MANSEHRA_BBOX = (34.20, 34.50, 73.05, 73.45)

GIRLS_CONSENT_PARENT = {
    "parental_consent",
    "parental_consent_understand",
    "parenal_consent_understand",
    "parental_consent_copy",
    "parental_consent_agree",
}
GIRLS_CONSENT_CHILD = {
    "child_consent",
    "child_consent_understand",
    "child_consent_copy",
    "child_consent_agree",
}
HH_CONSENT_FATHER = {
    "understand_consent_father",
    "copy_consent_father",
    "agree_consent_father",
}
HH_CONSENT_MOTHER = {
    "understand_consent_mother",
    "copy_consent_mother",
    "agree_consent_mother",
}
HH_CONSENT_CAREGIVER = {
    "understand_consent_caregiver",
    "copy_consent_caregiver",
    "agree_consent_caregiver",
}

WORD_CORRECT = 1
WORD_INCORRECT = 2
WORD_NO_ATTEMPT = 3
N_STORY_WORDS = 72

MetaFn = Callable[[Any], dict]


def _clip(val: Any, n: int = 220) -> str:
    s = "" if val is None or (isinstance(val, float) and pd.isna(val)) else str(val)
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[: n - 3].rstrip() + "..."


def _norm(val: Any) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return ""
    return re.sub(r"\s+", " ", str(val).strip().lower())


def _to_num(val: Any) -> float | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return float(val)
    except Exception:
        s = str(val).strip()
        if not s or s.lower() in {"nan", "none", "na", "n/a"}:
            return None
        try:
            return float(s)
        except Exception:
            return None


def _resp_code(val: Any) -> str:
    n = _to_num(val)
    if n is not None:
        return str(int(round(n)))
    return _norm(val)


def _district_code(val: Any) -> str:
    s = _norm(val)
    if s in DISTRICT_BBOX:
        return s
    n = _to_num(s)
    if n is not None and str(int(round(n))) in DISTRICT_BBOX:
        return str(int(round(n)))
    for code, label in DISTRICT_LABEL.items():
        if s == _norm(label) or label.lower().split()[0] in s:
            return code
    return s


def _in_bbox(lat: float, lon: float, box: tuple[float, float, float, float]) -> bool:
    return box[0] <= lat <= box[1] and box[2] <= lon <= box[3]


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(min(1.0, a)))


def _parse_dt(val: Any) -> datetime | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    if not s or s.lower() in {"nan", "none"}:
        return None
    fmts = (
        "%b %d, %Y %I:%M:%S %p",
        "%b %d, %Y %I:%M %p",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d-%m-%y %H:%M",
        "%d-%m-%Y %H:%M",
    )
    for fmt in fmts:
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            pass
    try:
        dt = pd.to_datetime(s, errors="coerce", dayfirst=True)
        if pd.isna(dt):
            return None
        return dt.to_pydatetime()
    except Exception:
        return None


def _emit(
    issues: list[dict],
    survey: str,
    i: Any,
    meta_fn: MetaFn,
    severity: str,
    rule_id: str,
    title: str,
    cause: str,
    field: str,
    value: Any,
) -> None:
    m = meta_fn(i) if meta_fn else {}
    add_issue(
        issues,
        survey=survey,
        severity=severity,
        rule_id=rule_id,
        title=title,
        cause=cause,
        field=field,
        value=_clip(value),
        record_key=m.get("record_key"),
        instance_id=m.get("instance_id"),
        enumerator=m.get("enumerator"),
        enumerator_id=m.get("enumerator_id"),
        deviceid=m.get("deviceid"),
        submission_date=m.get("submission_date"),
        district=m.get("district"),
    )


def _violation_leaves(raw: Any) -> set[str]:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return set()
    out: set[str] = set()
    for part in str(raw).split(","):
        t = part.strip()
        if not t:
            continue
        leaf = t.split("/")[-1]
        leaf = leaf.split("[")[0].strip().lower()
        if leaf:
            out.add(leaf)
    return out


def _geo_point_pairs(df: pd.DataFrame) -> list[tuple[str, str, str | None]]:
    """Return (lat_col, lon_col, acc_col) for auto-captured interview GPS."""
    pairs: list[tuple[str, str, str | None]] = []
    seen: set[str] = set()
    for c in df.columns:
        m = re.fullmatch(r"(geo_location\d+)-Latitude", str(c), flags=re.I)
        if not m:
            continue
        prefix = m.group(1)
        lat_c = c
        lon_c = None
        acc_c = None
        for cand in (f"{prefix}-Longitude", f"{prefix}-longitude"):
            if cand in df.columns:
                lon_c = cand
                break
        for cand in (f"{prefix}-Accuracy", f"{prefix}-accuracy"):
            if cand in df.columns:
                acc_c = cand
                break
        if lon_c and lat_c not in seen:
            pairs.append((lat_c, lon_c, acc_c))
            seen.add(lat_c)
    pairs.sort(key=lambda t: t[0])
    return pairs


def _row_geo_points(
    row: pd.Series, pairs: list[tuple[str, str, str | None]]
) -> list[dict[str, Any]]:
    pts: list[dict[str, Any]] = []
    for lat_c, lon_c, acc_c in pairs:
        lat = _to_num(row.get(lat_c))
        lon = _to_num(row.get(lon_c))
        if lat is None or lon is None:
            continue
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue
        acc = _to_num(row.get(acc_c)) if acc_c else None
        pts.append({"lat": lat, "lon": lon, "acc": acc, "lat_col": lat_c, "lon_col": lon_c})
    return pts


def run_reading_test(df: pd.DataFrame, col: dict, meta_fn: MetaFn) -> list[dict]:
    """Girls learning assessment: marked words, last_word, and incorrect must agree."""
    issues: list[dict] = []
    n_words = int(col.get("reading_n_words", N_STORY_WORDS) or N_STORY_WORDS)
    word_cols = [f"word{k}" for k in range(1, n_words + 1) if f"word{k}" in df.columns]
    if len(word_cols) < 10 or "last_word" not in df.columns:
        return issues

    for i in df.index:
        marks: list[int | None] = []
        for k in range(1, n_words + 1):
            c = f"word{k}"
            if c not in df.columns:
                marks.append(None)
                continue
            n = _to_num(df.at[i, c])
            marks.append(int(round(n)) if n is not None else None)

        last = _to_num(df.at[i, "last_word"]) if "last_word" in df.columns else None
        inc_field = _to_num(df.at[i, "incorrect"]) if "incorrect" in df.columns else None

        n_inc = sum(1 for m in marks if m == WORD_INCORRECT)
        n_corr = sum(1 for m in marks if m == WORD_CORRECT)
        attempted = [k for k, m in enumerate(marks, 1) if m in (WORD_CORRECT, WORD_INCORRECT)]
        problems: list[str] = []

        if inc_field is not None and n_inc != int(round(inc_field)):
            problems.append(
                f"incorrect field={int(round(inc_field))} but {n_inc} word(s) marked Incorrect"
            )

        if last is not None:
            lw = int(round(last))
            if lw <= 0 and (n_corr + n_inc) > 0:
                problems.append(
                    f"last_word={lw} but {n_corr + n_inc} word(s) are marked Correct/Incorrect "
                    "(test looks marked without being administered)"
                )
            elif 1 <= lw <= n_words:
                after = [k for k in attempted if k > lw]
                if after:
                    problems.append(
                        f"{len(after)} word(s) marked after last_word={lw} "
                        f"(highest marked={max(attempted) if attempted else 0})"
                    )
                mark_at = marks[lw - 1]
                if mark_at == WORD_NO_ATTEMPT:
                    problems.append(f"last_word={lw} is marked No attempt")
            elif lw > n_words:
                problems.append(f"last_word={lw} is above the {n_words}-word story")

        if not problems:
            continue

        fields = ",".join([*word_cols[:3], "last_word", "incorrect"] if "incorrect" in df.columns else [*word_cols[:3], "last_word"])
        _emit(
            issues,
            "Girls",
            i,
            meta_fn,
            "CRITICAL",
            "GL_CE_READING_INCONSISTENT",
            "Reading test contradicts itself",
            (
                "The 72 story-word marks, last_word, and incorrect total must describe the same event. "
                + "; ".join(problems)
                + "."
            ),
            fields,
            f"last_word={'' if last is None else int(round(last))}; incorrect={'' if inc_field is None else int(round(inc_field))}; marked_correct={n_corr}; marked_incorrect={n_inc}",
        )
    return issues


def run_gps_checks(df: pd.DataFrame, col: dict, meta_fn: MetaFn, survey: str) -> list[dict]:
    issues: list[dict] = []
    pairs = _geo_point_pairs(df)
    if not pairs:
        return issues

    jump_m = float(col.get("gps_jump_meters", 2000) or 2000)
    acc_max = float(col.get("gps_accuracy_max_meters", 100) or 100)
    cluster_dec = int(col.get("gps_cluster_decimals", 3) or 3)
    cluster_min = int(col.get("gps_cluster_min_villages", 5) or 5)
    village_col = "village_label" if "village_label" in df.columns else ("village" if "village" in df.columns else None)
    district_col = "district" if "district" in df.columns else None

    cr = "HH_CR" if survey == "Household" else "GL_CE"
    qf = "HH_QF" if survey == "Household" else "GL_QF"

    first_pts: dict[Any, dict[str, Any]] = {}
    for i in df.index:
        pts = _row_geo_points(df.loc[i], pairs)
        if not pts:
            continue
        first_pts[i] = pts[0]
        dcode = _district_code(df.at[i, district_col]) if district_col else ""
        box = DISTRICT_BBOX.get(dcode)
        usable = [p for p in pts if p["acc"] is None or p["acc"] <= acc_max]
        if not usable:
            usable = pts

        # Out of assigned district / in Mansehra
        out_pts = []
        man_pts = []
        if box:
            for p in usable:
                if not _in_bbox(p["lat"], p["lon"], box):
                    out_pts.append(p)
                if _in_bbox(p["lat"], p["lon"], MANSEHRA_BBOX):
                    man_pts.append(p)
        if out_pts:
            p0 = man_pts[0] if man_pts else out_pts[0]
            where = "Mansehra district" if man_pts else "outside the assigned district bounding box"
            dlab = DISTRICT_LABEL.get(dcode, dcode or "unknown")
            _emit(
                issues,
                survey,
                i,
                meta_fn,
                "CRITICAL",
                f"{cr}_GPS_OUT_OF_DISTRICT",
                "GPS is outside the assigned district",
                (
                    f"Interview GPS ({p0['lat']:.5f}, {p0['lon']:.5f}) is in {where} "
                    f"while the form is recorded as {dlab}. "
                    "Accuracy is typically a few metres — verify the interview location or form re-entry."
                ),
                f"{p0['lat_col']},{p0['lon_col']}",
                f"lat={p0['lat']:.6f}; lon={p0['lon']:.6f}; acc={p0['acc']}; district={dlab}",
            )

        # Mid-survey jump
        if len(usable) >= 2:
            a, b = usable[0], usable[-1]
            dist = _haversine_m(a["lat"], a["lon"], b["lat"], b["lon"])
            if dist >= jump_m:
                _emit(
                    issues,
                    survey,
                    i,
                    meta_fn,
                    "CRITICAL",
                    f"{cr}_GPS_JUMP",
                    "GPS jumped between interview captures",
                    (
                        f"Auto-captured GPS moved {dist / 1000.0:.1f} km during the same interview "
                        f"(from {a['lat']:.5f},{a['lon']:.5f} to {b['lat']:.5f},{b['lon']:.5f}). "
                        "The form should stay in one location."
                    ),
                    f"{a['lat_col']},{a['lon_col']},{b['lat_col']},{b['lon_col']}",
                    f"jump_m={dist:.0f}; n_points={len(usable)}",
                )

    # Same GPS cell, many village names
    if village_col and first_pts:
        cells: dict[tuple[float, float], list[Any]] = defaultdict(list)
        villages: dict[tuple[float, float], set[str]] = defaultdict(set)
        for i, p in first_pts.items():
            key = (round(p["lat"], cluster_dec), round(p["lon"], cluster_dec))
            cells[key].append(i)
            v = str(df.at[i, village_col]).strip() if pd.notna(df.at[i, village_col]) else ""
            if v and v.lower() not in {"nan", "none"}:
                villages[key].add(v)
        for key, idxs in cells.items():
            vset = villages.get(key, set())
            if len(vset) < cluster_min:
                continue
            sample = ", ".join(sorted(vset)[:8])
            extra = f" (+{len(vset) - 8} more)" if len(vset) > 8 else ""
            for i in idxs:
                p = first_pts[i]
                _emit(
                    issues,
                    survey,
                    i,
                    meta_fn,
                    "FLAG",
                    f"{qf}_GPS_VILLAGE_CLUSTER",
                    "Same GPS point recorded under many village names",
                    (
                        f"{len(vset)} different village names share interview GPS near "
                        f"{key[0]}, {key[1]} (~100 m cell). Sample: {sample}{extra}. "
                        "Verify geotag vs selected village."
                    ),
                    f"{p['lat_col']},{p['lon_col']},{village_col}",
                    f"lat={p['lat']:.6f}; lon={p['lon']:.6f}; n_villages={len(vset)}",
                )

    return issues


def run_speed_checks(df: pd.DataFrame, col: dict, meta_fn: MetaFn, survey: str) -> list[dict]:
    issues: list[dict] = []
    if "violation_list" not in df.columns and "violation_count" not in df.columns:
        return issues

    default_thr = 120 if survey == "Household" else 45
    thr = float(col.get("speed_warning_flag_threshold", default_thr) or default_thr)
    prefix_qf = "HH_QF" if survey == "Household" else "GL_QF"
    consent_field = "violation_list" if "violation_list" in df.columns else "violation_count"

    for i in df.index:
        leaves = _violation_leaves(df.at[i, "violation_list"]) if "violation_list" in df.columns else set()
        vc = _to_num(df.at[i, "violation_count"]) if "violation_count" in df.columns else None

        consent_hit = False
        if survey == "Girls":
            parent_n = len(leaves & GIRLS_CONSENT_PARENT)
            child_n = len(leaves & GIRLS_CONSENT_CHILD)
            # Both scripts appear, and several consent screens were speed-flagged
            if parent_n >= 1 and child_n >= 1 and (parent_n + child_n) >= 4:
                consent_hit = True
                _emit(
                    issues,
                    survey,
                    i,
                    meta_fn,
                    "CRITICAL",
                    f"{prefix_qf}_CONSENT_SPEED",
                    "Consent screens were tapped through",
                    (
                        "SurveyCTO speed warnings fired on both parental and child consent fields. "
                        "A recorded consent value is not evidence that the procedure was carried out. "
                        "This is an integrity finding (Track 2), not a routine timing flag. "
                        "Read consent aloud — do not tap through."
                    ),
                    consent_field,
                    f"parent_consent_fields={parent_n}; child_consent_fields={child_n}; violation_count={'' if vc is None else int(vc)}",
                )
        else:
            resp = _resp_code(df.at[i, "respondent"]) if "respondent" in df.columns else ""
            if resp == "1":
                group = HH_CONSENT_FATHER
                label = "father"
            elif resp == "2":
                group = HH_CONSENT_MOTHER
                label = "mother"
            else:
                group = HH_CONSENT_FATHER | HH_CONSENT_MOTHER | HH_CONSENT_CAREGIVER
                label = "parent/caregiver"
            hit = leaves & group
            understand_agree = any("understand" in x for x in hit) and any("agree" in x for x in hit)
            if understand_agree:
                consent_hit = True
                _emit(
                    issues,
                    survey,
                    i,
                    meta_fn,
                    "CRITICAL",
                    f"{prefix_qf}_CONSENT_SPEED",
                    "Consent screens were tapped through",
                    (
                        f"SurveyCTO speed warnings fired on {label} understand and agree consent fields. "
                        "A recorded consent value is not evidence that the procedure was carried out. "
                        "This is an integrity finding (Track 2). The consent script must be read aloud."
                    ),
                    consent_field,
                    f"consent_fields={','.join(sorted(hit))}; violation_count={'' if vc is None else int(vc)}",
                )

        if consent_hit:
            continue
        if vc is None or vc < thr:
            continue
        _emit(
            issues,
            survey,
            i,
            meta_fn,
            "FLAG",
            f"{prefix_qf}_SPEED_WARNINGS",
            "High number of SurveyCTO speed warnings",
            (
                f"This interview has {int(vc)} speed warnings (threshold {int(thr)}). "
                "Many questions were on screen for under about two seconds. Slow down and read items fully."
            ),
            "violation_count",
            f"violation_count={int(vc)}",
        )
    return issues


def run_timestamp_checks(df: pd.DataFrame, col: dict, meta_fn: MetaFn, survey: str) -> list[dict]:
    issues: list[dict] = []
    start_col = "starttime" if "starttime" in df.columns else None
    end_col = "endtime" if "endtime" in df.columns else None
    year_min = int(col.get("expected_year_min", 2025) or 2025)
    year_max = int(col.get("expected_year_max", 2027) or 2027)
    raw_hours = col.get("late_night_hours", [21, 22, 23, 0, 1, 2, 3, 4])
    if isinstance(raw_hours, str):
        night_hours = {int(x) for x in re.findall(r"\d+", raw_hours)}
    else:
        night_hours = {int(x) for x in (raw_hours or [21, 22, 23, 0, 1, 2, 3, 4])}

    prefix_qf = "HH_QF" if survey == "Household" else "GL_QF"

    for i in df.index:
        st = _parse_dt(df.at[i, start_col]) if start_col else None
        et = _parse_dt(df.at[i, end_col]) if end_col else None

        bad_years = []
        if st and not (year_min <= st.year <= year_max):
            bad_years.append(f"starttime={st.year}")
        if et and not (year_min <= et.year <= year_max):
            bad_years.append(f"endtime={et.year}")
        if bad_years:
            _emit(
                issues,
                survey,
                i,
                meta_fn,
                "FLAG",
                f"{prefix_qf}_TIMESTAMP_YEAR",
                "Interview timestamp has an impossible year",
                (
                    f"Device start/end year is not in {year_min}–{year_max} ({', '.join(bad_years)}). "
                    "Check tablet date/time before interviewing."
                ),
                ",".join(c for c in [start_col, end_col] if c),
                "; ".join(bad_years),
            )

        if st and st.hour in night_hours:
            _emit(
                issues,
                survey,
                i,
                meta_fn,
                "FLAG",
                f"{prefix_qf}_LATE_NIGHT",
                "Interview started late at night",
                (
                    f"starttime is {st.strftime('%Y-%m-%d %H:%M')} (hour {st.hour:02d}). "
                    "Night interviews were not agreed as a field method — verify whether this was a phone/re-entry case."
                ),
                start_col or "starttime",
                st.strftime("%Y-%m-%d %H:%M"),
            )
    return issues


def run_reinterview_checks(df: pd.DataFrame, col: dict, meta_fn: MetaFn, survey: str) -> list[dict]:
    """Second enumerator / late-night redo of an already-interviewed girl (+ respondent for HH)."""
    issues: list[dict] = []
    gid_col = "girl" if "girl" in df.columns else None
    if not gid_col:
        return issues
    resp_col = "respondent" if (survey == "Household" and "respondent" in df.columns) else None
    enum_col = "enumerator_id" if "enumerator_id" in df.columns else ("enumerator" if "enumerator" in df.columns else None)
    start_col = "starttime" if "starttime" in df.columns else None
    sub_col = "SubmissionDate" if "SubmissionDate" in df.columns else None
    key_col = "KEY" if "KEY" in df.columns else None

    raw_hours = col.get("late_night_hours", [21, 22, 23, 0, 1, 2, 3, 4])
    if isinstance(raw_hours, str):
        night_hours = {int(x) for x in re.findall(r"\d+", raw_hours)}
    else:
        night_hours = {int(x) for x in (raw_hours or [21, 22, 23, 0, 1, 2, 3, 4])}

    prefix_cr = "HH_CR" if survey == "Household" else "GL_CE"
    prefix_qf = "HH_QF" if survey == "Household" else "GL_QF"

    groups: dict[tuple[str, str], list[Any]] = defaultdict(list)
    for i in df.index:
        gid = _norm(df.at[i, gid_col])
        if not gid:
            continue
        resp = _resp_code(df.at[i, resp_col]) if resp_col else ""
        groups[(gid, resp)].append(i)

    for (gid, resp), idxs in groups.items():
        if len(idxs) < 2:
            continue

        def _sort_key(i: Any) -> datetime:
            dt = _parse_dt(df.at[i, start_col]) if start_col else None
            if dt is None and sub_col:
                dt = _parse_dt(df.at[i, sub_col])
            return dt or datetime.min

        ordered = sorted(idxs, key=_sort_key)
        enums = []
        for i in ordered:
            e = _norm(df.at[i, enum_col]) if enum_col else ""
            enums.append(e)
        uniq_enums = {e for e in enums if e}

        if len(uniq_enums) >= 2:
            who = f"girl={gid}" + (f"; respondent={resp}" if resp else "")
            for i in ordered:
                keep = ordered[-1]
                keep_key = df.at[keep, key_col] if key_col else ""
                _emit(
                    issues,
                    survey,
                    i,
                    meta_fn,
                    "CRITICAL",
                    f"{prefix_cr}_REENUM_COMPLETED",
                    "Different enumerator re-interviewed a completed case",
                    (
                        "This girl already has a household/girls interview from another enumerator. "
                        "Do not re-enter a completed case (including by phone) unless a supervisor "
                        f"approved a correction. Retain latest KEY={keep_key} after review."
                    ),
                    ",".join(c for c in [gid_col, resp_col, enum_col] if c),
                    f"{who}; enumerators={','.join(sorted(uniq_enums))}",
                )
            continue

        first_dt = _sort_key(ordered[0])
        for i in ordered[1:]:
            st = _parse_dt(df.at[i, start_col]) if start_col else None
            if st is None or st.hour not in night_hours:
                continue
            if first_dt == datetime.min:
                continue
            _emit(
                issues,
                survey,
                i,
                meta_fn,
                "CRITICAL",
                f"{prefix_cr}_LATE_REINTERVIEW",
                "Late-night re-interview of an already completed case",
                (
                    f"A later interview for this girl started at {st.strftime('%Y-%m-%d %H:%M')}, "
                    "after an earlier completed submission. Re-entry of a completed case is an "
                    "integrity finding (Track 2). The case should stay locked on the server "
                    "unless PIU/IE approved a re-open. Inform the World Bank team with details."
                ),
                ",".join(c for c in [gid_col, resp_col, start_col] if c),
                f"girl={gid}; start={st.strftime('%Y-%m-%d %H:%M')}",
            )
    return issues


def run_missing_and_village_gps(df: pd.DataFrame, col: dict, meta_fn: MetaFn, survey: str) -> list[dict]:
    """Tablet location off, and points far from other interviews in the same village."""
    issues: list[dict] = []
    pairs = _geo_point_pairs(df)
    cr = "HH_CR" if survey == "Household" else "GL_CE"
    qf = "HH_QF" if survey == "Household" else "GL_QF"
    village_col = "village_label" if "village_label" in df.columns else ("village" if "village" in df.columns else None)
    outlier_m = float(col.get("gps_village_outlier_meters", 2000) or 2000)

    first_pts: dict[Any, dict[str, Any]] = {}
    for i in df.index:
        pts = _row_geo_points(df.loc[i], pairs) if pairs else []
        if not pts:
            _emit(
                issues,
                survey,
                i,
                meta_fn,
                "FLAG",
                f"{qf}_GPS_MISSING",
                "Interview GPS missing (tablet location likely off)",
                (
                    "No auto-captured GPS point is stored on this form. "
                    "Every enumerator must keep tablet location on. Restate this in the debrief call."
                ),
                pairs[0][0] if pairs else "geo_location1-Latitude",
                "gps_missing=1",
            )
            continue
        first_pts[i] = pts[0]

    if not village_col or not first_pts:
        return issues

    by_vil: dict[str, list[Any]] = defaultdict(list)
    for i, p in first_pts.items():
        v = str(df.at[i, village_col]).strip() if pd.notna(df.at[i, village_col]) else ""
        if v and v.lower() not in {"nan", "none"}:
            by_vil[v].append(i)

    for v, idxs in by_vil.items():
        if len(idxs) < 4:
            continue
        lats = [first_pts[i]["lat"] for i in idxs]
        lons = [first_pts[i]["lon"] for i in idxs]
        med_lat = float(pd.Series(lats).median())
        med_lon = float(pd.Series(lons).median())
        for i in idxs:
            p = first_pts[i]
            dist = _haversine_m(p["lat"], p["lon"], med_lat, med_lon)
            if dist < outlier_m:
                continue
            _emit(
                issues,
                survey,
                i,
                meta_fn,
                "CRITICAL",
                f"{cr}_GPS_REMOTE_FROM_VILLAGE",
                "GPS is far from other interviews in this village",
                (
                    f"This point is {dist / 1000.0:.1f} km from the median of other interviews "
                    f"in '{v}'. That is a proxy for a remote or wrong location. "
                    "Resurvey if the location is not the assigned village."
                ),
                f"{p['lat_col']},{p['lon_col']},{village_col}",
                f"lat={p['lat']:.6f}; lon={p['lon']:.6f}; dist_m={dist:.0f}; village={v}",
            )
    return issues


def run_household_high_frequency(df: pd.DataFrame, col: dict, meta_fn: MetaFn) -> list[dict]:
    issues: list[dict] = []
    issues.extend(run_gps_checks(df, col, meta_fn, "Household"))
    issues.extend(run_missing_and_village_gps(df, col, meta_fn, "Household"))
    issues.extend(run_speed_checks(df, col, meta_fn, "Household"))
    issues.extend(run_timestamp_checks(df, col, meta_fn, "Household"))
    issues.extend(run_reinterview_checks(df, col, meta_fn, "Household"))
    return issues


def run_girls_high_frequency(df: pd.DataFrame, col: dict, meta_fn: MetaFn) -> list[dict]:
    issues: list[dict] = []
    issues.extend(run_reading_test(df, col, meta_fn))
    issues.extend(run_gps_checks(df, col, meta_fn, "Girls"))
    issues.extend(run_missing_and_village_gps(df, col, meta_fn, "Girls"))
    issues.extend(run_speed_checks(df, col, meta_fn, "Girls"))
    issues.extend(run_timestamp_checks(df, col, meta_fn, "Girls"))
    issues.extend(run_reinterview_checks(df, col, meta_fn, "Girls"))
    return issues
