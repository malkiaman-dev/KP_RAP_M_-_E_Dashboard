"""
District-wise Enumerator Working Days & Target Achievement Analysis

Rules:
- Working day = any date the enumerator submitted ≥1 form (HH or Girls)
- Daily target = 9 forms (3 Father HH + 3 Mother HH + 3 Girls)
- Target = working_days × 9
- Achievement % = total_forms / target × 100%
- Duplicates removed: same enumerator+date+girl in Girls survey → keep first
- Shazia Bibi (373648) and Shazia begum (373696) counted separately
- Naureen Khan (373716 & 453925) merged as one enumerator
- Shafaq Zahra (373646) + Shafaq.zahra (Sz123) merged → Shafaq Zahra (373646)
- Summiya Hayat (373710) + Summiya Hayat 123 (51020) merged → Summiya Hayat (373710)
- Jaweria (163495) + Javairia (373651) merged → Javairia (373651)
- aisha.aman (752327): only one variant in data, no merge needed
"""

import pandas as pd
from pathlib import Path
import os

DISTRICT_MAP = {1: "D.I. Khan", 2: "Hangu", 3: "Lakki", 4: "Torghar"}
DAILY_TARGET = 9


def load_surveys():
    hh = pd.read_csv(
        "Surveys/Household_Survey.csv",
        usecols=["SubmissionDate", "starttime", "enumerator_name", "enumerator_id",
                 "district", "girl", "respondent", "deviceid", "KEY"],
        encoding="utf-8-sig", low_memory=False,
    )
    gl = pd.read_csv(
        "Surveys/Girls_Survey.csv",
        usecols=["SubmissionDate", "starttime", "enumerator_name", "enumerator_id",
                 "district", "girl", "deviceid", "KEY"],
        encoding="utf-8-sig", low_memory=False,
    )
    for df in (hh, gl):
        sub_dt   = pd.to_datetime(df["SubmissionDate"], format="mixed", errors="coerce")
        start_dt = pd.to_datetime(df["starttime"],      format="mixed", errors="coerce")
        # Use starttime as working date UNLESS it is >30 days away from SubmissionDate
        # (catches impossible values like wrong year, e.g. 2021 instead of 2026)
        diff_days = (sub_dt - start_dt).dt.days.abs()
        use_start = start_dt.notna() & (diff_days <= 30)
        df["date"]     = sub_dt.dt.date                      # default: SubmissionDate
        df.loc[use_start, "date"] = start_dt[use_start].dt.date
        df["sub_date"] = sub_dt.dt.date                      # always SubmissionDate (for comparison)
        df["district_name"] = df["district"].map(DISTRICT_MAP)
        # Normalise all IDs to str so merges stay consistent across mixed-type columns
        df["enumerator_id"]   = df["enumerator_id"].astype(str).str.strip()
        df["enumerator_name"] = df["enumerator_name"].astype(str).str.strip()
        # Naureen Khan: ID 453925 → 373716
        m = df["enumerator_id"] == "453925"
        df.loc[m, "enumerator_name"] = "Naureen Khan"
        df.loc[m, "enumerator_id"]   = "373716"
        # Shafaq.zahra (Sz123) → Shafaq Zahra (373646)
        m = df["enumerator_id"] == "Sz123"
        df.loc[m, "enumerator_name"] = "Shafaq Zahra"
        df.loc[m, "enumerator_id"]   = "373646"
        # Summiya Hayat 123 (51020) → Summiya Hayat (373710)
        m = df["enumerator_id"] == "51020"
        df.loc[m, "enumerator_name"] = "Summiya Hayat"
        df.loc[m, "enumerator_id"]   = "373710"
        # Jaweria (163495) → Javairia (373651)
        m = df["enumerator_id"] == "163495"
        df.loc[m, "enumerator_name"] = "Javairia"
        df.loc[m, "enumerator_id"]   = "373651"
        # Shazia Begum used Shazia Bibi's ID on her own device (e0a09270a3659c9a) on Sep 10-11
        m = (df["deviceid"].astype(str).str.strip() == "e0a09270a3659c9a") & (df["enumerator_id"] == "373648")
        df.loc[m, "enumerator_name"] = "Shazia begum"
        df.loc[m, "enumerator_id"]   = "373696"
    return hh, gl


def deduplicate_girls(gl):
    """Remove duplicate Girls submissions: same enumerator+starttime date+girl → keep first."""
    gl_sorted = gl.sort_values("starttime")
    before = len(gl_sorted)
    gl_dedup = gl_sorted.drop_duplicates(
        subset=["enumerator_name", "enumerator_id", "date", "girl"], keep="first"
    )
    removed = before - len(gl_dedup)
    if removed > 0:
        print(f"  Girls: removed {removed} duplicate submission(s)")
    return gl_dedup


