"""
Additional protocol / data-quality checks for Household + Tracking surveys.

1. Listed girl missing from siblings roster / not first
2. Schooling status inconsistency (Mother vs Father)
3. Transport module missing when eligible
4. Long survey duration (warn / critical)
5. Dummy alternative / neighbour contact numbers
6. Missing listed girl's phone after successful tracking
7. Missing updated information after tracking
8. Duplicate contact numbers across girls
"""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Callable

import pandas as pd

from utils.logging import add_issue


EDU_LABELS = {
    1: "Never attended",
    2: "Attended in past",
    3: "Currently attending",
}

DUMMY_PHONES = {
    "0",
    "00",
    "000",
    "0000",
    "00000",
    "000000",
    "0000000",
    "00000000",
    "000000000",
    "0000000000",
    "00000000000",
    "11111111111",
    "22222222222",
    "33333333333",
    "44444444444",
    "55555555555",
    "66666666666",
    "77777777777",
    "88888888888",
    "99999999999",
    "12345678901",
    "1234567890",
    "01234567890",
    "03000000000",
    "03111111111",
    "03222222222",
    "03333333333",
}


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


def _digits_phone(val: Any) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return ""
    if isinstance(val, (int, float)) and not isinstance(val, bool):
        try:
            f = float(val)
            if f == 0:
                return "0"
            if f.is_integer() and abs(f) < 1e15:
                return str(int(f))
        except Exception:
            pass
    s = str(val).strip()
    if not s or s.lower() in {"nan", "none", "na", "n/a", "-", "--"}:
        return ""
    try:
        f = float(s)
        if f == 0:
            return "0"
        if f.is_integer() and abs(f) < 1e15:
            return str(int(f))
    except Exception:
        pass
    return re.sub(r"\D", "", s)


def _is_blank(val: Any) -> bool:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return True
    s = str(val).strip()
    return s == "" or s.lower() in {"nan", "none", "na", "n/a", "-", "--", "."}


def _is_dummy_phone(val: Any) -> bool:
    d = _digits_phone(val)
    if not d:
        return False
    if d in DUMMY_PHONES:
        return True
    if len(d) >= 7 and len(set(d)) == 1:
        return True
    if d in {"1234567890", "12345678901", "0123456789", "01234567890"}:
        return True
    return False


def _norm_name(val: Any) -> str:
    if _is_blank(val):
        return ""
    return re.sub(r"\s+", " ", str(val).strip().lower())


def _names_match(a: str, b: str) -> bool:
    if not a or not b:
        return False
    if a == b:
        return True
    # Tolerate honorific / suffix differences (e.g. "ghasima" vs "ghasima bibi")
    if a in b or b in a:
        return True
    return False


def _clip(val: Any, n: int = 220) -> str:
    s = "" if val is None or (isinstance(val, float) and pd.isna(val)) else str(val)
    s = s.strip()
    return s if len(s) <= n else s[: n - 1] + "…"


def _fmt_hours(minutes: float) -> str:
    """Format minutes as compact hours, e.g. 3hr or 2.4hr."""
    hrs = float(minutes) / 60.0
    if abs(hrs - round(hrs)) < 0.05:
        return f"{int(round(hrs))}hr"
    return f"{hrs:.1f}hr"


