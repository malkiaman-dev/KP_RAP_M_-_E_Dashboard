"""Generate PIDC KP-RAP Quality Assurance Workplan (Word)."""
from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor, Emu, Twips

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "dashboard" / "public" / "pidc-logo.png"
LOGO_AOE = ROOT / "dashboard" / "public" / "alliance-logo.png"
OUT_NAME = "PIDC_KP-RAP_Quality_Assurance_Workplan_17August2026.docx"
OUT_NAME_AOE = "AoE_KP-RAP_Quality_Assurance_Workplan_17August2026.docx"
OUT_NAME_KPRAP = "KP-RAP_Quality_Assurance_Workplan_17August2026.docx"
OUT_NAME_RAP = "RAP_Quality_Assurance_Workplan_2.O_19_August2026.docx"

# PIDC brand — blue primary, green accent
PIDC_PALETTE = {
    "TEAL": "164A7E",
    "TEAL_MID": "2060A0",
    "TEAL_SOFT": "E8F1F8",
    "GOLD": "2D9A3E",
    "GOLD_SOFT": "F0F9F1",
    "INK": "1A2332",
    "BODY": "334155",
    "MUTED": "64748B",
    "LINE": "D7DEE5",
    "WHITE": "FFFFFF",
    "COVER": "164A7E",
    "TEAL_LIGHT": "3B82C4",
}

# AoE brand: full Alliance teal + gold palette
AOE_PALETTE = {
    "TEAL": "178891",
    "TEAL_MID": "21A1AA",
    "TEAL_SOFT": "E6F7F8",
    "GOLD": "EDCA5C",
    "GOLD_SOFT": "F4D67F",
    "INK": "1A2332",
    "BODY": "334155",
    "MUTED": "64748B",
    "LINE": "B7E0E3",
    "WHITE": "FFFFFF",
    "COVER": "0E6B73",
    "TEAL_LIGHT": "2DBCC6",
}

# Neutral document palette — light slate (not PIDC blue/green, not charcoal/gold)
KPRAP_PALETTE = {
    "TEAL": "5C7A99",
    "TEAL_MID": "6B8499",
    "TEAL_SOFT": "F4F7FA",
    "GOLD": "8AA4BD",
    "GOLD_SOFT": "F7FAFC",
    "INK": "3D4A55",
    "BODY": "4A5560",
    "MUTED": "6B7C8A",
    "LINE": "D7DEE5",
    "WHITE": "FFFFFF",
    "COVER": "5C7A99",
    "TEAL_LIGHT": "6B8499",
}

TEAL = PIDC_PALETTE["TEAL"]
TEAL_MID = PIDC_PALETTE["TEAL_MID"]
TEAL_SOFT = PIDC_PALETTE["TEAL_SOFT"]
GOLD = PIDC_PALETTE["GOLD"]
GOLD_SOFT = PIDC_PALETTE["GOLD_SOFT"]
INK = PIDC_PALETTE["INK"]
BODY = PIDC_PALETTE["BODY"]
MUTED = PIDC_PALETTE["MUTED"]
LINE = PIDC_PALETTE["LINE"]
WHITE = PIDC_PALETTE["WHITE"]
COVER = PIDC_PALETTE["COVER"]
TEAL_LIGHT = PIDC_PALETTE["TEAL_LIGHT"]
CRIT = "9F1239"
CRIT_BG = "FFF1F2"
FLAG = "B45309"
FLAG_BG = "FFF7ED"
OK = "0F766E"
OK_BG = "ECFDF5"


def apply_palette(brand: str = "pidc") -> None:
    global TEAL, TEAL_MID, TEAL_SOFT, GOLD, GOLD_SOFT, INK, BODY, MUTED, LINE, WHITE, COVER, TEAL_LIGHT
    if brand in ("kprap", "rap"):
        pal = KPRAP_PALETTE
    elif brand == "aoe":
        pal = AOE_PALETTE
    else:
        pal = PIDC_PALETTE
    TEAL = pal["TEAL"]
    TEAL_MID = pal["TEAL_MID"]
    TEAL_SOFT = pal["TEAL_SOFT"]
    GOLD = pal["GOLD"]
    GOLD_SOFT = pal["GOLD_SOFT"]
    INK = pal["INK"]
    BODY = pal["BODY"]
    MUTED = pal["MUTED"]
    LINE = pal["LINE"]
    WHITE = pal["WHITE"]
    COVER = pal["COVER"]
    TEAL_LIGHT = pal["TEAL_LIGHT"]


def rgb(h: str) -> RGBColor:
    h = h.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def shade(cell, fill: str) -> None:
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    for child in list(tcPr):
        if child.tag == qn("w:shd"):
            tcPr.remove(child)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    shd.set(qn("w:val"), "clear")
    tcPr.append(shd)


def set_borders(cell, color=LINE, sz="4") -> None:
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), sz)
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)
        tcBorders.append(el)
    tcPr.append(tcBorders)


def no_borders(cell) -> None:
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "nil")
        tcBorders.append(el)
    tcPr.append(tcBorders)


def cell_margins(cell, **sides) -> None:
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for side, twips in sides.items():
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:w"), str(twips))
        el.set(qn("w:type"), "dxa")
        tcMar.append(el)
    tcPr.append(tcMar)


def set_run(run, text, *, size=11, bold=False, color=BODY, font="Calibri", italic=False):
    run.text = text
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.color.rgb = rgb(color)
    run.font.name = font
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:ascii"), font)
    rFonts.set(qn("w:hAnsi"), font)
    rFonts.set(qn("w:eastAsia"), font)


def P(
    doc,
    text="",
    *,
    size=11,
    bold=False,
    color=BODY,
    align="left",
    space_before=0,
    space_after=8,
    italic=False,
    font="Calibri",
):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    p.alignment = {
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
        "right": WD_ALIGN_PARAGRAPH.RIGHT,
        "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
    }[align]
    if text:
        set_run(p.add_run(), text, size=size, bold=bold, color=color, italic=italic, font=font)
    return p


def add_runs(p, parts):
    for text, kw in parts:
        set_run(p.add_run(), text, **kw)


def h1(doc, n, title):
    P(doc, "", space_before=10, space_after=2)
    t = doc.add_table(rows=1, cols=1)
    t.autofit = False
    c = t.cell(0, 0)
    c.width = Cm(17.0)
    shade(c, TEAL)
    no_borders(c)
    cell_margins(c, top=70, bottom=70, left=120, right=120)
    p = c.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    set_run(p.add_run(), f"{n}  {title}".strip(), size=13, bold=True, color=WHITE)
    set_row_height(t.rows[0], 380)
    gold = doc.add_table(rows=1, cols=1)
    gold.autofit = False
    g = gold.cell(0, 0)
    shade(g, GOLD)
    no_borders(g)
    g.paragraphs[0].paragraph_format.space_before = Pt(0)
    g.paragraphs[0].paragraph_format.space_after = Pt(0)
    set_row_height(gold.rows[0], 90)
    P(doc, "", space_after=8)


def h2(doc, n, title):
    P(doc, "", space_before=6, space_after=2)
    t = doc.add_table(rows=1, cols=1)
    t.autofit = False
    c = t.cell(0, 0)
    c.width = Cm(17.0)
    shade(c, TEAL_MID)
    no_borders(c)
    cell_margins(c, top=50, bottom=50, left=120, right=120)
    p = c.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    set_run(p.add_run(), f"{n}  {title}", size=11.5, bold=True, color=WHITE)
    set_row_height(t.rows[0], 300)
    P(doc, "", space_after=6)


def h3(doc, title):
    P(doc, title, size=11, bold=True, color=INK, space_before=8, space_after=4)


def body(doc, text):
    P(doc, text, size=11, color=BODY, align="justify", space_after=8)


def bullet(doc, text, level=0):
    p = P(doc, space_before=0, space_after=3)
    p.paragraph_format.left_indent = Cm(0.55 + level * 0.45)
    p.paragraph_format.first_line_indent = Cm(-0.35)
    set_run(p.add_run(), "•  ", size=11, bold=True, color=GOLD)
    set_run(p.add_run(), text, size=11, color=BODY)


def set_row_height(row, twips):
    tr = row._tr
    trPr = tr.get_or_add_trPr()
    trHeight = OxmlElement("w:trHeight")
    trHeight.set(qn("w:val"), str(twips))
    trHeight.set(qn("w:hRule"), "atLeast")
    trPr.append(trHeight)


