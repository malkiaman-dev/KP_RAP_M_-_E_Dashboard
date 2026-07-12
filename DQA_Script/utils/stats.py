from __future__ import annotations

import pandas as pd


# ------------------------------------------------------------
# Column picking helpers
# ------------------------------------------------------------
def _pick_col(df: pd.DataFrame, *names: str) -> str | None:
    for n in names:
        if n and n in df.columns:
            return n
    return None


def _ensure_cols(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    out = df.copy()
    for c in cols:
        if c not in out.columns:
            out[c] = pd.NA
    return out


def _norm_severity_series(s: pd.Series) -> pd.Series:
    x = s.astype(str).str.strip().str.upper()
    x = x.replace(
        {
            "ERROR": "CRITICAL",
            "ERR": "CRITICAL",
            "CRIT": "CRITICAL",
            "WARNING": "FLAG",
            "WARN": "FLAG",
            "QUALITY": "FLAG",
        }
    )
    x = x.replace({"NAN": ""})
    return x.where(x.ne(""), other="FLAG")


# ------------------------------------------------------------
# 1) ERROR RATE BY ENUMERATOR
# ------------------------------------------------------------
def error_rate_by_enumerator(error_log: pd.DataFrame) -> pd.DataFrame:
    if error_log is None or error_log.empty:
        return pd.DataFrame(
            columns=["enumerator_name", "enumerator_id", "total_issues", "critical_issues", "flag_issues"]
        )

    df = error_log.copy()
    df = _ensure_cols(df, ["survey", "rule_id", "severity", "enumerator_name", "enumerator_id"])

    df["severity"] = _norm_severity_series(df["severity"])

    # Ensure enumerator_id is nullable int (prevents FutureWarning)
    df["enumerator_id"] = pd.to_numeric(df["enumerator_id"], errors="coerce").astype("Int64")

    # Give meaning to unassigned rows (mostly cross-survey checks)
    mask_unassigned = (
        df["enumerator_name"].isna()
        | (df["enumerator_name"].astype(str).str.strip() == "")
        | (df["enumerator_name"].astype(str).str.strip() == "-")
    )

    df.loc[mask_unassigned, "enumerator_name"] = df.loc[mask_unassigned, "survey"].apply(
        lambda s: f"UNASSIGNED ({s})" if pd.notna(s) and str(s).strip() else "UNASSIGNED (Unknown)"
    )

    # Do NOT assign "-" into an integer column
    df.loc[mask_unassigned, "enumerator_id"] = pd.NA

    g = df.groupby(["enumerator_name", "enumerator_id"], dropna=False)

    out = g.agg(
        total_issues=("rule_id", "count"),
        critical_issues=("severity", lambda s: (s == "CRITICAL").sum()),
        flag_issues=("severity", lambda s: (s == "FLAG").sum()),
    ).reset_index()

    return out.sort_values(["critical_issues", "total_issues"], ascending=False)


# ------------------------------------------------------------
# 2) SURVEY ISSUE SUMMARY
# ------------------------------------------------------------
def survey_issue_summary(error_log: pd.DataFrame) -> pd.DataFrame:
    if error_log is None or error_log.empty:
        return pd.DataFrame(columns=["survey", "total_issues", "critical_issues", "flag_issues"])

    df = error_log.copy()
    df = _ensure_cols(df, ["survey", "rule_id", "severity"])
    df["severity"] = _norm_severity_series(df["severity"])

    g = df.groupby(["survey"], dropna=False)

    out = g.agg(
        total_issues=("rule_id", "count"),
        critical_issues=("severity", lambda s: (s == "CRITICAL").sum()),
        flag_issues=("severity", lambda s: (s == "FLAG").sum()),
    ).reset_index()

    return out.sort_values(["critical_issues", "total_issues"], ascending=False)


# ------------------------------------------------------------
# 3) ENUMERATOR ERROR % (ALL SURVEYS, UNIQUE KEY)
# ------------------------------------------------------------
def enumerator_error_percentage_all_surveys(
    error_log: pd.DataFrame,
    dfs: dict[str, pd.DataFrame],
) -> pd.DataFrame:
    """
    Calculates enumerator error percentage using:
    - Denominator: unique submission keys across ALL surveys per enumerator
      (record_key/KEY/key, fallback to instance_id if record key missing)
    - Numerator: total / critical / flag issues

    Cross-survey UNASSIGNED rows are excluded.

    This version is robust to SurveyCTO exports:
    - record_key can be record_key/KEY/key, fallback instance_id
    - enumerator_name can be enumerator_name/enumerator/Enumerator
    - enumerator_id can be enumerator_id/enumeratorid/Enumerator_id/EnumeratorID
    """

    if dfs is None:
        dfs = {}

    submissions: list[pd.DataFrame] = []

    for survey_name, df0 in dfs.items():
        if df0 is None or df0.empty:
            continue

        df = df0.copy()

        key_col = _pick_col(df, "record_key", "KEY", "key")
        if not key_col:
            key_col = _pick_col(df, "instance_id", "instanceID", "instanceid")

        enum_col = _pick_col(df, "enumerator_name", "enumerator", "Enumerator")
        enum_id_col = _pick_col(df, "enumerator_id", "enumeratorid", "Enumerator_id", "EnumeratorID")

        if not key_col or not enum_col:
            continue

        # Ensure enumerator_id is nullable int if present
        if enum_id_col:
            df[enum_id_col] = pd.to_numeric(df[enum_id_col], errors="coerce").astype("Int64")
        else:
            df["__enumerator_id__"] = pd.NA
            enum_id_col = "__enumerator_id__"

        tmp = df[[enum_col, enum_id_col, key_col]].copy()
        tmp = tmp.rename(
            columns={
                enum_col: "enumerator_name",
                enum_id_col: "enumerator_id",
                key_col: "record_key",
            }
        )

        tmp["record_key"] = tmp["record_key"].astype(str).replace("nan", "").str.strip()
        tmp = tmp[tmp["record_key"] != ""]

        tmp = (
            tmp.groupby(["enumerator_name", "enumerator_id"], dropna=False)["record_key"]
            .nunique()
            .reset_index(name="total_submissions")
        )

        submissions.append(tmp)

    if not submissions:
        return pd.DataFrame(
            columns=[
                "enumerator_name",
                "enumerator_id",
                "total_submissions",
                "total_issues",
                "critical_issues",
                "flag_issues",
                "error_pct",
                "critical_error_pct",
                "flag_error_pct",
            ]
        )

    submissions_df = (
        pd.concat(submissions, ignore_index=True)
        .groupby(["enumerator_name", "enumerator_id"], dropna=False)
        .agg(total_submissions=("total_submissions", "sum"))
        .reset_index()
    )

    # Issue counts
    issues_df = error_rate_by_enumerator(error_log)

    # Remove cross-survey unassigned rows
    issues_df = issues_df[~issues_df["enumerator_name"].fillna("").astype(str).str.startswith("UNASSIGNED")]

    out = submissions_df.merge(
        issues_df,
        on=["enumerator_name", "enumerator_id"],
        how="left",
    )

    out[["total_issues", "critical_issues", "flag_issues"]] = (
        out[["total_issues", "critical_issues", "flag_issues"]].fillna(0).astype(int)
    )

    out["total_submissions"] = pd.to_numeric(out["total_submissions"], errors="coerce").fillna(0).astype(int)
    out.loc[out["total_submissions"] < 0, "total_submissions"] = 0

    denom = out["total_submissions"].replace({0: pd.NA})

    out["error_pct"] = (out["total_issues"] / denom * 100).round(2)
    out["critical_error_pct"] = (out["critical_issues"] / denom * 100).round(2)
    out["flag_error_pct"] = (out["flag_issues"] / denom * 100).round(2)

    out[["error_pct", "critical_error_pct", "flag_error_pct"]] = out[
        ["error_pct", "critical_error_pct", "flag_error_pct"]
    ].fillna(0)

    return out.sort_values(["error_pct", "total_issues"], ascending=False)
