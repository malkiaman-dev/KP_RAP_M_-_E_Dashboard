# checks/tracking_vs_household.py
from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Dict, Set, Tuple, Optional, List

import pandas as pd
from utils.logging import make_issue

# ------------------------------------------------------------
# Normalization & similarity helpers
# ------------------------------------------------------------

_re_non_alnum = re.compile(r"[^a-z0-9]+")

STOP_TOKENS = {
    "m", "md", "muhammad", "mohammad", "mohammed",
    "khan", "syed", "sayed", "jan", "gul", "bibi", "begum",
}


def _clean_cols(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip().lstrip("\ufeff") for c in df.columns]
    return df


def _norm_raw(x) -> str:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return ""
    return str(x).strip()


def _clean_text(x) -> str:
    s = _norm_raw(x).lower()
    s = _re_non_alnum.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def _tokenize_name(s: str) -> str:
    return " ".join(
        t for t in _clean_text(s).split()
        if t not in STOP_TOKENS and len(t) > 1
    )


def _similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio() * 100.0


def _norm_id(x) -> str:
    # "3-25968-23-bce74df4-1" -> "3 25968 23 bce74df4 1"
    return _clean_text(x)


# ------------------------------------------------------------
# Dedup helpers
# ------------------------------------------------------------

def _severity_rank(level: str) -> int:
    return 0 if level == "CRITICAL" else 1


def _entity_key(record_key, instance_id, slot: int) -> str:
    base = record_key or instance_id or "NO_ID"
    return f"{base}|SLOT:{slot}"


def _add_issue(bucket: Dict[str, dict], entity_key: str, issue: dict, level: str, rule_id: str):
    rank = (_severity_rank(level), rule_id)
    if entity_key not in bucket or rank < bucket[entity_key]["rank"]:
        bucket[entity_key] = {"issue": issue, "rank": rank}


# ------------------------------------------------------------
# Slot detection
# ------------------------------------------------------------

def _detect_slots(df: pd.DataFrame) -> List[int]:
    slot_nums = set()
    for c in df.columns:
        if c.startswith("new_name_"):
            try:
                slot_nums.add(int(c.replace("new_name_", "")))
            except Exception:
                pass

    if not slot_nums and "new_name" in df.columns:
        slot_nums = {1}

    return sorted(slot_nums)


# ------------------------------------------------------------
# Tracking status stats ONLY (what you asked for)
# ------------------------------------------------------------

def _count_tracking_status(df: pd.DataFrame) -> tuple[int, int]:
    """
    Returns:
      (successfully_tracked, not_successfully_tracked)

    Successfully tracked:
      filled name+father AND house_found==1 AND girl_found in [1,2,3]

    Not successfully tracked:
      filled name+father BUT not successful
    """
    slot_nums = _detect_slots(df)

    if "house_found" not in df.columns or "girl_found" not in df.columns:
        return 0, 0

    success = 0
    not_success = 0

    for slot in slot_nums:
        def col(name):
            if f"{name}_{slot}" in df.columns:
                return f"{name}_{slot}"
            if slot == 1 and name in df.columns:
                return name
            return None

        name_col = col("new_name")
        father_col = col("new_father_name")
        if not name_col or not father_col:
            continue

        filled = df[name_col].notna() & df[father_col].notna()
        successful = filled & (df["house_found"] == 1) & (df["girl_found"].isin([1, 2, 3]))

        success += int(successful.sum())
        not_success += int((filled & ~successful).sum())

    return success, not_success


# ------------------------------------------------------------
# Tracking explode (successfully tracked girls only)
# ------------------------------------------------------------

