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
from difflib import SequenceMatcher
from typing import Any, Callable

import pandas as pd

from utils.logging import add_issue

# Below this similarity score, a sibling-roster name is not treated as a
# match for the listed girl's own name (see _fuzzy_listed_girl_match).
LISTED_GIRL_NAME_MATCH_THRESHOLD = 0.6


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
    """Digits-only phone string, preserving a leading zero.

    Numbers that arrive as an actual numeric type (e.g. a spreadsheet column
    that got auto-converted) go through a float round-trip to strip a
    trailing ".0" — but that same round-trip silently drops a leading zero
    ("03000000000" -> "3000000000"), which breaks exact-match comparisons
    against DUMMY_PHONES entries that are written with the leading zero.
    Once a value is already a clean digit string, it is returned as-is
    instead of being re-parsed as a float, so the leading zero survives.
    """
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
    if s.isdigit():
        return s
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


def _fuzzy_listed_girl_match(
    girl_name: Any, roster_names: list[tuple[int, str]]
) -> tuple[int, str, float] | None:
    """Best-matching sibling-roster row for the listed girl's own name.

    Handles cases where the girl was entered as a roster row (e.g. under a
    shortened or misspelled version of her name — "Arzoo" vs. "Arzo
    Abidullah") but tagged with the wrong relation code, instead of being
    genuinely omitted. Compares the full normalized name and just the first
    name token, since enumerators often enter only a first name in the
    roster. Returns (row_number, matched_name, score) for the best match at
    or above LISTED_GIRL_NAME_MATCH_THRESHOLD, or None if no roster name is
    a plausible match.
    """
    gn = _norm_name(girl_name)
    if not gn or not roster_names:
        return None
    gn_first = gn.split(" ", 1)[0]
    best: tuple[int, str, float] | None = None
    for k, sib_name in roster_names:
        if not sib_name:
            continue
        sib_first = sib_name.split(" ", 1)[0]
        score = max(
            SequenceMatcher(None, gn, sib_name).ratio(),
            SequenceMatcher(None, gn_first, sib_first).ratio(),
            SequenceMatcher(None, gn_first, sib_name).ratio(),
        )
        if best is None or score > best[2]:
            best = (k, sib_name, score)
    if best is not None and best[2] >= LISTED_GIRL_NAME_MATCH_THRESHOLD:
        return best
    return None


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


def listed_girl_position(df: pd.DataFrame, i: Any, sibling_max: int) -> int | None:
    """Sibling-roster position marked relation_sibling_k = 3 (Listed girl)."""
    for k in range(1, sibling_max + 1):
        rel_c = f"relation_sibling_{k}"
        if rel_c not in df.columns:
            continue
        rel_v = _to_num(df.at[i, rel_c])
        if rel_v is not None and int(rel_v) == 3:
            return k
    return None


def resolve_listed_girl_position(
    df: pd.DataFrame, i: Any, sibling_max: int, girlname_col: str | None
) -> tuple[int | None, str, float | None]:
    """Best-guess roster position for the listed girl, name-checked.

    The relation_sibling_k = 3 tag is unreliable in two ways this project
    has actually seen in the data: it can be missing entirely while the
    girl's own name still sits in the roster under a different relation
    (usually Sister, code 2 -- e.g. Sana Bibi, Anila, Ayat Hameed, Muskan,
    all entered by the same enumerator), or it can be placed on a different
    sibling's row while the girl's own name sits elsewhere, untagged (e.g.
    Girl ID 1-29159-23-dd0b97e0-8, Wajiha Bibi, where relation code 3 was
    on a sibling named Naila instead of on Wajiha's own row). Any check
    that reads a per-position field (like edu_background_k) off the tagged
    row, or that compares the roster name to the girl's own name for a
    spelling check, without checking whether that row's name actually
    matches the girl can silently answer for the wrong person, or miss the
    comparison entirely. This cross-checks the tag against a fuzzy match on
    the girl's own name (girlname_label vs. name_sibling_k) and prefers the
    name match when the two disagree, since the name is direct evidence of
    who the row actually is and the relation code is a single
    manually-picked value that both cases above show can be wrong or
    absent. Shared by every check in this project that needs to know which
    roster row is actually the listed girl (schooling-status mismatch here,
    and the spelling check in review_checks.py), so a fix to this logic
    fixes all of them at once.

    Returns (position, source, score): source is "tag" when a clean
    relation_sibling = 3 tag was trusted (it matches the name evidence, or
    no name evidence was available to check it against), with score None,
    or "name_match" when the position came from the name match instead,
    because the tag was missing or on the wrong row, with score the
    name-similarity ratio (0 to 1) behind that call. A caller that flags
    something using a "name_match" position should say so and can use the
    score to judge how confident the match is, the underlying
    relation-code error is itself worth fixing at the source (see
    HH_QF_LISTED_GIRL_WRONG_RELATION and HH_CR_LISTED_GIRL_TAG_MISPLACED).
    """
    tag_pos = listed_girl_position(df, i, sibling_max)
    if not girlname_col:
        return tag_pos, "tag", None
    roster_names: list[tuple[int, str]] = []
    for k in range(1, sibling_max + 1):
        name_c = f"name_sibling_{k}"
        if name_c in df.columns and not _is_blank(df.at[i, name_c]):
            roster_names.append((k, _norm_name(df.at[i, name_c])))
    fuzzy = _fuzzy_listed_girl_match(df.at[i, girlname_col], roster_names)
    if fuzzy is not None:
        name_pos, _name_val, name_score = fuzzy
        if tag_pos is None or tag_pos != name_pos:
            return name_pos, "name_match", name_score
    return tag_pos, "tag", None


