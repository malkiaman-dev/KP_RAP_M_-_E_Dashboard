from __future__ import annotations

from datetime import datetime
from typing import Any

import pandas as pd


# ------------------------------------------------------------
# District mapping (central, single source of truth)
# ------------------------------------------------------------
DISTRICT_MAP = {
    1: "D.I. Khan",
    2: "Hangu",
    3: "Lakki",
    4: "Torghar",
}


def make_issue(
    survey: str,
    severity: str,
    rule_id: str,
    title: str,
    message: str,
    field: str,
    value: Any,
    record_key: Any = None,
    instance_id: Any = None,
    enumerator: Any = None,
    enumerator_id: Any = None,
    deviceid: Any = None,
    submission_date: Any = None,
    district: Any = None,
    **extra: Any,
) -> dict:
    issue = {
        "survey": survey,
        "severity": severity,
        "rule_id": rule_id,
        "title": title,
        "message": message,
        "field": field,
        "value": value,
        "record_key": record_key,
        "instance_id": instance_id,
        "enumerator_name": enumerator,
        "enumerator_id": enumerator_id,
        "deviceid": deviceid,
        "submission_date": submission_date,
        "district": district,
        "created_at": datetime.now().strftime("%b %d, %Y %I:%M:%S %p"),
    }

    # append any extra metadata without breaking older code
    for k, v in extra.items():
        issue[k] = "" if v is None else v

    return issue


def add_issue(
    issues: list[dict],
    *,
    survey: str,
    severity: str,
    rule_id: str,
    title: str,
    cause: str,        # message = cause + criteria (your standard)
    field: str,        # exact columns, comma separated
    value: Any,        # short evidence only
    record_key: Any = None,
    instance_id: Any = None,
    enumerator: Any = None,
    enumerator_id: Any = None,
    deviceid: Any = None,
    submission_date: Any = None,
    district: Any = None,
    **extra: Any,
) -> None:
    """
    Standard issue writer (keeps your final format consistent everywhere).
    - title: short type of error
    - cause: message (why, criteria)
    - field: exact field names
    - value: short evidence
    """
    issues.append(make_issue(
        survey=survey,
        severity=severity,
        rule_id=rule_id,
        title=title,
        message=cause,
        field=field,
        value=value,
        record_key=record_key,
        instance_id=instance_id,
        enumerator=enumerator,
        enumerator_id=enumerator_id,
        deviceid=deviceid,
        submission_date=submission_date,
        district=district,
        **extra,
    ))


def _norm_severity(x: Any) -> str:
    s = "" if x is None else str(x).strip().upper()

    if s in {"ERROR", "ERR", "CRIT", "CRITICAL"}:
        return "CRITICAL"
    if s in {"WARNING", "WARN", "QUALITY", "FLAG"}:
        return "FLAG"
    if s in {"ANOMALY", "IMPLAUSIBLE", "TECHNICAL", "TECH"}:
        return "ANOMALY"
    if s in {"NOTE", "INFO"}:
        return "INFO"

    return s if s else "FLAG"


def issues_to_df(issues: list[dict]) -> pd.DataFrame:
    if not issues:
        cols = [
            "survey", "district", "record_key", "severity", "rule_id",
            "title", "message", "field", "value",
            "enumerator_name", "enumerator_id",
            "deviceid", "submission_date",
            "created_at",
        ]
        return pd.DataFrame(columns=cols)

    df = pd.DataFrame(issues)

    # Ensure record_key exists, if missing use instance_id as fallback
    if "record_key" not in df.columns:
        df["record_key"] = None
    if "instance_id" in df.columns:
        df["record_key"] = df["record_key"].fillna(df["instance_id"])

    # Backward compatibility: accept old "enumerator" column too
    if "enumerator_name" not in df.columns and "enumerator" in df.columns:
        df["enumerator_name"] = df["enumerator"]
    elif "enumerator" in df.columns:
        df["enumerator_name"] = df["enumerator_name"].fillna(df["enumerator"])

    # Clean enumerator_name (remove id in brackets, keep only name)
    if "enumerator_name" in df.columns:
        df["enumerator_name"] = (
            df["enumerator_name"]
            .astype(str)
            .str.replace(r"\s*\(.*?\)\s*", "", regex=True)
            .str.strip()
        )
        df.loc[df["enumerator_name"].isin({"None", "nan", ""}), "enumerator_name"] = None

    required = [
        "survey", "district",
        "severity", "rule_id", "title", "message",
        "field", "value",
        "record_key",
        "enumerator_name", "enumerator_id",
        "deviceid", "submission_date",
        "created_at",
    ]
    for c in required:
        if c not in df.columns:
            df[c] = None

    # ------------------------------------------------------------
    # Normalize district: ID -> Name
    # ------------------------------------------------------------
    def _district_to_name(x: Any) -> Any:
        if x is None:
            return None
        try:
            xi = int(float(str(x).strip()))
        except Exception:
            return x
        return DISTRICT_MAP.get(xi, x)

    df["district"] = df["district"].map(_district_to_name)

    df["severity"] = df["severity"].map(_norm_severity)

    sev_order = {"CRITICAL": 0, "FLAG": 1, "INFO": 2}
    df["_sev_rank"] = df["severity"].map(lambda s: sev_order.get(str(s), 9))

    df = df.sort_values(
        by=["_sev_rank", "survey", "rule_id"],
        kind="stable"
    ).drop(columns=["_sev_rank"])

    # ------------------------------------------------------------
    # ✅ FINAL COLUMN ORDER (professional error log layout)
    # ------------------------------------------------------------
    ORDER = [
        "survey",
        "district",
        "record_key",
        "severity",
        "rule_id",
        "title",
        "message",
        "field",
        "value",
        "enumerator_name",
        "enumerator_id",
        "deviceid",
        "submission_date",
        "created_at",
    ]

    df = df[[c for c in ORDER if c in df.columns]]

    return df


# ------------------------------------------------------------
# Renaming feature (use this ONLY for the Excel "errors" sheet)
# ------------------------------------------------------------
def rename_error_log_headers(df: pd.DataFrame) -> pd.DataFrame:
    header_map = {
        "survey": "Survey",
        "district": "District",
        "record_key": "Record Key",
        "severity": "Severity",
        "rule_id": "Rule ID",
        "title": "Title",
        "message": "Message",
        "field": "Field",
        "value": "Value",
        "enumerator_name": "Enumerator Name",
        "enumerator_id": "Enumerator ID",
        "deviceid": "Device ID",
        "submission_date": "Submission Date",
        "created_at": "Created At",
    }
    return df.rename(columns=header_map)


def rename_by_survey_headers(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns={
        "survey": "Survey",
        "total_issues": "Total Issues",
        "critical_issues": "Critical Issues",
        "flag_issues": "Flag Issues",
        "info_issues": "Info Issues",
    })


def rename_by_enumerator_headers(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns={
        "enumerator_name": "Enumerator Name",
        "enumerator_id": "Enumerator ID",
        "total_issues": "Total Issues",
        "critical_issues": "Critical Issues",
        "flag_issues": "Flag Issues",
        "info_issues": "Info Issues",
        "critical_rate": "Critical Rate",
    })
