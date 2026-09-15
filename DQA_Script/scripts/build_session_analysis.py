"""
Data Quality Session document: D.I. Khan + Hangu, built directly from the
real error log ("DI khan and Hangu Error log.xlsx"). Roman Urdu, simple
mixed language, real examples pulled from actual submitted forms.
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

from wajah_hal_common import (
    shade_cell, set_cell_margins, no_borders, tbl_borders_light, add_run,
    TEAL_DEEP, TEAL, AMBER, GREEN, INK, INK_SOFT, WHITE,
    AMBER_FILL, GREEN_FILL, TEAL_FILL, HEADER_FILL, CHIP_FILL,
)

BLUE = RGBColor(0x1E, 0x5A, 0x8A)
BLUE_FILL = "E8F0F7"
BLUE_LINE = "BBD6EA"
RED = RGBColor(0xB4, 0x2A, 0x2A)
RED_FILL = "FBEAEA"
RED_HEADER_HEX = "B42A2A"
GREEN_HEADER_HEX = "2F7A44"
TEAL_HEADER_HEX = HEADER_FILL


def section_heading(doc, title, subtitle=None):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(2)
    add_run(p, title, size=16, bold=True, color=TEAL_DEEP, font="Cambria")
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


def sub_heading(doc, title):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(6)
    add_run(p, title, size=12.5, bold=True, color=TEAL_DEEP, font="Cambria")


def doc_heading(doc, stats_line):
    band = doc.add_table(rows=1, cols=1)
    band.alignment = WD_TABLE_ALIGNMENT.CENTER
    band.autofit = True
    cell = band.rows[0].cells[0]
    shade_cell(cell, HEADER_FILL)
    set_cell_margins(cell, top=260, bottom=260, left=280, right=280)
    no_borders(band)

    p1 = cell.paragraphs[0]
    add_run(p1, "KP-RAP PROJECT | DATA QUALITY SESSION", size=9, bold=True, color=WHITE)

    p2 = cell.add_paragraph()
    p2.space_before = Pt(4)
    add_run(p2, "Errors Ki Wajah, Hal Aur Real Data Analysis", size=22, bold=True, color=WHITE, font="Cambria")

    p3 = cell.add_paragraph()
    p3.space_before = Pt(4)
    add_run(
        p3,
        "Yeh document D.I. Khan aur Hangu ke asal error log se banaya gaya hai. Har mistake ka "
        "real example (girl, village, enumerator) is mein diya gaya hai, taake session mein sab "
        "ko exact wajah aur hal samajh aaye.",
        size=10.5,
        color=WHITE,
    )

    p4 = cell.add_paragraph()
    p4.space_before = Pt(6)
    add_run(p4, stats_line, size=9, bold=True, color=WHITE)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)


def stat_tiles(doc, tiles):
    n = len(tiles)
    tbl = doc.add_table(rows=1, cols=n)
    tbl.autofit = True
    no_borders(tbl)
    for i, (label, value, color) in enumerate(tiles):
        cell = tbl.rows[0].cells[i]
        shade_cell(cell, "F6F7F5")
        set_cell_margins(cell, top=120, bottom=120, left=100, right=100)
        p1 = cell.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_run(p1, label, size=8, bold=True, color=INK_SOFT)
        p2 = cell.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_run(p2, value, size=16, bold=True, color=color, font="Cambria")
    doc.add_paragraph().paragraph_format.space_after = Pt(6)


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


def rule_card(doc, code, title, count, wajah, hal, example=None):
    head = doc.add_table(rows=1, cols=3)
    head.autofit = True
    head.columns[0].width = Cm(6.6)
    head.columns[1].width = Cm(6.6)
    head.columns[2].width = Cm(2.2)
    no_borders(head)

    c0, c1, c2 = head.rows[0].cells
    for c in (c0, c1, c2):
        set_cell_margins(c, top=40, bottom=40, left=80, right=80)

    shade_cell(c0, TEAL_FILL)
    add_run(c0.paragraphs[0], code, size=7.5, bold=True, color=TEAL_DEEP, font="Consolas")

    add_run(c1.paragraphs[0], title, size=10.5, bold=True, color=INK)

    shade_cell(c2, CHIP_FILL)
    c2.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_run(c2.paragraphs[0], count, size=8.5, bold=True, color=INK_SOFT, font="Consolas")

    body = doc.add_table(rows=1, cols=2)
    body.autofit = True
    body.columns[0].width = Cm(7.7)
    body.columns[1].width = Cm(7.7)
    tbl_borders_light(body)

    wc, hc = body.rows[0].cells
    shade_cell(wc, AMBER_FILL)
    shade_cell(hc, GREEN_FILL)
    set_cell_margins(wc, top=140, bottom=140, left=180, right=180)
    set_cell_margins(hc, top=140, bottom=140, left=180, right=180)

    add_run(wc.paragraphs[0], "WAJAH", size=8.5, bold=True, color=AMBER)
    add_run(wc.add_paragraph(), wajah, size=9.5, color=INK)

    add_run(hc.paragraphs[0], "HAL", size=8.5, bold=True, color=GREEN)
    add_run(hc.add_paragraph(), hal, size=9.5, color=INK)

    if example:
        ex = doc.add_table(rows=1, cols=1)
        ex.autofit = True
        tbl_borders_light(ex)
        ec = ex.rows[0].cells[0]
        shade_cell(ec, BLUE_FILL)
        set_cell_margins(ec, top=120, bottom=120, left=180, right=180)
        add_run(ec.paragraphs[0], "ASAL DATA SE MISAL", size=8, bold=True, color=BLUE)
        add_run(ec.add_paragraph(), example, size=9.5, italic=True, color=INK)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)


def simple_table(doc, headers, rows, col_widths, header_fill=HEADER_FILL, font_size=9):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.autofit = True
    for i, w in enumerate(col_widths):
        tbl.columns[i].width = Cm(w)
    tbl_borders_light(tbl)

    hdr = tbl.rows[0].cells
    for i, h in enumerate(headers):
        shade_cell(hdr[i], header_fill)
        set_cell_margins(hdr[i], top=70, bottom=70, left=120, right=120)
        add_run(hdr[i].paragraphs[0], h, size=font_size, bold=True, color=WHITE)

    for r_i, row in enumerate(rows):
        cells = tbl.add_row().cells
        shade = "F6F7F5" if r_i % 2 == 1 else "FFFFFF"
        for i, val in enumerate(row):
            shade_cell(cells[i], shade)
            set_cell_margins(cells[i], top=70, bottom=70, left=120, right=120)
            add_run(cells[i].paragraphs[0], str(val), size=font_size, color=INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)


def repeat_offender_card(doc, name_district, rule_title, count, example, instruction):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.autofit = True
    tbl_borders_light(tbl)
    cell = tbl.rows[0].cells[0]
    shade_cell(cell, RED_FILL)
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)

    p1 = cell.paragraphs[0]
    add_run(p1, name_district, size=10.5, bold=True, color=RED)
    add_run(p1, f"   {rule_title}   ", size=9.5, color=INK)
    add_run(p1, f"{count}x repeat", size=9, bold=True, color=RED, font="Consolas")

    p2 = cell.add_paragraph()
    add_run(p2, "Asal misal: ", size=9, bold=True, color=INK_SOFT)
    add_run(p2, example, size=9.5, italic=True, color=INK)

    p3 = cell.add_paragraph()
    add_run(p3, "Kya karein: ", size=9, bold=True, color=GREEN)
    add_run(p3, instruction, size=9.5, color=INK)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)


def footer_note(doc):
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
    add_run(p, "KP-RAP M&E  |  Data Quality Session  |  D.I. Khan aur Hangu", size=8.5, color=INK_SOFT)
    p2 = doc.add_paragraph()
    add_run(p2, "Source: DI khan and Hangu Error log.xlsx (264 rows, asal submitted forms se)", size=8.5, color=INK_SOFT)


# ---------------------------------------------------------------------------
# Real data, computed from "DI khan and Hangu Error log.xlsx" (264 rows).
# ---------------------------------------------------------------------------

STATS_LINE = "264 Total Errors (87 Critical + 177 Quality)  |  2 Districts  |  10 Enumerators  |  29 Rule Types  |  12-Sep-2026"

TOP_RULES = [
    # code, title, count, wajah, hal, real_example
    ("HH_QF_DUMMY_NEIGHBOR_PHONE", "Neighbour ka number fake dalna", "32 cases",
     "Form jaldi khatam karne ke liye number field mein \"0\" ya repeat digits dal diye jate hain. "
     "Asal number poochha hi nahi jata.",
     "Respondent se sahi neighbour number zaroor poochein. Number available na ho to \"not available\" "
     "option select karein. Dummy number, jaise 0 ya 0000000000, kabhi na dalein.",
     "Mahnoor (Hangu) ke Kainat (Zanki Banda) ke form mein neighbour_phonenumber sirf \"0\" darj hai. "
     "Yeh mistake in enumerators ne ki: Javairia (D.I. Khan) 6x, Asma Bibi (D.I. Khan) 5x, Shazia "
     "Bibi (D.I. Khan) 5x, Laiba Shams (Hangu) 4x, Mahnoor (Hangu) 4x, Irum Ikram (D.I. Khan) 3x, "
     "Nadia Bibi (Hangu) 3x, Shafaq Zahra (D.I. Khan) 2x."),

    ("HH_QF_GPS_MISSING / GL_QF_GPS_MISSING", "Interview ka GPS capture na hona", "48 cases",
     "Tablet ki location/GPS service interview ke waqt off thi, is liye system location record nahi "
     "kar saka.",
     "Har interview shuru karne se pehle tablet ki GPS setting ON karein. Confirm karein ke location "
     "signal mil raha hai, tab hi form shuru karein.",
     "Irum Ikram (D.I. Khan) ke Asma (Chah Faqeer) ke Household aur Girls, dono forms mein "
     "gps_missing=1 hai, matlab poore interview mein GPS on hi nahi thi. Yeh mistake in enumerators "
     "ne ki: Shazia Bibi (D.I. Khan) 19x, Laiba Shams (Hangu) 10x, Mahnoor (Hangu) 7x, Javairia "
     "(D.I. Khan) 4x, Asma Bibi (D.I. Khan) 2x, Irum Ikram (D.I. Khan) 2x, Naureen Khan (D.I. Khan) "
     "2x, Shafaq Zahra (D.I. Khan) 2x."),

    ("HH_QF_CONSENT_SPEED / GL_QF_CONSENT_SPEED", "Consent screen ko jaldi tap kar dena", "45 cases",
     "Enumerator consent screen parhe bina bohat tezi se \"samajh gaya / manzoor\" tap kar deta hai. "
     "SurveyCTO khud speed warning se yeh pakar leta hai.",
     "Har consent screen zaban se parh kar respondent ko sunayein. Respondent samjhe, us ke baad hi "
     "agla button dabayein.",
     "Mahnoor (Hangu) ke Kainat ke form mein mother consent par violation_count=100 hai. Yeh mistake "
     "in enumerators ne ki: Asma Bibi (D.I. Khan) 13x, Mahnoor (Hangu) 7x, Javairia (D.I. Khan) 5x, "
     "Naureen Khan (D.I. Khan) 5x, Irum Ikram (D.I. Khan) 4x, Laiba Shams (Hangu) 4x, Shazia Bibi "
     "(D.I. Khan) 4x, Shafaq Zahra (D.I. Khan) 2x, Nadia Bibi (Hangu) 1x."),

    ("HH_CR_SCHOOLING_PARENT_MISMATCH", "Schooling status: Maa aur Baap ke jawab match nahi karte", "22 cases",
     "Mother aur Father se bache ke school jane ke baray mein alag jawab milte hain. Enumerator dono "
     "jawab aapas mein check nahi karta.",
     "Dono parents se sawal poochne ke baad agar jawab mein farq aaye, submit se pehle household mein "
     "hi sahi jawab confirm karein. Dono forms mein wahi jawab darj karein.",
     "Asma Bibi (D.I. Khan) ke Ateeqa Bibi ke form mein Mother=\"Currently attending\" hai lekin "
     "Father ka jawab blank chhoda gaya. Yeh mistake in enumerators ne ki: Shazia Bibi (D.I. Khan) "
     "7x, Asma Bibi (D.I. Khan) 4x, Mahnoor (Hangu) 3x, Irum Ikram (D.I. Khan) 3x, Laiba Shams "
     "(Hangu) 2x, Javairia (D.I. Khan) 1x, Naureen Khan (D.I. Khan) 1x, Shafaq Zahra (D.I. Khan) 1x."),

    ("HH_QF_DUMMY_ALT_PHONE", "Alternative number fake dalna", "19 cases",
     "Form jaldi khatam karne ke liye alternate number field mein \"0\" ya repeat digits dal diye "
     "jate hain.",
     "Respondent se sahi alternate number poochein. Number na ho to \"not available\" select karein, "
     "dummy number kabhi na dalein.",
     "Mahnoor (Hangu) ke Kainat ke form mein alternate_phonenumber=\"0\" hai. Yeh mistake in "
     "enumerators ne ki: Javairia (D.I. Khan) 6x, Asma Bibi (D.I. Khan) 5x, Shazia Bibi (D.I. Khan) "
     "3x, Nadia Bibi (Hangu) 2x, Shafaq Zahra (D.I. Khan) 2x, Mahnoor (Hangu) 1x."),

    ("GL_CE_READING_INCONSISTENT", "Reading test ka data match nahi karta", "15 cases",
     "Story ke lafz mark to kar diye jate hain lekin last_word 0 reh jata hai, matlab test asal mein "
     "administer hi nahi hua tha, sirf mark kar diya gaya.",
     "Girl jaise jaise parhe, har lafz ussi waqt mark karein. last_word usi lafz par set karein jahan "
     "girl ruki. Test bagair administer kiye mark na karein.",
     "Irum Ikram (D.I. Khan) ke Asma ke form mein 72 lafz Correct/Incorrect mark hue lekin last_word=0 "
     "tha. Yeh mistake in enumerators ne ki: Naureen Khan (D.I. Khan) 4x, Shazia Bibi (D.I. Khan) 4x, "
     "Nadia Bibi (Hangu) 3x, Asma Bibi (D.I. Khan) 2x, Irum Ikram (D.I. Khan) 1x, Mahnoor (Hangu) 1x."),

    ("GL_QF_HARASSMENT_NOT_PRIVATE", "Harassment section private tareeqe se conduct na hona", "14 cases",
     "Harassment ke sensitive sawal ghar ke doosre afraad ki mojoodgi mein poochay gaye, jab keh form "
     "guidance ke mutabiq yeh section private hona chahiye.",
     "Section shuru karne se pehle ghar ke doosre afraad se thodi der bahar jane ki request karein. "
     "Sirf girl ke saath akele yeh sawal poochein.",
     "Irum Ikram (D.I. Khan) ke Asma ke form mein harassment_presence=\"2 3\" hai, matlab 2 se 3 log "
     "room mein maujood the. Yeh mistake in enumerators ne ki: Irum Ikram (D.I. Khan) 4x, Javairia "
     "(D.I. Khan) 3x, Nadia Bibi (Hangu) 3x, Asma Bibi (D.I. Khan) 2x, Shafaq Zahra (D.I. Khan) 1x, "
     "Shazia Bibi (D.I. Khan) 1x."),

    ("HH_QF_LISTED_GIRL_SPELLING", "Girl ka naam roster aur girl form mein alag likha jana", "16 cases",
     "Roster mein naam ek tarah likha jata hai aur girl ke apne form, girl_label, mein spelling thodi "
     "alag ho jati hai. Jaldi mein type karne se aisa hota hai.",
     "Naam har jagah bilkul ek jaisa likhein. Submit karne se pehle roster aur girl form ka naam "
     "compare kar lein.",
     "Mahnoor (Hangu) ke form mein roster=\"kainat bibi\" tha jab keh girl_label=\"kainat\" tha. Yeh "
     "mistake in enumerators ne ki: Javairia (D.I. Khan) 4x, Shazia Bibi (D.I. Khan) 4x, Mahnoor "
     "(Hangu) 3x, Laiba Shams (Hangu) 2x, Irum Ikram (D.I. Khan) 1x, Nadia Bibi (Hangu) 1x, Summiya "
     "Hayat (Hangu) 1x."),

    ("HH_QF_SMALL_HOUSEHOLD", "Household mein afraad ki tadaad ghair mamuli kam", "8 cases",
     "Roster banate waqt kuch members, jaise chhote bache ya bujurg, count hone se reh jate hain. Is "
     "liye household size asal se kam nazar aata hai.",
     "Roster complete karte waqt ghar ke har fard ko shamil karein, bache se le kar bujurg tak. Koi "
     "bhi member chootna nahi chahiye.",
     "Irum Ikram (D.I. Khan) ke Eman Zahra (Chah Faqeer) ke form mein sirf 2 siblings list hue, jab "
     "keh threshold bhi 2 hai. Yeh mistake in enumerators ne ki: Javairia (D.I. Khan) 4x, Irum Ikram "
     "(D.I. Khan) 1x, Laiba Shams (Hangu) 1x, Naureen Khan (D.I. Khan) 1x, Summiya Hayat (Hangu) 1x."),

    ("HH_QF_EDU_SPEND_OUTLIER", "Education expenditure ka amount ghair mamuli", "7 cases",
     "Kharch ki amount bohat zyada darj ho jati hai. Aksar respondent ko time period ki confusion "
     "hoti hai ya enumerator jaldi mein galat digit type kar deta hai.",
     "Amount darj karne se pehle respondent se currency aur time period, mahana ya salana, clear "
     "karein. Phir amount zaban se repeat kar ke confirm karein.",
     "Naureen Khan (D.I. Khan) ke Hanifa (GGMS ARA) ke form mein education spend 22,000 PKR darj "
     "hua, jab keh outlier threshold 20,000 PKR hai. Yeh mistake in enumerators ne ki: Shazia Bibi "
     "(D.I. Khan) 3x, Javairia (D.I. Khan) 2x, Nadia Bibi (Hangu) 1x, Naureen Khan (D.I. Khan) 1x."),

    ("HH_AN_LONG_DURATION", "Interview ka waqt zaroorat se zyada lamba ho jana", "5 cases",
     "Interview 3 ghante (180 minute) se zyada chal jata hai. Aksar tab hota hai jab tablet ka form "
     "khula reh jata hai, jaise beech mein break liya gaya, na keh lagatar interview hone se.",
     "Interview shuru karte hi usay lagatar complete karein. Break lena zaroori ho to form ko sahi "
     "tarah pause/save karein, khula na chhodein.",
     "Naureen Khan (D.I. Khan) ke Gul Bushra Bibi (Chah Faqeer) ke form ka duration 183 minute (3 "
     "ghante se zyada) show hua. Yeh mistake in enumerators ne ki: Shazia Bibi (D.I. Khan) 2x, "
     "Javairia (D.I. Khan) 1x, Naureen Khan (D.I. Khan) 1x, Shafaq Zahra (D.I. Khan) 1x."),

    ("HH_CR_GPS_JUMP / GL_CE_GPS_JUMP", "GPS location interview ke beech mein achanak badal jana", "6 cases",
     "Tablet ki location theek se lock nahi hoti, ya enumerator location capture hone se pehle hi "
     "ghar se chala jata hai.",
     "Interview shuru karne se pehle GPS lock hone ka wait karein. Location capture hone tak wahi "
     "ruke rahein.",
     "Irum Ikram (D.I. Khan) ke Eman Zahra ke form mein GPS interview ke dauran 4.2 km move hui. Yeh "
     "mistake in enumerators ne ki: Asma Bibi (D.I. Khan) 3x, Javairia (D.I. Khan) 2x, Irum Ikram "
     "(D.I. Khan) 1x."),
]

# ---------------------------------------------------------------------------
# Baqi 11 grouped rules — yeh bhi TOP_RULES jaisi detail ke sath, taake koi
# bhi error (all 264, sab 29 rules) is document se miss na ho.
# ---------------------------------------------------------------------------

OTHER_RULES = [
    ("HH_CR_GPS_REMOTE_FROM_VILLAGE / GL_CE_GPS_REMOTE_FROM_VILLAGE",
     "GPS village ke baqi interviews se bohat door", "5 cases",
     "Ya to interview ghalat address par hui, ya GPS point ghalat jagah capture hua, is liye yeh "
     "village ke doosre interviews se kaafi door (4 km se zyada) nazar aata hai.",
     "Interview shuru karne se pehle confirm karein ke aap sahi household mein hain. GPS ON karein "
     "aur sahi signal aane tak wait karein.",
     "Irum Ikram (D.I. Khan) ke Eman Zahra (Chah Faqeer) ke Household aur Girls, dono forms ka GPS "
     "point village ke baqi interviews se 4.1 se 4.3 km door tha. Yeh mistake in enumerators ne ki: "
     "Asma Bibi (D.I. Khan) 2x, Irum Ikram (D.I. Khan) 2x, Javairia (D.I. Khan) 1x."),

    ("HH_CR_LISTED_GIRL_NOT_IN_ROSTER", "Select ki gayi girl ka naam roster mein nahi hai", "4 cases",
     "Roster banate waqt kisi bacche ki entry reh jati hai ya naam ghalat likha jata hai, is liye "
     "selected girl ka naam roster se match nahi karta.",
     "Roster mein ghar ke tamam bachon ka naam dhyan se likhein. Girl select karne se pehle uska "
     "naam roster mein check karein.",
     "Naureen Khan (D.I. Khan) ke Hanifa (Chah Faqeer, GGMS ARA) ke form mein selected girl ka naam "
     "roster ke kisi bhi sibling se match nahi hua. Yeh mistake in enumerators ne ki: Naureen Khan "
     "(D.I. Khan) 2x, Asma Bibi (D.I. Khan) 1x, Shafaq Zahra (D.I. Khan) 1x."),

    ("HH_CR_08", "Age negative ya galat darj hona", "3 cases",
     "Age field mein negative number darj ho jata hai, jo mumkin nahi. Aksar galat entry ya date of "
     "birth (DOB) ghalat likhne se hota hai.",
     "Age darj karne se pehle respondent ki date of birth dobara confirm karein. Submit se pehle age "
     "field check kar lein ke woh positive hai.",
     "Shazia Bibi (D.I. Khan) ke Fatima (GGPS Miran Jai) ke form mein age negative darj hui. Yeh "
     "mistake in enumerators ne ki: Shazia Bibi (D.I. Khan) 2x, Javairia (D.I. Khan) 1x."),

    ("GL_AN_FAST_DURATION / HH_AN_FAST_DURATION", "Interview ka waqt zaroorat se kam ho jana", "4 cases",
     "Poora interview 15 minute ya us se kam mein khatam ho jata hai jab keh consent, roster aur sab "
     "modules poochne mein itna kam waqt lagna mumkin nahi.",
     "Har module ko poora waqt dein, sawal jaldi jaldi tap kar ke skip na karein.",
     "Asma Bibi (D.I. Khan) ke Adila ke Girls form ka duration 15.0 minute tha, aur Aqsa Bibi ke "
     "Household form ka duration sirf 11.4 minute tha. Yeh mistake in enumerators ne ki: Asma Bibi "
     "(D.I. Khan) 3x, Javairia (D.I. Khan) 1x."),

    ("HH_CR_LISTED_GIRL_NOT_FIRST", "Listed girl roster mein first entry na hona", "2 cases",
     "Selected girl roster mein mojood to hai lekin pehli entry nahi hai. Form ka rule hai ke listed "
     "girl roster ki pehli row honi chahiye.",
     "Roster banate waqt selected girl ka naam sab se pehle likhein, phir baqi siblings ka naam darj "
     "karein.",
     "Mahnoor (Hangu) ke Kainat (Zanki Banda) ke form mein listed girl roster mein 4th position par "
     "thi, first honi chahiye thi. Yeh mistake in enumerators ne ki: Javairia (D.I. Khan) 1x, "
     "Mahnoor (Hangu) 1x."),

    ("HH_QF_LATE_NIGHT / GL_QF_LATE_NIGHT", "Interview raat ko bohat der se shuru hona", "3 cases",
     "Interview raat 9 baje ke baad shuru hua, jab keh raat ko interview karna field method mein "
     "agreed nahi hai.",
     "Interview din ke mutayyen waqt mein hi karein. Raat ko interview karna pare to supervisor ko "
     "pehle inform karein.",
     "Javairia (D.I. Khan) ke Haleema Bibi ka interview raat 9:56 PM ko aur Alina Bahawal ka "
     "interview raat 11:22 PM ko shuru hua. Yeh mistake sirf Javairia (D.I. Khan) ne ki hai, 3x."),

    ("HH_QF_04", "Dummy ya placeholder identity/location darj karna", "2 cases",
     "Respondent ka asal naam ya location poochne ke bajaye field mein placeholder text darj kar di "
     "jati hai.",
     "Har respondent ka poora aur sahi naam aur sahi location darj karein.",
     "Javairia (D.I. Khan) ke Haleema Bibi (Chah Faqeer) ke form mein identity/location fields "
     "placeholder jaisi lagin. Yeh mistake in enumerators ne ki: Javairia (D.I. Khan) 1x, Summiya "
     "Hayat (Hangu) 1x."),

    ("GL_CE_00", "Age tay shuda range se bahar hona", "1 case",
     "Grade 6 se 8 tak ki target girls ke liye age 10 se 18 saal ke darmiyan honi chahiye, lekin "
     "darj ki gayi age is range se bahar hai.",
     "Girl ki age respondent se dobara poochein aur confirm karein ke woh sahi grade ke mutabiq hai.",
     "Nadia Bibi (Hangu) ke Romana (Zanki Banda) ke form mein age expected range se bahar thi. Yeh "
     "mistake sirf Nadia Bibi (Hangu) ne ki hai, 1x."),

    ("HH_QF_03", "Dummy ya placeholder naam darj karna", "1 case",
     "Respondent ka asal naam poochne ke bajaye field mein abc, xyz ya koi placeholder naam type kar "
     "diya jata hai.",
     "Har respondent ka poora aur sahi naam poochein aur wahi darj karein.",
     "Mahnoor (Hangu) ke Fatima (Zanki Banda) ke form mein roster/sibling naam placeholder jaisa "
     "laga. Yeh mistake sirf Mahnoor (Hangu) ne ki hai, 1x."),

    ("HH_QF_DUMMY_PRIMARY_PHONE", "Primary contact number fake dalna", "1 case",
     "Primary phone number field mein \"0\" ya koi aur fake number dal diya jata hai.",
     "Respondent se sahi primary number zaroor poochein.",
     "Javairia (D.I. Khan) ke Haleema Bibi ke form mein primary number bhi \"0\" tha. Yeh mistake "
     "sirf Javairia (D.I. Khan) ne ki hai, 1x."),

    ("HH_QF_SPEED_WARNINGS", "SurveyCTO ki speed warning zyada aana", "1 case",
     "Bohat se sawalat bohat kam waqt mein answer kiye jate hain, is liye system automatic speed "
     "warning deta hai.",
     "Har sawal ko poora waqt dein aur respondent se dhyan se sunein.",
     "Nadia Bibi (Hangu) ke Romana ke form mein 122 speed warnings aayi (threshold 120). Yeh "
     "mistake sirf Nadia Bibi (Hangu) ne ki hai, 1x."),
]

# ---------------------------------------------------------------------------
# District comparison
# ---------------------------------------------------------------------------

DISTRICT_ROWS = [
    ("D.I. Khan", "194", "71", "123", "36.6%", "26"),
    ("Hangu", "70", "16", "54", "22.9%", "17"),
]

DISTRICT_NOTES = {
    "D.I. Khan": (
        "D.I. Khan mein sab se zyada errors (194) aur sab se zyada critical rate (36.6%) hai. "
        "Teen enumerators, Shazia Bibi, Javairia aur Asma Bibi, mil kar 143 errors (73%) is "
        "district ke zimmedar hain. Sab se badi wajah GPS missing, consent tap, aur dummy phone "
        "numbers hain, plus schooling mismatch aur harassment privacy bhi bar bar aati hai.",
        [
            ("HH_QF_GPS_MISSING", "18"),
            ("HH_QF_CONSENT_SPEED", "20"),
            ("HH_QF_DUMMY_NEIGHBOR_PHONE", "21"),
            ("HH_CR_SCHOOLING_PARENT_MISMATCH", "17"),
            ("HH_QF_DUMMY_ALT_PHONE", "16"),
        ],
    ),
    "Hangu": (
        "Hangu mein errors kam hain (70) aur critical rate bhi kam (22.9%) hai, lekin GPS missing "
        "aur dummy phone number yahan bhi sab se bade masle hain, khas kar Mahnoor aur Laiba Shams "
        "ke forms mein. Yeh dono mil kar Hangu ke 51 errors (73%) ke zimmedar hain.",
        [
            ("HH_QF_DUMMY_NEIGHBOR_PHONE", "11"),
            ("HH_QF_GPS_MISSING", "10"),
            ("HH_QF_CONSENT_SPEED", "7"),
            ("GL_QF_GPS_MISSING", "7"),
            ("HH_QF_LISTED_GIRL_SPELLING", "7"),
        ],
    ),
}

# ---------------------------------------------------------------------------
# Enumerator-wise breakdown (name, district, id, total, critical, quality, top mistake)
# ---------------------------------------------------------------------------

ENUMERATOR_ROWS = [
    ("Shazia Bibi (D.I. Khan)", "373648", "54", "12", "42", "GPS missing (11x)"),
    ("Javairia (D.I. Khan)", "373651", "47", "11", "36", "Dummy neighbour/alt number (6x each)"),
    ("Asma Bibi (D.I. Khan)", "373641", "42", "24", "18", "Consent tap (8x)"),
    ("Mahnoor (Hangu)", "373705", "28", "8", "20", "GPS missing / dummy number / consent tap (4x each)"),
    ("Laiba Shams (Hangu)", "373706", "23", "4", "19", "GPS missing (6x)"),
    ("Irum Ikram (D.I. Khan)", "373642", "22", "8", "14", "Harassment not private (4x)"),
    ("Nadia bibi (Hangu)", "373669", "16", "4", "12", "Reading inconsistent / dummy number / harassment (3x each)"),
    ("Shafaq Zahra (D.I. Khan)", "373646", "12", "4", "8", "Dummy neighbour/alt number (2x each)"),
    ("Naureen Khan (D.I. Khan)", "373716 + 453925", "17", "12", "5", "Reading test mismatch (4x) / Consent tap (5x combined)"),
    ("Summiya Hayat (Hangu)", "373710", "3", "0", "3", "Dummy identity / spelling / small household (1x each)"),
]

# ---------------------------------------------------------------------------
# Repeat offenders (count >= 4 same enumerator, same rule)
# ---------------------------------------------------------------------------

REPEAT_OFFENDERS = [
    ("Shazia Bibi (D.I. Khan)", "GPS missing (Household)", "11",
     "11 alag forms mein GPS point capture hi nahi hua, matlab tablet ki location zyadatar off rehti thi.",
     "Har interview se pehle GPS ON karke signal confirm karein, warna form shuru na karein."),
    ("Asma Bibi (D.I. Khan)", "Consent screen jaldi tap karna", "8",
     "Consent fields par speed warnings bar bar aayi hain, ek form mein violation_count 27 tak gaya.",
     "Consent script har baar zaban se pura parhein, kam se kam utna waqt lein jitna parhne mein lagta hai."),
    ("Shazia Bibi (D.I. Khan)", "GPS missing (Girls)", "8",
     "Household ke sath sath Girls forms mein bhi GPS missing repeat hui.",
     "GPS setting sirf ek baar nahi, har interview se pehle dobara check karein."),
    ("Shazia Bibi (D.I. Khan)", "Schooling status Maa/Baap mismatch", "7",
     "7 forms mein Mother aur Father ka schooling jawab match nahi kiya.",
     "Dono parents se jawab lene ke baad submit se pehle dono jawab khud compare karein."),
    ("Javairia (D.I. Khan)", "Dummy neighbour number", "6",
     "6 forms mein neighbour number \"0\" ya fake digits mein darj hua.",
     "Respondent se asal number zaroor poochein, na milay to \"not available\" select karein."),
    ("Javairia (D.I. Khan)", "Dummy alternative number", "6",
     "Isi enumerator ke alternate number field mein bhi 6 baar wahi fake pattern dohraya gaya.",
     "Neighbour aur alternate number dono ke liye asal number poochne ki aadat banayein."),
    ("Laiba Shams (Hangu)", "GPS missing (Household)", "6",
     "6 Household forms mein GPS point record nahi hua.",
     "Interview shuru karne se pehle GPS lock hone ka intezar karein."),
    ("Asma Bibi (D.I. Khan)", "Dummy neighbour number", "5",
     "5 forms mein neighbour number fake tha.",
     "Number field mein sirf respondent se poocha hua asal number darj karein."),
    ("Asma Bibi (D.I. Khan)", "Dummy alternative number", "5",
     "5 forms mein alternate number bhi fake tha.",
     "Har number field ke liye respondent se dobara tasdeeq karein."),
    ("Asma Bibi (D.I. Khan)", "Consent screen jaldi tap karna (Girls)", "5",
     "Girls form ke consent par bhi speed warning bar bar aayi.",
     "Household aur Girls, dono forms ke consent screens ko barabar dhyan se parhein."),
    ("Irum Ikram (D.I. Khan)", "Harassment section private na hona", "4",
     "4 forms mein doosre afraad room mein maujood the jab harassment sawal poochay gaye.",
     "Section shuru karne se pehle doosre afraad ko bahar jane ki request karein, har baar."),
    ("Mahnoor (Hangu)", "Dummy neighbour number", "4",
     "4 forms mein neighbour number fake tha.",
     "Respondent se asal number poochein, dummy number ki aadat chhodein."),
    ("Mahnoor (Hangu)", "GPS missing (Household)", "4",
     "4 forms mein GPS point capture nahi hua.",
     "Tablet ki GPS setting hamesha ON rakhein, interview se pehle check karein."),
    ("Mahnoor (Hangu)", "Consent screen jaldi tap karna", "4",
     "Consent par speed warning 4 forms mein aayi, ek form mein violation_count 100 tak.",
     "Consent screen bilkul jaldi tap na karein, poora parh kar sunayein."),
    ("Javairia (D.I. Khan)", "Girl ka naam roster mein alag likha jana", "4",
     "4 forms mein roster ka naam aur girl_label ka naam match nahi kiya.",
     "Naam likhte waqt roster aur girl form dono mein ek jaisi spelling use karein."),
    ("Shazia Bibi (D.I. Khan)", "Reading test ka data match na karna", "4",
     "4 Girls forms mein last_word=0 tha jab keh lafz mark ho chuke the.",
     "Test administer karte waqt hi har lafz mark karein, baad mein na karein."),
    ("Naureen Khan (D.I. Khan)", "Reading test ka data match na karna", "4",
     "Is enumerator ke record 2 alag Enumerator ID (373716 aur 453925) ke neeche darj hain, lekin "
     "yeh ek hi shaks hai. Dono ko mila kar 4 Girls forms mein last_word=0 tha jab keh 72 lafz "
     "already mark ho chuke the.",
     "Test administer karte waqt hi har lafz mark karein. Field team ko bhi batayein ke iska data "
     "hamesha ek hi Enumerator ID se submit ho, taake record split na ho."),
]

# ---------------------------------------------------------------------------
# Full checklist (all 29 rules, compact reference)
# ---------------------------------------------------------------------------

CHECKLIST_CRITICAL = [
    ("HH_QF_CONSENT_SPEED / GL_QF_CONSENT_SPEED", "Consent jaldi tap karna",
     "Consent script poora zaban se parhein."),
    ("GL_CE_READING_INCONSISTENT", "Reading test ka data mismatch",
     "Har lafz test ke dauran ussi waqt mark karein."),
    ("HH_CR_GPS_JUMP / GL_CE_GPS_JUMP", "GPS beech mein badalna",
     "GPS lock hone tak ruke rahein, phir interview shuru karein."),
    ("HH_CR_GPS_REMOTE_FROM_VILLAGE / GL_CE_GPS_REMOTE_FROM_VILLAGE", "GPS village se door",
     "Sahi household mein hone ki tasdeeq karein, phir GPS on karein."),
    ("HH_CR_LISTED_GIRL_NOT_IN_ROSTER", "Girl roster mein nahi",
     "Roster mein selected girl ka naam zaroor likhein."),
    ("HH_CR_LISTED_GIRL_NOT_FIRST", "Girl roster mein first nahi",
     "Selected girl ko roster ki pehli row mein likhein."),
    ("HH_CR_08", "Age negative",
     "DOB dobara confirm karein, age positive honi chahiye."),
    ("GL_CE_00", "Age expected range se bahar",
     "Age respondent se dobara poochein, grade ke mutabiq confirm karein."),
    ("HH_AN_LONG_DURATION", "Interview zyada lamba",
     "Form ko beech mein khula na chhodein, lagatar complete karein."),
    ("HH_AN_FAST_DURATION / GL_AN_FAST_DURATION", "Interview bohat jaldi khatam",
     "Har module ko poora waqt dein, jaldi tap na karein."),
]

CHECKLIST_QUALITY = [
    ("HH_QF_DUMMY_NEIGHBOR_PHONE", "Neighbour number fake",
     "Asal number poochein, \"0\" kabhi na dalein."),
    ("HH_QF_DUMMY_ALT_PHONE", "Alternate number fake",
     "Asal number poochein, dummy na dalein."),
    ("HH_QF_DUMMY_PRIMARY_PHONE", "Primary number fake",
     "Primary number bhi asal hona chahiye."),
    ("HH_QF_GPS_MISSING / GL_QF_GPS_MISSING", "GPS capture nahi hua",
     "Interview se pehle GPS ON karein."),
    ("HH_CR_SCHOOLING_PARENT_MISMATCH", "Schooling Maa/Baap mismatch",
     "Submit se pehle dono jawab compare karein."),
    ("HH_QF_LISTED_GIRL_SPELLING", "Naam spelling mismatch",
     "Roster aur girl form mein naam ek jaisa likhein."),
    ("GL_QF_HARASSMENT_NOT_PRIVATE", "Harassment private nahi",
     "Doosre afraad se bahar jane ki request karein."),
    ("HH_QF_SMALL_HOUSEHOLD", "Household chhota",
     "Roster mein har member ko shamil karein."),
    ("HH_QF_EDU_SPEND_OUTLIER", "Education spend outlier",
     "Amount currency aur period confirm kar ke darj karein."),
    ("HH_QF_04", "Placeholder identity/location",
     "Asal naam aur location poochein."),
    ("HH_QF_03", "Placeholder naam",
     "Roster mein asal naam likhein, abc/xyz na likhein."),
    ("HH_QF_LATE_NIGHT / GL_QF_LATE_NIGHT", "Interview raat ko der se",
     "Interview din ke mutayyen waqt mein hi karein."),
    ("HH_QF_SPEED_WARNINGS", "Speed warnings zyada",
     "Har sawal ko poora waqt dein, jaldi tap na karein."),
]


def build():
    doc = Document()
    section = doc.sections[0]
    section.left_margin = Cm(1.6)
    section.right_margin = Cm(1.6)
    section.top_margin = Cm(1.4)
    section.bottom_margin = Cm(1.4)

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10.5)

    doc_heading(doc, STATS_LINE)

    intro_box(doc, [
        ("Maqsad: ", True),
        ("Yeh session D.I. Khan aur Hangu ke 264 asal errors par mabni hai (194 D.I. Khan, 70 "
         "Hangu). Har error ka apna girl, village aur enumerator record hai, is liye har mistake "
         "ko real example ke sath samjhaya gaya hai, sirf rule ka naam nahi.", False),
    ])

    stat_tiles(doc, [
        ("TOTAL ERRORS", "264", TEAL_DEEP),
        ("CRITICAL", "87", RED),
        ("QUALITY", "177", AMBER),
        ("CRITICAL %", "33.0%", RED),
        ("ENUMERATORS", "10", TEAL_DEEP),
        ("RULE TYPES", "29", TEAL_DEEP),
    ])

    # ---- Section 1: Top errors ----
    section_heading(
        doc,
        "1. Sabse Zyada Aane Wali Errors",
        "Yeh 12 rules mil kar 264 mein se 237 errors (89.8%) ke zimmedar hain",
    )
    for code, title, count, wajah, hal, example in TOP_RULES:
        rule_card(doc, code, title, count, wajah, hal, example)

    sub_heading(doc, "Baqi Errors — Koi Bhi Rule Miss Nahi (27 errors, 11 rules)")
    p_oth = doc.add_paragraph()
    add_run(
        p_oth,
        "Yeh rules kam frequency ke hain lekin koi bhi error is document se bahar nahi chhoda "
        "gaya, sab 29 rule types yahan cover hain.",
        size=9.5,
        italic=True,
        color=INK_SOFT,
    )
    p_oth.paragraph_format.space_after = Pt(8)
    for code, title, count, wajah, hal, example in OTHER_RULES:
        rule_card(doc, code, title, count, wajah, hal, example)

    # ---- Section 2: District wise ----
    section_heading(
        doc,
        "2. District Wise Analysis",
        "D.I. Khan aur Hangu ke darmiyan errors ka farq aur wajahat",
    )
    simple_table(
        doc,
        ["District", "Total", "Critical", "Quality", "Critical %", "Rule Types"],
        DISTRICT_ROWS,
        [3.0, 2.0, 2.0, 2.0, 2.2, 2.2],
    )
    for dist, (narrative, top5) in DISTRICT_NOTES.items():
        sub_heading(doc, dist)
        p = doc.add_paragraph()
        add_run(p, narrative, size=10, color=INK)
        p.paragraph_format.space_after = Pt(6)
        simple_table(
            doc,
            ["Rule", "Count"],
            top5,
            [10.5, 2.5],
            header_fill=TEAL_HEADER_HEX,
            font_size=8.5,
        )

    # ---- Section 3: Enumerator wise ----
    section_heading(
        doc,
        "3. Enumerator Wise Error Breakdown",
        "Har enumerator ke naam ke saamne uska district likha hai",
    )
    simple_table(
        doc,
        ["Enumerator (District)", "ID", "Total", "Critical", "Quality", "Sabse Zyada Mistake"],
        ENUMERATOR_ROWS,
        [4.4, 1.9, 1.4, 1.5, 1.5, 4.9],
        font_size=8.5,
    )
    p_note = doc.add_paragraph()
    add_run(
        p_note,
        "Note: Naureen Khan ka data system mein 2 alag Enumerator ID (373716 aur 453925) ke "
        "neeche darj tha, lekin yeh ek hi enumerator hai, is liye is table mein ek row mein "
        "combine kiya gaya hai.",
        size=9,
        italic=True,
        color=INK_SOFT,
    )
    p_note.paragraph_format.space_after = Pt(8)

    # ---- Section 4: Repeat offenders ----
    section_heading(
        doc,
        "4. Baar Baar Hone Wali Ghaltiyan (Repeat Offenders)",
        "Yeh wo enumerator hain jinhon ne ek hi mistake 4 ya us se zyada baar dohrai hai",
    )
    for name_d, rule_t, count, example, instruction in REPEAT_OFFENDERS:
        repeat_offender_card(doc, name_d, rule_t, count, example, instruction)

    # ---- Section 5: Checklist ----
    section_heading(
        doc,
        "5. Mukammal Correction Checklist (Quick Reference)",
        "Sab 29 rules (jo Section 1 mein detail se cover hue) ek nazar mein, session ke dauran "
        "jaldi dekhne ke liye",
    )
    sub_heading(doc, "Critical Rules")
    simple_table(
        doc,
        ["Rule", "Mistake", "Fix"],
        CHECKLIST_CRITICAL,
        [7.0, 4.0, 4.5],
        header_fill=RED_HEADER_HEX,
        font_size=8.5,
    )
    sub_heading(doc, "Quality Flags")
    simple_table(
        doc,
        ["Rule", "Mistake", "Fix"],
        CHECKLIST_QUALITY,
        [6.0, 4.0, 5.5],
        header_fill=GREEN_HEADER_HEX,
        font_size=8.5,
    )

    footer_note(doc)

    out_path = "DI_Khan_Hangu_Data_Quality_Session_12-Sep-2026.docx"
    doc.save(out_path)
    print(f"Saved: {out_path}")


if __name__ == "__main__":
    build()