def prevent_break(row):
    tr = row._tr
    trPr = tr.get_or_add_trPr()
    cant = OxmlElement("w:cantSplit")
    trPr.append(cant)


def tbl(doc, headers, rows, col_widths=None, header_fill=None):
    if header_fill is None:
        header_fill = TEAL
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    usable = Cm(17.0)
    if col_widths:
        total = sum(col_widths)
        widths = [usable * (w / total) for w in col_widths]
    else:
        widths = [usable / len(headers)] * len(headers)

    for i, h in enumerate(headers):
        cell = t.cell(0, i)
        cell.width = widths[i]
        shade(cell, header_fill)
        set_borders(cell, TEAL, "4")
        cell_margins(cell, top=60, bottom=60, left=80, right=80)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        set_run(p.add_run(), h, size=9, bold=True, color=WHITE)

    for r_i, row in enumerate(rows):
        fill = WHITE if r_i % 2 == 0 else TEAL_SOFT
        for c_i, val in enumerate(row):
            cell = t.cell(r_i + 1, c_i)
            cell.width = widths[c_i]
            shade(cell, fill)
            set_borders(cell, LINE, "4")
            cell_margins(cell, top=50, bottom=50, left=80, right=80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            set_run(p.add_run(), str(val), size=9.5, color=INK)
        prevent_break(t.rows[r_i + 1])
    P(doc, "", space_after=10)
    return t


def callout(doc, label, text, fill=None, accent=None):
    if fill is None:
        fill = GOLD_SOFT
    if accent is None:
        accent = GOLD
    t = doc.add_table(rows=1, cols=2)
    t.autofit = False
    c0, c1 = t.cell(0, 0), t.cell(0, 1)
    c0.width = Cm(0.18)
    c1.width = Cm(16.82)
    shade(c0, accent)
    shade(c1, fill)
    no_borders(c0)
    no_borders(c1)
    cell_margins(c1, top=80, bottom=80, left=140, right=120)
    p = c1.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    set_run(p.add_run(), label.upper() + "  ", size=8, bold=True, color=TEAL)
    p2 = c1.add_paragraph()
    p2.paragraph_format.space_before = Pt(0)
    p2.paragraph_format.space_after = Pt(0)
    set_run(p2.add_run(), text, size=10.5, color=INK)
    P(doc, "", space_after=10)


def meta_row(table, i, k, v):
    a, b = table.cell(i, 0), table.cell(i, 1)
    shade(a, TEAL_SOFT)
    shade(b, WHITE)
    set_borders(a, LINE, "4")
    set_borders(b, LINE, "4")
    cell_margins(a, top=50, bottom=50, left=90, right=80)
    cell_margins(b, top=50, bottom=50, left=90, right=80)
    pa, pb = a.paragraphs[0], b.paragraphs[0]
    pa.paragraph_format.space_before = Pt(0)
    pa.paragraph_format.space_after = Pt(0)
    pb.paragraph_format.space_before = Pt(0)
    pb.paragraph_format.space_after = Pt(0)
    set_run(pa.add_run(), k, size=9, bold=True, color=TEAL)
    set_run(pb.add_run(), v, size=9.5, color=INK)


def add_page_number(paragraph):
    run = paragraph.add_run()
    fld1 = OxmlElement("w:fldChar")
    fld1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld2 = OxmlElement("w:fldChar")
    fld2.set(qn("w:fldCharType"), "end")
    run._r.append(fld1)
    run._r.append(instr)
    run._r.append(fld2)
    set_run(run, "", size=8, color=MUTED)


def setup_header_footer(doc, brand="pidc"):
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.2)
    section.header_distance = Cm(0.8)
    section.footer_distance = Cm(0.8)
    section.different_first_page_header_footer = True

    # First page: empty header
    hp = section.first_page_header.paragraphs[0]
    hp.text = ""

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.LEFT
    if brand in ("kprap", "rap"):
        set_run(header.add_run(), "KP-RAP  ", size=8, bold=True, color=TEAL)
        set_run(header.add_run(), "·  Quality Assurance Workplan", size=8, color=MUTED)
        if brand == "rap":
            foot = "KP-RAP  ·  Quality Assurance Workplan  ·  19 August 2026  ·  Page "
            first_foot = "KP-RAP  ·  Quality Assurance Workplan  ·  Version 2.0  ·  19 August 2026"
        else:
            foot = "KP-RAP  ·  Quality Assurance Workplan  ·  17 August 2026  ·  Page "
            first_foot = "KP-RAP  ·  Quality Assurance Workplan  ·  17 August 2026"
    elif brand == "aoe":
        set_run(header.add_run(), "AoE  ", size=8, bold=True, color=TEAL)
        set_run(header.add_run(), "·  Household and Girls Survey Quality Assurance Workplan", size=8, color=MUTED)
        foot = "AoE  ·  Household and Girls QA Workplan  ·  17 August 2026  ·  Page "
        first_foot = "AoE  ·  Household and Girls Survey Quality Assurance Workplan  ·  17 August 2026"
    else:
        set_run(header.add_run(), "PIDC  ", size=8, bold=True, color=TEAL)
        set_run(header.add_run(), "·  Household and Girls Survey Quality Assurance Workplan", size=8, color=MUTED)
        foot = "PIDC  ·  Household and Girls QA Workplan  ·  17 August 2026  ·  Page "
        first_foot = "PIDC  ·  Household and Girls Survey Quality Assurance Workplan  ·  17 August 2026"

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.LEFT
    set_run(footer.add_run(), foot, size=8, color=MUTED)
    add_page_number(footer)

    fp = section.first_page_footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_run(fp.add_run(), first_foot, size=8, color=MUTED)


