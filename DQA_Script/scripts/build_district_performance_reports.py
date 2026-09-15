"""
District Team Performance Report — Household (Father/Mother) & Girls survey
activity, D.I. Khan and Hangu only, built directly from the raw submission
files (Surveys/Household_Survey.csv, Surveys/Girls_Survey.csv).

Produces two separate documents, one per district:
  - DI_Khan_Team_Performance_Report.docx
  - Hangu_Team_Performance_Report.docx

Daily target: 3 Households per enumerator per day = 3 Father interviews +
3 Mother interviews + 3 Girl interviews = 9 forms/day/enumerator.
"""

import pandas as pd
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

from wajah_hal_common import (
    shade_cell, set_cell_margins, no_borders, tbl_borders_light, add_run,
    TEAL_DEEP, TEAL, AMBER, GREEN, INK, INK_SOFT, WHITE,
    AMBER_FILL, GREEN_FILL, TEAL_FILL, HEADER_FILL, CHIP_FILL,
)
from docx.shared import RGBColor

RED = RGBColor(0xB4, 0x2A, 0x2A)
RED_FILL = "FBEAEA"
RED_HEADER_HEX = "B42A2A"
GREEN_HEADER_HEX = "2F7A44"
AMBER_HEADER_HEX = "A15C12"

DAILY_TARGET_HH = 3       # households per enumerator per day
DAILY_TARGET_FORMS = 9    # 3 father + 3 mother + 3 girl forms

DISTRICT_MAP = {1: "D.I. Khan", 2: "Hangu", 3: "Lakki", 4: "Torghar"}
TARGET_DISTRICT_IDS = {"D.I. Khan": 1, "Hangu": 2}


# ---------------------------------------------------------------------------
# Data loading / computation
# ---------------------------------------------------------------------------

def load_data():
    hh = pd.read_csv(
        "Surveys/Household_Survey.csv",
        usecols=["SubmissionDate", "enumerator", "enumerator_id", "enumerator_name",
                 "district", "village_label", "girl", "respondent"],
        encoding="utf-8-sig", low_memory=False,
    )
    gl = pd.read_csv(
        "Surveys/Girls_Survey.csv",
        usecols=["SubmissionDate", "enumerator", "enumerator_id", "enumerator_name",
                 "district", "village_label", "girl"],
        encoding="utf-8-sig", low_memory=False,
    )
    for df in (hh, gl):
        df["district_name"] = df["district"].map(DISTRICT_MAP)
        df["date"] = pd.to_datetime(df["SubmissionDate"], format="mixed", errors="coerce").dt.date

    def norm_name(row):
        if row["enumerator_id"] == 453925:
            return "Naureen Khan"
        return str(row["enumerator_name"]).strip()

    hh["enum_name"] = hh.apply(norm_name, axis=1)
    gl["enum_name"] = gl.apply(norm_name, axis=1)
    return hh, gl


def canonical_ids(hh, gl):
    both = pd.concat([hh[["enum_name", "enumerator_id"]], gl[["enum_name", "enumerator_id"]]])
    out = {}
    for name, g in both.groupby("enum_name"):
        ids = sorted(set(int(i) for i in g["enumerator_id"].dropna().tolist()))
        ids = [i for i in ids if i != 453925] or ids
        out[name] = ids[0] if ids else None
    return out