def _explode_tracking_confirmed(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    slot_nums = _detect_slots(df)

    if "house_found" not in df.columns or "girl_found" not in df.columns:
        return pd.DataFrame()

    for slot in slot_nums:
        def col(name):
            if f"{name}_{slot}" in df.columns:
                return f"{name}_{slot}"
            if slot == 1 and name in df.columns:
                return name
            return None

        name_col = col("new_name")
        father_col = col("new_father_name")
        if not name_col or not father_col:
            continue

        tmp = df[
            (df[name_col].notna()) &
            (df[father_col].notna()) &
            (df["house_found"] == 1) &
            (df["girl_found"].isin([1, 2, 3]))
        ].copy()

        if tmp.empty:
            continue

        tmp["slot"] = slot
        tmp["trk_row"] = tmp.index
        tmp["name"] = tmp[name_col]
        tmp["father"] = tmp[father_col]
        rows.append(tmp)

    if not rows:
        return pd.DataFrame()

    return pd.concat(rows, ignore_index=True)


# ------------------------------------------------------------
# Household preparation (ID in column "girl")
# ------------------------------------------------------------

def _prepare_household(df: pd.DataFrame) -> pd.DataFrame:
    df = _clean_cols(df)

    if "girl" not in df.columns:
        return pd.DataFrame(columns=["girl_id", "girl", "father", "girl_id_n", "girl_tok", "father_tok"])

    out = pd.DataFrame({
        "girl_id": df["girl"],
        "girl": df.get("girlname_label", ""),
        "father": df.get("fathername_label", ""),
    })

    out["girl_id_n"] = out["girl_id"].map(_norm_id)
    out["girl_tok"] = out["girl"].map(_tokenize_name)
    out["father_tok"] = out["father"].map(_tokenize_name)

    return out[out["girl_id_n"] != ""]


# ------------------------------------------------------------
# Tracking girl ID extractor (use girl_{slot})
# ------------------------------------------------------------

def _get_tracking_slot_girl_id(tracking_df: pd.DataFrame, row_idx: int, slot: int) -> Tuple[str, str]:
    raw = None

    col_a = f"girl_{slot}"
    col_b = f"girl_id_{slot}"

    if col_b in tracking_df.columns:
        raw = tracking_df.at[row_idx, col_b]
    elif col_a in tracking_df.columns:
        raw = tracking_df.at[row_idx, col_a]
    else:
        raw = None

    raw_s = _norm_raw(raw)
    return raw_s, _norm_id(raw_s)


def _best_household_match(trk_name: str, trk_father: str, hh: pd.DataFrame) -> Tuple[float, Optional[str]]:
    tn = _tokenize_name(trk_name)
    tf = _tokenize_name(trk_father)

    best = 0.0
    best_id = None

    for _, h in hh.iterrows():
        gsim = _similarity(tn, h["girl_tok"])
        fsim = _similarity(tf, h["father_tok"])
        score = 0.65 * gsim + 0.35 * fsim

        if score > best:
            best = score
            best_id = h["girl_id_n"]

        if gsim >= 95 and fsim >= 90:
            return 100.0, h["girl_id_n"]

    return best, best_id


# ------------------------------------------------------------
# MAIN
# ------------------------------------------------------------

def run(tracking_df: pd.DataFrame, household_df: pd.DataFrame, cfg: dict | None = None) -> List[dict]:
    """
    Outputs ONLY:
      1) Successfully tracked slot but household missing
      2) Household exists but not in successfully tracked slots

    Also prints ONLY the stats you asked for:
      - total successfully tracked girls
      - total not successfully tracked girls
    """
    cfg = cfg or {}
    chosen: Dict[str, dict] = {}

    accept = float(cfg.get("hh_name_father_accept", 75))
    reverse_severity = str(cfg.get("household_not_in_tracking_severity", "FLAG")).upper()
    if reverse_severity not in {"FLAG", "CRITICAL"}:
        reverse_severity = "FLAG"

    use_name_father_fallback = bool(cfg.get("use_name_father_fallback", True))

    tracking_df = _clean_cols(tracking_df)
    household_df = _clean_cols(household_df)

    # ---- ONLY tracking status stats (terminal) ----
    successfully_tracked, not_successfully_tracked = _count_tracking_status(tracking_df)

    print("\n========== TRACKING STATUS ==========")
    print(f"Successfully tracked girls : {successfully_tracked}")
    print(f"Not successfully tracked   : {not_successfully_tracked}")
    print("====================================\n")

    # ---- comparison logic (unchanged) ----
    trk = _explode_tracking_confirmed(tracking_df)
    hh = _prepare_household(household_df)

    if trk.empty and hh.empty:
        return []

    key_col = "KEY" if "KEY" in tracking_df.columns else None
    inst_col = "instanceID" if "instanceID" in tracking_df.columns else None
    district_col = "district" if "district" in tracking_df.columns else None

    matched_hh_ids_n: Set[str] = set()

    # 1) Tracking -> Household
    for _, r in trk.iterrows():
        slot = int(r["slot"])
        trk_row = int(r["trk_row"])

        rk = tracking_df.at[trk_row, key_col] if key_col else None
        inst = tracking_df.at[trk_row, inst_col] if inst_col else None
        district_val = tracking_df.at[trk_row, district_col] if district_col else None
        entity = _entity_key(rk, inst, slot)

        trk_id_raw, trk_id_n = _get_tracking_slot_girl_id(tracking_df, trk_row, slot)

        if trk_id_n and (hh["girl_id_n"] == trk_id_n).any():
            matched_hh_ids_n.add(trk_id_n)
            continue

        if use_name_father_fallback and not hh.empty:
            best, best_id_n = _best_household_match(r["name"], r["father"], hh)
            if best_id_n and best >= accept:
                matched_hh_ids_n.add(best_id_n)
                continue

        issue = make_issue(
            survey="Tracking vs Household",
            severity="CRITICAL",
            rule_id="TRK_HH_CR_TRACKED_BUT_HH_MISSING",
            title="Successfully tracked but household missing",
            message="Girl is successfully tracked but no matching household survey was found.",
            field="tracking_vs_household",
            value=(
                f"girl_id={trk_id_raw} | "
                f"girl_name={_norm_raw(r['name'])} | "
                f"father_name={_norm_raw(r['father'])}"
            ),
            record_key=rk,
            instance_id=inst,
            enumerator="-",
            enumerator_id="-",
            deviceid="-",
            submission_date="-",
            district=district_val,
        )
        _add_issue(chosen, entity, issue, "CRITICAL", "TRK_HH_CR_TRACKED_BUT_HH_MISSING")

    # 2) Household -> Tracking
    if not hh.empty:
        seen: Set[str] = set()
        for _, row in hh.iterrows():
            gid_n = row.get("girl_id_n", "")
            if not gid_n or gid_n in seen:
                continue
            seen.add(gid_n)

            if gid_n in matched_hh_ids_n:
                continue

            issue = make_issue(
                survey="Tracking vs Household",
                severity=reverse_severity,
                rule_id="TRK_HH_QF_HH_EXISTS_NOT_TRACKED",
                title="Household exists but not successfully tracked",
                message="Household survey exists but the girl is not present in the successfully tracked set.",
                field="tracking_vs_household",
                value=(
                    f"girl_id={_norm_raw(row.get('girl_id'))} | "
                    f"girl_name={_norm_raw(row.get('girl'))} | "
                    f"father_name={_norm_raw(row.get('father'))}"
                ),
                record_key="-",
                instance_id="-",
                enumerator="-",
                enumerator_id="-",
                deviceid="-",
                submission_date="-",
                district="-",
            )
            _add_issue(chosen, f"HH_GIRL_ID|{gid_n}", issue, reverse_severity, "TRK_HH_QF_HH_EXISTS_NOT_TRACKED")

    return [v["issue"] for v in chosen.values()]
