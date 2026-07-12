# =============================================================================
# Listing vs Tracking – Listed but NOT Tracked + Tracked but NOT Listed
#
# Purpose:
#   1) CRITICAL: girls that exist in LISTING but do NOT exist in TRACKING
#   2) FLAG:     girls that exist in TRACKING but do NOT exist in LISTING
#
# Pilot (rollout_plan=False):
#   listing IDs: girls_2023_id_* / girls_2024_id_*
#
# Rollout (rollout_plan=True):
#   listing IDs: rand_grl_girlid_23_* / rand_grl_girlid_24_* (ONLY where status is primary/alternate)
#
# Tracking IDs:
#   girl_id, girl_* (supports girl_id_*, girl_1, etc)
#
# Output:
#   Uses the SAME make_issue() format
#   value field includes ONLY: girl_id, girl_name, father_name
#   Terminal prints totals:
#     - listed unique
#     - tracked unique
#     - overlap
#     - untracked (listed-not-tracked)
#     - tracked_not_listed
# =============================================================================

from __future__ import annotations

import re
from typing import Any, Dict, List, Set, Tuple

import pandas as pd
from utils.logging import make_issue


# ============================================================
# TRUE/FALSE SWITCH
# ============================================================
# rollout_plan = True  -> Rollout phase (selected girls only)
# rollout_plan = False -> Pilot phase   (all listed girls)
# ============================================================
rollout_plan = False  # set True for ROLLOUT


# -------------------------
# Helpers
# -------------------------
def _norm(x: Any) -> str:
    if x is None:
        return ""
    if isinstance(x, float) and pd.isna(x):
        return ""
    s = str(x).strip()
    if s == "":
        return ""
    # Convert "14118.0" -> "14118"
    if re.fullmatch(r"\d+\.0", s):
        s = s[:-2]
    return s


def _pick_first_existing(df: pd.DataFrame, candidates: List[str]) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    return None


def _iter_indexed_cols(df: pd.DataFrame, prefix: str) -> List[Tuple[int, str]]:
    """
    Return [(idx, colname)] for columns like prefix_1, prefix_2 ...
    """
    pat = re.compile(rf"^{re.escape(prefix)}_(\d+)$", flags=re.IGNORECASE)
    out: List[Tuple[int, str]] = []
    for c in df.columns:
        m = pat.match(c)
        if not m:
            continue
        try:
            out.append((int(m.group(1)), c))
        except Exception:
            pass
    return sorted(out, key=lambda x: x[0])


def _value_text(girl_id: str, girl_name: str, father_name: str) -> str:
    return f"girl_id={girl_id} | girl_name={girl_name} | father_name={father_name}"