def build_metrics(hh, gl, district):
    did = TARGET_DISTRICT_IDS[district]
    hh_d = hh[hh["district"] == did].copy()
    gl_d = gl[gl["district"] == did].copy()
    ids = canonical_ids(hh_d, gl_d)

    field_dates = sorted(set(hh_d["date"].dropna()) | set(gl_d["date"].dropna()))
    first_day = field_dates[0]
    last_day = field_dates[-1]

    enum_names = sorted(set(hh_d["enum_name"]) | set(gl_d["enum_name"]))

    rows = {}
    for name in enum_names:
        hh_e = hh_d[hh_d["enum_name"] == name]
        gl_e = gl_d[gl_d["enum_name"] == name]
        per_day = {}
        for d in field_dates:
            hh_day = hh_e[hh_e["date"] == d]
            father = int((hh_day["respondent"] == 1).sum())
            mother = int((hh_day["respondent"] == 2).sum())
            other = int((hh_day["respondent"] == 3).sum()) + int(hh_day["respondent"].isna().sum())
            girls = int((gl_e["date"] == d).sum())
            hh_covered = int(hh_day["girl"].nunique())
            per_day[d] = {
                "father": father, "mother": mother, "other": other,
                "girls": girls, "total": father + mother + other + girls,
                "hh_covered": hh_covered,
            }
        field_days = [d for d, v in per_day.items() if v["total"] > 0]
        total_forms = sum(v["total"] for v in per_day.values())
        rows[name] = {
            "id": ids.get(name),
            "per_day": per_day,
            "field_days": field_days,
            "n_field_days": len(field_days),
            "total_father": sum(v["father"] for v in per_day.values()),
            "total_mother": sum(v["mother"] for v in per_day.values()),
            "total_girls": sum(v["girls"] for v in per_day.values()),
            "total_other": sum(v["other"] for v in per_day.values()),
            "total_hh_covered": int(hh_e["girl"].nunique()),
            "total_forms": total_forms,
            "avg_per_day": (total_forms / len(field_days)) if field_days else 0.0,
            "day1": per_day.get(first_day),
        }

    date_summary = {}
    for d in field_dates:
        hh_day = hh_d[hh_d["date"] == d]
        gl_day = gl_d[gl_d["date"] == d]
        father = int((hh_day["respondent"] == 1).sum())
        mother = int((hh_day["respondent"] == 2).sum())
        other = int((hh_day["respondent"] == 3).sum()) + int(hh_day["respondent"].isna().sum())
        girls = int(len(gl_day))
        total = father + mother + other + girls
        active_enums = set(hh_day["enum_name"]) | set(gl_day["enum_name"])
        n_active = len(active_enums)
        date_summary[d] = {
            "n_active": n_active,
            "father": father, "mother": mother, "other": other, "girls": girls,
            "total": total,
            "hh_covered": int(hh_day["girl"].nunique()),
            "avg_per_enum": (total / n_active) if n_active else 0.0,
            "target": n_active * DAILY_TARGET_FORMS,
            "target_hh": n_active * DAILY_TARGET_HH,
        }

    hh_groups = hh_d.groupby("girl")["respondent"]
    hh_complete = int(sum(1 for _, g in hh_groups if 1 in g.values and 2 in g.values))
    hh_total = int(hh_d["girl"].nunique())
    hh_partial = hh_total - hh_complete

    return {
        "district": district,
        "field_dates": field_dates,
        "first_day": first_day,
        "last_day": last_day,
        "enumerators": rows,
        "date_summary": date_summary,
        "total_hh_covered": hh_total,
        "hh_complete": hh_complete,
        "hh_partial": hh_partial,
    }


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def fmt_date(d):
    return d.strftime("%d-%b")


def fmt_date_long(d):
    return d.strftime("%d-%b-%Y")


def pct(achieved, target):
    if target == 0:
        return 0.0
    return round(achieved / target * 100, 1)


def status_for(pct_val):
    if pct_val >= 100:
        return ("On/Above Target", GREEN, GREEN_FILL)
    if pct_val >= 70:
        return ("Near Target", AMBER, AMBER_FILL)
    return ("Below Target", RED, RED_FILL)


# ---------------------------------------------------------------------------
# Document building blocks
# ---------------------------------------------------------------------------

def doc_heading(doc, district, stats_line):
    band = doc.add_table(rows=1, cols=1)
    band.alignment = WD_TABLE_ALIGNMENT.CENTER
    band.autofit = True
    cell = band.rows[0].cells[0]
    shade_cell(cell, HEADER_FILL)
    set_cell_margins(cell, top=260, bottom=260, left=280, right=280)
    no_borders(band)

    p1 = cell.paragraphs[0]
    add_run(p1, "KP-RAP PROJECT | DISTRICT TEAM PERFORMANCE REPORT", size=9, bold=True, color=WHITE)

    p2 = cell.add_paragraph()
    p2.space_before = Pt(4)
    add_run(p2, f"{district} — Household (Father/Mother) & Girls Survey Activity", size=19, bold=True, color=WHITE, font="Cambria")

    p3 = cell.add_paragraph()
    p3.space_before = Pt(4)
    add_run(
        p3,
        "Enumerator-wise field performance against the daily target of 3 Households per enumerator "
        "(3 Father + 3 Mother + 3 Girl interviews = 9 forms/day). Built directly from the raw "
        "Household_Survey.csv and Girls_Survey.csv submission records.",
        size=10.5,
        color=WHITE,
    )

    p4 = cell.add_paragraph()
    p4.space_before = Pt(6)
    add_run(p4, stats_line, size=9, bold=True, color=WHITE)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)


