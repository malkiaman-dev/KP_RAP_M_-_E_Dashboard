"""
Cross-rule de-duplication for the "duplicate detection" rule family.

Several rules in Household, Girls, and Tracking independently detect the same
underlying duplicate/re-interview case from different angles (exact duplicate
record, same-respondent conflict, re-interview by a different enumerator,
duplicate submission ID, duplicate girl record, ...). Without this pass, one
real-world duplicate case can show up multiple times in the error log under
several different rule IDs, which reads as more distinct problems than there
actually are.

This keeps only the highest-priority rule's issue(s) per record among this
family; issues outside the family are untouched.
"""

from __future__ import annotations

# Lower number = higher priority = kept when multiple duplicate-family rules
# fire for the same record. Ties (same number) are never assigned on purpose.
DUPLICATE_FAMILY_PRIORITY: dict[str, int] = {
    # Household
    "HH_CR_09": 10,  # Duplicate submission ID (KEY/instanceID) — plainest signal
    "HH_CR_10": 20,  # Exact duplicate record (identity + location + respondent)
    "HH_CR_SAME_RESP_MISMATCH": 30,  # Same respondent, conflicting fields
    "HH_CR_REENUM_COMPLETED": 40,  # Different enumerator re-interviewed
    "HH_CR_LATE_REINTERVIEW": 50,  # Late-night re-interview of a completed case
    # Girls
    "GL_CE_DUP_KEY": 10,
    "GL_CE_DUP_INSTANCE": 15,
    "GL_CE_EXACT_DUP": 20,
    "GL_CE_14": 30,
    "GL_CE_ID_CONFLICT": 35,
    "GL_CE_DUP_GIRL_MISMATCH": 40,
    "GL_CE_DUP_GIRL_ID": 45,
    "GL_CE_REENUM_COMPLETED": 50,
    "GL_CE_LATE_REINTERVIEW": 60,
    # Tracking
    "TRK_CE_DUP_INSTANCE": 10,
    "TRK_QF_DUP_RECORD_KEY": 20,
    "TRK_QF_DUP_GIRL_EXACT": 30,
    "TRK_QF_DUP_GIRL_NEAR_MISMATCH": 40,
    "TRK_QF_DUP_GIRL_MISMATCH": 50,
}


HOUSEHOLD_DUP_RULES = {
    "HH_CR_09",
    "HH_CR_10",
    "HH_CR_SAME_RESP_MISMATCH",
    "HH_CR_REENUM_COMPLETED",
    "HH_CR_LATE_REINTERVIEW",
}
GIRLS_DUP_RULES = {
    "GL_CE_DUP_KEY",
    "GL_CE_DUP_INSTANCE",
    "GL_CE_EXACT_DUP",
    "GL_CE_14",
    "GL_CE_ID_CONFLICT",
    "GL_CE_DUP_GIRL_MISMATCH",
    "GL_CE_DUP_GIRL_ID",
    "GL_CE_REENUM_COMPLETED",
    "GL_CE_LATE_REINTERVIEW",
}

HH_DUP_BOTH_ID = "HH_DUP_BOTH_PARENTS"
HH_DUP_FATHER_ID = "HH_DUP_FATHER"
HH_DUP_MOTHER_ID = "HH_DUP_MOTHER"
HH_DUP_OTHER_ID = "HH_DUP_OTHER"
GL_DUP_ID = "GL_DUP_GIRLS_SURVEY"
GL_DUP_TITLE = "Duplicate Girls survey"


def _record_group_key(issue: dict) -> str | None:
    key = issue.get("record_key") or issue.get("instance_id")
    if key is None:
        return None
    key = str(key).strip()
    return key or None


def _respondent_label(code: str) -> str:
    return {"1": "Father", "2": "Mother"}.get(code, "Unknown")


def _resp_code_from_raw(x) -> str:
    if x is None:
        return ""
    try:
        n = float(x)
        return str(int(round(n)))
    except (TypeError, ValueError):
        return str(x).strip()


def _build_household_lookups(hh_df) -> tuple[dict[str, str], dict[str, str]]:
    """(record_key -> girl id, record_key -> respondent label) from the Household frame."""
    girl_by_key: dict[str, str] = {}
    resp_by_key: dict[str, str] = {}
    if hh_df is None:
        return girl_by_key, resp_by_key
    key_col = "KEY" if "KEY" in hh_df.columns else None
    girl_col = "girl" if "girl" in hh_df.columns else None
    resp_col = "respondent" if "respondent" in hh_df.columns else None
    if not key_col:
        return girl_by_key, resp_by_key
    cols = [c for c in [key_col, girl_col, resp_col] if c]
    for _, row in hh_df[cols].iterrows():
        k = str(row[key_col]).strip()
        if not k:
            continue
        if girl_col:
            g = str(row[girl_col]).strip()
            if g and g.lower() != "nan":
                girl_by_key[k] = g
        if resp_col:
            resp_by_key[k] = _respondent_label(_resp_code_from_raw(row[resp_col]))
    return girl_by_key, resp_by_key