def build_enumerator_key(df):
    """Return clean (name, id) string for grouping."""
    df = df.copy()
    df["enum_key"] = df["enumerator_name"] + "||" + df["enumerator_id"].astype(str)
    return df


def compute_metrics(hh, gl, district_id):
    """Compute per-enumerator working days and form counts for one district."""
    hh_d = hh[hh["district"] == district_id].copy()
    gl_d = gl[gl["district"] == district_id].copy()

    # All enumerators present in this district
    hh_enums = set(zip(hh_d["enumerator_name"], hh_d["enumerator_id"].astype(str)))
    gl_enums = set(zip(gl_d["enumerator_name"], gl_d["enumerator_id"].astype(str)))
    all_enums = sorted(hh_enums | gl_enums, key=lambda x: x[0])

    rows = []
    for (name, eid) in all_enums:
        hh_e = hh_d[(hh_d["enumerator_name"] == name) & (hh_d["enumerator_id"].astype(str) == eid)]
        gl_e = gl_d[(gl_d["enumerator_name"] == name) & (gl_d["enumerator_id"].astype(str) == eid)]

        # Forms by type — count ALL HH rows (father + mother + other/NaN all count toward target)
        father_forms = int((hh_e["respondent"] == 1).sum())
        mother_forms = int((hh_e["respondent"] == 2).sum())
        other_forms  = int((~hh_e["respondent"].isin([1.0, 2.0])).sum())
        girls_forms  = int(len(gl_e))
        total_forms  = father_forms + mother_forms + other_forms + girls_forms

        # Working days based on starttime (primary — actual field day)
        hh_dates = set(hh_e["date"].dropna())
        gl_dates = set(gl_e["date"].dropna())
        all_dates = sorted(hh_dates | gl_dates)
        working_days = len(all_dates)

        # Working days based on SubmissionDate (for comparison / conflict detection)
        hh_sub_dates = set(hh_e["sub_date"].dropna())
        gl_sub_dates = set(gl_e["sub_date"].dropna())
        sub_working_days = len(hh_sub_dates | gl_sub_dates)

        conflict = working_days - sub_working_days  # positive = starttime adds extra days

        target = working_days * DAILY_TARGET
        achievement = round(total_forms / target * 100, 1) if target > 0 else 0.0
        avg_per_day = round(total_forms / working_days, 2) if working_days > 0 else 0.0

        # First and last active date
        first_day = str(min(all_dates)) if all_dates else ""
        last_day = str(max(all_dates)) if all_dates else ""

        rows.append({
            "District": DISTRICT_MAP.get(district_id, str(district_id)),
            "Enumerator Name": name,
            "Enumerator ID": eid,
            "First Active Date": first_day,
            "Last Active Date": last_day,
            "WD (starttime)": working_days,
            "WD (SubmissionDate)": sub_working_days,
            "WD Difference": conflict,
            "Father Forms": father_forms,
            "Mother Forms": mother_forms,
            "Other HH Forms": other_forms,
            "Girls Forms": girls_forms,
            "Total Forms": total_forms,
            "Target (WD x 9)": target,
            "Achievement %": achievement,
            "Avg Forms/Day": avg_per_day,
            "Status": "On/Above Target" if achievement >= 100 else ("Near Target" if achievement >= 70 else "Below Target"),
        })

    return pd.DataFrame(rows)


