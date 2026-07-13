"""
Attach girl name / village / school to DQA issues by looking up the source survey row.

Ensures Error Detail Log can always show these fields when available, for any rule.
"""

from __future__ import annotations

import re
from typing import Any

import pandas as pd


SURVEY_ALIASES = {
    "tracking": "Tracking",
    "household": "Household",
    "girls": "Girls",
    "Tracking": "Tracking",
    "Household": "Household",
    "Girls": "Girls",
}

CONTEXT_COLS = {
    "Tracking": {
        "girl_name": [
            "girl_name",
            "girlname_label",
            "new_name",
            "name",
            "girl_name_1",
            "new_name_1",
        ],
        "village": [
            "village_label",
            "village_label_1",
            "village",
            "village_1",
            "village_label_b1",
        ],
        "school": [
            "school_label",
            "new_school_label",
            "school",
            "new_school",
            "girl_school_label",
            "school_label_1",
            "new_school_label_1",
        ],
    },
    "Household": {
        "girl_name": ["girlname_label", "girl_name", "name"],
        "village": ["village_label", "village"],
        "school": [
            "schoollist_24_25_label_1",
            "schoollist_23_24_label_1",
            "schoollist_22_23_label_1",
            "girls_school",
            "girls_school1",
            "school_label",
            "school",
        ],
    },
    "Girls": {
        "girl_name": ["girlname_label", "name", "girl_name"],
        "village": ["village_label", "village"],
        "school": [
            "ay2425schoolname",
            "middleschool_label",
            "school_label",
            "school",
            "girls_school",
        ],
    },
}


def _blank(val: Any) -> bool:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return True
    s = str(val).strip()
    return s == "" or s.lower() in {"nan", "none", "na", "n/a", "-", "--", "."}


def _text(val: Any) -> str:
    if _blank(val):
        return ""
    return re.sub(r"\s+", " ", str(val).strip())


def _first(row: pd.Series, cols: list[str], *, prefer_text: bool = False) -> str:
    fallback = ""
    for c in cols:
        if c not in row.index:
            continue
        t = _text(row.get(c))
        if not t:
            continue
        # Skip pure codes like "4" when looking for school names
        if prefer_text and t.replace(".", "", 1).isdigit():
            if not fallback:
                fallback = t
            continue
        return t
    return fallback


def _extract_context(row: pd.Series, survey: str) -> dict[str, str]:
    cols = CONTEXT_COLS.get(survey, {})
    girl_id_cols = (
        ["girl_id", "girl_id_1", "girl"]
        if survey == "Tracking"
        else ["girl", "girl_id"]
    )
    return {
        "girl_name": _first(row, cols.get("girl_name", [])),
        "village": _first(row, cols.get("village", [])),
        "school": _first(row, cols.get("school", []), prefer_text=True),
        "girl_id": _first(row, girl_id_cols),
    }


def _merge_ctx(a: dict[str, str] | None, b: dict[str, str]) -> dict[str, str]:
    if not a:
        return dict(b)
    school_a = a.get("school") or ""
    school_b = b.get("school") or ""

    def _good_school(s: str) -> str:
        if not s:
            return ""
        if s.replace(".", "", 1).isdigit():
            return ""
        return s

    return {
        "girl_name": a.get("girl_name") or b.get("girl_name") or "",
        "village": a.get("village") or b.get("village") or "",
        "school": _good_school(school_a) or _good_school(school_b) or school_a or school_b,
        "girl_id": a.get("girl_id") or b.get("girl_id") or "",
    }


def _norm_key(val: Any) -> str:
    if _blank(val):
        return ""
    return str(val).strip()


def _build_lookup(df: pd.DataFrame, survey: str) -> dict[str, dict[str, str]]:
    lookup: dict[str, dict[str, str]] = {}
    key_cols = [c for c in ("KEY", "record_key", "instanceID", "instance_id") if c in df.columns]
    if not key_cols:
        return lookup

    for _, row in df.iterrows():
        ctx = _extract_context(row, survey)
        if not any(v for k, v in ctx.items() if k != "girl_id" and v):
            continue
        for kc in key_cols:
            k = _norm_key(row.get(kc))
            if k and k not in lookup:
                lookup[k] = ctx
            if k.startswith("uuid:"):
                short = k.replace("uuid:", "", 1)
                if short and short not in lookup:
                    lookup[short] = ctx
    return lookup