def cover(doc, brand="pidc"):
    # Top brand bar
    bar = doc.add_table(rows=1, cols=1)
    c = bar.cell(0, 0)
    shade(c, COVER)
    no_borders(c)
    cell_margins(c, top=140, bottom=140, left=160, right=160)
    p = c.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    if brand in ("kprap", "rap"):
        set_run(p.add_run(), "KP-RAP", size=11, bold=True, color=WHITE)
        p2 = c.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p2.paragraph_format.space_before = Pt(2)
        p2.paragraph_format.space_after = Pt(0)
        set_run(p2.add_run(), "Khyber Pakhtunkhwa Rural Accessibility Project", size=9, color="E8EEF4")
    elif brand == "aoe":
        set_run(p.add_run(), "AoE", size=11, bold=True, color=WHITE)
        p2 = c.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p2.paragraph_format.space_before = Pt(2)
        p2.paragraph_format.space_after = Pt(0)
        set_run(p2.add_run(), "Alliance of Excellence  ·  Monitoring & Evaluation", size=9, color="D4F0F2")
    else:
        set_run(p.add_run(), "PIDC", size=11, bold=True, color=WHITE)
        p2 = c.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p2.paragraph_format.space_before = Pt(2)
        p2.paragraph_format.space_after = Pt(0)
        set_run(p2.add_run(), "Professional in Development Consulting (Pvt.) Ltd.  ·  Monitoring & Evaluation", size=9, color="D6E4F2")
    set_row_height(bar.rows[0], 900)

    gold = doc.add_table(rows=1, cols=1)
    g = gold.cell(0, 0)
    shade(g, GOLD)
    no_borders(g)
    g.paragraphs[0].paragraph_format.space_before = Pt(0)
    g.paragraphs[0].paragraph_format.space_after = Pt(0)
    set_row_height(gold.rows[0], 120)

    P(doc, "", space_after=6)
    logo = LOGO_AOE if brand == "aoe" else (LOGO if brand == "pidc" else None)
    if logo is not None and logo.exists():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(8)
        run = p.add_run()
        run.add_picture(str(logo), width=Inches(1.7 if brand == "aoe" else 2.55))

    P(doc, "KHYBER PAKHTUNKHWA RURAL ACCESSIBILITY PROJECT", size=9, bold=True, color=GOLD, space_after=4)
    P(doc, "QUALITY ASSURANCE WORKPLAN", size=22, bold=True, color=TEAL, space_before=2, space_after=4)
    P(
        doc,
        "Household and Girls Surveys  ·  Data Quality Assurance Protocol",
        size=12,
        color=INK,
        space_after=6,
    )
    P(
        doc,
        "D.I. Khan, Hangu, Lakki Marwat, and remaining work in Torghar (currently paused)",
        size=11,
        italic=True,
        color=MUTED,
        space_after=14,
    )

    if brand == "kprap":
        meta_rows = [
            ("Document", "KP-RAP Quality Assurance Workplan"),
            ("Document type", "Operational quality-assurance protocol"),
            ("Date", "17 August 2026"),
            ("Version", "1.0"),
            ("Coverage", "Household and Girls surveys in D.I. Khan, Hangu, Lakki Marwat, and remaining work in Torghar (currently paused)"),
        ]
    elif brand == "rap":
        meta_rows = [
            ("Document", "RAP Quality Assurance Workplan"),
            ("Document type", "Operational quality-assurance protocol"),
            ("Prepared by", "Alliance of Excellence (AoE)"),
            ("Date", "19 August 2026"),
            ("Version", "2.0"),
            ("Coverage", "Household and Girls surveys in D.I. Khan, Hangu, Lakki Marwat, and remaining work in Torghar (currently paused)"),
        ]
    elif brand == "aoe":
        meta_rows = [
            ("Document type", "Operational quality-assurance protocol"),
            ("Prepared by", "Alliance of Excellence (AoE)"),
            ("Date", "17 August 2026"),
            ("Version", "1.0"),
            ("Coverage", "Household and Girls surveys in D.I. Khan, Hangu, Lakki Marwat, and remaining work in Torghar (currently paused)"),
        ]
    else:
        meta_rows = [
            ("Document type", "Operational quality-assurance protocol"),
            ("Prepared by", "Professional in Development Consulting (Pvt.) Ltd. (PIDC)"),
            ("Date", "17 August 2026"),
            ("Version", "1.0"),
            ("Coverage", "Household and Girls surveys in D.I. Khan, Hangu, Lakki Marwat, and remaining work in Torghar (currently paused)"),
        ]
    meta = doc.add_table(rows=len(meta_rows), cols=2)
    meta.autofit = False
    for i, (k, v) in enumerate(meta_rows):
        meta.cell(i, 0).width = Cm(5.2)
        meta.cell(i, 1).width = Cm(11.8)
        meta_row(meta, i, k, v)

    if brand in ("aoe", "rap"):
        P(doc, "", space_after=10)
        P(doc, "SIGN-OFF", size=11, bold=True, color=TEAL, space_after=4)
        body(
            doc,
            "Alliance of Excellence (AoE) and PIU agree to this protocol as the operating method "
            "for Household and Girls quality assurance. It is part of the original terms of "
            "reference and proposal. Enumerator orientation on this protocol will start when both "
            "AoE and PIU have signed and dated below.",
        )
        sig = [
            ["Organisation", "Name", "Designation", "Signature", "Date"],
            ["Alliance of Excellence (AoE)", "", "", "", ""],
            ["PIU", "", "", "", ""],
        ]
        t = doc.add_table(rows=len(sig), cols=5)
        t.autofit = False
        widths = [Cm(4.2), Cm(3.4), Cm(3.2), Cm(3.2), Cm(3.0)]
        for r_i, row in enumerate(sig):
            for c_i, val in enumerate(row):
                cell = t.cell(r_i, c_i)
                cell.width = widths[c_i]
                if r_i == 0:
                    shade(cell, TEAL)
                    set_borders(cell, TEAL, "4")
                    set_run(cell.paragraphs[0].add_run(), val, size=8, bold=True, color=WHITE)
                else:
                    shade(cell, WHITE)
                    set_borders(cell, LINE, "4")
                    set_run(cell.paragraphs[0].add_run(), val, size=9, color=INK)
                cell_margins(cell, top=80, bottom=80, left=60, right=60)
                cell.paragraphs[0].paragraph_format.space_before = Pt(0)
                cell.paragraphs[0].paragraph_format.space_after = Pt(0)
            if r_i > 0:
                set_row_height(t.rows[r_i], 700)
        P(doc, "", space_after=6)