def build_conflict_report(hh, gl):
    """
    Return a DataFrame listing every form record where starttime date != SubmissionDate.
    Columns: District, Enumerator, ID, Survey, Girl/HH ID, Respondent,
             Start Date, Submission Date, Diff (days), starttime (raw), SubmissionDate (raw)
    """
    rows = []

    # --- Household ---
    for _, r in hh.iterrows():
        if r["date"] == r["sub_date"]:
            continue
        # Both dates present and different
        if pd.isna(r["date"]) or pd.isna(r["sub_date"]):
            continue
        diff = (pd.Timestamp(r["sub_date"]) - pd.Timestamp(r["date"])).days
        resp_map = {1: "Father", 2: "Mother", 3: "Other"}
        resp = resp_map.get(r.get("respondent"), f'Other/NaN')
        rows.append({
            "District":          DISTRICT_MAP.get(int(r["district"]), str(r["district"])),
            "Enumerator Name":   r["enumerator_name"],
            "Enumerator ID":     r["enumerator_id"],
            "Survey":            "Household",
            "Girl / HH ID":      r.get("girl", ""),
            "Respondent":        resp,
            "Start Date":        str(r["date"]),
            "Submission Date":   str(r["sub_date"]),
            "Diff (days)":       diff,
            "starttime (raw)":   r["starttime"],
            "SubmissionDate (raw)": r["SubmissionDate"],
        })

    # --- Girls ---
    for _, r in gl.iterrows():
        if r["date"] == r["sub_date"]:
            continue
        if pd.isna(r["date"]) or pd.isna(r["sub_date"]):
            continue
        diff = (pd.Timestamp(r["sub_date"]) - pd.Timestamp(r["date"])).days
        rows.append({
            "District":          DISTRICT_MAP.get(int(r["district"]), str(r["district"])),
            "Enumerator Name":   r["enumerator_name"],
            "Enumerator ID":     r["enumerator_id"],
            "Survey":            "Girls",
            "Girl / HH ID":      r.get("girl", ""),
            "Respondent":        "Girl",
            "Start Date":        str(r["date"]),
            "Submission Date":   str(r["sub_date"]),
            "Diff (days)":       diff,
            "starttime (raw)":   r["starttime"],
            "SubmissionDate (raw)": r["SubmissionDate"],
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return df
    return df.sort_values(["District", "Enumerator Name", "Start Date"]).reset_index(drop=True)


def build_daily_matrix(hh, gl, district_id):
    """Build enumerator × date matrix showing daily form counts."""
    hh_d = hh[hh["district"] == district_id].copy()
    gl_d = gl[gl["district"] == district_id].copy()

    all_dates = sorted(set(hh_d["date"].dropna()) | set(gl_d["date"].dropna()))

    hh_enums = set(zip(hh_d["enumerator_name"], hh_d["enumerator_id"].astype(str)))
    gl_enums = set(zip(gl_d["enumerator_name"], gl_d["enumerator_id"].astype(str)))
    all_enums = sorted(hh_enums | gl_enums, key=lambda x: x[0])

    matrix_rows = []
    for (name, eid) in all_enums:
        hh_e = hh_d[(hh_d["enumerator_name"] == name) & (hh_d["enumerator_id"].astype(str) == eid)]
        gl_e = gl_d[(gl_d["enumerator_name"] == name) & (gl_d["enumerator_id"].astype(str) == eid)]
        row = {"Enumerator": f"{name} ({eid})"}
        for d in all_dates:
            hh_count = int(len(hh_e[hh_e["date"] == d]))
            gl_count = int(len(gl_e[gl_e["date"] == d]))
            total = hh_count + gl_count
            row[str(d)] = total if total > 0 else ""
        matrix_rows.append(row)

    return pd.DataFrame(matrix_rows)


def save_excel(summary_df, district_dfs, matrix_dfs, conflict_df, out_path):
    with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
        # Summary sheet — all districts
        summary_df.to_excel(writer, sheet_name="All Districts Summary", index=False)

        # Per-district sheets
        for dist_id, (name, df) in district_dfs.items():
            sheet_name = name.replace(".", "").replace(" ", "_")[:31]
            df.to_excel(writer, sheet_name=sheet_name, index=False)

        # Daily matrix sheets
        for dist_id, (name, mdf) in matrix_dfs.items():
            sheet_name = f"{name.replace('.','').replace(' ','_')[:25]}_Daily"[:31]
            mdf.to_excel(writer, sheet_name=sheet_name, index=False)

        # Conflict detail sheet
        if not conflict_df.empty:
            conflict_df.to_excel(writer, sheet_name="Date Conflicts", index=False)

    # Apply formatting
    from openpyxl import load_workbook
    from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = load_workbook(out_path)

    HEADER_FILL = PatternFill("solid", fgColor="2C5F7A")
    GREEN_FILL = PatternFill("solid", fgColor="D6F4E0")
    AMBER_FILL = PatternFill("solid", fgColor="FFF3CD")
    RED_FILL = PatternFill("solid", fgColor="FBEAEA")
    ALT_FILL = PatternFill("solid", fgColor="F6F7F5")

    def style_sheet(ws, status_col_idx=None):
        # Header row
        for cell in ws[1]:
            cell.fill = HEADER_FILL
            cell.font = Font(bold=True, color="FFFFFF", size=10)
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        # Auto-width
        for col in ws.columns:
            max_len = max((len(str(c.value)) if c.value is not None else 0) for c in col)
            ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 3, 30)

        # Data rows
        for i, row in enumerate(ws.iter_rows(min_row=2), start=2):
            fill = ALT_FILL if i % 2 == 0 else PatternFill("solid", fgColor="FFFFFF")
            status_val = ""
            if status_col_idx:
                try:
                    status_val = str(ws.cell(row=i, column=status_col_idx).value or "")
                except Exception:
                    pass
            if "Below Target" in status_val:
                fill = RED_FILL
            elif "Near Target" in status_val:
                fill = AMBER_FILL
            elif "On/Above Target" in status_val:
                fill = GREEN_FILL
            for cell in row:
                cell.fill = fill
                cell.alignment = Alignment(horizontal="center", vertical="center")

        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions

    ORANGE_FILL = PatternFill("solid", fgColor="FFD0A0")   # large gap (>3 days)
    YELLOW_FILL = PatternFill("solid", fgColor="FFFACD")   # small gap (1-3 days)

    def style_conflict_sheet(ws):
        """Special styling for the Date Conflicts sheet."""
        # Header
        for cell in ws[1]:
            cell.fill = PatternFill("solid", fgColor="8B2500")
            cell.font = Font(bold=True, color="FFFFFF", size=10)
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        # Find the "Diff (days)" column index
        diff_col_idx = None
        for cell in ws[1]:
            if cell.value and "Diff" in str(cell.value):
                diff_col_idx = cell.column
                break

        # Auto-width
        for col in ws.columns:
            max_len = max((len(str(c.value)) if c.value is not None else 0) for c in col)
            ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 3, 35)

        # Data rows — colour by gap size
        for i, row in enumerate(ws.iter_rows(min_row=2), start=2):
            diff_val = 0
            if diff_col_idx:
                try:
                    diff_val = int(ws.cell(row=i, column=diff_col_idx).value or 0)
                except (ValueError, TypeError):
                    diff_val = 0
            if abs(diff_val) > 3:
                fill = ORANGE_FILL
            else:
                fill = YELLOW_FILL
            for cell in row:
                cell.fill = fill
                cell.alignment = Alignment(horizontal="center", vertical="center")

        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions

    for ws_name in wb.sheetnames:
        ws = wb[ws_name]
        if ws_name == "Date Conflicts":
            style_conflict_sheet(ws)
        else:
            status_idx = None
            for cell in ws[1]:
                if cell.value and "Status" in str(cell.value):
                    status_idx = cell.column
                    break
            style_sheet(ws, status_col_idx=status_idx)

    wb.save(out_path)
    print(f"\nSaved: {out_path}")