def section_heading(doc, title, subtitle=None):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(2)
    add_run(p, title, size=15, bold=True, color=TEAL_DEEP, font="Cambria")
    if subtitle:
        p2 = doc.add_paragraph()
        p2.paragraph_format.space_after = Pt(8)
        add_run(p2, subtitle, size=9.5, italic=True, color=INK_SOFT)
    pBorder = doc.add_paragraph()
    pBorder.paragraph_format.space_after = Pt(8)
    pPr = pBorder._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "8")
    bottom.set(qn("w:color"), "DDE3E0")
    bottom.set(qn("w:space"), "1")
    pbdr.append(bottom)
    pPr.append(pbdr)


def intro_box(doc, text_runs):
    tbl = doc.add_table(rows=1, cols=1)
    cell = tbl.rows[0].cells[0]
    shade_cell(cell, "F6F7F5")
    set_cell_margins(cell, top=200, bottom=200, left=220, right=220)
    tbl_borders_light(tbl)
    p = cell.paragraphs[0]
    for text, bold in text_runs:
        add_run(p, text, size=10.5, bold=bold, color=(INK if bold else INK_SOFT))
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def stat_tiles(doc, tiles):
    n = len(tiles)
    tbl = doc.add_table(rows=1, cols=n)
    tbl.autofit = True
    no_borders(tbl)
    for i, (label, value, color) in enumerate(tiles):
        cell = tbl.rows[0].cells[i]
        shade_cell(cell, "F6F7F5")
        set_cell_margins(cell, top=120, bottom=120, left=90, right=90)
        p1 = cell.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_run(p1, label, size=7.6, bold=True, color=INK_SOFT)
        p2 = cell.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_run(p2, value, size=15, bold=True, color=color, font="Cambria")
    doc.add_paragraph().paragraph_format.space_after = Pt(6)


def simple_table(doc, headers, rows, col_widths, header_fill=HEADER_FILL, font_size=9,
                  row_colors=None):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.autofit = True
    for i, w in enumerate(col_widths):
        tbl.columns[i].width = Cm(w)
    tbl_borders_light(tbl)

    hdr = tbl.rows[0].cells
    for i, h in enumerate(headers):
        shade_cell(hdr[i], header_fill)
        set_cell_margins(hdr[i], top=70, bottom=70, left=110, right=110)
        add_run(hdr[i].paragraphs[0], h, size=font_size, bold=True, color=WHITE)

    for r_i, row in enumerate(rows):
        cells = tbl.add_row().cells
        shade = "F6F7F5" if r_i % 2 == 1 else "FFFFFF"
        if row_colors and row_colors[r_i]:
            shade = row_colors[r_i]
        for i, val in enumerate(row):
            shade_cell(cells[i], shade)
            set_cell_margins(cells[i], top=70, bottom=70, left=110, right=110)
            add_run(cells[i].paragraphs[0], str(val), size=font_size, color=INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)


def bullet_list(doc, items):
    for lead, rest in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(6)
        if lead:
            add_run(p, lead, size=10, bold=True, color=TEAL_DEEP)
        add_run(p, rest, size=10, color=INK)


def footer_note(doc, district):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    pPr = p._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    top = OxmlElement("w:top")
    top.set(qn("w:val"), "single")
    top.set(qn("w:sz"), "6")
    top.set(qn("w:color"), "DDE3E0")
    top.set(qn("w:space"), "4")
    pbdr.append(top)
    pPr.append(pbdr)
    add_run(p, f"KP-RAP M&E  |  District Team Performance Report  |  {district}", size=8.5, color=INK_SOFT)
    p2 = doc.add_paragraph()
    add_run(
        p2,
        "Source: Surveys/Household_Survey.csv (respondent field: 1=Father, 2=Mother, 3/blank=Other) "
        "and Surveys/Girls_Survey.csv. Naureen Khan's two Enumerator IDs (373716 and 453925) are "
        "combined as one enumerator.",
        size=8.5,
        color=INK_SOFT,
    )