def _merge_both_parents_group(group: list[tuple[dict, str]]) -> dict:
    """Collapse a girl's father-duplicate issue(s) and mother-duplicate issue(s)
    into a single HH_DUP_BOTH_PARENTS row, so the girl appears once in the
    error log instead of once per respondent-side duplicate pair."""
    group = sorted(group, key=lambda pair: (pair[1] != "Father", pair[1]))
    base_issue, _ = group[0]
    merged = dict(base_issue)
    merged["rule_id"] = HH_DUP_BOTH_ID
    merged["title"] = "Duplicate household record (Father & Mother)"

    message_lines = []
    value_lines = []
    for it, resp in group:
        rk = it.get("record_key") or it.get("instance_id") or ""
        message_lines.append(f"[{resp}] {it.get('message', '')}")
        value_lines.append(f"{resp.lower()}_form_id={rk}")
    merged["message"] = " ".join(message_lines)
    merged["value"] = "; ".join(value_lines) + "; " + str(base_issue.get("value", ""))
    return merged


def recategorize_household_duplicates(issues: list[dict], hh_df) -> list[dict]:
    """Recategorize Household duplicate-family issues into one of three
    categories: Duplicate HH (father AND mother both duplicated for the same
    girl — merged into one row per girl), Duplicate Father survey, or
    Duplicate Mother survey — so the same underlying case reads as one
    consistent category instead of five rule IDs, and a girl with both sides
    duplicated appears once, not twice.

    Returns a new list; `issues` is not mutated.
    """
    hh_issues = [it for it in issues if it.get("rule_id") in HOUSEHOLD_DUP_RULES]
    if not hh_issues:
        return issues
    other_issues = [it for it in issues if it.get("rule_id") not in HOUSEHOLD_DUP_RULES]

    girl_by_key, resp_by_key = _build_household_lookups(hh_df)

    # girl -> [(issue, respondent_label), ...]; ungrouped issues have no resolvable girl id
    by_girl: dict[str, list[tuple[dict, str]]] = {}
    ungrouped: list[tuple[dict, str]] = []
    for it in hh_issues:
        rk = _record_group_key(it)
        girl = girl_by_key.get(rk) if rk else None
        resp = resp_by_key.get(rk, "Unknown") if rk else "Unknown"
        if girl:
            by_girl.setdefault(girl, []).append((it, resp))
        else:
            ungrouped.append((it, resp))

    result: list[dict] = []
    for girl, group in by_girl.items():
        types = {resp for _, resp in group}
        if {"Father", "Mother"}.issubset(types):
            result.append(_merge_both_parents_group(group))
        elif types == {"Father"}:
            for it, _ in group:
                it["rule_id"] = HH_DUP_FATHER_ID
                it["title"] = "Duplicate Father survey"
                result.append(it)
        elif types == {"Mother"}:
            for it, _ in group:
                it["rule_id"] = HH_DUP_MOTHER_ID
                it["title"] = "Duplicate Mother survey"
                result.append(it)
        else:
            for it, _ in group:
                it["rule_id"] = HH_DUP_OTHER_ID
                it["title"] = "Duplicate household record"
                result.append(it)

    for it, resp in ungrouped:
        if resp == "Father":
            it["rule_id"], it["title"] = HH_DUP_FATHER_ID, "Duplicate Father survey"
        elif resp == "Mother":
            it["rule_id"], it["title"] = HH_DUP_MOTHER_ID, "Duplicate Mother survey"
        else:
            it["rule_id"], it["title"] = HH_DUP_OTHER_ID, "Duplicate household record"
        result.append(it)

    return other_issues + result


def recategorize_girls_duplicates(issues: list[dict]) -> None:
    """Mutate Girls duplicate-family issues in place into a single unified
    "Duplicate Girls survey" category — Girls has no father/mother split."""
    for it in issues:
        if it.get("rule_id") in GIRLS_DUP_RULES:
            it["rule_id"] = GL_DUP_ID
            it["title"] = GL_DUP_TITLE


def dedupe_duplicate_family_issues(issues: list[dict]) -> list[dict]:
    """Keep only the highest-priority duplicate-family rule's issue(s) per record.

    Non-duplicate-family issues pass through unchanged. A record that has both
    a duplicate-family issue and an unrelated issue (e.g. GPS missing) keeps
    both — only competing duplicate-family rules on the same record collapse.
    """
    best_priority: dict[str, int] = {}
    for issue in issues:
        priority = DUPLICATE_FAMILY_PRIORITY.get(issue.get("rule_id"))
        if priority is None:
            continue
        rec_key = _record_group_key(issue)
        if rec_key is None:
            continue
        if rec_key not in best_priority or priority < best_priority[rec_key]:
            best_priority[rec_key] = priority

    out: list[dict] = []
    for issue in issues:
        priority = DUPLICATE_FAMILY_PRIORITY.get(issue.get("rule_id"))
        if priority is None:
            out.append(issue)
            continue
        rec_key = _record_group_key(issue)
        if rec_key is None or priority == best_priority.get(rec_key):
            out.append(issue)
        # else: a higher-priority duplicate-family rule already covers this record
    return out