def build(brand="pidc"):
    apply_palette(brand)
    doc = Document()
    # Normal style
    styles = doc.styles
    styles["Normal"].font.name = "Calibri"
    styles["Normal"].font.size = Pt(11)
    styles["Normal"].font.color.rgb = rgb(BODY)
    h1s = styles["Heading 1"]
    h1s.font.name = "Calibri"
    h1s.font.size = Pt(14)
    h1s.font.bold = True
    h1s.font.color.rgb = rgb(TEAL)
    h1s.paragraph_format.space_before = Pt(16)
    h1s.paragraph_format.space_after = Pt(2)
    h2s = styles["Heading 2"]
    h2s.font.name = "Calibri"
    h2s.font.size = Pt(12)
    h2s.font.bold = True
    h2s.font.color.rgb = rgb(INK)
    h2s.paragraph_format.space_before = Pt(12)
    h2s.paragraph_format.space_after = Pt(6)

    setup_header_footer(doc, brand)
    cover(doc, brand)
    doc.add_page_break()

    h1(doc, "", "CONTENTS")
    contents = [
        ("1", "Executive summary"),
        ("2", "Purpose"),
        ("3", "Scope"),
        ("4", "Why this workplan works"),
        ("5", "Daily quality-assurance process"),
        ("6", "Household survey checks"),
        ("7", "Girls survey checks"),
        ("8", "Response to findings"),
        ("9", "District error-log portal"),
        ("10", "Repeat findings"),
        ("11", "Roles and responsibilities"),
        ("12", "Weekly review meetings and on-the-job training"),
        ("13", "Proposed roster sync and second confirmation"),
        ("14", "What the daily script cannot check"),
        ("15", "Field supervision"),
        ("16", "Conclusion"),
    ]
    ct = doc.add_table(rows=len(contents), cols=2)
    ct.autofit = False
    for i, (num, title) in enumerate(contents):
        a, b = ct.cell(i, 0), ct.cell(i, 1)
        a.width = Cm(1.4)
        b.width = Cm(15.6)
        no_borders(a)
        no_borders(b)
        shade(a, WHITE if i % 2 == 0 else TEAL_SOFT)
        shade(b, WHITE if i % 2 == 0 else TEAL_SOFT)
        cell_margins(a, top=40, bottom=40, left=80, right=40)
        cell_margins(b, top=40, bottom=40, left=40, right=80)
        pa, pb = a.paragraphs[0], b.paragraphs[0]
        pa.paragraph_format.space_before = Pt(0)
        pa.paragraph_format.space_after = Pt(0)
        pb.paragraph_format.space_before = Pt(0)
        pb.paragraph_format.space_after = Pt(0)
        set_run(pa.add_run(), num, size=10, bold=True, color=TEAL)
        set_run(pb.add_run(), title, size=10.5, color=INK)
    P(doc, "", space_after=12)

    kprap = brand == "kprap"
    aoe = brand in ("aoe", "rap")
    org = "AoE" if aoe else ("PIDC" if not kprap else "")
    org_full = (
        "Alliance of Excellence (AoE)" if aoe
        else ("Professional in Development Consulting (Pvt.) Ltd. (PIDC)" if not kprap else "")
    )
    h1(doc, "1", "Executive summary")
    if kprap:
        body(
            doc,
            "This workplan is the quality-assurance protocol for the KP-RAP Household and Girls "
            "Surveys in D.I. Khan, Hangu, Lakki Marwat, and remaining work in Torghar (currently paused). "
            "Daily data checks are already running on every submitted form. Findings appear on the "
            "district error-log portal the same day.",
        )
    else:
        body(
            doc,
            f"This workplan is the quality-assurance protocol that {org_full} will follow for the "
            "KP-RAP Household and Girls Surveys in D.I. Khan, Hangu, Lakki Marwat, and remaining work "
            "in Torghar (currently paused). Daily data checks are already running on every submitted "
            "Household and Girls form. Findings appear on the district error-log portal the same day.",
        )
    body(
        doc,
        f"{'The team' if kprap else org} will handle findings on two tracks. Track 1 is a "
        "correctable error, such as a typing mistake, a skipped question or a device issue. "
        f"{'The team' if kprap else org} will notify the enumerator, will call them the same day "
        "or the next morning, will obtain an explanation, and will give guidance before the next "
        "field day. Track 2 is an integrity finding, such as an interview that did not take place, "
        "consent screens tapped through, a completed form finished in under 15 minutes, GPS that "
        "does not match the household, a completed case re-entered, or a learning test recorded "
        "but not given. On Track 2, "
        f"{'the team' if kprap else org} will suspend the enumerator from Household and Girls "
        "interviews pending investigation, will notify PIU in writing within 24 hours, will review "
        "that enumerator’s full workload, and will invalidate forms that cannot be verified. An "
        "enumerator explanation will not close a Track 2 finding. Only independent verification "
        "will close it.",
    )
    body(
        doc,
        f"{'The team' if kprap else org} will not allow telephonic interviews. Once a household "
        "or girl is marked complete on the server, "
        f"{'the team' if kprap else org} will keep it locked unless PIU / IE documents approval "
        "to re-open it. Field supervision will be done by the Supervisor (Male). He is not part "
        "of Household or Girls data collection. He will carry out accompaniment, spot checks and "
        "unannounced visits, including looking at a sample of learning-test photographs.",
    )
    body(
        doc,
        "The daily script already flags missing photograph files, total duration under 15 minutes, "
        "SurveyCTO speed warnings, device start and end times, GPS in the export, duplicate KEY, "
        "roster problems, dummy phone numbers and the other checks listed later in this workplan. "
        "Three requested checks cannot be run from the SurveyCTO export: the script cannot open "
        "a test photograph to see whether the page is blank or real; it cannot time consent, "
        "roster or the learning test as separate modules; and it cannot compare device start/end "
        "with a start/end time typed by the enumerator, because no typed pair exists in the file. "
        f"{'The team' if kprap else org} will cover those three gaps through field supervision "
        "and through the checks that already run.",
    )

    h1(doc, "2", "Purpose")
    body(
        doc,
        "The purpose is to keep Household and Girls data clean while fieldwork is still running, "
        "including remaining work in Torghar when that district resumes. The daily script already "
        "detects inconsistencies in submitted forms, large and small. "
        f"{'The team' if kprap else org} will inform the enumerator the same day, will obtain an "
        "explanation on Track 1, and will give guidance so the same error is not repeated on the "
        "next interview. On Track 2, "
        f"{'the team' if kprap else org} will suspend, investigate, notify PIU and resurvey "
        "where the finding cannot be verified.",
    )

    h1(doc, "3", "Scope")
    tbl(
        doc,
        ["Item", "Coverage"],
        [
            ["Surveys", "Household survey and Girls survey"],
            ["Districts", "D.I. Khan, Hangu, Lakki Marwat, and remaining work in Torghar (currently paused)"],
            ["Coverage", "Every enumerator who submits a Household or Girls form"],
            ["Frequency", "Every working day"],
            ["Access", "District error-log portal, with credentials issued to each district"],
        ],
        col_widths=[3.2, 8.8],
    )

    h1(doc, "4", "Why this workplan works")
    body(
        doc,
        "Quality fails when errors are found late, when only a sample is reviewed, or when "
        "the enumerator never hears what went wrong. Daily checks already cover every form. "
        f"{'The team' if kprap else org} will call the enumerator while the interview is still "
        "fresh, and will guide them before the next field day.",
    )
    tbl(
        doc,
        ["What is in place / what will happen", "Why it matters"],
        [
            [
                "The script checks every enumerator, every day (already running)",
                "A mistake on Monday is visible on Monday, not after many more forms have been collected.",
            ],
            [
                f"{'The team' if kprap else org} will call while the interview is still fresh",
                "A typing error can be separated from a real field problem.",
            ],
            [
                f"{'The team' if kprap else org} will guide before the next field day",
                "The same person does not repeat the same mistake the next day.",
            ],
            [
                "The Daily Error Log is on the district portal (already running)",
                "The district field supervisor sees the whole team, not only the cases QA happens to call.",
            ],
        ],
        col_widths=[5.2, 6.8],
    )

    h1(doc, "5", "Daily quality-assurance process")
    body(
        doc,
        "Steps 1 to 4 are already in operation. Steps 5 to 8 are the response "
        f"{'the team' if kprap else org} will follow after a finding is on the log.",
    )
    tbl(
        doc,
        ["Step", "Action"],
        [
            ["1. Extract (in place)", "Household and Girls submissions for the day are extracted."],
            ["2. Run checks (in place)", "The script is run on every enumerator’s forms on both surveys."],
            ["3. Compile the log (in place)", "Findings are compiled in the Daily Error Log, by survey, enumerator and district."],
            ["4. Publish to the portal (in place)", "The log is posted on each district’s error-log portal."],
            ["5. Notify and call, Track 1 (will follow)", "Where a correctable inconsistency is found, the enumerator will be notified and called the same day or the next morning."],
            ["6. Explain and guide, Track 1 (will follow)", "The enumerator will explain the case and will be guided before returning to the field."],
            ["7. Integrity track, Track 2 (will follow)", "If an integrity finding is opened, the enumerator will be suspended from Household and Girls interviews pending investigation. PIU will be notified in writing within 24 hours. Every completed form by that enumerator will be reviewed. Forms that cannot be verified will be invalidated and re-collected. An enumerator explanation will not close the finding."],
            ["8. Field supervision (will follow)", "The Supervisor (Male) will carry out accompaniment, spot checks and unannounced visits. He is not part of Household or Girls data collection. He will look at a sample of learning-test photographs in the field."],
        ],
        col_widths=[4.2, 7.8],
    )
    body(
        doc,
        "Two operating rules "
        f"{'the team' if kprap else org} will follow. These are field rules, not script checks. "
        "First, telephonic interviews will not be allowed. Household and Girls interviews will "
        "be completed in person. Second, once a household or girl is marked complete on the "
        "server, it will stay locked. "
        f"{'The team' if kprap else org} will re-open a completed case only if PIU / IE documents "
        "approval. A completed case that is re-entered without that approval will be invalidated.",
    )

    h1(doc, "6", "Household survey checks")
    body(
        doc,
        "The following checks are already in operation on the Household survey. They run on "
        "every enumerator’s household submissions each working day. They catch both serious "
        "failures (duplicates, consent tapped through, duration under 15 minutes, GPS missing) "
        "and small inconsistencies (dummy names, speed warnings, education outliers). Only "
        "checks the daily script can run from the SurveyCTO export are listed here. If a new "
        "type of problem is observed in the data, an additional check will be added.",
    )

    h2(doc, "6.1", "Consent, availability and respondent")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Father consent without father survey", "Father consent is recorded as agreed, but there is no father household submission for that girl."],
            ["Mother consent without mother survey", "Mother consent is recorded as agreed, but there is no mother household submission for that girl."],
            ["High non-consent by enumerator", "An enumerator has more than five cases in which consent was not agreed."],
            ["Consent screens tapped through", "SurveyCTO speed warnings fired on consent screens, so the screens were on the tablet too briefly to have been read or explained. A recorded consent value is not evidence that the procedure was carried out."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "A recorded consent value is not evidence that the procedure was carried out. The script "
        "flags SurveyCTO speed warnings on consent screens. That means the screens were on the "
        "tablet too briefly to have been read or explained. "
        f"{'The team' if kprap else org} will treat consent screens tapped through as an integrity "
        "finding: the enumerator will be suspended pending investigation, PIU will be notified "
        "in writing within 24 hours, and the household will be resurveyed if consent was not "
        "actually obtained.",
    )

    h2(doc, "6.2", "Identity, duplicates and re-entry")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Duplicate submission ID", "The same record key or instance ID appears more than once. The log names the latest KEY to retain."],
            ["Exact duplicate household record", "The same respondent is submitted more than once with the same identity and location."],
            ["Same respondent with conflicting fields", "The same girl and same respondent are submitted more than once, but name, father, village or address differ."],
            ["Girl ID conflict", "The same girl ID is linked to different girl or father names."],
            ["Completed household re-entered", "A household already marked complete is re-opened or re-submitted, including at night or by another enumerator."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The script flags a duplicate KEY and names the latest KEY to retain. "
        f"{'The team' if kprap else org} will investigate every duplicate KEY, will inform the "
        "World Bank team with the details, and will recommend which submission ID to retain. "
        f"{'The team' if kprap else org} will not allow a completed household to be re-entered. "
        "Once the case is marked complete on the server, it will stay locked unless PIU / IE "
        "documents approval to re-open it.",
    )

    h2(doc, "6.3", "Household roster")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Household size mismatch", "Reported household size does not match the number of members listed on the roster."],
            ["Duplicate household members", "The same person appears more than once on the roster (same name, age and gender)."],
            ["No adult in the roster", "All listed members appear to be under 18 years of age."],
            ["Extremely large household", "Reported household size is unusually large and requires verification."],
            ["Extremely small household", "Reported household size is unusually small and requires verification."],
            ["Listed girl missing from the roster", "The listed (sample) girl is not included in the siblings roster."],
            ["Listed girl not first on the siblings roster", "The listed girl is not the first entry in the siblings roster."],
            ["Listed-girl spelling does not match girl_label", "The listed girl’s name spelling on the roster does not match girl_label, so matching fails."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The listed (sample) girl must appear on the siblings roster, must be the first entry, "
        "and the spelling must match girl_label. The script flags all three. "
        f"Where the listed girl was left out, {'the team' if kprap else org} will investigate "
        "and will resurvey the household. Extremely small and extremely large households are "
        "also flagged so the roster can be verified.",
    )

    h2(doc, "6.4", "Age, date of birth and relationships")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Negative age", "An age on the roster or sibling list is below zero."],
            ["Date of birth does not match age", "Reported age is inconsistent with date of birth."],
            ["Impossible relationships", "Parent-child ages or relationships on the roster are not possible."],
            ["Parent age unrealistically low", "A parent’s reported age is too low to be plausible."],
            ["Invalid sibling marriage information", "Marriage age or related sibling fields are inconsistent or implausible."],
            ["Age heaping", "A high share of roster ages end in 0 or 5, suggesting ages were guessed rather than asked."],
        ],
        col_widths=[4.4, 7.6],
    )

    h2(doc, "6.5", "Education and schooling")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Education roster inconsistency", "Enrolment, grade or ‘never attended’ answers do not agree for the same person."],
            ["Grade and age implausible", "Current grade does not match the person’s age."],
            ["Schooling status mismatch (mother vs father)", "Mother and father report different schooling status for the same girl."],
            ["Invalid school attendance days", "Days attended school in the past two weeks is outside the range 0-12."],
            ["Education expenditure outlier", "Reported education expenditure is an extreme outlier for that household and requires verification."],
        ],
        col_widths=[4.4, 7.6],
    )

    h2(doc, "6.6", "GPS and location")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["GPS outside the assigned district", "Interview coordinates fall outside the district bounding box for the district recorded on the form."],
            ["GPS missing", "No auto-captured GPS point is stored (tablet location likely off)."],
            ["GPS far from other interviews in the same village", "The point is far from the median of other submitted interviews in that village."],
            ["GPS jump during the interview", "Coordinates move a long distance (two kilometres or more) while the same form is open."],
            ["Same GPS point under many village names", "One location cluster is stored against a large number of different village names."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The script flags missing GPS, points outside the district bounding box, points far from "
        "other interviews in the same village, jumps of two kilometres or more while the form is "
        "open, and one location stored under many village names. "
        f"{'The team' if kprap else org} will require enumerators to keep tablet location on at "
        "all times, and will restate this in the debrief call. GPS is captured at intervals in "
        "the form without relying on internet. Where GPS is inconsistent, "
        f"{'the team' if kprap else org} will resurvey. The script does not use shapefile "
        "administrative layers. It uses the district box and the village cluster of submitted "
        "points that are already in the export.",
    )

    h2(doc, "6.7", "Interview timing and duration")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Household duration under 15 minutes", "A completed household form with consent and roster finished in under 15 minutes. This is not achievable in a genuine interview and is referred to the integrity track."],
            ["Implausibly long duration", "Interview duration is so long that the form was likely left open rather than completed in one sitting."],
            ["Late-night interview start", "The household interview started outside agreed field hours."],
            ["Late-night re-interview of a completed household", "A household that was already completed is re-opened at night."],
            ["Impossible timestamp year", "Start or end time shows a year that cannot be correct (device date/time error)."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The minimum duration for a completed household interview is 15 minutes or less than "
        "15 minutes. The script already flags any completed Household form under that floor. "
        f"{'The team' if kprap else org} will treat a form finished faster than this as an "
        "integrity finding: the enumerator will be suspended pending investigation, and the "
        "household will be resurveyed. The script cannot split time by module (consent, roster, "
        "and so on), because the second-by-second text-audit file is not in the export. "
        f"{'The team' if kprap else org} will use total duration and SurveyCTO speed warnings "
        "instead. The export has only SurveyCTO’s own starttime and endtime. There is no typed "
        "start/end pair to compare, so the script checks those device times for end-before-start, "
        "late-night start, impossible year and total duration.",
    )

    h2(doc, "6.8", "Speed and device warnings")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Consent completed too quickly", "Consent screens triggered a device speed warning (screens tapped through)."],
            ["High speed-warning count", "The interview has an unusually high number of speed warnings across questions."],
        ],
        col_widths=[4.4, 7.6],
    )

    h2(doc, "6.9", "Dummy or placeholder entries")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Dummy or placeholder name", "A roster or sibling name looks like test or filler text."],
            ["Dummy identity or location", "Girl name, father name, address, landmark or village looks like placeholder text."],
            ["Dummy primary phone number", "The primary contact number is a fake or repeated-digit pattern."],
            ["Dummy alternative contact number", "The alternative phone number is a fake or repeated-digit pattern."],
            ["Dummy neighbour contact number", "The neighbour phone number is a fake or repeated-digit pattern."],
            ["High don’t-know / refuse by enumerator", "An enumerator records don’t-know or refuse at a much higher rate than peers."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The script flags dummy names, dummy identity and location text, dummy primary / "
        "alternative / neighbour phone numbers, and enumerators whose don’t-know or refuse rate "
        "is much higher than peers. "
        f"{'The team' if kprap else org} will call the enumerator on Track 1 for dummy or "
        "placeholder text. A pattern of dummy entries across many forms will be treated as an "
        "integrity finding.",
    )

    h2(doc, "6.10", "Module completeness and consistency")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Required transport module missing", "The transport module was skipped when it should have been completed."],
            ["Time-use exceeds 24 hours", "Yesterday’s looking-after, chores and leisure hours add up to more than 24 hours."],
            ["Willingness-to-pay inconsistent with maximum fee", "The household accepts a monthly fee tier but the stated maximum fee is lower than that tier."],
            ["Refused free transport but positive maximum fee", "The household would keep the girl at home even if transport were free, yet a positive maximum fee is recorded."],
            ["Asset contradiction", "Electrical assets are reported although the household reports no electricity and no alternative power."],
            ["Follow-up scheduled when it should not exist", "A revisit is recorded in a situation where no follow-up should have been set."],
            ["Required follow-up missed", "A parent was temporarily unavailable but the required revisit was not completed."],
        ],
        col_widths=[4.4, 7.6],
    )

    h1(doc, "7", "Girls survey checks")
    body(
        doc,
        "The following checks are already in operation on the Girls survey. They run on "
        "every enumerator’s Girls submissions each working day. They catch both serious "
        "failures (duplicates, consent refused but marked complete, inconsistent reading test, "
        "duration under 15 minutes) and small inconsistencies (dummy text, speed warnings, "
        "travel-time mismatch). Only checks the daily script can run from the SurveyCTO export "
        "are listed here. If a new type of problem is observed in the data, an additional check "
        "will be added.",
    )

    h2(doc, "7.1", "Consent")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Parental consent not confirmed", "The girl is available but parental consent has not been recorded as agreed. The interview is not valid without parental consent."],
            ["Consent refused but survey marked complete", "Parental or child consent was refused, yet the Girls survey is marked Complete. It must be Incomplete when consent is refused."],
            ["Consent screens tapped through", "SurveyCTO speed warnings fired on parental or child consent screens."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The interview is not valid without parental consent. If consent was refused, the Girls "
        "survey must be marked Incomplete. The script flags both. A recorded consent value is "
        "not evidence that the procedure was carried out. "
        f"{'The team' if kprap else org} will treat consent screens tapped through as an integrity "
        "finding: the enumerator will be suspended pending investigation, PIU will be notified "
        "in writing within 24 hours, and the girl will be resurveyed if consent was not actually "
        "obtained.",
    )

    h2(doc, "7.2", "Identity, duplicates and re-entry")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Duplicate submission ID", "The same KEY or instance ID appears more than once. The log names the latest KEY to retain."],
            ["Duplicate girl in the same village", "The same girl ID is submitted more than once within the same village."],
            ["Duplicate girl ID across villages", "The same girl ID appears in more than one village."],
            ["Exact duplicate record", "Two Girls submissions are identical across almost all fields."],
            ["Missing village or girl name label", "The ID is present but the corresponding name label is missing/dummy."],
            ["Completed Girls form re-entered", "A girl already marked complete is re-opened or re-submitted, including at night or by another enumerator."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The script flags a duplicate KEY and names the latest KEY to retain. "
        f"{'The team' if kprap else org} will investigate every duplicate KEY, will inform the "
        "World Bank team with the details, and will recommend which submission ID to retain. "
        f"{'The team' if kprap else org} will not allow a completed Girls form to be re-entered. "
        "Once the case is marked complete on the server, it will stay locked unless PIU / IE "
        "documents approval to re-open it.",
    )

    h2(doc, "7.3", "Age and marital status")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Age outside expected range", "Reported age is outside 10-17 years for the Grade 6-8 target group."],
            ["Married-type status at a very young age", "Age is very low, but marital status is married, separated, widowed or divorced."],
            ["Marriage age greater than current age", "Reported age at marriage is higher than current age."],
            ["Marriage age too low", "Age at marriage is negative or implausibly low."],
        ],
        col_widths=[4.4, 7.6],
    )

    h2(doc, "7.4", "Education, school and travel")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Teacher is Other but name missing", "Teacher was selected as Other, but the teacher name was not entered/dummy."],
            ["Distance to school is negative/unrealistic", "Reported distance cannot be below zero/unrealistic."],
            ["Distance is zero but transport mode suggests travel", "Distance is 0 km while a non-walking transport mode is selected."],
            ["Transport mode is Other but details missing", "Mode of transport is Other, but the specify field is empty."],
            ["Travel time inconsistent with distance", "Time to school does not match the reported distance (for example a long distance in a few minutes)."],
        ],
        col_widths=[4.4, 7.6],
    )

    h2(doc, "7.5", "Learning assessment")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Reading test inconsistent", "The 72 story-word marks, last word reached, and incorrect total do not describe the same reading event."],
            ["Test-paper photograph not uploaded", "The reading/math test was recorded but front_photo / back_photo has no file."],
            ["Enumerator-level score distribution unusual", "An enumerator’s scores, last_word or incorrect totals sit far from other enumerators."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The script flags reading-test marks that do not describe one event, a missing "
        "photograph file (front_photo / back_photo has no link), and enumerators whose score "
        "pattern sits far from others. The script cannot open the picture. It cannot tell a "
        "blank page from a real completed test sheet, because the export stores only a link. "
        f"{'The team' if kprap else org} will require the enumerator to photograph the completed "
        "paper and upload it. The Supervisor (Male) will look at a sample of photographs during "
        "accompaniment and spot checks. Where the marks do not describe one event, the file is "
        "missing, or the photograph is not a real completed test, "
        f"{'the team' if kprap else org} will resurvey.",
    )

    h2(doc, "7.6", "GPS and location")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["GPS outside the assigned district", "Interview coordinates fall outside the district bounding box for the district recorded on the form."],
            ["GPS missing", "No auto-captured GPS point is stored (tablet location likely off)."],
            ["GPS far from other interviews in the same village", "The point is far from the median of other submitted interviews in that village."],
            ["Girls GPS does not match Household GPS", "For the same girl ID, Girls coordinates are not at the same place as the Household survey."],
            ["GPS jump during the interview", "Coordinates move a long distance (two kilometres or more) while the same form is open."],
            ["Same GPS point under many village names", "One location cluster is stored against a large number of different village names."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The script flags missing GPS, points outside the district box, points far from other "
        "interviews in the village, jumps during the interview, one location stored under many "
        "village names, and Girls GPS that does not match Household GPS for the same girl ID. "
        f"{'The team' if kprap else org} will require enumerators to keep tablet location on at "
        "all times. Where Girls GPS does not match Household GPS, or the point is not in the "
        "expected area, "
        f"{'the team' if kprap else org} will resurvey.",
    )

    h2(doc, "7.7", "Interview timing and duration")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["End time before start time", "The recorded end time is earlier than the start time."],
            ["Girls duration under 15 minutes", "A completed Girls form with consent, modules and reading/math finished in under 15 minutes is invalid and is referred to the integrity track, not treated as a routine timing flag."],
            ["Late-night interview start", "The Girls interview started outside agreed field hours."],
            ["Late-night re-interview of a completed case", "A girl who was already surveyed is re-interviewed at night."],
            ["Impossible timestamp year", "Start or end time shows a year that cannot be correct (device date/time error)."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "The minimum duration for a completed Girls interview is 15 minutes. The script already "
        "flags any completed Girls form under that floor. Remaining work in Torghar will follow "
        "the same 15-minute floor. "
        f"{'The team' if kprap else org} will treat a form finished faster than this as an "
        "integrity finding, not a routine timing flag: the enumerator will be suspended pending "
        "investigation, and the girl will be resurveyed. The script cannot time the learning "
        "test as its own module. It uses total duration and SurveyCTO speed warnings, including "
        "speed warnings on learning-test items.",
    )

    h2(doc, "7.8", "Speed and device warnings")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Consent completed too quickly", "Parental or child consent screens triggered a device speed warning (screens tapped through)."],
            ["High speed-warning count", "The interview has an unusually high number of speed warnings across questions, including learning-test items."],
        ],
        col_widths=[4.4, 7.6],
    )

    h2(doc, "7.9", "Dummy or placeholder entries")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Dummy or placeholder text", "Girl name, village, school, teacher name or comments look like test or filler text."],
            ["Dummy primary phone number", "The primary contact number is a fake or repeated-digit pattern."],
            ["High don’t-know / refuse by enumerator", "An enumerator records don’t-know or refuse at a much higher rate than peers."],
        ],
        col_widths=[4.4, 7.6],
    )

    h2(doc, "7.10", "Module completeness and consistency")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Time-use exceeds 24 hours", "Yesterday’s looking-after, chores and leisure hours add up to more than 24 hours."],
            ["Harassment section not conducted in private", "The harassment module was completed without ‘no one else present’, contrary to form guidance."],
            ["Working hours per week unusually high", "Reported hours of work in a week are implausibly high."],
            ["Months value out of range", "A months field is outside the valid 1-12 range."],
            ["Class size invalid or implausible", "Class size is not a number, is zero or negative, or is unusually high."],
            ["Monthly income is negative", "Reported monthly income is below zero."],
        ],
        col_widths=[4.4, 7.6],
    )

    h2(doc, "7.11", "Linkage with the Household survey")
    tbl(
        doc,
        ["Check", "What it detects"],
        [
            ["Girls survey missing after completed household", "The household interview is complete for the girl, but no Girls survey has been submitted."],
            ["Girls survey still outstanding (attempts not complete)", "The household is complete and the Girls interview is not yet in, and three contact attempts have not yet been recorded."],
            ["Name mismatch between Household and Girls", "The girl name on the Household form does not match the name on the Girls form for the same girl ID."],
        ],
        col_widths=[4.4, 7.6],
    )
    body(
        doc,
        "A completed household for a listed girl must be followed by a Girls survey. The script "
        "flags a missing Girls form, outstanding attempts, and a name mismatch for the same girl "
        "ID. "
        f"{'The team' if kprap else org} will follow up until the Girls interview is completed "
        "or three documented contact attempts are on the record.",
    )

    h1(doc, "8", "Response to findings")
    body(
        doc,
        f"{'The team' if kprap else org} will handle findings on two tracks. Track 1 is a "
        "correctable error: a typing mistake, a skipped question, dummy text that looks like a "
        "slip, or a device issue. Track 2 is an integrity violation: the problem is not a slip, "
        "and an enumerator explanation will not close it. Only independent verification will "
        "close a Track 2 finding. "
        f"{'The team' if kprap else org} will apply the same tracks to every enumerator and "
        "every district, including remaining work in Torghar.",
    )

    h2(doc, "8.1", "Track 1: correctable error")
    body(
        doc,
        "For typing errors, skipped questions and device issues, "
        f"{'the team' if kprap else org} will follow this sequence.",
    )
    tbl(
        doc,
        ["Step", "Action"],
        [
            ["Notify", "The enumerator will be informed of the form, the field, and the finding."],
            ["Call", (
                "The quality-assurance team will contact the enumerator by telephone the same day or the next morning and will request an explanation."
                if kprap else
                f"{org} will contact the enumerator by telephone the same day or the next morning and will request an explanation."
            )],
            ["Explain", "The enumerator will explain what occurred, for example a data-entry error, a skipped question, or a device issue."],
            ["Guide", "Guidance will be given so the same case is avoided on the next interview."],
            ["Record", "The finding, the explanation and the guidance will be recorded in the daily log."],
        ],
        col_widths=[2.6, 9.4],
    )

    h2(doc, "8.2", "Track 2: integrity violation")
    body(
        doc,
        "Track 2 will be used when the problem is not a correctable slip. Examples: the "
        "respondent denies that the interview took place; the learning test was recorded but "
        "not administered; consent was recorded but not obtained (screens tapped through); a "
        "completed case was re-entered without PIU / IE approval; GPS is inconsistent with the "
        "household or the village; a completed form was finished in under 15 minutes. "
        f"{'The team' if kprap else org} will not close these findings on an enumerator "
        "explanation alone.",
    )
    tbl(
        doc,
        ["Step", "Action"],
        [
            ["Immediate suspension", "The enumerator will be suspended from Household and Girls interviews pending investigation."],
            ["Full workload review", "Every completed form by that enumerator will be reviewed, not only the flagged case."],
            ["Invalidate and re-collect", "Forms that cannot be independently verified will be invalidated and re-collected."],
            ["Notify PIU", "PIU will be notified in writing within 24 hours."],
            ["Independent verification", "The finding will stay open until it is verified independently."],
        ],
        col_widths=[3.4, 8.6],
    )
    body(
        doc,
        "When a duplicate record is found, "
        f"{'the team' if kprap else org} will investigate, will inform the World Bank team with "
        "the details, and will recommend which submission ID to retain.",
    )

    h2(doc, "8.3", "Resurvey triggers")
    body(
        doc,
        f"{'The team' if kprap else org} will repeat the survey when any of the following is found. "
        "Enumerators will be told that GPS is captured at intervals in the form without relying "
        "on internet.",
    )
    tbl(
        doc,
        ["Trigger", "What AoE will do" if aoe else "What will happen"],
        [
            ["Listed girl omitted from the roster", "The household will be investigated and will be resurveyed if the listed girl was left out."],
            ["GPS in a different area", "The case will be resurveyed if GPS is outside the district box, is far from other interviews in the village, or Girls GPS does not match Household GPS for the same girl ID."],
            ["Survey rushed", "The case will be resurveyed if Household or Girls duration is under 15 minutes."],
            ["Learning-test inconsistency", "The case will be resurveyed if the reading/math marks do not describe one event, the photograph file was not uploaded, or the Supervisor (Male) finds that the image is not a real completed test."],
            ["Consent not actually obtained", "The case will be resurveyed if consent screens were tapped through or the respondent says consent was not obtained."],
            ["Completed case re-entered", "The re-entry will be invalidated. A genuine re-interview will be done only with documented PIU / IE approval."],
        ],
        col_widths=[4.0, 8.0],
    )

    h1(doc, "9", "District error-log portal")
    body(
        doc,
        "A district error-log portal is already in place. This is how the district field "
        "supervisor keeps an eye on the team: the same list that quality assurance uses is in "
        "front of the district every working day.",
    )
    bullet(doc, "Each district has its own login. The district field supervisor will use those credentials and will see only that district’s enumerators and forms.")
    bullet(doc, "The Daily Error Log is posted on the portal every working day after checks are run.")
    bullet(doc, "The portal lists the enumerator, the survey (Household or Girls), the record, the type of finding, and a short description.")
    bullet(doc, f"The district field supervisor will review the team’s findings, will follow up with enumerators, and will monitor team performance.")
    bullet(doc, "The same log will be used on the call with the enumerator so both sides are looking at the same issue.")
    bullet(doc, "A record will be kept of whether an explanation was received and what guidance was given.")

    h1(doc, "10", "Repeat findings")
    body(
        doc,
        "On Track 1, "
        f"{'the team' if kprap else org} will first notify, call, obtain an explanation, and "
        "provide guidance. Most enumerators correct the issue after that call. If the same "
        "enumerator continues to produce the same finding after that guidance, further action "
        "will be taken so that one person’s habit does not damage the district’s data. Track 2 "
        "will not start with a call for explanation. It will start with suspension and independent "
        "verification.",
    )
    tbl(
        doc,
        ["Situation", "Action" if kprap else f"Action by {org}"],
        [
            ["First occurrence (Track 1)", "Will notify, call, obtain an explanation, and provide guidance before the next field day."],
            ["Same finding after guidance", "Will issue a written warning. The enumerator will be informed that the issue must stop."],
            ["Repeated problems after warning", "The enumerator may be withdrawn from Household and Girls interviews until the issue is resolved. Those forms must be corrected."],
            ["Integrity violation (Track 2)", "Will suspend the enumerator pending investigation, review the full workload, invalidate forms that cannot be verified, re-collect them, and notify PIU in writing within 24 hours."],
        ],
        col_widths=[5.0, 7.0],
    )

    h1(doc, "11", "Roles and responsibilities")
    tbl(
        doc,
        ["Role", "Responsibility"],
        [
            [
                "Enumerator",
                "Will complete Household and Girls forms accurately in person (not by telephone); will keep tablet location on; will photograph the completed learning-test paper and upload it; will respond to the daily call; will explain Track 1 findings; will follow the guidance before the next interviews; will attend weekly review and on-the-job training.",
            ],
            [
                "Supervisor (Male)",
                "Is not part of Household or Girls data collection. He will not conduct those interviews and he is not on the enumerator team that collected that day’s survey data. Field supervision is his role: accompaniment, spot checks and unannounced visits. He will confirm, on a sample of visits, that a learning-test photograph is a real completed page (the script can only see that a file was uploaded). He may notify male counterparts in the household so an in-person interview can be arranged, without conducting the Household or Girls interview himself. Will also log in to the district error-log portal with the district credentials; will review the team’s Household and Girls findings each day; will follow up with enumerators; will monitor team performance; will join the weekly review meeting.",
            ],
            [
                "Technical team" if kprap else f"Technical team ({org})",
                "Runs the daily checks on both surveys and publishes the log (already in place). Will notify and call the enumerator on Track 1; will open Track 2 where required; will record the explanation and the guidance; will notify PIU in writing within 24 hours of an integrity finding; will lead weekly review meetings and on-the-job training; will restate in the debrief call that tablet location must stay on.",
            ],
            [
                "Project Manager" if kprap else f"Project Manager ({org})",
                "Will issue written warnings; will suspend an enumerator on Track 2 pending investigation; will decide whether an enumerator is withdrawn from Household and Girls interviews if problems continue.",
            ],
        ],
        col_widths=[3.8, 8.2],
    )

    h1(doc, "12", "Weekly review meetings and on-the-job training")
    body(
        doc,
        "Daily checks stay in place. In addition, "
        f"{'the team' if kprap else org} will hold a review meeting each week. The meeting may "
        "be combined (all staff together) or separate (by district or by team), depending on the "
        "week’s findings. The Daily Error Log will be the agenda. Recurring errors, the guidance "
        "already given, and what the team must do in the next week will be discussed so the same "
        "mistakes are not carried forward.",
    )
    tbl(
        doc,
        ["Session", "What will happen"],
        [
            ["Combined weekly review", "All relevant staff will sit together. The week’s error log will be reviewed. Common mistakes will be explained once so the whole team hears the same guidance."],
            ["Separate weekly review", "Where one district or one team has a different pattern of errors, a separate session will be held with that group only."],
            ["On-the-job training (team)", "Training will be given on the errors that were notified and that appeared during the daily data check. The training will use real cases from that week, not generic slides."],
            ["Separate session for individuals", "Where one enumerator keeps making the same mistake, a separate session will be held with that person so the guidance is specific to their forms."],
        ],
        col_widths=[4.2, 7.8],
    )
    callout(
        doc,
        "How this keeps work smooth",
        "The daily call will fix yesterday’s form. The weekly meeting and on-the-job training "
        "will fix the habit. By the next week the team will have practised the correct entry, "
        "not only been told about it.",
    )

    h1(doc, "13", "Proposed roster sync and second confirmation")
    body(
        doc,
        "It is proposed that the household roster be prepared once and then used with a Sync "
        "option. The synced roster can be edited where needed. A second confirmation will be "
        "taken while interviewing the second counterpart (the father, or the girl herself) so "
        "household members, ages and relationships are confirmed by more than one respondent "
        "before the record is treated as final.",
    )
    tbl(
        doc,
        ["Step", "What it does"],
        [
            ["Prepare the roster", "The roster is completed carefully in the first household interview."],
            ["Sync option", "The same roster is available for the second interview (father or girl) instead of being built again from scratch."],
            ["Possible editing", "If the second respondent reports a correction (a missing member, a wrong age, a wrong relationship), the synced roster can be edited."],
            ["Second confirmation", "The father, or the girl herself, confirms the roster during their interview. That confirmation is the check against a one-sided or rushed first roster."],
        ],
        col_widths=[3.6, 8.4],
    )
    body(
        doc,
        "This will reduce dummy names, household-size mismatches and listed-girl "
        "errors, because the second counterpart sees the same list and can correct it on the spot. "
        "Until the sync option is in use, the roster checks already running on Household and Girls "
        "forms will continue as they are.",
    )

    h1(doc, "14", "What the daily script cannot check")
    body(
        doc,
        "The daily quality-assurance script reads the Household and Girls exports (the CSV files "
        "downloaded from SurveyCTO). It can only check values that are already in those files: "
        "answers, IDs, SurveyCTO starttime and endtime, duration in seconds, GPS coordinates, "
        "speed-warning lists, and whether a photograph field has a file link. Three checks that "
        "were requested in review cannot be run from that export. They are not omitted by "
        "choice. The data needed for them is not in our files.",
    )
    tbl(
        doc,
        ["Requested check", "Why it cannot be run from our end", "How it is covered instead"],
        [
            [
                "Look at the test-paper photograph (blank page, random picture, or a real completed test)",
                "The export stores only a link to the image on SurveyCTO (for example front_photo / back_photo). The script can see that the link is missing. It does not download the picture and it cannot see pixels, so it cannot tell a blank page from a real test sheet.",
                "The enumerator will photograph the paper and upload it. The script flags a missing file. The Supervisor (Male) will look at a sample of images during field visits.",
            ],
            [
                "Time spent on each module (consent, roster, harassment, learning test, and so on)",
                "SurveyCTO text_audit is stored as a login URL, not as the second-by-second table. Those media files are not in the exported file and cannot be opened without SurveyCTO credentials and a separate download. Without that table, the script cannot time consent, roster or harassment on their own.",
                "The script checks total duration (15-minute floor) and SurveyCTO speed warnings, including consent screens tapped through. Module-level seconds would need the text-audit files to be exported.",
            ],
            [
                "Automated start/end time versus a start/end time typed by the enumerator",
                "The export has only SurveyCTO’s own starttime and endtime (written by the tablet when the form is opened and closed). There is no second pair of fields in which the enumerator types a start and end time. With one pair of times, there is nothing to compare.",
                "The script still checks those device times: end before start, late-night start, impossible year, and total duration. A typed-versus-device check would need a new form field.",
            ],
        ],
        col_widths=[3.4, 4.8, 3.8],
    )
    body(
        doc,
        "There are three important limitations that cannot be covered by the script alone. "
        "These limitations require information and observation that cannot be captured through "
        "a submitted CSV file or processed automatically by the script.",
    )

    h1(doc, "15", "Field supervision")
    body(
        doc,
        "Field supervision will be done by the Supervisor (Male). He is not part of Household "
        "or Girls data collection. He will not conduct those interviews, and he is not on the "
        "enumerator team that collected that day’s survey data. That independence is the point: "
        "accompaniment, spot checks and unannounced visits will not be done by the same people "
        "who filled the forms.",
    )
    tbl(
        doc,
        ["Method", "What the Supervisor (Male) will do"],
        [
            ["Accompaniment", "Will sit with the enumerator for selected Household or Girls interviews and will check that consent, roster, modules and the learning test are administered as written."],
            ["Spot checks", "Will revisit or observe completed households and girls shortly after the interview to confirm that the visit took place, that GPS is consistent with a residential location, and that the learning-test photograph (if uploaded) is a real completed page, not a blank or random image."],
            ["Unannounced visits", "Will arrive without prior notice to the enumerator team, so the check is not staged."],
        ],
        col_widths=[3.6, 8.4],
    )
    body(
        doc,
        "Field-supervision findings will follow the same two tracks as the daily data checks. A "
        "typing error found in accompaniment is Track 1: "
        f"{'the team' if kprap else org} will notify, call, obtain an explanation and give "
        "guidance. A respondent who says the interview did not take place, a learning test "
        "recorded but not given, or consent recorded but not obtained is Track 2: "
        f"{'the team' if kprap else org} will suspend the enumerator pending investigation, "
        "notify PIU in writing within 24 hours, and invalidate forms that cannot be verified.",
    )

    h1(doc, "16", "Conclusion")
    if kprap:
        lead = (
            "This workplan is the daily operating method for the KP-RAP Household and Girls Surveys "
            "in D.I. Khan, Hangu, Lakki Marwat, and remaining work in Torghar (currently paused)."
        )
    else:
        lead = (
            f"This workplan is the daily operating method that {org_full} will follow for the "
            "KP-RAP Household and Girls Surveys in D.I. Khan, Hangu, Lakki Marwat, and remaining "
            "work in Torghar (currently paused)."
        )
    body(
        doc,
        lead + " "
        "Daily checks already run on every enumerator’s forms. "
        f"{'The team' if kprap else org} will notify, call and guide on Track 1 before the next "
        "field day. On Track 2, "
        f"{'the team' if kprap else org} will suspend the enumerator, review the full workload, "
        "invalidate forms that cannot be verified, and notify PIU in writing within 24 hours. "
        f"{'The team' if kprap else org} will not allow telephonic interviews. Completed cases "
        "will stay locked on the server until PIU / IE approval. Field supervision will be done "
        "by the Supervisor (Male), who is not part of Household or Girls data collection.",
    )
    body(
        doc,
        "Each week a review meeting will be held, combined or separate, and on-the-job training "
        "will be given on the errors that appeared in the data check, including separate sessions "
        "for individual team members. The proposed roster sync, with editing and second "
        "confirmation from the father, will further reduce roster errors once it is "
        "in use. If a new type of problem is observed in the data, an additional check will be "
        "added. Followed as written, this protocol keeps Household and Girls data clean while "
        "fieldwork is still running, including remaining work in Torghar.",
    )

    P(doc, "", space_after=16)
    P(
        doc,
        (
            "KP-RAP  ·  Household and Girls Surveys  ·  Quality Assurance Workplan"
            if kprap else
            f"{org_full}  ·  KP-RAP Household and Girls Surveys  ·  Quality Assurance Workplan"
        ),
        size=8,
        color=MUTED,
        align="center",
    )

    if brand == "rap":
        out_name = OUT_NAME_RAP
    elif kprap:
        out_name = OUT_NAME_KPRAP
    elif brand == "aoe":
        out_name = OUT_NAME_AOE
    else:
        out_name = OUT_NAME
    dests = [
        ROOT / out_name,
        Path.home() / "OneDrive" / "Desktop" / out_name,
        Path.home() / "Desktop" / out_name,
    ]
    if brand == "rap":
        dests.append(ROOT / "KP-RAP_Quality_Assurance_Workplan_17August2026.docx")
    written = []
    from io import BytesIO

    buf = BytesIO()
    doc.save(buf)
    data = buf.getvalue()
    for d in dests:
        try:
            d.parent.mkdir(parents=True, exist_ok=True)
            d.write_bytes(data)
            written.append(str(d))
        except Exception:
            pass
    return written


if __name__ == "__main__":
    import sys
    brand = "pidc"
    if "rap" in sys.argv:
        brand = "rap"
    elif "kprap" in sys.argv:
        brand = "kprap"
    elif "aoe" in sys.argv:
        brand = "aoe"
    paths = build(brand=brand)
    print("Wrote:")
    for p in paths:
        print(" ", p)
