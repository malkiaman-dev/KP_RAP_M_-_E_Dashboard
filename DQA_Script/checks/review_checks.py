"""
Checks added from World Bank / PIU comments on the QA workplan.

Implementable from current SurveyCTO exports. Not possible here (no server
control, no shapefiles, no downloaded text-audit CSVs, no image pixels):
server lock, admin-boundary GIS, module-level text-audit seconds, photo
content (blank vs real page), telephonic-mode field, joint sign-off.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable

import pandas as pd

from checks.high_frequency import (
    _emit,
    _geo_point_pairs,
    _haversine_m,
    _row_geo_points,
    _to_num,
)
from checks.protocol_extras import _digits_phone, _is_blank, _is_dummy_phone, _norm_name
from utils.logging import add_issue


MetaFn = Callable[[Any], dict]

DK_TEXT = {
    "dk",
    "d.k",
    "d/k",
    "don't know",
    "dont know",
    "do not know",
    "refuse",
    "refused",
    "refusal",
    "n/a",
    "na",
    "not applicable",
}
DK_CODES = {"89", "97", "98", "99", "888", "999", "-99", "-88", "-77"}
SKIP_COL_BITS = (
    "key",
    "instance",
    "uuid",
    "device",
    "duration",
    "starttime",
    "endtime",
    "submission",
    "enumerator",
    "latitude",
    "longitude",
    "altitude",
    "accuracy",
    "text_audit",
    "audio",
    "photo",
    "mapsurl",
    "formdef",
)


def _is_dk_value(val: Any) -> bool:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return False
    if isinstance(val, bool):
        return False
    s = str(val).strip().lower()
    if not s or s in {"nan", "none", ""}:
        return False
    if s in DK_TEXT:
        return True
    n = _to_num(val)
    if n is not None and n == int(n) and str(int(n)) in DK_CODES:
        return True
    if s in DK_CODES:
        return True
    return False


def _skip_col(name: str) -> bool:
    n = str(name).strip().lower()
    if n.startswith("geo_location") or n.startswith("gps"):
        return True
    return any(bit in n for bit in SKIP_COL_BITS)


def _edu_spend_total(row: pd.Series, slot: int) -> float | None:
    parts = [
        f"admission_fees_{slot}",
        f"uniform_{slot}",
        f"books_{slot}",
        f"transportation_{slot}",
        f"examination_fee_{slot}",
        f"other_{slot}",
    ]
    total = 0.0
    any_val = False
    for c in parts:
        if c not in row.index:
            continue
        n = _to_num(row.get(c))
        if n is None:
            continue
        if str(int(n)) in DK_CODES if n == int(n) else False:
            continue
        if n < 0:
            continue
        total += float(n)
        any_val = True
    return total if any_val else None


def run_household_review(df: pd.DataFrame, col: dict, meta_fn: MetaFn) -> list[dict]:
    issues: list[dict] = []
    sibling_max = int(col.get("sibling_roster_max", 11) or 11)
    small_thr = float(col.get("small_household_threshold", 2) or 2)
    edu_iqr = float(col.get("edu_spend_iqr_mult", 3) or 3)
    phone_col = "phonenumber" if "phonenumber" in df.columns else None
    phone1_col = "phonenumber1" if "phonenumber1" in df.columns else None
    girlname_col = "girlname_label" if "girlname_label" in df.columns else None

    # Extremely small household: use siblings roster / num_siblings.
    # The HH presence roster (name_1..) is often only 1-2 people and is not household size.
    for i in df.index:
        num_sib = _to_num(df.at[i, "num_siblings"]) if "num_siblings" in df.columns else None
        sib_n = 0
        for k in range(1, sibling_max + 1):
            c = f"name_sibling_{k}"
            if c in df.columns and not _is_blank(df.at[i, c]):
                sib_n += 1
        size_proxy = num_sib if num_sib is not None else (float(sib_n) if sib_n else None)
        if size_proxy is not None and 0 < size_proxy <= small_thr:
            _emit(
                issues,
                "Household",
                i,
                meta_fn,
                "FLAG",
                "HH_QF_SMALL_HOUSEHOLD",
                "Extremely small household",
                (
                    f"Only {int(size_proxy)} sibling(s) are listed (threshold {int(small_thr)}). "
                    "Verify that household members were not omitted."
                ),
                "num_siblings,name_sibling_1",
                f"num_siblings={'' if num_sib is None else int(num_sib)}; roster_siblings={sib_n}",
            )

        if phone_col:
            ph = df.at[i, phone_col]
            if not _is_blank(ph) and _is_dummy_phone(ph):
                _emit(
                    issues,
                    "Household",
                    i,
                    meta_fn,
                    "FLAG",
                    "HH_QF_DUMMY_PRIMARY_PHONE",
                    "Dummy primary phone number",
                    f"Primary contact number looks like a dummy placeholder ({_digits_phone(ph)}).",
                    phone_col,
                    f"phonenumber={_digits_phone(ph)}",
                )
        if phone1_col:
            ph = df.at[i, phone1_col]
            if not _is_blank(ph) and _is_dummy_phone(ph):
                _emit(
                    issues,
                    "Household",
                    i,
                    meta_fn,
                    "FLAG",
                    "HH_QF_DUMMY_PRIMARY_PHONE_2",
                    "Dummy primary phone number (confirmation)",
                    f"Confirmed primary number looks like a dummy placeholder ({_digits_phone(ph)}).",
                    phone1_col,
                    f"phonenumber1={_digits_phone(ph)}",
                )

        # Listed girl spelling must match girl_label
        if girlname_col:
            label = _norm_name(df.at[i, girlname_col])
            listed_k = None
            for k in range(1, sibling_max + 1):
                flag_c = f"listed_girl_{k}"
                if flag_c in df.columns and _to_num(df.at[i, flag_c]) == 1:
                    listed_k = k
                    break
            if listed_k is None and "listed_girl_index" in df.columns:
                idx = _to_num(df.at[i, "listed_girl_index"])
                if idx is not None and idx >= 1:
                    listed_k = int(idx)
            if listed_k and label:
                name_c = f"name_sibling_{listed_k}"
                if name_c in df.columns:
                    roster_nm = _norm_name(df.at[i, name_c])
                    if roster_nm and roster_nm != label:
                        _emit(
                            issues,
                            "Household",
                            i,
                            meta_fn,
                            "FLAG",
                            "HH_QF_LISTED_GIRL_SPELLING",
                            "Listed-girl spelling does not match girl_label",
                            (
                                "The listed girl's name on the siblings roster must match girl_label "
                                "for matching. "
                                f"roster='{roster_nm}'; girl_label='{label}'."
                            ),
                            f"{name_c},{girlname_col}",
                            f"roster={roster_nm}; girl_label={label}",
                        )

    # Education expenditure outliers (IQR on per-sibling totals)
    spend_vals: list[float] = []
    spend_rows: list[tuple[Any, int, float]] = []
    for i in df.index:
        for slot in range(1, sibling_max + 1):
            tot = _edu_spend_total(df.loc[i], slot)
            if tot is None:
                continue
            spend_vals.append(tot)
            spend_rows.append((i, slot, tot))
    if spend_vals:
        s = pd.Series(spend_vals)
        q1, q3 = float(s.quantile(0.25)), float(s.quantile(0.75))
        iqr = max(q3 - q1, 1.0)
        cap = q3 + edu_iqr * iqr
        cap = max(cap, 20000.0)
        for i, slot, tot in spend_rows:
            if tot <= cap:
                continue
            _emit(
                issues,
                "Household",
                i,
                meta_fn,
                "FLAG",
                "HH_QF_EDU_SPEND_OUTLIER",
                "Education expenditure outlier",
                (
                    f"Education spend for sibling slot {slot} is {tot:.0f} PKR "
                    f"(outlier threshold {cap:.0f} PKR). Verify with the household."
                ),
                f"admission_fees_{slot},uniform_{slot},books_{slot},transportation_{slot},examination_fee_{slot}",
                f"slot={slot}; total_pkr={tot:.0f}",
            )

    issues.extend(_enumerator_dk_refuse(df, col, meta_fn, "Household"))
    return issues


def run_girls_review(df: pd.DataFrame, col: dict, meta_fn: MetaFn) -> list[dict]:
    issues: list[dict] = []
    issues.extend(_enumerator_dk_refuse(df, col, meta_fn, "Girls"))
    issues.extend(_reading_photo_missing(df, col, meta_fn))
    issues.extend(_enumerator_reading_distribution(df, col, meta_fn))
    phone_col = next((c for c in ("phonenumber", "contactnumber", "girl_contact") if c in df.columns), None)
    if phone_col:
        for i in df.index:
            ph = df.at[i, phone_col]
            if not _is_blank(ph) and _is_dummy_phone(ph):
                _emit(
                    issues,
                    "Girls",
                    i,
                    meta_fn,
                    "FLAG",
                    "GL_QF_DUMMY_PRIMARY_PHONE",
                    "Dummy primary phone number",
                    f"Primary contact number looks like a dummy placeholder ({_digits_phone(ph)}).",
                    phone_col,
                    f"{phone_col}={_digits_phone(ph)}",
                )
    return issues


def _enumerator_dk_refuse(df: pd.DataFrame, col: dict, meta_fn: MetaFn, survey: str) -> list[dict]:
    issues: list[dict] = []
    enum_col = "enumerator_id" if "enumerator_id" in df.columns else ("enumerator" if "enumerator" in df.columns else None)
    if not enum_col:
        return issues
    min_n = int(col.get("dk_refuse_min_interviews", 5) or 5)
    mult = float(col.get("dk_refuse_rate_multiplier", 3) or 3)
    prefix = "HH_QF" if survey == "Household" else "GL_QF"

    usable = [c for c in df.columns if not _skip_col(c)]
    # Multi-select DK ticks: column name ends with _98 / _99 / _888 / _999 and value is 1
    ms_dk_cols = [
        c
        for c in df.columns
        if str(c).endswith(("_98", "_99", "_888", "_999", "_89"))
    ]

    per_enum: dict[str, list[tuple[Any, int]]] = defaultdict(list)
    for i in df.index:
        e = str(df.at[i, enum_col]).strip() if pd.notna(df.at[i, enum_col]) else ""
        if not e or e.lower() in {"nan", "none"}:
            continue
        hits = 0
        for c in usable:
            if _is_dk_value(df.at[i, c]):
                hits += 1
        for c in ms_dk_cols:
            n = _to_num(df.at[i, c])
            if n == 1:
                hits += 1
        per_enum[e].append((i, hits))

    rates = []
    for e, rows in per_enum.items():
        if len(rows) < min_n:
            continue
        rates.append(sum(h for _, h in rows) / max(len(rows), 1))
    if not rates:
        return issues
    median_rate = float(pd.Series(rates).median())
    thr = max(median_rate * mult, median_rate + 2.0)
    if thr <= 0:
        thr = 5.0

    for e, rows in per_enum.items():
        if len(rows) < min_n:
            continue
        avg = sum(h for _, h in rows) / len(rows)
        if avg < thr:
            continue
        worst_i, worst_hits = max(rows, key=lambda t: t[1])
        _emit(
            issues,
            survey,
            worst_i,
            meta_fn,
            "FLAG",
            f"{prefix}_HIGH_DK_REFUSE",
            "High don’t-know / refuse use by enumerator",
            (
                f"Enumerator {e} records don’t-know/refuse at {avg:.1f} fields per interview "
                f"(team median {median_rate:.1f}; threshold {thr:.1f}, n={len(rows)}). "
                "Verify whether questions are being asked."
            ),
            enum_col,
            f"enumerator={e}; avg_dk={avg:.1f}; this_row={worst_hits}",
        )
    return issues


def _reading_administered(row: pd.Series) -> bool:
    last = _to_num(row.get("last_word")) if "last_word" in row.index else None
    if last is not None and last > 0:
        return True
    n_marked = 0
    for k in range(1, 73):
        c = f"word{k}"
        if c not in row.index:
            break
        n = _to_num(row.get(c))
        if n in (1, 2):
            n_marked += 1
        if n_marked >= 3:
            return True
    return False


def _photo_present(val: Any) -> bool:
    if _is_blank(val):
        return False
    s = str(val).strip().lower()
    if s in {"nan", "none", "null"}:
        return False
    return "http" in s or s.endswith((".jpg", ".jpeg", ".png")) or len(s) > 8


def _reading_photo_missing(df: pd.DataFrame, col: dict, meta_fn: MetaFn) -> list[dict]:
    issues: list[dict] = []
    front = "front_photo" if "front_photo" in df.columns else None
    back = "back_photo" if "back_photo" in df.columns else None
    if not front and not back:
        return issues
    for i in df.index:
        if not _reading_administered(df.loc[i]):
            continue
        f_ok = _photo_present(df.at[i, front]) if front else False
        b_ok = _photo_present(df.at[i, back]) if back else False
        if f_ok or b_ok:
            continue
        _emit(
            issues,
            "Girls",
            i,
            meta_fn,
            "CRITICAL",
            "GL_CE_TEST_PHOTO_MISSING",
            "Learning-test photograph missing",
            (
                "The reading/math test was recorded, but the completed paper test photograph "
                "was not uploaded (front_photo/back_photo blank). Photograph the paper and "
                "upload it with the form. Daily QA must confirm the image is a real test page, "
                "not blank. Resurvey if the test was not administered."
            ),
            ",".join(c for c in [front, back, "last_word"] if c),
            f"front={'yes' if f_ok else 'missing'}; back={'yes' if b_ok else 'missing'}",
        )
    return issues


def _enumerator_reading_distribution(df: pd.DataFrame, col: dict, meta_fn: MetaFn) -> list[dict]:
    issues: list[dict] = []
    if "last_word" not in df.columns:
        return issues
    enum_col = "enumerator_id" if "enumerator_id" in df.columns else ("enumerator" if "enumerator" in df.columns else None)
    if not enum_col:
        return issues
    min_n = int(col.get("reading_score_min_n", 5) or 5)
    z_thr = float(col.get("reading_score_z", 2.5) or 2.5)

    rows: list[tuple[Any, str, float, float, float]] = []
    for i in df.index:
        if not _reading_administered(df.loc[i]):
            continue
        e = str(df.at[i, enum_col]).strip() if pd.notna(df.at[i, enum_col]) else ""
        if not e or e.lower() in {"nan", "none"}:
            continue
        last = _to_num(df.at[i, "last_word"]) or 0.0
        inc = _to_num(df.at[i, "incorrect"]) if "incorrect" in df.columns else 0.0
        n_corr = 0.0
        for k in range(1, 73):
            c = f"word{k}"
            if c not in df.columns:
                break
            if _to_num(df.at[i, c]) == 1:
                n_corr += 1
        rows.append((i, e, float(last), float(inc or 0), n_corr))
    if len(rows) < min_n * 2:
        return issues

    by_enum: dict[str, list[tuple[Any, float, float, float]]] = defaultdict(list)
    for i, e, last, inc, n_corr in rows:
        by_enum[e].append((i, last, inc, n_corr))

    team_last = pd.Series([r[2] for r in rows])
    team_inc = pd.Series([r[3] for r in rows])
    team_corr = pd.Series([r[4] for r in rows])

    def _z(val: float, series: pd.Series) -> float:
        sd = float(series.std(ddof=0) or 0)
        if sd < 1e-6:
            return 0.0
        return abs(val - float(series.mean())) / sd

    for e, items in by_enum.items():
        if len(items) < min_n:
            continue
        m_last = sum(x[1] for x in items) / len(items)
        m_inc = sum(x[2] for x in items) / len(items)
        m_corr = sum(x[3] for x in items) / len(items)
        z_last, z_inc, z_corr = _z(m_last, team_last), _z(m_inc, team_inc), _z(m_corr, team_corr)
        worst = max(z_last, z_inc, z_corr)
        if worst < z_thr:
            continue
        which = "last_word" if z_last == worst else ("incorrect" if z_inc == worst else "correct_marks")
        i, last, inc, n_corr = items[0]
        _emit(
            issues,
            "Girls",
            i,
            meta_fn,
            "FLAG",
            "GL_QF_READING_ENUM_DISTRIBUTION",
            "Enumerator learning-test scores differ from the team",
            (
                f"Enumerator {e} mean {which} is far from other enumerators "
                f"(z={worst:.1f}, n={len(items)}). "
                f"Means: last_word={m_last:.1f}, incorrect={m_inc:.1f}, correct={m_corr:.1f}. "
                "Review a sample of test-paper photographs."
            ),
            f"{enum_col},last_word,incorrect",
            f"enumerator={e}; last_word={last:.0f}; incorrect={inc:.0f}; correct={n_corr:.0f}",
        )
    return issues


def run_hh_girls_gps(
    household_df: pd.DataFrame,
    girls_df: pd.DataFrame,
    max_meters: float = 500.0,
) -> list[dict]:
    """Same girl ID should have Household and Girls GPS in the same place."""
    issues: list[dict] = []
    if "girl" not in household_df.columns or "girl" not in girls_df.columns:
        return issues
    hh_pairs = _geo_point_pairs(household_df)
    gl_pairs = _geo_point_pairs(girls_df)
    if not hh_pairs or not gl_pairs:
        return issues

    def _gid(val: Any) -> str:
        n = _to_num(val)
        if n is not None and n == int(n):
            return str(int(n))
        s = "" if val is None or (isinstance(val, float) and pd.isna(val)) else str(val).strip()
        return s

    hh_pts: dict[str, tuple[Any, dict[str, Any]]] = {}
    for i in household_df.index:
        gid = _gid(household_df.at[i, "girl"])
        if not gid:
            continue
        pts = _row_geo_points(household_df.loc[i], hh_pairs)
        if not pts:
            continue
        hh_pts[gid] = (i, pts[0])

    def _meta(df: pd.DataFrame, i: Any) -> dict:
        def g(c: str):
            return df.at[i, c] if c in df.columns else None
        return dict(
            record_key=g("KEY"),
            instance_id=g("instanceID"),
            enumerator=g("enumerator"),
            enumerator_id=g("enumerator_id"),
            deviceid=g("deviceid"),
            submission_date=g("SubmissionDate"),
            district=g("district"),
        )

    for j in girls_df.index:
        gid = _gid(girls_df.at[j, "girl"])
        if not gid or gid not in hh_pts:
            continue
        gl_pts = _row_geo_points(girls_df.loc[j], gl_pairs)
        if not gl_pts:
            continue
        _, hp = hh_pts[gid]
        gp = gl_pts[0]
        dist = _haversine_m(hp["lat"], hp["lon"], gp["lat"], gp["lon"])
        if dist <= max_meters:
            continue
        m = _meta(girls_df, j)
        add_issue(
            issues,
            survey="Household vs Girls",
            severity="CRITICAL",
            rule_id="HVG_CE_GPS_MISMATCH",
            title="Girls GPS does not match Household GPS",
            cause=(
                f"For girl ID {gid}, Girls GPS is {dist:.0f} m from Household GPS "
                f"(limit {int(max_meters)} m). Both surveys should be at the same place. "
                "Resurvey if the locations are different areas."
            ),
            field="girl,geo_location1-Latitude,geo_location1-Longitude",
            value=(
                f"girl={gid}; dist_m={dist:.0f}; "
                f"hh=({hp['lat']:.5f},{hp['lon']:.5f}); "
                f"girls=({gp['lat']:.5f},{gp['lon']:.5f})"
            ),
            record_key=m["record_key"],
            instance_id=m["instance_id"],
            enumerator=m["enumerator"],
            enumerator_id=m["enumerator_id"],
            deviceid=m["deviceid"],
            submission_date=m["submission_date"],
            district=m["district"],
        )
    return issues