def run_household_protocol(
    df: pd.DataFrame,
    col: dict,
    meta_for_row: Callable[[Any], dict],
) -> list[dict]:
    issues: list[dict] = []

    sibling_max = int(col.get("sibling_roster_max", 11) or 11)
    girlname_col = "girlname_label" if "girlname_label" in df.columns else None
    warn_mins = float(col.get("long_duration_warn_minutes", 120) or 120)
    crit_mins = float(col.get("long_duration_critical_minutes", 180) or 180)
    transport_edu = int(col.get("transport_eligible_edu_code", 3) or 3)

    girl_col = col.get("girl_id") or ("girl" if "girl" in df.columns else None)
    if girl_col and girl_col not in df.columns and "girl" in df.columns:
        girl_col = "girl"
    edu_col = "listed_girl_edu" if "listed_girl_edu" in df.columns else None
    father_edu_col = "edu_background1" if "edu_background1" in df.columns else None

    def _listed_girl_position(i: Any) -> int | None:
        return listed_girl_position(df, i, sibling_max)

    def _resolve_listed_girl_position(i: Any) -> tuple[int | None, str, float | None]:
        return resolve_listed_girl_position(df, i, sibling_max, girlname_col)

    respondent_col = "respondent" if "respondent" in df.columns else None
    duration_col = col.get("duration") or "duration"
    start_col = col.get("starttime") or "starttime"
    end_col = col.get("endtime") or "endtime"
    alt_start_col = "starttime1" if "starttime1" in df.columns else None
    alt_end_col = (
        "Endtime1"
        if "Endtime1" in df.columns
        else ("endtime1" if "endtime1" in df.columns else None)
    )
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
    # One form is used for both the mother and the father interview — selecting
    # the respondent shows only that respondent's section, the rest is skipped.
    # Mother's section carries the full per-sibling education roster
    # (edu_background_k), so the listed girl's status is read from her own
    # position (found via relation_sibling_k = 3). Father's section instead
    # asks a single compact follow-up (edu_background1) about the listed girl.
    # Only comparing these two specific fields should fire this mismatch.
    submit_col = "SubmissionDate" if "SubmissionDate" in df.columns else None

    def _submit_dt(i: Any):
        if not submit_col:
            return None
        return pd.to_datetime(df.at[i, submit_col], errors="coerce")

    # Some girls have more than one Father or Mother submission (duplicate
    # visits — see Issue 1). Without a tiebreaker, whichever row happened to
    # load last would silently win, which is not necessarily the submission
    # the project actually retains. Prefer a row with an actual answer over
    # a blank one, and between two answered rows prefer the later submission,
    # the same "keep the latest" convention used for duplicate resolution
    # elsewhere in this project (see household.py's _retain_recommendation).
    parent_row_by_girl: dict[str, dict[str, Any]] = defaultdict(dict)
    mother_pos_source_by_girl: dict[str, str] = {}
    mother_pos_score_by_girl: dict[str, float | None] = {}
    if girl_col and respondent_col:
        for i in df.index:
            gid = df.at[i, girl_col] if girl_col in df.columns else None
            if _is_blank(gid):
                continue
            gid_s = str(gid).strip()
            resp = _to_num(df.at[i, respondent_col])
            parent = "father" if resp == 1 else ("mother" if resp == 2 else None)
            if not parent:
                continue
            if parent == "father":
                edu = _to_num(df.at[i, father_edu_col]) if father_edu_col else None
                pos_source, pos_score = None, None
            else:
                pos, pos_source, pos_score = _resolve_listed_girl_position(i)
                edu_bg_col = f"edu_background_{pos}" if pos else None
                edu = _to_num(df.at[i, edu_bg_col]) if edu_bg_col and edu_bg_col in df.columns else None
            edu = edu if edu is None else int(edu)

            existing = parent_row_by_girl[gid_s].get(parent)
            if existing is not None:
                existing_edu, existing_i = existing
                if existing_edu is not None and edu is None:
                    continue  # keep the row that actually has an answer
                if existing_edu is None and edu is not None:
                    pass  # the new row has an answer the kept one doesn't, take it
                else:
                    existing_dt, new_dt = _submit_dt(existing_i), _submit_dt(i)
                    if existing_dt is not None and new_dt is not None and new_dt <= existing_dt:
                        continue  # existing row is the same age or newer, keep it
                    if existing_dt is not None and new_dt is None:
                        continue  # can't confirm the new row is newer, keep the dated one

            parent_row_by_girl[gid_s][parent] = (edu, i)
            if parent == "mother":
                mother_pos_source_by_girl[gid_s] = pos_source
                mother_pos_score_by_girl[gid_s] = pos_score

    for gid, parents in parent_row_by_girl.items():
        if "father" not in parents or "mother" not in parents:
            continue
        f_edu, _f_idx = parents["father"]
        m_edu, m_idx = parents["mother"]
        # Only a genuine contradiction counts: both sides must have an actual
        # answer (1/2/3). One side blank is not a mismatch — the enumerator
        # simply didn't (re)answer it in that respondent's section.
        if f_edu is None or m_edu is None:
            continue
        if f_edu != m_edu:
            m_lab = EDU_LABELS.get(m_edu, "blank")
            f_lab = EDU_LABELS.get(f_edu, "blank")
            by_name_match = mother_pos_source_by_girl.get(gid) == "name_match"
            pos_score = mother_pos_score_by_girl.get(gid)
            note = (
                f" The mother's answer was located by matching the girl's own name in the "
                f"siblings roster (similarity {pos_score:.2f}), not by a clean relation_sibling = 3 "
                "tag (the tag was missing or on a different row, see "
                "HH_QF_LISTED_GIRL_WRONG_RELATION / HH_CR_LISTED_GIRL_TAG_MISPLACED on this same "
                "household). The mismatch itself is still genuine, but the underlying "
                "relation-code error is worth fixing too."
                if by_name_match
                else ""
            )
            _emit(
                m_idx,
                "FLAG",
                "HH_CR_SCHOOLING_PARENT_MISMATCH",
                "Schooling status mismatch (Mother vs Father)",
                (
                    f"Mother={m_lab}; Father={f_lab}. "
                    "Statuses must match; mismatch can skip downstream modules (e.g. transport)."
                    + note
                ),
                "edu_background_*," + (father_edu_col or "edu_background1"),
                (
                    f"girl={gid}; mother={m_edu}; father={f_edu}; "
                    f"mother_position_source={mother_pos_source_by_girl.get(gid, 'tag')}"
                    + (f"; mother_position_score={pos_score:.2f}" if pos_score is not None else "")
                ),
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

    # --- Household siblings roster is empty ---
    # A blank roster on a Father submission is normal by form design whenever
    # the mother was available or only temporarily unavailable (she is
    # expected to complete it herself, either already has on another
    # submission or a revisit is pending) — the roster section on the
    # Father's form is only genuinely required, and therefore only a real
    # gap when blank, when the mother is permanently unavailable (moved to
    # another city, moved to another country, or passed away: reasons 3, 4,
    # 5 on mother_unavailable1), making the father the household's sole and
    # final respondent. On a Mother or Caretaker submission the roster is
    # always expected. This is also checked at the household level (across
    # every submission for the girl, not just one row in isolation), since a
    # blank roster on one respondent's row is not a gap if a different row
    # for the same girl already has it populated (e.g. the mother's own
    # submission is empty but the father's, from the same visit, is not).
    mother_unavail_col = "mother_unavailable1" if "mother_unavailable1" in df.columns else None
    PERMANENT_UNAVAIL_REASONS = {3, 4, 5}
    RESP_LABEL = {1: "Father", 2: "Mother", 3: "Caretaker"}

    def _roster_size(i: Any) -> int:
        if "num_siblings" in df.columns:
            n = _to_num(df.at[i, "num_siblings"])
            if n is not None:
                return int(n)
        return sum(
            1
            for k in range(1, sibling_max + 1)
            if f"name_sibling_{k}" in df.columns and not _is_blank(df.at[i, f"name_sibling_{k}"])
        )

    if girl_col and respondent_col:
        rows_by_girl: dict[str, list[Any]] = defaultdict(list)
        for i in df.index:
            gid = df.at[i, girl_col]
            if _is_blank(gid):
                continue
            rows_by_girl[str(gid).strip()].append(i)

        for gid_s, idxs in rows_by_girl.items():
            if any(_roster_size(i) > 0 for i in idxs):
                continue  # roster exists somewhere for this girl, not empty
            for i in idxs:
                resp = _to_num(df.at[i, respondent_col])
                if resp is None:
                    continue
                resp = int(resp)
                if resp in (2, 3):
                    reason = (
                        f"the {RESP_LABEL[resp].lower()} respondent, who is expected to complete this "
                        "roster, recorded zero household members"
                    )
                elif resp == 1:
                    mreason = _to_num(df.at[i, mother_unavail_col]) if mother_unavail_col else None
                    if mreason is not None and int(mreason) in PERMANENT_UNAVAIL_REASONS:
                        reason = (
                            "the father is the household's sole and final respondent because the "
                            f"mother's unavailability is recorded as permanent (reason={int(mreason)}), "
                            "and the roster is still zero"
                        )
                    else:
                        continue  # mother available or only temporarily unavailable: correctly blank by form design, not a gap
                else:
                    continue
                _emit(
                    i,
                    "CRITICAL",
                    "HH_CR_ROSTER_EMPTY",
                    "Household siblings roster is empty",
                    (
                        "No sibling roster entry exists for this girl on any of her household "
                        f"submissions, and {reason}. Investigate and resurvey the household if the "
                        "roster was genuinely never captured."
                    ),
                    "num_siblings,name_sibling_1",
                    f"girl={gid_s}; respondent={RESP_LABEL.get(resp, resp)}",
                )

    for i in df.index:
        gid = df.at[i, girl_col] if girl_col and girl_col in df.columns else None
        gid_s = str(gid).strip() if not _is_blank(gid) else ""

        # --- 1. Listed girl in siblings roster ---
        # The listed girl's roster entry is meant to be the one marked
        # relation_sibling_k = 3 (Listed girl). When that tag is missing, we
        # still check whether a roster row's name is a plausible match for the
        # girl's own name (girlname_label) before concluding she was omitted —
        # some enumerators enter her as a regular sibling row (often tagged
        # Sister) instead of selecting the Listed girl relation. That is a
        # relation-code error, not an omission, and is reported separately so
        # the two don't get conflated into one "missing" count.
        roster_names: list[tuple[int, str]] = []
        for k in range(1, sibling_max + 1):
            name_c = f"name_sibling_{k}"
            if name_c in df.columns and not _is_blank(df.at[i, name_c]):
                roster_names.append((k, _norm_name(df.at[i, name_c])))

        has_any_roster = len(roster_names) > 0
        listed_pos = _listed_girl_position(i)
        girl_name_val = df.at[i, girlname_col] if girlname_col else None
        fuzzy = _fuzzy_listed_girl_match(girl_name_val, roster_names) if has_any_roster else None
        fuzzy_pos = fuzzy[0] if fuzzy else None

        if has_any_roster:
            if listed_pos is None:
                if fuzzy is not None:
                    fuzzy_row, fuzzy_name, fuzzy_score = fuzzy
                    _emit(
                        i,
                        "FLAG",
                        "HH_QF_LISTED_GIRL_WRONG_RELATION",
                        "Listed girl in roster but tagged with the wrong relation code",
                        (
                            f"Sibling roster row {fuzzy_row} ('{fuzzy_name}') closely matches the listed "
                            f"girl's own name ('{_norm_name(girl_name_val)}', similarity {fuzzy_score:.2f}) "
                            "but is not tagged relation_sibling = 3 (Listed girl). This reads as a relation "
                            "code selection error, not an omission. Correct the relation code rather than "
                            "resurveying the household."
                        ),
                        f"relation_sibling_{fuzzy_row},name_sibling_{fuzzy_row}",
                        f"girl={gid_s}; matched_row={fuzzy_row}; matched_name={fuzzy_name}; score={fuzzy_score:.2f}",
                    )
                else:
                    _emit(
                        i,
                        "CRITICAL",
                        "HH_CR_LISTED_GIRL_NOT_IN_ROSTER",
                        "Listed girl missing from siblings roster",
                        "No sibling roster entry has relation = Listed girl (relation_sibling = 3), and no "
                        "roster entry's name resembles the listed girl's own name either. "
                        "Investigate and resurvey the household if the listed girl was omitted.",
                        "relation_sibling_1,name_sibling_1",
                        f"girl={gid_s}; roster_n={len(roster_names)}",
                    )
            elif fuzzy_pos is not None and fuzzy_pos != listed_pos:
                # The relation_sibling = 3 tag exists, but on a different row than
                # the one whose name actually matches the listed girl (e.g. Girl ID
                # 1-29159-23-dd0b97e0-8, Wajiha Bibi: the tag was on a sibling
                # named Naila, not on Wajiha's own row). Any field read off the
                # tagged position, such as education status, would be answering
                # for the wrong person. Flag the misplaced tag, and use the
                # name-matched row (not the tag) to judge first-entry position.
                fuzzy_row, fuzzy_name, fuzzy_score = fuzzy
                _emit(
                    i,
                    "FLAG",
                    "HH_CR_LISTED_GIRL_TAG_MISPLACED",
                    "Listed girl tag is on the wrong siblings-roster row",
                    (
                        f"relation_sibling = 3 (Listed girl) is tagged on roster row {listed_pos}, but row "
                        f"{fuzzy_row} ('{fuzzy_name}') is the row whose name matches the listed girl's own "
                        f"name ('{_norm_name(girl_name_val)}', similarity {fuzzy_score:.2f}). Any per-position "
                        "field read using the tagged row (e.g. edu_background_k) is answering for the wrong "
                        f"sibling. Move the Listed girl tag to row {fuzzy_row}."
                    ),
                    f"relation_sibling_{listed_pos},relation_sibling_{fuzzy_row},name_sibling_{fuzzy_row}",
                    f"girl={gid_s}; tagged_row={listed_pos}; name_matched_row={fuzzy_row}; matched_name={fuzzy_name}; score={fuzzy_score:.2f}",
                )
                if fuzzy_row != 1:
                    _emit(
                        i,
                        "FLAG",
                        "HH_CR_LISTED_GIRL_NOT_FIRST",
                        "Listed girl not first in siblings roster",
                        f"By name match (the relation_sibling tag is misplaced, see "
                        f"HH_CR_LISTED_GIRL_TAG_MISPLACED), the listed girl is roster row {fuzzy_row}, not "
                        "the first entry.",
                        f"name_sibling_{fuzzy_row}",
                        f"girl={gid_s}; listed_position={fuzzy_row}",
                    )
            elif listed_pos != 1:
                _emit(
                    i,
                    "FLAG",
                    "HH_CR_LISTED_GIRL_NOT_FIRST",
                    "Listed girl not first in siblings roster",
                    f"Listed girl (relation_sibling = 3) exists in siblings roster but is not the first entry "
                    f"(position={listed_pos}). The listed girl must be the first siblings-roster row.",
                    f"relation_sibling_{listed_pos},name_sibling_{listed_pos}",
                    f"girl={gid_s}; listed_position={listed_pos}",
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
                    "FLAG",
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
                # SurveyCTO `duration` is always in seconds
                dur_min = float(raw) / 60.0
        if dur_min is None and start_col in df.columns and end_col in df.columns:
            try:
                st = pd.to_datetime(df.at[i, start_col], errors="coerce", dayfirst=True)
                en = pd.to_datetime(df.at[i, end_col], errors="coerce", dayfirst=True)
                if pd.notna(st) and pd.notna(en) and en >= st:
                    dur_min = (en - st).total_seconds() / 60.0
            except Exception:
                dur_min = None

        # Implausibly long duration — often form left open overnight, but still
        # a data-quality problem worth surfacing as a Critical error. Cross-check
        # against the form's own starttime1/Endtime1 when available: `duration`
        # can over-report when the app sits backgrounded, so only treat this as
        # a genuine long interview when both signals agree it's long.
        long_flag = dur_min is not None and dur_min >= warn_mins
        if long_flag and alt_start_col and alt_end_col:
            alt_st = pd.to_datetime(df.at[i, alt_start_col], errors="coerce", dayfirst=True)
            alt_en = pd.to_datetime(df.at[i, alt_end_col], errors="coerce", dayfirst=True)
            if pd.notna(alt_st) and pd.notna(alt_en) and alt_en > alt_st:
                alt_mins = (alt_en - alt_st).total_seconds() / 60.0
                if alt_mins < warn_mins:
                    long_flag = False

        if long_flag:
            sev = "CRITICAL"
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
        _emit(
            rows[0],
            "FLAG",
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