def run_household_protocol(
    df: pd.DataFrame,
    col: dict,
    meta_for_row: Callable[[Any], dict],
) -> list[dict]:
    issues: list[dict] = []

    sibling_max = int(col.get("sibling_roster_max", 11) or 11)
    warn_mins = float(col.get("long_duration_warn_minutes", 120) or 120)
    crit_mins = float(col.get("long_duration_critical_minutes", 180) or 180)
    transport_edu = int(col.get("transport_eligible_edu_code", 3) or 3)

    girl_col = col.get("girl_id") or ("girl" if "girl" in df.columns else None)
    if girl_col and girl_col not in df.columns and "girl" in df.columns:
        girl_col = "girl"
    girlname_col = "girlname_label" if "girlname_label" in df.columns else None
    listed_idx_col = "listed_girl_index" if "listed_girl_index" in df.columns else None
    edu_col = "listed_girl_edu" if "listed_girl_edu" in df.columns else None
    respondent_col = "respondent" if "respondent" in df.columns else None
    duration_col = col.get("duration") or "duration"
    start_col = col.get("starttime") or "starttime"
    end_col = col.get("endtime") or "endtime"
    alt_phone_col = "alternate_phonenumber" if "alternate_phonenumber" in df.columns else None
    neigh_phone_col = "neighbor_phonenumber" if "neighbor_phonenumber" in df.columns else None
    transport_presence_col = "transport_presence" if "transport_presence" in df.columns else None
    mode_transport_col = "mode_of_transport" if "mode_of_transport" in df.columns else None
    transport_col = "transport" if "transport" in df.columns else None

    def _emit(i: Any, severity: str, rule_id: str, title: str, cause: str, field: str, value: Any) -> None:
        m = meta_for_row(i)
        add_issue(
            issues,
            survey="Household",
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

    # --- 2. Schooling status Mother vs Father ---
    # Track latest row per parent even when edu is blank (both interviewed).
    parent_row_by_girl: dict[str, dict[str, Any]] = defaultdict(dict)
    if girl_col and respondent_col:
        for i in df.index:
            gid = df.at[i, girl_col] if girl_col in df.columns else None
            if _is_blank(gid):
                continue
            resp = _to_num(df.at[i, respondent_col])
            parent = "father" if resp == 1 else ("mother" if resp == 2 else None)
            if not parent:
                continue
            edu = _to_num(df.at[i, edu_col]) if edu_col else None
            parent_row_by_girl[str(gid).strip()][parent] = (edu if edu is None else int(edu), i)

    for gid, parents in parent_row_by_girl.items():
        if "father" not in parents or "mother" not in parents:
            continue
        f_edu, _f_idx = parents["father"]
        m_edu, m_idx = parents["mother"]
        if f_edu is None and m_edu is None:
            continue
        if f_edu != m_edu:
            m_lab = EDU_LABELS.get(m_edu, "blank") if m_edu is not None else "blank"
            f_lab = EDU_LABELS.get(f_edu, "blank") if f_edu is not None else "blank"
            _emit(
                m_idx,
                "CRITICAL",
                "HH_CR_SCHOOLING_PARENT_MISMATCH",
                "Schooling status mismatch (Mother vs Father)",
                (
                    f"Mother={m_lab}; Father={f_lab}. "
                    "Statuses must match; mismatch can skip downstream modules (e.g. transport)."
                ),
                edu_col or "listed_girl_edu",
                f"girl={gid}; mother={m_edu}; father={f_edu}",
            )

    both_parents: set[str] = set()
    if girl_col and respondent_col:
        resp_by_girl: dict[str, set[int]] = defaultdict(set)
        for i in df.index:
            gid = df.at[i, girl_col]
            if _is_blank(gid):
                continue
            resp = _to_num(df.at[i, respondent_col])
            if resp in (1, 2):
                resp_by_girl[str(gid).strip()].add(int(resp))
        both_parents = {g for g, rs in resp_by_girl.items() if {1, 2}.issubset(rs)}

    for i in df.index:
        gid = df.at[i, girl_col] if girl_col and girl_col in df.columns else None
        gid_s = str(gid).strip() if not _is_blank(gid) else ""

        # --- 1. Listed girl in siblings roster ---
        roster_names: list[tuple[int, str]] = []
        listed_positions: list[int] = []
        for k in range(1, sibling_max + 1):
            name_c = f"name_sibling_{k}"
            flag_c = f"listed_girl_{k}"
            if name_c in df.columns and not _is_blank(df.at[i, name_c]):
                roster_names.append((k, _norm_name(df.at[i, name_c])))
            if flag_c in df.columns:
                flag_v = _to_num(df.at[i, flag_c])
                if flag_v == 1:
                    listed_positions.append(k)

        has_any_roster = len(roster_names) > 0
        listed_idx = _to_num(df.at[i, listed_idx_col]) if listed_idx_col else None
        girl_name = _norm_name(df.at[i, girlname_col]) if girlname_col else ""

        if has_any_roster:
            name_positions = [k for k, nm in roster_names if _names_match(girl_name, nm)]
            name_in_roster = bool(name_positions)
            marked = bool(listed_positions) or (listed_idx is not None and listed_idx >= 1)

            if not marked and not name_in_roster:
                _emit(
                    i,
                    "CRITICAL",
                    "HH_CR_LISTED_GIRL_NOT_IN_ROSTER",
                    "Listed girl missing from siblings roster",
                    "Listed girl is not marked in the sibling roster and name does not match any sibling entry.",
                    ",".join(
                        c
                        for c in [girlname_col, listed_idx_col, "listed_girl_1", "name_sibling_1"]
                        if c
                    ),
                    f"girl={gid_s}; roster_n={len(roster_names)}; listed_index={listed_idx}",
                )
            else:
                first_ok = False
                if listed_positions and min(listed_positions) == 1:
                    first_ok = True
                elif listed_idx == 1:
                    first_ok = True
                elif name_positions and min(name_positions) == 1:
                    first_ok = True

                if not first_ok and (listed_positions or (listed_idx is not None and listed_idx >= 1) or name_in_roster):
                    if listed_positions:
                        pos = min(listed_positions)
                    elif listed_idx is not None and listed_idx >= 1:
                        pos = int(listed_idx)
                    else:
                        pos = min(name_positions) if name_positions else listed_idx
                    _emit(
                        i,
                        "FLAG",
                        "HH_CR_LISTED_GIRL_NOT_FIRST",
                        "Listed girl not first in siblings roster",
                        f"Listed girl exists in siblings roster but is not the first entry (position={pos}).",
                        f"{listed_idx_col or 'listed_girl_index'},listed_girl_1,name_sibling_1",
                        f"girl={gid_s}; listed_index={listed_idx}; listed_positions={listed_positions}",
                    )

        # --- 3. Transport module missing ---
        edu = _to_num(df.at[i, edu_col]) if edu_col else None
        if edu is not None and int(edu) == transport_edu:
            tp = df.at[i, transport_presence_col] if transport_presence_col else None
            mt = df.at[i, mode_transport_col] if mode_transport_col else None
            tr = df.at[i, transport_col] if transport_col else None
            transport_missing = _is_blank(tp) and _is_blank(mt) and _is_blank(tr)
            if transport_missing:
                both = gid_s in both_parents
                _emit(
                    i,
                    "CRITICAL" if both else "FLAG",
                    "HH_CR_TRANSPORT_MODULE_MISSING",
                    "Transport module missing",
                    (
                        "Listed girl is currently attending school but transport module fields are blank"
                        + (" (both parents interviewed)." if both else ".")
                    ),
                    ",".join(
                        c
                        for c in [edu_col, transport_presence_col, mode_transport_col, transport_col]
                        if c
                    ),
                    f"girl={gid_s}; edu={int(edu)}; both_parents={int(both)}",
                )

        # --- 4. Long survey duration ---
        # Prefer SurveyCTO `duration` (active interview seconds). Wall-clock
        # start/end often spans overnight when the tablet form is left open.
        dur_min = None
        if duration_col in df.columns:
            raw = _to_num(df.at[i, duration_col])
            if raw is not None and raw >= 0:
                # Seconds if large; otherwise already minutes
                dur_min = float(raw) / 60.0 if float(raw) > 500 else float(raw)
        if dur_min is None and start_col in df.columns and end_col in df.columns:
            try:
                st = pd.to_datetime(df.at[i, start_col], errors="coerce", dayfirst=True)
                en = pd.to_datetime(df.at[i, end_col], errors="coerce", dayfirst=True)
                if pd.notna(st) and pd.notna(en) and en >= st:
                    dur_min = (en - st).total_seconds() / 60.0
            except Exception:
                dur_min = None

        # Implausible long duration (ANOMALY) — often form left open overnight.
        if dur_min is not None and dur_min >= warn_mins:
            sev = "ANOMALY"
            thr = crit_mins if dur_min >= crit_mins else warn_mins
            _emit(
                i,
                sev,
                "HH_AN_LONG_DURATION",
                "Implausibly long household interview duration",
                (
                    f"Interview duration is {dur_min:.0f} minutes ({_fmt_hours(dur_min)}) "
                    f"(threshold {thr:.0f} min / {_fmt_hours(thr)}). "
                    "Durations this long usually mean the tablet form was left open "
                    "(overnight pause / idle), not continuous interviewing. Verify before coaching."
                ),
                f"{start_col},{end_col},{duration_col}",
                f"duration_minutes={dur_min:.1f}; duration_hours={_fmt_hours(dur_min)}",
            )

        # --- 5. Dummy alt / neighbour phones ---
        if alt_phone_col:
            alt = df.at[i, alt_phone_col]
            if not _is_blank(alt) and _is_dummy_phone(alt):
                _emit(
                    i,
                    "FLAG",
                    "HH_QF_DUMMY_ALT_PHONE",
                    "Dummy alternative contact number",
                    f"Alternative contact number looks like a dummy placeholder ({_digits_phone(alt)}).",
                    alt_phone_col,
                    f"alternate_phonenumber={_digits_phone(alt)}",
                )
        if neigh_phone_col:
            nb = df.at[i, neigh_phone_col]
            if not _is_blank(nb) and _is_dummy_phone(nb):
                _emit(
                    i,
                    "FLAG",
                    "HH_QF_DUMMY_NEIGHBOR_PHONE",
                    "Dummy neighbour contact number",
                    f"Neighbour contact number looks like a dummy placeholder ({_digits_phone(nb)}).",
                    neigh_phone_col,
                    f"neighbor_phonenumber={_digits_phone(nb)}",
                )

    return issues


def run_tracking_protocol(
    df: pd.DataFrame,
    col: dict,
    meta_for_row: Callable[[Any], dict],
) -> list[dict]:
    issues: list[dict] = []

    # Flat export (current Surveys) uses unindexed names; block export uses _1 suffix.
    def _pick(*names: str) -> str | None:
        for n in names:
            if n and n in df.columns:
                return n
        return None

    girl_col = _pick("girl_id", "girl_id_1", col.get("girl_id") or "")
    girl_found_col = _pick("girl_found", "girl_found_1", col.get("girl_found") or "", col.get("outcome") or "")
    contact_col = _pick("contact", "contact_1")
    girl_phone_col = _pick("girl_contactnumber", "girl_contactnumber_1")
    new_contact_col = _pick("new_contact", "new_contact_1")

    listing_phone_label = _pick("prim_contactnumber_label")
    listing_addr_label = _pick("address_label")
    listing_enroll_label = _pick("enrollstat_label")
    listing_landmark_label = _pick("landmark_label")

    addr_col = _pick("address", "girl_address", "new_address", "address_1", "girl_address_1")
    enroll_col = _pick("girl_found_confirm_enrolled")
    landmark_col = _pick("landmark", "girl_landmark", "new_landmark")

    dup_threshold = int(col.get("duplicate_phone_girl_threshold", 3) or 3)
    success_codes = {1, 2, 3}

    def _emit(i: Any, severity: str, rule_id: str, title: str, cause: str, field: str, value: Any) -> None:
        m = meta_for_row(i)
        add_issue(
            issues,
            survey="Tracking",
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

    phone_to_girls: dict[str, set[str]] = defaultdict(set)
    phone_to_rows: dict[str, list[Any]] = defaultdict(list)

    for i in df.index:
        gf = _to_num(df.at[i, girl_found_col]) if girl_found_col else None
        success = gf is not None and int(gf) in success_codes
        gid = df.at[i, girl_col] if girl_col else None
        gid_s = str(gid).strip() if not _is_blank(gid) else ""

        phones: list[str] = []
        for c in (girl_phone_col, contact_col, new_contact_col):
            if not c:
                continue
            d = _digits_phone(df.at[i, c])
            if d and not _is_dummy_phone(d) and len(d) >= 7:
                phones.append(d)
        for p in set(phones):
            if gid_s:
                phone_to_girls[p].add(gid_s)
            phone_to_rows[p].append(i)

        if not success:
            continue

        girl_phone = df.at[i, girl_phone_col] if girl_phone_col else None
        contact = df.at[i, contact_col] if contact_col else None
        new_contact = df.at[i, new_contact_col] if new_contact_col else None
        phone_digits = _digits_phone(girl_phone) or _digits_phone(contact) or _digits_phone(new_contact)
        phone_missing = (not phone_digits) or _is_dummy_phone(phone_digits)

        # --- 6. Missing phone after successful tracking ---
        if phone_missing:
            _emit(
                i,
                "CRITICAL",
                "TRK_CE_MISSING_PHONE",
                "Missing listed girl phone after tracking",
                "Girl successfully tracked but phone number is blank/NA/dummy.",
                ",".join(c for c in [girl_phone_col, contact_col, new_contact_col] if c),
                f"girl={gid_s}; girl_found={int(gf) if gf is not None else ''}; phone={phone_digits or 'blank'}",
            )

        # --- 7. Missing updated information after tracking ---
        # Only when listing preloads exist on this row (baseline). After
        # concatenating cohorts, New Sample rows get NaN listing labels and
        # must not be treated as "listing had blanks".
        listing_cols = [
            c
            for c in (
                listing_phone_label,
                listing_addr_label,
                listing_enroll_label,
                listing_landmark_label,
                "girlname_label",
                "fathername_label",
            )
            if c and c in df.columns
        ]
        has_listing_context = any(not _is_blank(df.at[i, c]) for c in listing_cols)

        missing_updates: list[str] = []
        if has_listing_context:
            if listing_phone_label and _is_blank(df.at[i, listing_phone_label]) and phone_missing:
                missing_updates.append("phone")

            if listing_addr_label and _is_blank(df.at[i, listing_addr_label]):
                addr_now = None
                if addr_col and not _is_blank(df.at[i, addr_col]):
                    addr_now = df.at[i, addr_col]
                if addr_now is None:
                    missing_updates.append("address")

            if listing_enroll_label and _is_blank(df.at[i, listing_enroll_label]):
                if not enroll_col or _is_blank(df.at[i, enroll_col]):
                    missing_updates.append("education/enrollment")

            if listing_landmark_label and _is_blank(df.at[i, listing_landmark_label]):
                if not landmark_col or _is_blank(df.at[i, landmark_col]):
                    missing_updates.append("landmark")

        if missing_updates:
            _emit(
                i,
                "FLAG",
                "TRK_QF_MISSING_UPDATE_AFTER_TRACK",
                "Missing updates after tracking",
                "Tracking completed but listing gaps remain unfilled: " + ", ".join(missing_updates) + ".",
                ",".join(
                    c
                    for c in [
                        listing_phone_label,
                        listing_addr_label,
                        listing_enroll_label,
                        listing_landmark_label,
                        girl_phone_col,
                        addr_col,
                        enroll_col,
                        landmark_col,
                    ]
                    if c
                ),
                f"girl={gid_s}; missing={','.join(missing_updates)}",
            )

    # --- 8. Duplicate phones across girls ---
    for phone, girls in phone_to_girls.items():
        if len(girls) < dup_threshold:
            continue
        rows = phone_to_rows.get(phone) or []
        if not rows:
            continue
        girl_list = sorted(girls)
        sev = "CRITICAL" if len(girls) >= max(dup_threshold + 1, 4) else "FLAG"
        _emit(
            rows[0],
            sev,
            "TRK_QF_DUP_PHONE_MULTI_GIRL",
            "Duplicate contact number across girls",
            (
                f"Phone {phone} is used for {len(girls)} listed girls (threshold {dup_threshold}): "
                + ", ".join(girl_list[:20])
                + ("…" if len(girl_list) > 20 else "")
                + "."
            ),
            ",".join(c for c in [girl_phone_col, contact_col, new_contact_col] if c),
            f"phone={phone}; n_girls={len(girls)}; girl_ids={','.join(girl_list)}",
        )

    return issues