def _build_girl_lookup(dfs: dict[str, pd.DataFrame]) -> dict[str, dict[str, str]]:
    by_girl: dict[str, dict[str, str]] = {}
    for raw_name, df in dfs.items():
        survey = SURVEY_ALIASES.get(raw_name, raw_name)
        if survey not in CONTEXT_COLS:
            continue
        for _, row in df.iterrows():
            ctx = _extract_context(row, survey)
            gid = ctx.get("girl_id") or ""
            if not gid:
                continue
            by_girl[gid] = _merge_ctx(by_girl.get(gid), ctx)
    return by_girl


def _value_has_key(value: str, key: str) -> bool:
    return re.search(rf"(?:^|;\s*){re.escape(key)}=", value or "") is not None


def _append_context_to_value(value: Any, ctx: dict[str, str]) -> str:
    base = "" if value is None or (isinstance(value, float) and pd.isna(value)) else str(value).strip()
    parts: list[str] = []
    for key in ("girl_name", "village", "school"):
        if ctx.get(key) and not _value_has_key(base, key):
            parts.append(f"{key}={ctx[key]}")
    if not parts:
        return base
    if not base:
        return "; ".join(parts)
    return base.rstrip(";") + "; " + "; ".join(parts)


def _append_context_to_message(message: Any, ctx: dict[str, str]) -> str:
    msg = "" if message is None or (isinstance(message, float) and pd.isna(message)) else str(message).strip()
    # Avoid duplicating if message already names the girl/village
    lower = msg.lower()
    bits: list[str] = []
    if ctx.get("girl_name") and f"girl: {ctx['girl_name'].lower()}" not in lower:
        bits.append(f"Girl: {ctx['girl_name']}")
    if ctx.get("village") and f"village: {ctx['village'].lower()}" not in lower:
        bits.append(f"Village: {ctx['village']}")
    if ctx.get("school") and f"school: {ctx['school'].lower()}" not in lower:
        bits.append(f"School: {ctx['school']}")
    if not bits:
        return msg
    suffix = " " + "; ".join(bits) + "."
    if msg.endswith("."):
        return msg + suffix
    return (msg + "." if msg else "") + suffix


def enrich_issues_with_context(issues: list[dict], dfs: dict[str, pd.DataFrame]) -> list[dict]:
    """Mutate/return issues with girl_name, village, school in value (+ message)."""
    lookups: dict[str, dict[str, dict[str, str]]] = {}
    for raw_name, df in dfs.items():
        survey = SURVEY_ALIASES.get(raw_name, raw_name)
        if survey not in CONTEXT_COLS:
            continue
        lookups[survey] = _build_lookup(df, survey)

    by_girl = _build_girl_lookup(dfs)

    for it in issues:
        survey = SURVEY_ALIASES.get(str(it.get("survey") or ""), str(it.get("survey") or ""))
        lookup = lookups.get(survey)
        if not lookup:
            continue

        keys = [
            _norm_key(it.get("record_key")),
            _norm_key(it.get("instance_id")),
        ]
        ctx: dict[str, str] | None = None
        for k in keys:
            if not k:
                continue
            ctx = lookup.get(k) or lookup.get(k.replace("uuid:", "", 1))
            if ctx:
                break
        if not ctx:
            continue

        # Cross-survey fill (e.g. Girls missing school → Tracking new_school_label)
        gid = ctx.get("girl_id") or ""
        if not gid:
            # Try parse from existing value evidence
            m = re.search(r"(?:^|;\s*)girl=([^;]+)", str(it.get("value") or ""))
            if m:
                gid = m.group(1).strip()
        if gid and gid in by_girl:
            ctx = _merge_ctx(ctx, by_girl[gid])

        it["value"] = _append_context_to_value(it.get("value"), ctx)
        it["message"] = _append_context_to_message(it.get("message"), ctx)

    return issues