# ---------------------------------------------------------------------------
# Report build for one district
# ---------------------------------------------------------------------------

def build_district_report(m, out_path):
    district = m["district"]
    field_dates = m["field_dates"]
    first_day = m["first_day"]
    last_day = m["last_day"]
    enumerators = m["enumerators"]
    names_sorted = sorted(enumerators.keys())

    n_enum = len(names_sorted)
    n_field_days_district = len(field_dates)
    total_forms = sum(e["total_forms"] for e in enumerators.values())
    total_target = sum(e["n_field_days"] * DAILY_TARGET_FORMS for e in enumerators.values())
    total_target_hh = sum(e["n_field_days"] * DAILY_TARGET_HH for e in enumerators.values())
    overall_pct = pct(total_forms, total_target)
    overall_hh_pct = pct(m["total_hh_covered"], total_target_hh)
    day1_fielded = [n for n in names_sorted if enumerators[n]["day1"]["total"] > 0]
    day1_total = sum(enumerators[n]["day1"]["total"] for n in names_sorted)

    stats_line = (
        f"{n_enum} Enumerators  |  Field Days: {fmt_date_long(first_day)} to {fmt_date_long(last_day)} "
        f"({n_field_days_district} days)  |  {total_forms} Forms Submitted  |  "
        f"Overall Achievement: {overall_pct}%"
    )

    doc = Document()
    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width, section.page_height = section.page_height, section.page_width
    section.left_margin = Cm(1.4)
    section.right_margin = Cm(1.4)
    section.top_margin = Cm(1.3)
    section.bottom_margin = Cm(1.3)

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10.5)

    doc_heading(doc, district, stats_line)

    intro_box(doc, [
        ("Target definition: ", True),
        (f"Each enumerator's daily target is {DAILY_TARGET_HH} Households, meaning "
         f"{DAILY_TARGET_HH} Father interviews + {DAILY_TARGET_HH} Mother interviews + "
         f"{DAILY_TARGET_HH} Girl interviews = {DAILY_TARGET_FORMS} forms/day/enumerator. ", False),
        ("Activity window: ", True),
        (f"{fmt_date_long(first_day)} to {fmt_date_long(last_day)}, covering {n_field_days_district} "
         f"field dates ({', '.join(fmt_date(d) for d in field_dates)}). No submissions were recorded "
         "for 12-Sep-2026, which was used for the Data Quality Session, so it is excluded from the "
         "field-day count. Individual targets below are calculated only over the days each enumerator "
         "was actually active in the field, so a newly-joined enumerator is not penalised for days "
         "before they started.", False),
    ])

    stat_tiles(doc, [
        ("ENUMERATORS", str(n_enum), TEAL_DEEP),
        ("FIELD DAYS", str(n_field_days_district), TEAL_DEEP),
        ("TARGET HH", str(total_target_hh), INK_SOFT),
        ("HH COVERED", f"{m['total_hh_covered']} ({overall_hh_pct}%)", TEAL_DEEP),
        ("TARGET FORMS", str(total_target), INK_SOFT),
        ("FORMS SUBMITTED", f"{total_forms} ({overall_pct}%)", GREEN if overall_pct >= 70 else (AMBER if overall_pct >= 50 else RED)),
        ("DAY 1 FIELDED", f"{len(day1_fielded)}/{n_enum}", TEAL_DEEP),
    ])

    # ---- Section 1: Date-wise district summary ----
    section_heading(
        doc,
        "1. Date-Wise District Summary",
        "Har field date par poore district ke liye: kitne enumerators active thay, kitne forms aur "
        "households cover huay, aur enumerator-average kitna raha",
    )
    date_summary = m["date_summary"]
    rows0, colors0 = [], []
    for d in field_dates:
        s = date_summary[d]
        p0 = pct(s["total"], s["target"]) if s["target"] else 0.0
        p0_hh = pct(s["hh_covered"], s["target_hh"]) if s["target_hh"] else 0.0
        status0, _, fill0 = status_for(p0) if s["n_active"] else ("No Fieldwork", INK_SOFT, "F6F7F5")
        rows0.append([
            fmt_date_long(d), s["n_active"], s["father"], s["mother"], s["girls"],
            s["target_hh"], s["hh_covered"], f"{p0_hh}%",
            s["target"], s["total"], f"{p0}%",
            f"{s['avg_per_enum']:.2f}", status0,
        ])
        colors0.append(fill0)
    simple_table(
        doc,
        ["Date", "Enumerators", "Father", "Mother", "Girls", "Target HH", "HH Covered", "HH %",
         "Target Forms", "Total Forms", "Forms %", "Avg Forms/Enumerator", "Status"],
        rows0,
        [2.4, 1.5, 1.1, 1.1, 1.0, 1.5, 1.5, 1.2, 1.6, 1.6, 1.3, 2.0, 2.0],
        font_size=8.3,
        row_colors=colors0,
    )
    p_date_note = doc.add_paragraph()
    add_run(
        p_date_note,
        f"12-Sep-2026 is not listed above as it had no field submissions (Data Quality Session day). "
        f"Across all {n_field_days_district} field dates, {district} averaged "
        f"{round(total_forms / n_field_days_district, 2)} forms/day district-wide and covered "
        f"{m['total_hh_covered']} distinct households in total.",
        size=9, italic=True, color=INK_SOFT,
    )
    p_date_note.paragraph_format.space_after = Pt(8)

    # ---- Section 2: Day 1 deployment ----
    section_heading(
        doc,
        f"2. First Day Field Deployment — {fmt_date_long(first_day)}",
        f"How many enumerators went to the field on the first day, and how much of the "
        f"{DAILY_TARGET_FORMS}-form daily target ({DAILY_TARGET_HH} HH = Father+Mother+Girl) they achieved",
    )
    rows1, colors1 = [], []
    for name in names_sorted:
        e = enumerators[name]
        d1 = e["day1"]
        fielded = "Yes" if d1["total"] > 0 else "No"
        p1 = pct(d1["total"], DAILY_TARGET_FORMS)
        p1_hh = pct(d1["hh_covered"], DAILY_TARGET_HH)
        rows1.append([
            f"{name} ({e['id']})", fielded, d1["father"], d1["mother"], d1["girls"],
            DAILY_TARGET_HH, d1["hh_covered"], f"{p1_hh}%",
            DAILY_TARGET_FORMS, d1["total"], f"{p1}%",
        ])
        colors1.append(RED_FILL if fielded == "No" else None)
    simple_table(
        doc,
        ["Enumerator (ID)", "Fielded?", "Father", "Mother", "Girls", "Target HH", "HH Covered", "HH %",
         "Target Forms", "Total Forms", "Forms %"],
        rows1,
        [3.6, 1.4, 1.2, 1.2, 1.1, 1.4, 1.5, 1.2, 1.6, 1.5, 1.4],
        font_size=8.3,
        row_colors=colors1,
    )
    not_fielded = [n for n in names_sorted if n not in day1_fielded]
    p_note = doc.add_paragraph()
    if not_fielded:
        add_run(
            p_note,
            f"On {fmt_date(first_day)}, {len(day1_fielded)} of {n_enum} enumerators were active in the "
            f"field, submitting {day1_total} forms in total against a combined target of "
            f"{len(day1_fielded) * DAILY_TARGET_FORMS} for those fielded ({pct(day1_total, len(day1_fielded) * DAILY_TARGET_FORMS)}%). "
            f"The following enumerators had not yet started fieldwork on Day 1 and joined on a later "
            f"date: " + ", ".join(f"{n} (started {fmt_date(enumerators[n]['field_days'][0])})" for n in not_fielded) + ".",
            size=9,
            italic=True,
            color=INK_SOFT,
        )
    else:
        add_run(
            p_note,
            f"All {n_enum} enumerators were active in the field on Day 1, submitting {day1_total} "
            f"forms in total against a combined target of {n_enum * DAILY_TARGET_FORMS} "
            f"({pct(day1_total, n_enum * DAILY_TARGET_FORMS)}%).",
            size=9, italic=True, color=INK_SOFT,
        )
    p_note.paragraph_format.space_after = Pt(8)

    # ---- Section 3: Daily submission matrix ----
    section_heading(
        doc,
        "3. Enumerator-Wise Daily Submissions",
        "Total forms (Father + Mother + Girl) submitted by each enumerator on each field date",
    )
    headers2 = ["Enumerator"] + [fmt_date(d) for d in field_dates] + ["Field Days", "Total", "Avg Forms/Day"]
    rows2 = []
    for name in names_sorted:
        e = enumerators[name]
        row = [name]
        for d in field_dates:
            t = e["per_day"][d]["total"]
            row.append(t if t > 0 else "—")
        row.append(e["n_field_days"])
        row.append(e["total_forms"])
        row.append(f"{e['avg_per_day']:.2f}")
        rows2.append(row)
    col_widths2 = [3.4] + [1.5] * len(field_dates) + [1.5, 1.4, 1.9]
    simple_table(doc, headers2, rows2, col_widths2, header_fill=TEAL_HEADER_HEX if False else HEADER_FILL, font_size=8.7)

    # ---- Section 4: Average per day ----
    section_heading(
        doc,
        "4. Average Form Submission per Day per Enumerator",
        f"Total forms submitted divided by the number of days each enumerator was actually in the field, "
        f"compared with the {DAILY_TARGET_FORMS}-form daily target",
    )
    rows3, colors3 = [], []
    for name in sorted(names_sorted, key=lambda n: -enumerators[n]["avg_per_day"]):
        e = enumerators[name]
        avg_hh_per_day = (e["total_hh_covered"] / e["n_field_days"]) if e["n_field_days"] else 0.0
        avg_pct = pct(e["avg_per_day"], DAILY_TARGET_FORMS)
        status, _, fill = status_for(avg_pct)
        rows3.append([
            f"{name} ({e['id']})", e["n_field_days"],
            DAILY_TARGET_HH, f"{avg_hh_per_day:.2f}",
            DAILY_TARGET_FORMS, e["total_forms"], f"{e['avg_per_day']:.2f}",
            f"{avg_pct}%", status,
        ])
        colors3.append(fill)
    simple_table(
        doc,
        ["Enumerator (ID)", "Field Days", "Daily Target HH", "Avg HH/Day", "Daily Target Forms",
         "Total Forms", "Avg Forms/Day", "Avg vs Target", "Status"],
        rows3,
        [3.4, 1.4, 1.6, 1.5, 1.7, 1.6, 1.6, 1.7, 2.1],
        font_size=8.3,
        row_colors=colors3,
    )

    # ---- Section 5: Overall performance vs target ----
    section_heading(
        doc,
        "5. Overall Performance vs Target",
        f"Cumulative Father / Mother / Girl forms achieved against the cumulative target "
        f"({DAILY_TARGET_FORMS} forms x field days worked) for the full activity period",
    )
    rows4, colors4 = [], []
    for name in sorted(names_sorted, key=lambda n: -pct(enumerators[n]["total_forms"], enumerators[n]["n_field_days"] * DAILY_TARGET_FORMS)):
        e = enumerators[name]
        target = e["n_field_days"] * DAILY_TARGET_FORMS
        target_hh = e["n_field_days"] * DAILY_TARGET_HH
        p_val = pct(e["total_forms"], target)
        p_val_hh = pct(e["total_hh_covered"], target_hh)
        status, _, fill = status_for(p_val)
        rows4.append([
            f"{name} ({e['id']})", e["n_field_days"],
            target_hh, e["total_hh_covered"], f"{p_val_hh}%",
            target, e["total_father"], e["total_mother"], e["total_girls"],
            e["total_forms"], f"{p_val}%", status,
        ])
        colors4.append(fill)
    simple_table(
        doc,
        ["Enumerator (ID)", "Field Days", "Target HH", "HH Covered", "HH %",
         "Target Forms", "Father", "Mother", "Girls", "Total Forms", "Forms %", "Status"],
        rows4,
        [3.0, 1.2, 1.3, 1.4, 1.1, 1.5, 1.1, 1.2, 1.0, 1.4, 1.3, 1.9],
        font_size=8.0,
        row_colors=colors4,
    )

    # ---- Section 6: District summary ----
    section_heading(
        doc,
        "6. District Summary",
        "Key observations for the field team lead / district coordinator",
    )
    best_name = max(names_sorted, key=lambda n: pct(enumerators[n]["total_forms"], enumerators[n]["n_field_days"] * DAILY_TARGET_FORMS))
    worst_name = min(names_sorted, key=lambda n: pct(enumerators[n]["total_forms"], enumerators[n]["n_field_days"] * DAILY_TARGET_FORMS))
    best_pct = pct(enumerators[best_name]["total_forms"], enumerators[best_name]["n_field_days"] * DAILY_TARGET_FORMS)
    worst_pct = pct(enumerators[worst_name]["total_forms"], enumerators[worst_name]["n_field_days"] * DAILY_TARGET_FORMS)
    below_70 = [n for n in names_sorted if pct(enumerators[n]["total_forms"], enumerators[n]["n_field_days"] * DAILY_TARGET_FORMS) < 70]

    p = doc.add_paragraph()
    add_run(
        p,
        f"Across {n_enum} enumerators and {n_field_days_district} field dates ({fmt_date_long(first_day)} to "
        f"{fmt_date_long(last_day)}), {district} covered {m['total_hh_covered']} households against a "
        f"targeted {total_target_hh} households ({overall_hh_pct}%), and submitted {total_forms} forms "
        f"against a targeted {total_target} forms ({overall_pct}% overall achievement). "
        f"{best_name} has the highest achievement rate at {best_pct}% of target, while {worst_name} has "
        f"the lowest at {worst_pct}%. ",
        size=10, color=INK,
    )
    if below_70:
        add_run(
            p,
            f"{len(below_70)} enumerator(s) are currently below 70% of their target and should be "
            f"prioritised for field coaching / follow-up: " + ", ".join(below_70) + ".",
            size=10, color=INK,
        )
    else:
        add_run(p, "All enumerators are at or above 70% of their individual target.", size=10, color=INK)
    p.paragraph_format.space_after = Pt(8)

    # ---- Section 7: Key insights & recommendations ----
    section_heading(
        doc,
        "7. Key Insights & Recommendations",
        "Performance ka mukammal khulasa — kya achha hua, kahan gap hai, aur agay kya karna hai",
    )

    date_summary = m["date_summary"]
    best_day = max(field_dates, key=lambda d: pct(date_summary[d]["total"], date_summary[d]["target"]) if date_summary[d]["target"] else -1)
    worst_day = min(field_dates, key=lambda d: pct(date_summary[d]["total"], date_summary[d]["target"]) if date_summary[d]["target"] else 101)
    best_day_pct = pct(date_summary[best_day]["total"], date_summary[best_day]["target"])
    worst_day_pct = pct(date_summary[worst_day]["total"], date_summary[worst_day]["target"])

    full_period = [n for n in names_sorted if enumerators[n]["n_field_days"] == n_field_days_district]
    partial_period = [n for n in names_sorted if n not in full_period]

    father_total = sum(e["total_father"] for e in enumerators.values())
    mother_total = sum(e["total_mother"] for e in enumerators.values())
    girls_total = sum(e["total_girls"] for e in enumerators.values())

    avg_hh_per_day_district = m["total_hh_covered"] / n_field_days_district if n_field_days_district else 0
    avg_forms_per_day_district = total_forms / n_field_days_district if n_field_days_district else 0

    insights = []

    insights.append((
        "Overall performance: ",
        f"{district} achieved {overall_pct}% of its total form target ({total_forms} of {total_target} forms) "
        f"and {overall_hh_pct}% of its household target ({m['total_hh_covered']} of {total_target_hh} HH) over "
        f"{n_field_days_district} field days. District-wide the team averaged {round(avg_forms_per_day_district, 2)} "
        f"forms/day and {round(avg_hh_per_day_district, 2)} HH/day, against the per-enumerator daily target of "
        f"{DAILY_TARGET_FORMS} forms ({DAILY_TARGET_HH} HH)."
    ))

    if day1_fielded:
        insights.append((
            "Field ramp-up: ", (
                f"only {len(day1_fielded)} of {n_enum} enumerators were in the field on Day 1 "
                f"({fmt_date(first_day)}), achieving {pct(day1_total, len(day1_fielded) * DAILY_TARGET_FORMS)}% of "
                f"that day's target. " if len(day1_fielded) < n_enum else
                f"all {n_enum} enumerators were already in the field from Day 1 ({fmt_date(first_day)}). "
            ) + (
                f"The remaining {len(names_sorted) - len(day1_fielded)} joined progressively between "
                f"{fmt_date(min(enumerators[n]['field_days'][0] for n in names_sorted if n not in day1_fielded))} and "
                f"{fmt_date(max(enumerators[n]['field_days'][0] for n in names_sorted if n not in day1_fielded))}, "
                f"which is the main reason district-wide totals rose in the days after Day 1."
                if len(day1_fielded) < n_enum else
                "Full team strength from the start means later-day dips reflect pace, not headcount."
            )
        ))

    def _enum_word(n):
        return "enumerator" if n == 1 else "enumerators"

    insights.append((
        "Best vs. weakest day: ", (
            f"{fmt_date_long(best_day)} was the strongest day at {best_day_pct}% of that day's target "
            f"({date_summary[best_day]['total']} forms from {date_summary[best_day]['n_active']} "
            f"{_enum_word(date_summary[best_day]['n_active'])}), "
            f"while {fmt_date_long(worst_day)} was the weakest at {worst_day_pct}% "
            f"({date_summary[worst_day]['total']} forms from {date_summary[worst_day]['n_active']} "
            f"{_enum_word(date_summary[worst_day]['n_active'])})."
        )
    ))

    insights.append((
        "Father vs. Mother vs. Girl forms: ", (
            f"{father_total} Father, {mother_total} Mother and {girls_total} Girl forms were submitted in total. "
            + (
                f"Father interviews are running behind Mother interviews by {mother_total - father_total} forms "
                f"district-wide, suggesting fathers are harder to reach/available less often during field visits — "
                f"worth flagging to the team as a scheduling issue."
                if mother_total - father_total >= 5 else
                "The three form types are reasonably balanced, so no single respondent type is the bottleneck."
            )
        )
    ))

    insights.append((
        "Household completion: ", (
            f"of the {m['total_hh_covered']} households visited, {m['hh_complete']} have both Father and Mother "
            f"interviews completed, while {m['hh_partial']} still have only one parent interviewed and need a "
            f"revisit to close out the household."
        )
    ))

    if full_period and partial_period:
        partial_desc = ", ".join(f"{n} ({enumerators[n]['n_field_days']}d)" for n in partial_period)
        insights.append((
            "Team consistency: ", (
                f"{len(full_period)} enumerator(s) worked all {n_field_days_district} field days "
                f"({', '.join(full_period)}), while {len(partial_period)} worked only part of the period "
                f"({partial_desc}). Achievement figures above are already calculated only over each person's own "
                "active days, so this is for staffing awareness rather than a performance penalty."
            )
        ))

    if below_70:
        insights.append((
            "Needs follow-up: ", (
                f"{len(below_70)} of {n_enum} enumerators are below 70% of their individual target — "
                + ", ".join(below_70) +
                f". Recommend the district coordinator review daily plans with them and confirm no access/"
                f"availability issues are limiting household visits."
            )
        ))
    else:
        insights.append((
            "Needs follow-up: ",
            "no enumerator is currently below 70% of their individual target; focus coaching on closing the "
            f"remaining gap to 100% ({overall_pct}% currently achieved) rather than on underperformance.",
        ))

    bullet_list(doc, insights)

    footer_note(doc, district)

    doc.save(out_path)
    print(f"Saved: {out_path}")


TEAL_HEADER_HEX = HEADER_FILL


def main():
    hh, gl = load_data()
    m_dik = build_metrics(hh, gl, "D.I. Khan")
    m_hangu = build_metrics(hh, gl, "Hangu")

    build_district_report(m_dik, "DI_Khan_Team_Performance_Report.docx")
    build_district_report(m_hangu, "Hangu_Team_Performance_Report.docx")


if __name__ == "__main__":
    main()