def main():
    print("Loading surveys...")
    hh, gl = load_surveys()

    print("Deduplicating Girls survey...")
    gl = deduplicate_girls(gl)

    district_ids = sorted(hh["district"].dropna().unique().tolist())
    all_rows = []
    district_dfs = {}
    matrix_dfs = {}

    for dist_id in district_ids:
        dist_id = int(dist_id)
        dname = DISTRICT_MAP.get(dist_id, str(dist_id))
        print(f"\nProcessing {dname}...")
        df = compute_metrics(hh, gl, dist_id)
        df_sorted = df.sort_values(["Enumerator Name"])
        district_dfs[dist_id] = (dname, df_sorted)
        all_rows.append(df_sorted)

        mdf = build_daily_matrix(hh, gl, dist_id)
        matrix_dfs[dist_id] = (dname, mdf)

        print(f"  {len(df_sorted)} enumerators, {df_sorted['WD (starttime)'].sum()} total working days")
        print(f"  {'Enumerator':<25} {'WD(start)':>9} {'WD(sub)':>8} {'Diff':>5} {'Forms':>6} {'Target':>7} {'Achiev%':>8}")
        for _, row in df_sorted.iterrows():
            diff = row['WD Difference']
            flag = " <-- CONFLICT" if diff != 0 else ""
            print(f"    {row['Enumerator Name']:<25} {row['WD (starttime)']:>9} {row['WD (SubmissionDate)']:>8} "
                  f"{diff:>5} {row['Total Forms']:>6} {row['Target (WD x 9)']:>7} {row['Achievement %']:>8}{flag}")

    summary_df = pd.concat(all_rows, ignore_index=True)

    print("\nBuilding date conflict report...")
    conflict_df = build_conflict_report(hh, gl)
    print(f"  {len(conflict_df)} conflicting records found across all districts")

    out_path = "Error_log/Working_Days_Analysis.xlsx"
    os.makedirs("Error_log", exist_ok=True)
    save_excel(summary_df, district_dfs, matrix_dfs, conflict_df, out_path)


if __name__ == "__main__":
    main()
