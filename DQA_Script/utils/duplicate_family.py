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


def _record_group_key(issue: dict) -> str | None:
    key = issue.get("record_key") or issue.get("instance_id")
    if key is None:
        return None
    key = str(key).strip()
    return key or None


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