# -------------------------
# Extract expected girls from listing
# -------------------------
def _extract_expected_pilot(listing_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Pilot: every listed girl must be tracked.
    listing:
      - girls_2023_id_*
      - girls_2024_id_*
    names:
      - name_2023_*, name_2024_*
    father:
      - father_2023_*, father_2024_*
    """
    out: List[Dict[str, Any]] = []
    if listing_df is None or listing_df.empty:
        return out

    school_col = _pick_first_existing(listing_df, ["school"])
    district_col = _pick_first_existing(listing_df, ["district", "District"])

    def harvest_row(row: pd.Series, year: str) -> None:
        id_cols = _iter_indexed_cols(listing_df, f"girls_{year}_id")
        for idx, id_col in id_cols:
            gid = _norm(row.get(id_col))
            if gid == "":
                continue

            name_col = f"name_{year}_{idx}"
            father_col = f"father_{year}_{idx}"

            out.append(
                {
                    "mode": "PILOT (all listed girls)",
                    "girl_id": gid,
                    "girl_name": _norm(row.get(name_col)),
                    "father_name": _norm(row.get(father_col)),
                    "field": id_col,
                    "school": _norm(row.get(school_col)) if school_col else "",
                    "district": _norm(row.get(district_col)) if district_col else "",
                }
            )

    for _, row in listing_df.iterrows():
        harvest_row(row, "2023")
        harvest_row(row, "2024")

    return out


def _extract_expected_rollout(listing_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Rollout: only SurveyCTO-selected girls must be tracked.
    listing:
      - rand_grl_status_23_* + rand_grl_girlid_23_*
      - rand_grl_status_24_* + rand_grl_girlid_24_*
    include only where status is primary/alternate.
    Names/father best-effort: locate roster slot where girls_YYYY_id_* == selected id.
    """
    out: List[Dict[str, Any]] = []
    if listing_df is None or listing_df.empty:
        return out

    school_col = _pick_first_existing(listing_df, ["school"])
    district_col = _pick_first_existing(listing_df, ["district", "District"])

    def find_roster_slot(row: pd.Series, year: str, gid: str) -> int | None:
        pat = re.compile(rf"^girls_{year}_id_(\d+)$", flags=re.IGNORECASE)
        for c in listing_df.columns:
            m = pat.match(c)
            if not m:
                continue
            if _norm(row.get(c)) == gid:
                try:
                    return int(m.group(1))
                except Exception:
                    return None
        return None

    def harvest_selected(row: pd.Series, year_suffix: str, year_full: str) -> None:
        status_cols = _iter_indexed_cols(listing_df, f"rand_grl_status_{year_suffix}")
        for idx, status_col in status_cols:
            gid_col = f"rand_grl_girlid_{year_suffix}_{idx}"
            status = _norm(row.get(status_col)).lower()
            gid = _norm(row.get(gid_col))

            if gid == "" or status == "":
                continue
            if status not in {"primary", "alternate"}:
                continue

            gname = ""
            fname = ""
            slot = find_roster_slot(row, year_full, gid)
            if slot is not None:
                gname = _norm(row.get(f"name_{year_full}_{slot}"))
                fname = _norm(row.get(f"father_{year_full}_{slot}"))

            out.append(
                {
                    "mode": "ROLLOUT (selected girls only)",
                    "girl_id": gid,
                    "girl_name": gname,
                    "father_name": fname,
                    "field": gid_col,
                    "school": _norm(row.get(school_col)) if school_col else "",
                    "district": _norm(row.get(district_col)) if district_col else "",
                    "status": status,
                }
            )

    for _, row in listing_df.iterrows():
        harvest_selected(row, "23", "2023")
        harvest_selected(row, "24", "2024")

    return out


def _build_expected(listing_df: pd.DataFrame) -> List[Dict[str, Any]]:
    return _extract_expected_rollout(listing_df) if rollout_plan else _extract_expected_pilot(listing_df)


# -------------------------
# Tracking parsing (IDs + name/father best-effort)
# -------------------------
def _tracking_slot_index(colname: str) -> int:
    """
    Extract slot index from columns like:
      girl_1, girl_id_2, new_name_2, girl_name_3, father_name_3
    If no suffix (girl_id, new_name), treat as slot 1.
    """
    c = colname.lower().strip()
    m = re.match(r"^(?:girl_id|girl|new_name|name|girl_name|new_father_name|father_name|girl_fathername)_(\d+)$", c)
    if m:
        try:
            return int(m.group(1))
        except Exception:
            return 1
    return 1


def _build_tracking_sets_and_info(tracking_df: pd.DataFrame) -> Tuple[Set[str], Dict[str, Dict[str, str]], Dict[str, str]]:
    """
    Returns:
      - tracked_ids: set of unique tracking girl IDs
      - tracked_info: gid -> {"girl_name":..., "father_name":...} (best-effort)
      - tracked_field: gid -> first field name where this id was seen (best-effort)
    """
    tracked_ids: Set[str] = set()
    tracked_info: Dict[str, Dict[str, str]] = {}
    tracked_field: Dict[str, str] = {}

    if tracking_df is None or tracking_df.empty:
        return tracked_ids, tracked_info, tracked_field

    # ID columns
    id_cols: List[str] = []
    for c in tracking_df.columns:
        cl = c.lower().strip()
        if cl in {"girl_id", "girl"}:
            id_cols.append(c)
            continue
        if re.match(r"^(girl_id|girl)_\d+($|_)", cl):
            # allow odd flattened variants like girl_1_1, still useful for IDs
            id_cols.append(c)

    # Candidate name/father bases (your correction)
    name_bases = {"new_name", "name", "girl_name"}
    father_bases = {"new_father_name", "father_name", "girl_fathername"}

    # Pre-index columns by base+slot for quicker lookup
    # key: (base, slot) -> [colnames...]
    by_base_slot: Dict[Tuple[str, int], List[str]] = {}
    for c in tracking_df.columns:
        cl = c.lower().strip()
        base = None
        if cl in name_bases:
            base = cl
        elif cl in father_bases:
            base = cl
        else:
            m = re.match(r"^(new_name|name|girl_name|new_father_name|father_name|girl_fathername)_(\d+)$", cl)
            if m:
                base = m.group(1)
        if base:
            slot = _tracking_slot_index(c)
            by_base_slot.setdefault((base, slot), []).append(c)

    def first_nonblank(row: pd.Series, cols: List[str]) -> str:
        for cc in cols:
            v = _norm(row.get(cc))
            if v != "":
                return v
        return ""

    # Walk rows and capture IDs, then attach name/father from same slot if possible
    for _, row in tracking_df.iterrows():
        for c in id_cols:
            gid = _norm(row.get(c))
            if gid == "":
                continue

            tracked_ids.add(gid)

            if gid not in tracked_field:
                tracked_field[gid] = c

            # slot alignment: for girl_2 use slot=2, for flat girl_id treat slot=1
            slot = _tracking_slot_index(c)

            # best-effort name and father
            gname = ""
            fname = ""

            # try same slot first
            gname = first_nonblank(row, sum([by_base_slot.get((b, slot), []) for b in name_bases], []))
            fname = first_nonblank(row, sum([by_base_slot.get((b, slot), []) for b in father_bases], []))

            # fallback, any-slot in same row (rarely needed, but prevents blanks)
            if gname == "":
                for s in range(1, 61):
                    gname = first_nonblank(row, sum([by_base_slot.get((b, s), []) for b in name_bases], []))
                    if gname:
                        break
            if fname == "":
                for s in range(1, 61):
                    fname = first_nonblank(row, sum([by_base_slot.get((b, s), []) for b in father_bases], []))
                    if fname:
                        break

            # store first non-empty seen for that gid
            if gid not in tracked_info:
                tracked_info[gid] = {"girl_name": gname, "father_name": fname}
            else:
                if tracked_info[gid].get("girl_name", "") == "" and gname != "":
                    tracked_info[gid]["girl_name"] = gname
                if tracked_info[gid].get("father_name", "") == "" and fname != "":
                    tracked_info[gid]["father_name"] = fname

    return tracked_ids, tracked_info, tracked_field


# -------------------------
# Main checks
# -------------------------
def _detect_listed_vs_tracked(listing_df: pd.DataFrame, tracking_df: pd.DataFrame) -> List[dict]:
    issues: List[dict] = []

    expected = _build_expected(listing_df)

    # Unique expected IDs (dedupe listing)
    expected_ids: Set[str] = set()
    expected_first: Dict[str, Dict[str, Any]] = {}
    for e in expected:
        gid = _norm(e.get("girl_id"))
        if gid == "":
            continue
        expected_ids.add(gid)
        if gid not in expected_first:
            expected_first[gid] = e  # keep first occurrence for message/field/value

    tracked_ids, tracked_info, tracked_field = _build_tracking_sets_and_info(tracking_df)

    overlap = expected_ids & tracked_ids
    listed_not_tracked = expected_ids - tracked_ids
    tracked_not_listed = tracked_ids - expected_ids

    print(f"[Listing vs Tracking] Mode: {'ROLLOUT' if rollout_plan else 'PILOT'}")
    print(f"[Listing vs Tracking] Total listed girls (unique IDs): {len(expected_ids)}")
    print(f"[Listing vs Tracking] Total tracked girls (unique IDs): {len(tracked_ids)}")
    print(f"[Listing vs Tracking] Listed & tracked (overlap): {len(overlap)}")
    print(f"[Listing vs Tracking] Total untracked girls (unique IDs): {len(listed_not_tracked)}")
    print(f"[Listing vs Tracking] Tracked but not listed (unique IDs): {len(tracked_not_listed)}")

    # 1) CRITICAL: listed but not tracked
    for gid in sorted(listed_not_tracked):
        e = expected_first.get(gid, {})
        mode_txt = e.get("mode") or ("ROLLOUT (selected girls only)" if rollout_plan else "PILOT (all listed girls)")
        school = _norm(e.get("school"))
        district = _norm(e.get("district"))

        msg_parts = [f"{mode_txt}: Listed girl is missing in tracking survey."]
        if school:
            msg_parts.append(f"school={school}.")
        if district:
            msg_parts.append(f"district={district}.")
        if rollout_plan and _norm(e.get("status")):
            msg_parts.append(f"status={_norm(e.get('status'))}.")

        gname = _norm(e.get("girl_name"))
        fname = _norm(e.get("father_name"))
        msg_parts.append(_value_text(gid, gname, fname))

        issues.append(
            make_issue(
                survey="Listing vs Tracking",
                severity="CRITICAL",
                rule_id="LVT_CR_01",
                title="Listed girl missing in tracking survey",
                message=" ".join(msg_parts),
                field=_norm(e.get("field")) or "girl_id",
                value=_value_text(gid, gname, fname),
                record_key=None,
                instance_id=None,
                enumerator="-",
                enumerator_id="-",
                deviceid="-",
                submission_date="-",
                district=district or None,
            )
        )

    # 2) FLAG: tracked but not listed
    mode_txt_2 = "ROLLOUT (selected girls only)" if rollout_plan else "PILOT (all listed girls)"
    for gid in sorted(tracked_not_listed):
        info = tracked_info.get(gid, {})
        gname = _norm(info.get("girl_name"))
        fname = _norm(info.get("father_name"))

        msg = (
            f"{mode_txt_2}: Girl exists in tracking survey but is not found in listing export. "
            f"{_value_text(gid, gname, fname)}"
        )

        issues.append(
            make_issue(
                survey="Listing vs Tracking",
                severity="FLAG",
                rule_id="LVT_FL_02",
                title="Tracked girl missing in listing survey",
                message=msg,
                field=_norm(tracked_field.get(gid)) or "girl_id",
                value=_value_text(gid, gname, fname),
                record_key=None,
                instance_id=None,
                enumerator="-",
                enumerator_id="-",
                deviceid="-",
                submission_date="-",
                district=None,
            )
        )

    print(f"[Listing vs Tracking] issues={len(issues)}")
    return issues


# -------------------------
# Entrypoint
# -------------------------
def run(listing_df: pd.DataFrame, tracking_df: pd.DataFrame, cfg: dict) -> List[dict]:
    """
    Standard entrypoint called by run_dqa.py.

    Produces:
      - CRITICAL: listed but not tracked
      - FLAG: tracked but not listed
    Uses same make_issue() output format (single combined error log).
    """
    global rollout_plan
    cfg = cfg or {}

    # Optional override from cfg:
    if "rollout_plan" in cfg:
        rollout_plan = bool(cfg["rollout_plan"])

    return _detect_listed_vs_tracked(listing_df, tracking_df)
