"""Enumerator orientation deck: KP-RAP QA protocol.
Palette taken from KP_RAP_Quality_Assurance_Workplan_final.docx.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT_NAME = "AoE_Enumerator_Orientation_QA_Protocol_August2026.pptx"
LOGO = ROOT / "dashboard" / "public" / "alliance-logo.png"

# Palette from KP_RAP_Quality_Assurance_Workplan_final.docx
NAVY = RGBColor(0x17, 0x36, 0x5D)
NAVY_SOFT = RGBColor(0xEA, 0xF0, 0xF6)
TEAL = RGBColor(0x2A, 0x7F, 0x9E)
TEAL_SOFT = RGBColor(0xEE, 0xF6, 0xF8)
INK = RGBColor(0x24, 0x34, 0x47)
BODY = RGBColor(0x24, 0x34, 0x47)
MUTED = RGBColor(0x5A, 0x6A, 0x7A)
SOFT = RGBColor(0xF5, 0xF7, 0xFA)
AMBER = RGBColor(0xA1, 0x5C, 0x00)
AMBER_SOFT = RGBColor(0xFF, 0xF7, 0xE8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
CRIT = RGBColor(0x8B, 0x1E, 0x3F)
CRIT_BG = RGBColor(0xFD, 0xF2, 0xF4)
OK = RGBColor(0x1B, 0x6B, 0x5A)
OK_BG = RGBColor(0xEC, 0xF8, 0xF4)
LINE = RGBColor(0xC5, 0xD0, 0xDC)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)


def set_run(run, text, *, size=18, bold=False, color=BODY, font="Calibri"):
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font


def add_text(shape, lines, *, size=18, bold=False, color=BODY, align=PP_ALIGN.LEFT, after=6):
    tf = shape.text_frame
    tf.clear()
    tf.word_wrap = True
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(after)
        p.line_spacing = 1.12
        if isinstance(line, tuple):
            text, kw = line
            set_run(p.add_run(), text, **kw)
        else:
            set_run(p.add_run(), line, size=size, bold=bold, color=color)


def rect(slide, left, top, width, height, fill, *, line=None):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    s.fill.solid()
    s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
    return s


def round_rect(slide, left, top, width, height, fill, *, line=None):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    s.fill.solid()
    s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
    try:
        s.adjustments[0] = 0.06
    except Exception:
        pass
    return s


def footer(slide, page: int, total: int):
    rect(slide, 0, Inches(7.12), SLIDE_W, Inches(0.38), NAVY)
    box = slide.shapes.add_textbox(Inches(0.45), Inches(7.16), Inches(10.2), Inches(0.28))
    add_text(
        box,
        ["KP-RAP  ·  Household & Girls Surveys  ·  Enumerator orientation  ·  QA Workplan 2.0"],
        size=10,
        color=WHITE,
        after=0,
    )
    num = slide.shapes.add_textbox(Inches(11.5), Inches(7.16), Inches(1.5), Inches(0.28))
    add_text(num, [f"{page}  /  {total}"], size=10, color=TEAL_SOFT, align=PP_ALIGN.RIGHT, after=0)


def title_band(slide, title: str, subtitle: str | None = None):
    rect(slide, 0, 0, SLIDE_W, Inches(1.05), NAVY)
    rect(slide, 0, Inches(1.05), SLIDE_W, Inches(0.07), TEAL)
    box = slide.shapes.add_textbox(Inches(0.5), Inches(0.28), Inches(12.3), Inches(0.45))
    add_text(box, [title], size=26, bold=True, color=WHITE, after=0)
    if subtitle:
        sub = slide.shapes.add_textbox(Inches(0.5), Inches(0.68), Inches(12.3), Inches(0.3))
        add_text(sub, [subtitle], size=12, color=TEAL_SOFT, after=0)


def card(slide, left, top, width, height, title, body_lines, *, accent=TEAL, title_size=14, body_size=12):
    round_rect(slide, left, top, width, height, WHITE, line=LINE)
    rect(slide, left, top, Inches(0.09), height, accent)
    t = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.14), width - Inches(0.4), Inches(0.35))
    add_text(t, [title], size=title_size, bold=True, color=NAVY, after=0)
    b = slide.shapes.add_textbox(
        left + Inches(0.25),
        top + Inches(0.48),
        width - Inches(0.4),
        height - Inches(0.6),
    )
    add_text(b, body_lines, size=body_size, color=BODY, after=3)


def bullet_card(slide, left, top, width, height, title, bullets, *, accent=TEAL):
    card(slide, left, top, width, height, title, [f"•  {x}" for x in bullets], accent=accent)


def track_badge(slide, left, top, track: int):
    """Small Track 1 (green) or Track 2 (red) label."""
    if track == 1:
        fill, text, color = OK_BG, "TRACK 1", OK
    else:
        fill, text, color = CRIT_BG, "TRACK 2", CRIT
    shape = round_rect(slide, left, top, Inches(1.15), Inches(0.32), fill)
    box = slide.shapes.add_textbox(left, top + Inches(0.02), Inches(1.15), Inches(0.28))
    add_text(box, [text], size=10, bold=True, color=color, align=PP_ALIGN.CENTER, after=0)
    return shape


def track_row(slide, left, top, width, track: int, text: str):
    bg = OK_BG if track == 1 else CRIT_BG
    accent = OK if track == 1 else CRIT
    round_rect(slide, left, top, width, Inches(0.42), bg, line=LINE)
    rect(slide, left, top, Inches(0.08), Inches(0.42), accent)
    track_badge(slide, left + Inches(0.15), top + Inches(0.05), track)
    tb = slide.shapes.add_textbox(left + Inches(1.4), top + Inches(0.08), width - Inches(1.55), Inches(0.32))
    add_text(tb, [text], size=11, color=INK, after=0)


def build() -> list[str]:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    blank = prs.slide_layouts[6]
    slides: list = []

    def new():
        s = prs.slides.add_slide(blank)
        rect(s, 0, 0, SLIDE_W, SLIDE_H, WHITE)
        slides.append(s)
        return s

    # ===== 1 COVER =====
    s = prs.slides.add_slide(blank)
    slides.append(s)
    rect(s, 0, 0, SLIDE_W, SLIDE_H, NAVY)
    rect(s, 0, Inches(5.85), SLIDE_W, Inches(1.65), RGBColor(0x12, 0x2A, 0x4A))
    rect(s, 0, Inches(5.85), SLIDE_W, Inches(0.08), TEAL)
    if LOGO.exists():
        try:
            s.shapes.add_picture(str(LOGO), Inches(0.55), Inches(0.4), height=Inches(0.75))
        except Exception:
            pass
    eye = s.shapes.add_textbox(Inches(0.55), Inches(1.55), Inches(12), Inches(0.35))
    add_text(eye, ["ALLIANCE OF EXCELLENCE  ·  KP-RAP"], size=13, bold=True, color=TEAL, after=0)
    title = s.shapes.add_textbox(Inches(0.55), Inches(2.05), Inches(12.2), Inches(1.5))
    add_text(title, ["Enumerator orientation"], size=42, bold=True, color=WHITE, after=4)
    sub = s.shapes.add_textbox(Inches(0.55), Inches(3.55), Inches(12), Inches(1.2))
    add_text(
        sub,
        [
            "Household and Girls Surveys",
            "Data quality protocol: rules, checks and field practice",
        ],
        size=18,
        color=NAVY_SOFT,
        after=4,
    )
    foot = s.shapes.add_textbox(Inches(0.55), Inches(6.15), Inches(12.2), Inches(0.9))
    add_text(
        foot,
        [
            "D.I. Khan  ·  Hangu  ·  Lakki Marwat  ·  remaining work in Torghar (paused)",
            "Quality Assurance Workplan Version 2.0  ·  August 2026",
        ],
        size=13,
        color=WHITE,
        after=2,
    )

    # ===== 2 AGENDA =====
    s = new()
    title_band(s, "Agenda", "What we will cover in this session")
    agenda = [
        ("01", "Why quality matters every day"),
        ("02", "Track 1 vs Track 2 (with list)"),
        ("03", "Hard field rules"),
        ("04", "Father & mother surveys (mandatory)"),
        ("05", "Consent, roster, GPS, timing"),
        ("06", "Learning test & photograph"),
        ("07", "Checks tagged Track 1 / Track 2"),
        ("08", "After a finding, resurvey & supervision"),
        ("09", "Your daily checklist"),
    ]
    for i, (num, text) in enumerate(agenda):
        col = i % 3
        row = i // 3
        left = Inches(0.45) + col * Inches(4.2)
        top = Inches(1.4) + row * Inches(1.75)
        round_rect(s, left, top, Inches(4.0), Inches(1.5), NAVY_SOFT)
        n = s.shapes.add_textbox(left + Inches(0.25), top + Inches(0.35), Inches(0.9), Inches(0.55))
        add_text(n, [num], size=26, bold=True, color=TEAL, after=0)
        t = s.shapes.add_textbox(left + Inches(1.15), top + Inches(0.45), Inches(2.6), Inches(0.8))
        add_text(t, [text], size=14, bold=True, color=NAVY, after=0)

    # ===== 3 WHY =====
    s = new()
    title_band(s, "Why this session", "Clean data while fieldwork is still running")
    points = [
        ("Every form is checked", "Household and Girls submissions are reviewed every working day. No enumerator is skipped."),
        ("Same-day feedback", "Findings appear on the district portal the same day. On Track 1 you are called while the interview is still fresh."),
        ("Guidance before the next day", "Correctable issues are fixed with clear guidance before you return to the field."),
        ("Integrity is different", "Fabrication, rushed forms, fake consent or wrong GPS are Track 2: suspension and investigation, not a casual call."),
    ]
    for i, (t, b) in enumerate(points):
        top = Inches(1.35) + i * Inches(1.3)
        round_rect(s, Inches(0.5), top, Inches(12.3), Inches(1.15), NAVY_SOFT if i % 2 == 0 else SOFT)
        rect(s, Inches(0.5), top, Inches(0.1), Inches(1.15), TEAL)
        n = s.shapes.add_textbox(Inches(0.85), top + Inches(0.3), Inches(0.7), Inches(0.5))
        add_text(n, [f"{i+1:02d}"], size=22, bold=True, color=TEAL, after=0)
        tb = s.shapes.add_textbox(Inches(1.7), top + Inches(0.18), Inches(10.7), Inches(0.35))
        add_text(tb, [t], size=16, bold=True, color=NAVY, after=0)
        bb = s.shapes.add_textbox(Inches(1.7), top + Inches(0.55), Inches(10.7), Inches(0.45))
        add_text(bb, [b], size=13, color=BODY, after=0)

    # ===== 4 TWO TRACKS =====
    s = new()
    title_band(s, "Two tracks", "Not every finding is treated the same way")
    round_rect(s, Inches(0.45), Inches(1.35), Inches(6.05), Inches(5.4), OK_BG)
    t1 = s.shapes.add_textbox(Inches(0.75), Inches(1.55), Inches(5.5), Inches(0.4))
    add_text(t1, ["TRACK 1  ·  Correctable error"], size=17, bold=True, color=OK, after=0)
    t1b = s.shapes.add_textbox(Inches(0.75), Inches(2.1), Inches(5.5), Inches(4.3))
    add_text(
        t1b,
        [
            "Examples",
            "Typing mistake, skipped question, device issue, dummy text that looks like a slip.",
            "",
            "What happens",
            "1. You are notified of the form and the finding",
            "2. You get a call the same day or next morning",
            "3. You explain what happened",
            "4. You receive clear guidance",
            "5. You apply it on the next interview",
            "6. Finding, explanation and guidance are recorded",
            "",
            "If the same finding continues: written warning, then possible withdrawal from interviews.",
        ],
        size=13,
        color=INK,
        after=2,
    )
    round_rect(s, Inches(6.8), Inches(1.35), Inches(6.05), Inches(5.4), CRIT_BG)
    t2 = s.shapes.add_textbox(Inches(7.1), Inches(1.55), Inches(5.5), Inches(0.4))
    add_text(t2, ["TRACK 2  ·  Integrity violation"], size=17, bold=True, color=CRIT, after=0)
    t2b = s.shapes.add_textbox(Inches(7.1), Inches(2.1), Inches(5.5), Inches(4.3))
    add_text(
        t2b,
        [
            "Examples",
            "Interview did not take place; consent tapped through; form under 15 minutes; GPS wrong; completed case re-entered; learning test recorded but not given.",
            "",
            "What happens",
            "Immediate suspension pending investigation",
            "Full review of your completed workload",
            "Forms that cannot be verified are invalidated and re-collected",
            "PIU notified in writing within 24 hours",
            "",
            "Your explanation alone does not close Track 2.",
            "Only independent verification closes it.",
        ],
        size=13,
        color=INK,
        after=2,
    )

    # ===== 4B TRACK FINDER (quick reference) =====
    s = new()
    title_band(s, "Which findings are Track 1 or Track 2?", "Green = correctable. Red = integrity. Learn this list.")
    # Legend
    round_rect(s, Inches(0.45), Inches(1.25), Inches(6.05), Inches(0.55), OK_BG)
    l1 = s.shapes.add_textbox(Inches(0.65), Inches(1.35), Inches(5.7), Inches(0.4))
    add_text(l1, ["TRACK 1  ·  Notify, call, explain, guide"], size=13, bold=True, color=OK, after=0)
    round_rect(s, Inches(6.8), Inches(1.25), Inches(6.05), Inches(0.55), CRIT_BG)
    l2 = s.shapes.add_textbox(Inches(7.0), Inches(1.35), Inches(5.7), Inches(0.4))
    add_text(l2, ["TRACK 2  ·  Suspend, investigate, notify PIU"], size=13, bold=True, color=CRIT, after=0)

    t1_items = [
        "Typing / data-entry mistake",
        "Skipped question or device issue",
        "Dummy name or dummy phone (first / slip)",
        "Household size mismatch; extreme small/large HH",
        "girl_label spelling mismatch; listed girl not first",
        "Education outlier; mother vs father schooling mismatch",
        "High don't-know / refuse rate",
        "GPS missing (location off) — first call & guidance",
        "Late-night start; long duration; clock year error",
        "Girls survey still outstanding (attempts incomplete)",
        "Name mismatch HH vs Girls; travel/time inconsistency",
        "Father/mother consent agreed but survey not yet in (follow-up)",
    ]
    t2_items = [
        "Consent screens tapped through",
        "Consent recorded but not obtained",
        "Interview did not take place (denied by respondent)",
        "Completed form under 15 minutes",
        "Completed case re-entered without PIU / IE approval",
        "GPS inconsistent / wrong area / HH vs Girls GPS mismatch (integrity)",
        "Learning test recorded but not administered",
        "Blank / random test photo (field confirmation)",
        "Reading-test marks that cannot describe one event (serious)",
        "Listed girl omitted from roster (resurvey + integrity review)",
        "Pattern of dummy entries across many forms",
        "Repeated Track 1 after warning → may escalate",
    ]
    for i, text in enumerate(t1_items):
        track_row(s, Inches(0.45), Inches(1.95) + i * Inches(0.42), Inches(6.05), 1, text)
    for i, text in enumerate(t2_items):
        track_row(s, Inches(6.8), Inches(1.95) + i * Inches(0.42), Inches(6.05), 2, text)

    # ===== 5 HARD RULES =====
    s = new()
    title_band(s, "Hard rules", "No exceptions in any district")
    rules = [
        ("In person only", "Telephonic interviews are not allowed. Face-to-face only. Breaking this is Track 2."),
        ("Completed cases stay locked", "Do not re-open without PIU / IE approval. Re-entry without approval is Track 2."),
        ("Location must stay ON", "Keep tablet location on. Missing GPS is Track 1 first; wrong/fake GPS can be Track 2."),
        ("Minimum 15 minutes", "Completed form under 15 minutes is Track 2 integrity, not a small timing flag."),
        ("Answer the daily call", "Track 1: explain honestly and follow guidance before the next field day."),
        ("Real learning-test photo", "Upload a real completed page. Blank/random photo is Track 2 after field check."),
    ]
    for i, (t, b) in enumerate(rules):
        col = i % 3
        row = i // 3
        left = Inches(0.4) + col * Inches(4.25)
        top = Inches(1.35) + row * Inches(2.7)
        card(s, left, top, Inches(4.1), Inches(2.45), t, [b], accent=AMBER if i in (1, 3, 5) else TEAL)

    # ===== 6 FATHER + MOTHER MANDATORY =====
    s = new()
    title_band(s, "Father and mother surveys", "Available + agreed consent = both surveys are mandatory")
    banner = round_rect(s, Inches(0.45), Inches(1.3), Inches(12.4), Inches(1.55), AMBER_SOFT)
    bt = s.shapes.add_textbox(Inches(0.75), Inches(1.5), Inches(11.9), Inches(1.25))
    add_text(
        bt,
        [
            "Mandatory rule",
            "If the father is shown as available and consent is agreed, the father household survey must be submitted. "
            "If the mother is shown as available and consent is agreed, the mother household survey must be submitted. "
            "When both are available and both have agreed, both surveys are mandatory.",
        ],
        size=15,
        color=INK,
        after=3,
    )
    card(
        s,
        Inches(0.45),
        Inches(3.15),
        Inches(6.05),
        Inches(3.5),
        "What the script flags",
        [
            "•  Father consent agreed, but no father household submission for that girl",
            "•  Mother consent agreed, but no mother household submission for that girl",
            "•  High non-consent by enumerator (more than five cases)",
            "•  Consent screens tapped through (speed warning)",
            "",
            "Recording agreed consent without submitting the survey is a quality failure.",
        ],
        accent=CRIT,
        body_size=13,
    )
    card(
        s,
        Inches(6.8),
        Inches(3.15),
        Inches(6.05),
        Inches(3.5),
        "What you must do",
        [
            "•  Confirm availability correctly",
            "•  Obtain real consent (read and explain)",
            "•  Complete and submit the matching survey",
            "•  If a parent is temporarily unavailable, complete the required follow-up / revisit",
            "•  Do not mark consent agreed and then skip that parent's form",
            "",
            "Both parents available + both agreed = both forms in.",
        ],
        accent=OK,
        body_size=13,
    )

    # ===== 7 CONSENT =====
    s = new()
    title_band(s, "Consent", "A recorded Yes is not enough if the screen was tapped through")
    # do/dont
    round_rect(s, Inches(0.45), Inches(1.3), Inches(6.05), Inches(2.35), OK_BG)
    d1 = s.shapes.add_textbox(Inches(0.7), Inches(1.45), Inches(5.6), Inches(0.3))
    add_text(d1, ["DO"], size=12, bold=True, color=OK, after=0)
    d1b = s.shapes.add_textbox(Inches(0.7), Inches(1.8), Inches(5.6), Inches(1.7))
    add_text(
        d1b,
        [
            "Read and explain consent. Give the respondent time.",
            "Record only after the procedure is done.",
            "If consent is refused on Girls, mark Incomplete.",
        ],
        size=14,
        color=INK,
        after=4,
    )
    round_rect(s, Inches(6.8), Inches(1.3), Inches(6.05), Inches(2.35), CRIT_BG)
    n1 = s.shapes.add_textbox(Inches(7.05), Inches(1.45), Inches(5.6), Inches(0.3))
    add_text(n1, ["DON'T"], size=12, bold=True, color=CRIT, after=0)
    n1b = s.shapes.add_textbox(Inches(7.05), Inches(1.8), Inches(5.6), Inches(1.7))
    add_text(
        n1b,
        [
            "Tap through consent screens quickly.",
            "A speed warning means the screen was open too briefly.",
            "Do not mark Complete when consent was refused.",
        ],
        size=14,
        color=INK,
        after=4,
    )
    card(
        s,
        Inches(0.45),
        Inches(3.9),
        Inches(6.05),
        Inches(2.7),
        "Girls consent rules",
        [
            "•  Interview is not valid without parental consent",
            "•  Parental consent not confirmed is flagged",
            "•  Consent refused but marked Complete is flagged",
            "•  Parental or child consent tap-through is integrity (Track 2)",
        ],
        accent=TEAL,
        body_size=13,
    )
    card(
        s,
        Inches(6.8),
        Inches(3.9),
        Inches(6.05),
        Inches(2.7),
        "Integrity consequence",
        [
            "Consent screens tapped through = Track 2.",
            "You may be suspended pending investigation.",
            "PIU is notified in writing within 24 hours.",
            "If consent was not actually obtained, the case will be resurveyed.",
        ],
        accent=CRIT,
        body_size=13,
    )

    # ===== 8 ROSTER =====
    s = new()
    title_band(s, "Household roster and listed girl", "Get the sample girl right the first time")
    items = [
        ("Listed girl on roster", "She must appear in the siblings roster. Missing listed girl triggers investigation and resurvey."),
        ("First entry", "She must be the first entry in the siblings roster."),
        ("Spelling = girl_label", "Name spelling must match girl_label exactly, or matching fails."),
        ("Household size", "Reported size must match members listed. Extremely small or large households are verified."),
        ("No dummies", "No filler names, fake phones, or placeholder addresses / landmarks."),
        ("Ages & relationships", "No negative ages, impossible parent-child ages, or guessed ages (heaping)."),
    ]
    for i, (t, b) in enumerate(items):
        col = i % 3
        row = i // 3
        left = Inches(0.4) + col * Inches(4.25)
        top = Inches(1.35) + row * Inches(2.7)
        card(s, left, top, Inches(4.1), Inches(2.45), t, [b])

    # ===== 9 GPS =====
    s = new()
    title_band(s, "GPS and location", "Be where the interview is")
    tips = [
        ("Location ON", "Turn location on before you start. Keep it on until you finish. Restated in every debrief call."),
        ("No internet needed", "The form captures GPS at intervals without internet. Do not invent points."),
        ("Same place for both surveys", "For the same girl ID, Girls GPS must match Household GPS."),
        ("What is flagged", "Missing GPS; outside district box; far from other interviews in the village; jump of 2 km+ while form is open; one location under many village names."),
        ("Wrong place = resurvey", "Inconsistent GPS can trigger a repeat survey and can open Track 2."),
        ("Residential check", "Supervisor (Male) may confirm in the field that the visit took place at a real residential location."),
    ]
    for i, (t, b) in enumerate(tips):
        col = i % 3
        row = i // 3
        left = Inches(0.4) + col * Inches(4.25)
        top = Inches(1.35) + row * Inches(2.7)
        card(s, left, top, Inches(4.1), Inches(2.45), t, [b], accent=TEAL if i % 2 == 0 else AMBER)

    # ===== 10 TIMING =====
    s = new()
    title_band(s, "Interview timing", "15 minutes is the floor for a completed form")
    round_rect(s, Inches(0.45), Inches(1.3), Inches(12.4), Inches(1.7), CRIT_BG)
    bt = s.shapes.add_textbox(Inches(0.75), Inches(1.5), Inches(11.9), Inches(1.35))
    add_text(
        bt,
        [
            "Under 15 minutes = integrity track",
            "A completed Household form (consent + roster) or Girls form (consent + modules + reading/math) "
            "finished in under 15 minutes is not a routine timing flag. It can lead to suspension and resurvey. "
            "Same rule applies to remaining work in Torghar.",
        ],
        size=15,
        color=INK,
        after=3,
    )
    card(
        s,
        Inches(0.45),
        Inches(3.3),
        Inches(6.05),
        Inches(3.3),
        "Also flagged",
        [
            "•  Late-night starts outside agreed field hours",
            "•  Re-interview of a completed case at night",
            "•  End time before start time",
            "•  Impossible year on the tablet clock",
            "•  Implausibly long duration (form left open)",
            "•  High speed-warning count across questions",
        ],
        accent=AMBER,
        body_size=13,
    )
    card(
        s,
        Inches(6.8),
        Inches(3.3),
        Inches(6.05),
        Inches(3.3),
        "Your practice",
        [
            "•  Do not rush modules",
            "•  Do not leave the form open overnight",
            "•  Set tablet date and time correctly",
            "•  Finish a real interview in one sitting",
            "•  Do not re-enter a completed case",
            "•  Speed warnings on consent are integrity",
        ],
        accent=OK,
        body_size=13,
    )

    # ===== 11 LEARNING TEST =====
    s = new()
    title_band(s, "Learning test and photograph", "Real test. Real paper. Real upload.")
    steps = [
        ("1", "Administer reading and math as written"),
        ("2", "Mark story words, last word, incorrects carefully"),
        ("3", "Photograph the completed paper (front / back)"),
        ("4", "Upload the photo before you submit"),
    ]
    for i, (n, t) in enumerate(steps):
        left = Inches(0.4) + i * Inches(3.2)
        round_rect(s, left, Inches(1.35), Inches(3.05), Inches(2.35), NAVY_SOFT)
        nb = s.shapes.add_textbox(left + Inches(0.2), Inches(1.6), Inches(2.6), Inches(0.55))
        add_text(nb, [n], size=32, bold=True, color=TEAL, after=0)
        tb = s.shapes.add_textbox(left + Inches(0.2), Inches(2.35), Inches(2.6), Inches(1.1))
        add_text(tb, [t], size=14, bold=True, color=NAVY, after=0)
    card(
        s,
        Inches(0.45),
        Inches(4.0),
        Inches(6.05),
        Inches(2.55),
        "What the script flags",
        [
            "•  Reading-test marks that do not describe one event",
            "•  Test recorded but front_photo / back_photo has no file",
            "•  Enumerator score / last_word / incorrect pattern far from peers",
        ],
        body_size=13,
    )
    card(
        s,
        Inches(6.8),
        Inches(4.0),
        Inches(6.05),
        Inches(2.55),
        "What field supervision checks",
        [
            "•  Supervisor (Male) reviews a sample of photographs",
            "•  Blank page or random image is not acceptable",
            "•  Missing / fake photo or inconsistent marks can trigger resurvey (Track 2 if test was not given)",
        ],
        accent=AMBER,
        body_size=13,
    )

    # ===== 12 HH CHECKS SUMMARY =====
    s = new()
    title_band(s, "Household findings: Track 1 or Track 2", "Green badge = Track 1. Red badge = Track 2.")
    hh_rows = [
        (1, "Typing slip, skipped field, device issue"),
        (1, "Dummy name / phone / placeholder (first occurrence)"),
        (1, "Household size mismatch; extreme small/large HH"),
        (1, "Listed girl not first; girl_label spelling mismatch"),
        (1, "Education outlier; mother vs father schooling mismatch"),
        (1, "High don't-know / refuse; GPS missing (location off)"),
        (1, "Late-night start; long duration; impossible clock year"),
        (1, "Father/mother agreed + available but survey not yet submitted"),
        (2, "Consent screens tapped through"),
        (2, "Completed household under 15 minutes"),
        (2, "Completed household re-entered without approval"),
        (2, "GPS wrong area / jump / village cluster integrity issue"),
        (2, "Listed girl omitted from roster"),
        (2, "Pattern of dummy entries across many forms"),
    ]
    for i, (track, text) in enumerate(hh_rows):
        col = 0 if i < 7 else 1
        row = i if i < 7 else i - 7
        left = Inches(0.45) + col * Inches(6.4)
        top = Inches(1.25) + row * Inches(0.75)
        track_row(s, left, top, Inches(6.2), track, text)

    # ===== 13 GIRLS CHECKS =====
    s = new()
    title_band(s, "Girls findings: Track 1 or Track 2", "Green badge = Track 1. Red badge = Track 2.")
    g_rows = [
        (1, "Parental consent not yet confirmed (follow up)"),
        (1, "Girls survey outstanding; attempts incomplete"),
        (1, "Name mismatch HH vs Girls; travel/time inconsistency"),
        (1, "Dummy text / dummy primary phone (first occurrence)"),
        (1, "Unusual score distribution (review & guidance)"),
        (1, "Photo file missing — first call to upload / correct"),
        (1, "Harassment not in private; module consistency issues"),
        (1, "Late-night start; clock errors"),
        (2, "Consent refused but marked Complete"),
        (2, "Consent screens tapped through"),
        (2, "Girls form under 15 minutes"),
        (2, "Completed Girls form re-entered without approval"),
        (2, "Girls GPS does not match Household GPS (integrity)"),
        (2, "Learning test not given / blank-random photo / marks not one event"),
    ]
    for i, (track, text) in enumerate(g_rows):
        col = 0 if i < 7 else 1
        row = i if i < 7 else i - 7
        left = Inches(0.45) + col * Inches(6.4)
        top = Inches(1.25) + row * Inches(0.75)
        track_row(s, left, top, Inches(6.2), track, text)

    # ===== 14 AFTER FINDING =====
    s = new()
    title_band(s, "If something is flagged", "Daily loop and repeat findings")
    flow = [
        ("Portal", "Findings appear on the district error-log portal the same day."),
        ("Call", "On Track 1 you get a call. Look at the same log together."),
        ("Explain", "Say what happened. A typing slip is different from a fake interview."),
        ("Guide", "Follow the guidance before your next field day."),
        ("Repeat", "Same finding after guidance: written warning, then possible withdrawal."),
        ("Track 2", "Integrity cases start with suspension. Explanation alone does not close them."),
    ]
    for i, (t, b) in enumerate(flow):
        col = i % 3
        row = i // 3
        left = Inches(0.4) + col * Inches(4.25)
        top = Inches(1.35) + row * Inches(2.7)
        card(s, left, top, Inches(4.1), Inches(2.45), t, [b], accent=CRIT if t == "Track 2" else TEAL)

    # ===== 15 RESURVEY =====
    s = new()
    title_band(s, "Resurvey triggers", "These cases mean a repeat survey. Most are Track 2 integrity.")
    note = round_rect(s, Inches(0.45), Inches(1.2), Inches(12.4), Inches(0.5), CRIT_BG)
    nt = s.shapes.add_textbox(Inches(0.7), Inches(1.3), Inches(12.0), Inches(0.35))
    add_text(
        nt,
        ["TRACK 2  ·  Resurvey cases below are integrity findings: suspension / investigation may also apply."],
        size=12,
        bold=True,
        color=CRIT,
        after=0,
    )
    triggers = [
        "Listed girl omitted from the roster",
        "GPS in a different area, or Girls GPS does not match Household GPS",
        "Household or Girls form finished in under 15 minutes",
        "Learning-test marks inconsistent, photo missing, or photo not a real completed test",
        "Consent screens tapped through, or respondent says consent was not obtained",
        "Completed case re-entered without PIU / IE approval",
        "Father/mother consent agreed and available, but matching survey not submitted (must complete both)",
    ]
    for i, text in enumerate(triggers):
        top = Inches(1.85) + i * Inches(0.68)
        track_row(s, Inches(0.45), top, Inches(12.4), 2, text)

    # ===== 16 SUPERVISION =====
    s = new()
    title_band(s, "Field supervision", "Independent checks in the field")
    card(
        s,
        Inches(0.4),
        Inches(1.35),
        Inches(4.1),
        Inches(5.3),
        "Accompaniment",
        [
            "Supervisor (Male) may sit with you on selected interviews.",
            "",
            "Checks consent, roster, modules and learning test as written.",
            "",
            "He is not part of the Household/Girls collection team for that day.",
        ],
        body_size=13,
    )
    card(
        s,
        Inches(4.65),
        Inches(1.35),
        Inches(4.1),
        Inches(5.3),
        "Spot checks",
        [
            "May revisit or observe completed cases soon after the interview.",
            "",
            "Confirms the visit took place.",
            "",
            "Reviews a sample of learning-test photographs (blank/random images fail).",
        ],
        accent=AMBER,
        body_size=13,
    )
    card(
        s,
        Inches(8.9),
        Inches(1.35),
        Inches(4.0),
        Inches(5.3),
        "Unannounced visits",
        [
            "May arrive without prior notice.",
            "",
            "The check is not staged.",
            "",
            "Field findings follow the same Track 1 / Track 2 rules as the daily log.",
        ],
        accent=TEAL,
        body_size=13,
    )

    # ===== 17 WEEKLY =====
    s = new()
    title_band(s, "Weekly review and training", "Daily call fixes yesterday. Weekly meeting fixes the habit.")
    items = [
        ("Combined weekly review", "All relevant staff review the week's error log together. Same guidance for everyone."),
        ("Separate weekly review", "Held when one district or team has a different error pattern."),
        ("On-the-job training", "Uses that week's real cases, not generic slides."),
        ("Individual session", "If one enumerator keeps repeating the same mistake, a separate session is held."),
    ]
    for i, (t, b) in enumerate(items):
        col = i % 2
        row = i // 2
        left = Inches(0.45) + col * Inches(6.35)
        top = Inches(1.4) + row * Inches(2.55)
        card(s, left, top, Inches(6.15), Inches(2.3), t, [b], body_size=14)

    # ===== 18 CHECKLIST =====
    s = new()
    title_band(s, "Your daily checklist", "Before you submit each form")
    checks = [
        "Interview done in person (not by phone)",
        "Tablet location ON for the whole form",
        "Consent read and explained (not tapped through)",
        "If father available + agreed: submit father survey",
        "If mother available + agreed: submit mother survey",
        "Both available + both agreed: both surveys mandatory",
        "Listed girl first on siblings roster; spelling = girl_label",
        "No dummy names or fake phone numbers",
        "Completed form took at least 15 minutes",
        "Learning-test paper photographed and uploaded",
        "Do not re-open a completed case without approval",
        "Answer the daily QA call and follow Track 1 guidance",
    ]
    for i, text in enumerate(checks):
        col = 0 if i < 6 else 1
        row = i if i < 6 else i - 6
        left = Inches(0.45) + col * Inches(6.4)
        top = Inches(1.25) + row * Inches(0.88)
        round_rect(s, left, top, Inches(6.2), Inches(0.78), NAVY_SOFT if i % 2 == 0 else SOFT)
        box = s.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            left + Inches(0.18),
            top + Inches(0.22),
            Inches(0.32),
            Inches(0.32),
        )
        box.fill.solid()
        box.fill.fore_color.rgb = WHITE
        box.line.color.rgb = TEAL
        tb = s.shapes.add_textbox(left + Inches(0.65), top + Inches(0.22), Inches(5.35), Inches(0.45))
        add_text(tb, [text], size=13, color=INK, after=0)

    # ===== 19 CLOSING =====
    s = prs.slides.add_slide(blank)
    slides.append(s)
    rect(s, 0, 0, SLIDE_W, SLIDE_H, NAVY)
    rect(s, 0, Inches(5.85), SLIDE_W, Inches(1.65), RGBColor(0x12, 0x2A, 0x4A))
    rect(s, 0, Inches(5.85), SLIDE_W, Inches(0.08), TEAL)
    t = s.shapes.add_textbox(Inches(0.6), Inches(1.8), Inches(12.1), Inches(0.8))
    add_text(t, ["Protect the interview."], size=38, bold=True, color=WHITE, after=0)
    u = s.shapes.add_textbox(Inches(0.6), Inches(2.85), Inches(12.1), Inches(2.2))
    add_text(
        u,
        [
            "Work in person. Keep location on. Take consent seriously.",
            "If father and mother are available and agreed, submit both surveys.",
            "Get the listed girl right. Upload a real test photo. Do not rush.",
            "If QA calls, answer, explain, and apply the guidance.",
        ],
        size=17,
        color=NAVY_SOFT,
        after=6,
    )
    f = s.shapes.add_textbox(Inches(0.6), Inches(6.15), Inches(12.1), Inches(0.9))
    add_text(
        f,
        [
            "Alliance of Excellence  ·  KP-RAP Quality Assurance Workplan 2.0",
            "Questions after this session: raise them with your supervisor or the technical team",
        ],
        size=13,
        color=WHITE,
        after=2,
    )

    total = len(slides)
    for i, slide in enumerate(slides):
        if i == 0 or i == total - 1:
            continue
        footer(slide, i + 1, total)

    dests = [
        ROOT / OUT_NAME,
        Path.home() / "OneDrive" / "Desktop" / OUT_NAME,
        Path.home() / "Desktop" / OUT_NAME,
    ]
    buf = BytesIO()
    prs.save(buf)
    data = buf.getvalue()
    written = []
    for d in dests:
        try:
            d.parent.mkdir(parents=True, exist_ok=True)
            d.write_bytes(data)
            written.append(str(d))
        except Exception:
            pass
    return written


if __name__ == "__main__":
    paths = build()
    print("Wrote:")
    for p in paths:
        print(" ", p)
