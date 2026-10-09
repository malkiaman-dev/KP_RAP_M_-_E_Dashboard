"""
Data Quality Session document (07-Oct-2026): D.I. Khan + Hangu, Household/Girls
scope, last two weeks only (submissions 23-Sep to 06-Oct-2026). Same layout as
the 26-Sep session document; every number, enumerator list and real example is
computed directly from Error_log/Daily_Error_Log.xlsx for that window.
"""

import re
from collections import Counter
from pathlib import Path

import pandas as pd
from docx import Document
from docx.shared import Pt, Cm

from build_session_analysis import (
    doc_heading, intro_box, stat_tiles, section_heading, sub_heading, rule_card,
    simple_table, repeat_offender_card, RED, RED_HEADER_HEX, GREEN_HEADER_HEX,
    TEAL_HEADER_HEX,
)
from wajah_hal_common import add_run, TEAL_DEEP, AMBER, INK, INK_SOFT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ROOT = Path(__file__).resolve().parents[2]
LOG = ROOT / "Error_log" / "Daily_Error_Log.xlsx"
OUT = ROOT / "Data Quality Sessions" / "DI_Khan_Hangu_Data_Quality_Session_07-Oct-2026.docx"
DATE_LABEL = "07-Oct-2026"
# Last two weeks of submissions (inclusive start, exclusive end).
WINDOW_START = pd.Timestamp("2026-09-23")
WINDOW_END = pd.Timestamp("2026-10-07")
# First HH/Girls submission day in D.I. Khan + Hangu; weeks for the trend run from here.
SURVEY_START = pd.Timestamp("2026-09-09")
DISTRICTS = ["D.I. Khan", "Hangu"]
SURVEYS = ["Household", "Girls", "Household vs Girls", "Girls vs Household"]

# ---------------------------------------------------------------------------
# Rule texts: title, short label (for tables), wajah, hal.
# ---------------------------------------------------------------------------
PHONE_HAL = ("Respondent se sahi neighbour number zaroor poochein. Number available na ho to "
             "“not available” option select karein. Dummy number, jaise 0 ya 0000000000, kabhi na dalein.")
CONSENT = ("Consent screen ko jaldi tap kar dena", "Consent tap",
           "Enumerator consent screen parhe bina bohat tezi se “samajh gaya / manzoor” tap kar deta hai. "
           "SurveyCTO khud speed warning se yeh pakar leta hai.",
           "Har consent screen zaban se parh kar respondent ko sunayein. Respondent samjhe, us ke baad hi "
           "agla button dabayein.")
GPS_MISSING = ("Interview ka GPS capture na hona", "GPS missing",
               "Tablet ki location/GPS service interview ke waqt off thi, is liye system location record nahi kar saka.",
               "Har interview shuru karne se pehle tablet ki GPS setting ON karein. Confirm karein ke location "
               "signal mil raha hai, tab hi form shuru karein.")
GPS_REMOTE = ("GPS village ke baqi interviews se bohat door", "GPS remote",
              "Ya to interview ghalat address par hui, ya GPS point ghalat jagah capture hua, is liye yeh village "
              "ke doosre interviews se kaafi door (4 km se zyada) nazar aata hai.",
              "Interview shuru karne se pehle confirm karein ke aap sahi household mein hain. GPS ON karein aur "
              "sahi signal aane tak wait karein.")
GPS_JUMP = ("GPS location interview ke beech mein achanak badal jana", "GPS jump",
            "Tablet ki location theek se lock nahi hoti, ya enumerator location capture hone se pehle hi ghar se "
            "chala jata hai.",
            "Interview shuru karne se pehle GPS lock hone ka wait karein. Location capture hone tak wahi ruke rahein.")
FAST = ("Interview ka waqt zaroorat se kam ho jana", "Fast duration",
        "Poora interview 15 minute ya us se kam mein khatam ho jata hai jab keh consent, roster aur sab modules "
        "poochne mein itna kam waqt lagna mumkin nahi.",
        "Har module ko poora waqt dein, sawal jaldi jaldi tap kar ke skip na karein.")
LATE = ("Interview raat ko bohat der se shuru hona", "Late night",
        "Interview raat 9 baje ke baad shuru hua, jab keh raat ko interview karna field method mein agreed nahi hai.",
        "Interview din ke mutayyen waqt mein hi karein. Raat ko interview karna pare to supervisor ko pehle "
        "inform karein.")
SPEED = ("SurveyCTO ki speed warning zyada aana", "Speed warnings",
         "Bohat se sawalat bohat kam waqt mein answer kiye jate hain (Household aur Girls dono forms mein), is liye "
         "system automatic speed warning deta hai.",
         "Har sawal ko poora waqt dein aur respondent se dhyan se sunein.")
HH_DUP = ("Mother ya Father ka household form dobara submit ho jana", "HH duplicate",
          "Ek hi respondent (Mother ya Father, kabhi dono) ka household form dobara submit ho gaya, jo pehle se "
          "maujood record se identity aur location dono mein match karta hai.",
          "Submit se pehle check karein ke is respondent ka form pehle se maujood to nahi. Duplicate ho to sirf "
          "sab se latest/mukammal wala retain karein, baqi supervisor review ke baad void karein.")

RULES = {
    "HH_QF_CONSENT_SPEED": CONSENT, "GL_QF_CONSENT_SPEED": CONSENT,
    "HH_QF_GPS_MISSING": GPS_MISSING, "GL_QF_GPS_MISSING": GPS_MISSING,
    "HH_CR_GPS_REMOTE_FROM_VILLAGE": GPS_REMOTE, "GL_CE_GPS_REMOTE_FROM_VILLAGE": GPS_REMOTE,
    "HH_CR_GPS_JUMP": GPS_JUMP, "GL_CE_GPS_JUMP": GPS_JUMP,
    "HH_AN_FAST_DURATION": FAST, "GL_AN_FAST_DURATION": FAST,
    "HH_QF_LATE_NIGHT": LATE, "GL_QF_LATE_NIGHT": LATE,
    "HH_QF_SPEED_WARNINGS": SPEED, "GL_QF_SPEED_WARNINGS": SPEED,
    "HH_DUP_MOTHER": HH_DUP, "HH_DUP_FATHER": HH_DUP, "HH_DUP_BOTH_PARENTS": HH_DUP,
    "HH_QF_DUMMY_NEIGHBOR_PHONE": (
        "Neighbour ka number fake dalna", "Dummy neighbour number",
        "Form jaldi khatam karne ke liye number field mein “0” ya repeat digits dal diye jate hain. Asal number "
        "poochha hi nahi jata.", PHONE_HAL),
    "HH_QF_DUMMY_ALT_PHONE": (
        "Alternative number fake dalna", "Dummy alt number",
        "Form jaldi khatam karne ke liye alternate number field mein “0” ya repeat digits dal diye jate hain.",
        "Respondent se sahi alternate number poochein. Number na ho to “not available” select karein, dummy "
        "number kabhi na dalein."),
    "HH_QF_DUMMY_PRIMARY_PHONE": (
        "Primary contact number fake dalna", "Dummy primary number",
        "Primary phone number field mein “0” ya koi aur fake number dal diya jata hai.",
        "Respondent se sahi primary number zaroor poochein."),
    "HH_QF_LISTED_GIRL_SPELLING": (
        "Girl ka naam roster aur girl form mein alag likha jana", "Listed girl spelling",
        "Roster mein naam ek tarah likha jata hai aur girl ke apne form, girl_label, mein spelling thodi alag ho "
        "jati hai. Jaldi mein type karne se aisa hota hai.",
        "Naam har jagah bilkul ek jaisa likhein. Submit karne se pehle roster aur girl form ka naam compare kar lein."),
    "HH_QF_LISTED_GIRL_WRONG_RELATION": (
        "Listed girl roster mein hai lekin relation code ghalat select hua", "Wrong relation code",
        "Listed girl ka naam siblings roster mein likha gaya hai, lekin us row par relation “Listed girl” (code 3) "
        "select nahi kiya gaya, koi aur relation (jaise sister) chun liya gaya. Is wajah se form samajhta hai ke "
        "listed girl roster mein hai hi nahi.",
        "Roster mein listed girl ki row par hamesha relation “Listed girl” select karein. Submit se pehle "
        "check karein ke yeh tag sirf aur sirf usi girl par laga hai."),
    "HH_CR_LISTED_GIRL_TAG_MISPLACED": (
        "Listed girl ka tag roster ki ghalat row par lagna", "Listed girl tag ghalat row",
        "“Listed girl” relation kisi aur sibling ki row par laga diya gaya, jab keh listed girl ka naam kisi doosri "
        "row par hai. Is se education ke sawal ghalat bache ke liye jawab ho jate hain.",
        "Listed girl ki row pehchaan kar relation “Listed girl” sirf usi row par lagayein, aur usay roster ki "
        "pehli row rakhein."),
    "HH_CR_ROSTER_EMPTY": (
        "Household ka siblings roster bilkul khali hona", "Roster khali",
        "Mother respondent ke form mein siblings roster mein ek bhi member darj nahi hua, jab keh yeh roster "
        "mother se hi mukammal karwana hota hai.",
        "Mother interview mein roster section kabhi skip na karein. Ghar ke tamam bachon ka naam, age aur grade "
        "darj karein, kam az kam listed girl zaroor."),
    "HH_CR_SCHOOLING_PARENT_MISMATCH": (
        "Schooling status: Maa aur Baap ke jawab match nahi karte", "Schooling mismatch",
        "Mother aur Father se bache ke school jane ke baray mein alag jawab milte hain. Enumerator dono jawab "
        "aapas mein check nahi karta.",
        "Dono parents se sawal poochne ke baad agar jawab mein farq aaye, submit se pehle household mein hi sahi "
        "jawab confirm karein. Dono forms mein wahi jawab darj karein."),
    "GL_QF_HARASSMENT_NOT_PRIVATE": (
        "Harassment section private tareeqe se conduct na hona", "Harassment not private",
        "Harassment ke sensitive sawal ghar ke doosre afraad ki mojoodgi mein poochay gaye, jab keh form guidance "
        "ke mutabiq yeh section private hona chahiye.",
        "Section shuru karne se pehle ghar ke doosre afraad se thodi der bahar jane ki request karein. Sirf girl "
        "ke saath akele yeh sawal poochein."),
    "GL_CE_READING_INCONSISTENT": (
        "Reading test ka data match nahi karta", "Reading inconsistent",
        "Story ke lafz mark to kar diye jate hain lekin last_word ya incorrect total un marks se match nahi karta, "
        "matlab test theek tarah administer ya record nahi hua.",
        "Girl jaise jaise parhe, har lafz ussi waqt mark karein. last_word usi lafz par set karein jahan girl ruki. "
        "Test bagair administer kiye mark na karein."),
    "HH_QF_SMALL_HOUSEHOLD": (
        "Household mein afraad ki tadaad ghair mamuli kam", "Small household",
        "Roster banate waqt kuch members, jaise chhote bache ya bujurg, count hone se reh jate hain. Is liye "
        "household size asal se kam nazar aata hai.",
        "Roster complete karte waqt ghar ke har fard ko shamil karein, bache se le kar bujurg tak. Koi bhi member "
        "chootna nahi chahiye."),
    "HH_QF_EDU_SPEND_OUTLIER": (
        "Education expenditure ka amount ghair mamuli", "Edu spend outlier",
        "Kharch ki amount bohat zyada darj ho jati hai. Aksar respondent ko time period ki confusion hoti hai ya "
        "enumerator jaldi mein galat digit type kar deta hai.",
        "Amount darj karne se pehle respondent se currency aur time period, mahana ya salana, clear karein. Phir "
        "amount zaban se repeat kar ke confirm karein."),
    "HH_CR_LISTED_GIRL_NOT_IN_ROSTER": (
        "Select ki gayi girl ka naam roster mein nahi hai", "Girl not in roster",
        "Roster banate waqt kisi bacche ki entry reh jati hai ya naam ghalat likha jata hai, is liye selected girl "
        "ka naam roster se match nahi karta.",
        "Roster mein ghar ke tamam bachon ka naam dhyan se likhein. Girl select karne se pehle uska naam roster "
        "mein check karein."),
    "HH_QF_04": (
        "Dummy ya placeholder identity/location darj karna", "Dummy identity/location",
        "Respondent ka asal naam ya location poochne ke bajaye field mein placeholder text darj kar di jati hai.",
        "Har respondent ka poora aur sahi naam aur sahi location darj karein."),
    "HH_QF_05": (
        "Girl ki age aur grade ka combination ajeeb lagna", "Age-grade mismatch",
        "Bache ki age aur uski grade ka combination mumkin range se bahar lagta hai, jaise age grade ke mutabiq nahi.",
        "Bache ki age aur grade dono dobara respondent/school record se confirm karein, agar mismatch ho to note karein."),
    "HVG_FL_01": (
        "Household mukammal lekin Girls survey abhi tak nahi hua", "Girls survey pending",
        "Household interview mukammal ho chuka hai lekin usi girl ka Girls interview abhi tak conduct nahi hua. "
        "Aksar girl pehli visit par available nahi hoti aur follow-up visit reh jati hai.",
        "Girl ke liye kam az kam 3 attempts poore karein. Visit ka waqt household se pehle tay kar lein aur har "
        "attempt form mein record karein."),
    "HH_AN_LONG_DURATION": (
        "Interview ka waqt zaroorat se zyada lamba ho jana", "Long duration",
        "Interview 2 ghante (120 minute) se zyada chal jata hai. Aksar tab hota hai jab tablet ka form khula reh "
        "jata hai, jaise beech mein break liya gaya, na keh lagatar interview hone se.",
        "Interview shuru karte hi usay lagatar complete karein. Break lena zaroori ho to form ko sahi tarah "
        "pause/save karein, khula na chhodein."),
    "GL_DUP_GIRLS_SURVEY": (
        "Girl ka Girls form dobara submit ho jana", "Girls duplicate",
        "Ek hi girl ka Girls form isi village mein ek se zyada dafa submit ho gaya, jo duplicate record ban gaya.",
        "Submit karne se pehle confirm karein ke is girl ka form pehle se submit to nahi hua. Duplicate submission "
        "ho to supervisor ko turant inform karein taake sahi wala retain ho."),
    "HH_CR_INCOMPLETE_SUPERSEDED": (
        "Adhoora form jo baad ke mukammal submission se replace ho gaya", "Incomplete superseded",
        "Yeh household record khali (respondent blank) chhoda gaya, jab keh isi household ka doosra mukammal form "
        "pehle se system mein maujood hai — pehla wala adhoora attempt tha.",
        "Adhoora ya galat shuru hua form turant void/cancel karein, aur sirf mukammal submission ko hi record mein rakhein."),
    "HH_CR_LISTED_GIRL_NOT_FIRST": (
        "Listed girl roster mein first entry na hona", "Listed girl not first",
        "Selected girl roster mein mojood to hai lekin pehli entry nahi hai. Form ka rule hai ke listed girl "
        "roster ki pehli row honi chahiye.",
        "Roster banate waqt selected girl ka naam sab se pehle likhein, phir baqi siblings ka naam darj karein."),
    "HH_CR_08": (
        "Age negative ya galat darj hona", "Negative age",
        "Age field mein negative number darj ho jata hai, jo mumkin nahi. Aksar galat entry ya date of birth (DOB) "
        "ghalat likhne se hota hai.",
        "Age darj karne se pehle respondent ki date of birth dobara confirm karein. Submit se pehle age field check "
        "kar lein ke woh positive hai."),
    "GL_CE_00": (
        "Age tay shuda range se bahar hona", "Age out of range",
        "Grade 6 se 8 tak ki target girls ke liye age 10 se 18 saal ke darmiyan honi chahiye, lekin darj ki gayi "
        "age is range se bahar hai.",
        "Girl ki age respondent se dobara poochein aur confirm karein ke woh sahi grade ke mutabiq hai."),
    "GL_QF_HIGH_DK_REFUSE": (
        "Ek hi enumerator mein don't-know/refuse jawabat ghair mamuli zyada", "High DK/refuse",
        "Ek enumerator ke interviews mein “don’t know” ya “refuse” jawabat baqi team ke muqable mein kaafi zyada "
        "aa rahe hain, jo iss baat ka ishara ho sakta hai ke sawal thik se poochay nahi ja rahe.",
        "Supervisor is enumerator ke saath baith kar interview technique review karein, aur confirm karein ke har "
        "sawal poora aur sahi tareeqe se poocha ja raha hai."),
    "HVG_CE_GPS_MISMATCH": (
        "Girls form ka GPS Mother ke Household GPS se match na karna", "HH-Girls GPS mismatch",
        "Girl aur uski Mother ka interview ek hi ghar mein hona chahiye, lekin dono forms ke GPS points 500 meter "
        "se zyada door hain. Ya interview ghar se bahar hua, ya GPS lock hone se pehle form shuru kiya gaya.",
        "Girls interview usi ghar mein karein jahan Household interview hua. Dono forms shuru karne se pehle GPS "
        "lock hone ka wait karein."),
    "GVH_CE_01": (
        "Girls interview ho gaya lekin Household interview record nahi", "Household survey missing",
        "Girl ka Girls interview conduct ho chuka hai lekin usi girl ka mukammal Household interview system mein "
        "maujood nahi — ya submit reh gaya ya kabhi hua hi nahi.",
        "Har girl ke liye Household (Mother/Father) interview bhi mukammal karein aur same din submit karein. "
        "Submit status supervisor ke saath confirm karein."),
    "HH_CR_05": (
        "Household roster mein koi bhi adult na hona", "No adult in roster",
        "Roster mein tamam members ki age 18 saal se kam show ho rahi hai, matlab ghar mein koi bhi adult record "
        "nahi hua — yeh roster ki completeness par sawal uthata hai.",
        "Roster banate waqt ghar ke sab se bade fard (walid/walida ya guardian) ki age zaroor sahi darj karein aur "
        "confirm karein ke koi adult member chootan nahi."),
    "HH_CR_13": (
        "Parent ki age ghair mamuli kam darj hona", "Parent age too low",
        "Roster mein jis member ko parent (Mother/Father) mark kiya gaya hai, uski age 12 saal se kam darj hui hai, "
        "jo mumkin nahi.",
        "Parent ki age dobara respondent se confirm karein aur sahi age darj karein, khas kar jab age bohat kam lage."),
    "GL_CE_CONSENT_REFUSED_COMPLETE": (
        "Consent inkaar hua lekin survey “Complete” mark kiya", "Refused but complete",
        "Parent ya girl ne consent se inkaar kiya, phir bhi form ke aakhir mein survey_status “Complete” select "
        "kar diya gaya. Instructions ke mutabiq consent refuse ho to status “Incomplete” hona chahiye.",
        "Jab bhi parent ya girl consent se inkaar kare, survey_status hamesha “Incomplete” select karein aur "
        "comment mein wajah likhein."),
    "GL_CE_TIME_NEG": (
        "Interview ka end time start time se pehle", "Negative duration",
        "Tablet ki date/time ghalat set thi, is liye form ka end time start time se pehle record hua.",
        "Tablet ka date/time automatic (network) par rakhein aur har din kaam shuru karne se pehle check karein."),
    "HH_DUP_OTHER": (
        "Household form dobara submit ho jana (respondent unknown)", "HH duplicate (other)",
        "Ek hi household ka form, jismein respondent select nahi hua, dobara submit ho gaya — identity aur "
        "location fields pehle wale record se match karti hain.",
        "Submit se pehle check karein ke is household ka form pehle se maujood to nahi. Respondent hamesha "
        "select karein, aur duplicate ho to supervisor ko inform karein."),
    "GL_QF_DIST_MODE": (
        "School ka faasla 0 lekin aane jane ka zariya sawari", "Distance vs transport",
        "School ka faasla 0 darj hua lekin aane jane ka zariya motorbike/gaari jaisi sawari select ki gayi, jo "
        "aapas mein match nahi karta.",
        "Faasla aur transport ka sawal dobara confirm karein. Faasla 0 ho to zariya aam tor par “paidal” hona "
        "chahiye."),
    "HH_QF_03": (
        "Dummy ya placeholder naam darj karna", "Dummy name",
        "Respondent ka asal naam poochne ke bajaye field mein abc, xyz ya koi placeholder naam type kar diya jata hai.",
        "Har respondent ka poora aur sahi naam poochein aur wahi darj karein."),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def kv(value):
    out = {}
    for part in str(value).split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def msg_field(msg, name):
    m = re.search(rf"{name}: ([^;]+?)(?:;|\.$|$)", str(msg))
    return m.group(1).strip() if m else ""


def parse_dt(col):
    return pd.to_datetime(col.astype(str).str.replace(" ", " ").str.replace("Sept", "Sep"),
                          format="mixed", errors="coerce")


def in_window(ts):
    return (ts >= WINDOW_START) & (ts < WINDOW_END)


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def fmt_int(x):
    return f"{int(round(x)):,}"


def form_label(survey):
    return {"Girls": "Girls", "Household": "Household"}.get(survey, "")


def fix_name(name):
    return "Naureen Khan" if str(name).strip().lower() == "naureen khan" else str(name).strip()


def example_text(row, lookup):
    """Roman Urdu example sentence for one error row."""
    r = row["Rule ID"]
    v = kv(row["Value"])
    msg = str(row["Message"])
    rec = lookup.get(row["Record Key"], ("", "", ""))
    girl = msg_field(msg, "Girl") or v.get("girl_name") or rec[0]
    village = msg_field(msg, "Village") or v.get("village") or rec[1]
    gid = rec[2] or v.get("girl", "")
    m = re.search(r"GirlID: ([^,]+)", str(row["Value"]))
    gid = gid or (m.group(1).strip() if m else "")
    day = f"{row['SubDate']:%d-%b}" if pd.notna(row["SubDate"]) else ""
    enum = f"{row['Enum']} ({row['District']})"
    form = form_label(row["Survey"])
    idtxt = f"Girl ID {gid}, " if gid else ""
    village = f"{idtxt}{village}"
    who = f"{enum} ke {girl} ({village}) ke {day + ' ' if day else ''}{form + ' ' if form else ''}form mein"

    if r == "GL_QF_CONSENT_SPEED":
        return f"{who} parent aur child dono consent fields par speed warning aayi, violation_count {v.get('violation_count', '')} tha."
    if r == "HH_QF_CONSENT_SPEED":
        m = re.search(r"fired on (.+?) consent fields", msg)
        which = m.group(1) if m else "consent"
        which = which.replace("father", "father ke").replace("mother", "mother ke").replace(" and ", " aur ")
        return f"{who} {which} consent fields par speed warning aayi, yani consent parh kar sunaya nahi gaya."
    if r in ("HH_QF_GPS_MISSING", "GL_QF_GPS_MISSING"):
        return f"{who} GPS point record hi nahi hua, gps_missing=1."
    if r in ("HH_CR_GPS_REMOTE_FROM_VILLAGE", "GL_CE_GPS_REMOTE_FROM_VILLAGE"):
        d = num(v.get("dist_m")) or 0
        return f"{who} GPS point village ke baqi interviews se {d / 1000:.1f} km door tha."
    if r in ("HH_CR_GPS_JUMP", "GL_CE_GPS_JUMP"):
        d = num(v.get("jump_m")) or 0
        return f"{who} GPS interview ke dauran {d / 1000:.1f} km move hui."
    if r in ("HH_AN_FAST_DURATION", "GL_AN_FAST_DURATION"):
        m = re.search(r"([\d.]+) mins", str(row["Value"]))
        return f"{who} duration sirf {m.group(1) if m else '?'} minute tha (floor 15 minute)."
    if r in ("HH_QF_LATE_NIGHT", "GL_QF_LATE_NIGHT"):
        ts = pd.to_datetime(str(row["Value"]).split(";")[0], errors="coerce")
        t = ts.strftime("%I:%M %p").lstrip("0") if pd.notna(ts) else "?"
        when = "raat" if ts.hour >= 12 or ts.hour < 4 else "subah"
        return f"{enum} ke {girl} ({village}) ka {form} interview {when} {t} ko shuru hua."
    if r in ("HH_QF_SPEED_WARNINGS", "GL_QF_SPEED_WARNINGS"):
        m = re.search(r"has (\d+) speed warnings \(threshold (\d+)\)", msg)
        return f"{who} {m.group(1)} speed warnings aayi (threshold {m.group(2)})." if m else f"{who} speed warnings threshold se zyada aayi."
    if r == "HH_QF_DUMMY_NEIGHBOR_PHONE":
        return f"{who} neighbor_phonenumber sirf “{v.get('neighbor_phonenumber', '0')}” darj hai."
    if r == "HH_QF_DUMMY_ALT_PHONE":
        return f"{who} alternate_phonenumber “{v.get('alternate_phonenumber', '0')}” darj hai."
    if r == "HH_QF_DUMMY_PRIMARY_PHONE":
        return f"{who} primary phone number “{v.get('phonenumber', '0')}” darj tha."
    if r == "HH_QF_LISTED_GIRL_SPELLING":
        return f"{who} roster=“{v.get('roster', '')}” tha jab keh girl_label=“{v.get('girl_label', '')}” tha."
    if r == "HH_QF_LISTED_GIRL_WRONG_RELATION":
        return (f"{who} roster row {v.get('matched_row', '?')} (“{v.get('matched_name', '')}”) listed girl ka naam hai, "
                f"lekin us par relation “Listed girl” (code 3) select nahi kiya gaya.")
    if r == "HH_CR_LISTED_GIRL_TAG_MISPLACED":
        return (f"{who} “Listed girl” tag roster row {v.get('tagged_row', '?')} par laga tha, jab keh girl ka naam "
                f"(“{v.get('matched_name', '')}”) row {v.get('name_matched_row', '?')} par tha.")
    if r == "HH_CR_ROSTER_EMPTY":
        return f"{who} Mother respondent ne siblings roster mein ek bhi member darj nahi kiya, roster bilkul khali tha."
    if r == "HH_CR_SCHOOLING_PARENT_MISMATCH":
        m = re.search(r"Mother=([^;]+); Father=([^.]+)\.", msg)
        return (f"{who} Mother=“{m.group(1)}” hai lekin Father=“{m.group(2)}” hai." if m
                else f"{who} Mother aur Father ke schooling jawab alag hain.")
    if r == "GL_QF_HARASSMENT_NOT_PRIVATE":
        # Room presence codes: 1=siblings, 2=father, 3=mother, 4=other adults.
        names = {"1": "siblings (behan/bhai)", "2": "father", "3": "mother", "4": "doosre adults"}
        codes = v.get("harassment_presence", "").split()
        present = " aur ".join(names.get(c, c) for c in codes)
        return (f"{who} harassment_presence=“{' '.join(codes)}” hai, matlab section ke dauran {present} "
                f"room mein maujood the.")
    if r == "GL_CE_READING_INCONSISTENT":
        m = re.search(r"last_word=0 but (\d+) word", msg)
        if m:
            return f"{who} {m.group(1)} lafz Correct/Incorrect mark hue lekin last_word=0 tha."
        m = re.search(r"(\d+) word\(s\) marked after last_word=(\d+)", msg)
        if m:
            return f"{who} last_word={m.group(2)} set tha lekin us ke baad bhi {m.group(1)} lafz mark hue."
        m = re.search(r"incorrect field=(-?\d+) but (\d+) word", msg)
        if m:
            return f"{who} incorrect field mein {m.group(1)} darj tha lekin sirf {m.group(2)} lafz Incorrect mark hue."
        return f"{who} reading test ke marks aur last_word aapas mein match nahi karte."
    if r == "HH_QF_SMALL_HOUSEHOLD":
        return f"{who} sibling aur family roster mila kar sirf {v.get('num_siblings', '?')} member list hue (threshold 2)."
    if r == "HH_QF_EDU_SPEND_OUTLIER":
        t = num(v.get("total_pkr")) or 0
        m = re.search(r"threshold (\d+) PKR", msg)
        thr = fmt_int(float(m.group(1))) if m else "20,000"
        return f"{who} education spend {fmt_int(t)} PKR darj hua, jab keh outlier threshold {thr} PKR hai."
    if r == "HH_CR_LISTED_GIRL_NOT_IN_ROSTER":
        return f"{who} selected girl ka naam roster ke kisi bhi sibling se match nahi hua (roster mein {v.get('roster_n', '?')} entries thi)."
    if r == "HH_QF_04":
        field = str(row["Field"]).split(",")[0].strip()
        return f"{who} {field} field mein sirf “{v.get(field, '?')}” darj tha, jo placeholder jaisa laga."
    if r == "HH_QF_05":
        m = re.search(r"^(\w[\w ]*?) \(#\d+\): age_\w+=([\d.]+) year\(s\), grade_\w+=([^(]+)\(Expected age ([\d.]+)-([\d.]+)", str(row["Value"]))
        if m:
            return (f"{who} sibling {m.group(1).title()} ki age {m.group(2)} saal thi lekin grade “{m.group(3).strip()}” "
                    f"(expected age {m.group(4)}–{m.group(5)}) se match nahi hui.")
        return f"{who} bache ki age aur grade ka combination ajeeb laga."
    if r == "HVG_FL_01":
        gm = re.search(r"GirlName: ([^,]+)", str(row["Value"]))
        am = re.search(r"Attempt: (\d+)", str(row["Value"]))
        g = gm.group(1).strip() if gm else girl
        return (f"{enum} ke {g} ({village}) ka Household interview mukammal hai lekin Girls survey abhi tak conduct nahi hua "
                f"(Household attempt {am.group(1) if am else '?'}).")
    if r == "HH_AN_LONG_DURATION":
        mins = num(v.get("duration_minutes")) or 0
        return f"{who} duration {mins:.0f} minute ({mins / 60:.1f} ghante) show hua."
    if r == "GL_DUP_GIRLS_SURVEY":
        return f"{who} record isi village mein doosri baar submit hua — duplicate detect hua."
    if r == "HH_CR_INCOMPLETE_SUPERSEDED":
        return (f"{who} respondent field blank tha, jab keh isi household ka mukammal record pehle se maujood tha — "
                f"yeh adhoora attempt tha.")
    if r == "HH_CR_LISTED_GIRL_NOT_FIRST":
        return f"{who} listed girl roster mein position {v.get('listed_position', '?')} par thi, first honi chahiye thi."
    if r == "HH_CR_08":
        a = [num(x) for k, x in v.items() if k.startswith("age")]
        a = a[0] if a and a[0] is not None else 0
        return f"{who} sibling ki age negative ({a:.1f} saal) darj hui."
    if r == "GL_CE_00":
        m = re.search(r"([\d.]+) years", str(row["Value"]))
        return f"{who} age ({m.group(1) if m else '?'} saal) expected range (10–18) se bahar thi."
    if r == "GL_QF_HIGH_DK_REFUSE":
        m = re.search(r"at ([\d.]+) fields per interview \(team median ([\d.]+)", msg)
        return (f"{enum} ke interviews mein don’t-know/refuse jawabat average {m.group(1)} fields per interview aaye, "
                f"jab keh team ka median sirf {m.group(2)} hai." if m else f"{enum} ke interviews mein DK/refuse zyada hain.")
    if r in ("HH_DUP_MOTHER", "HH_DUP_FATHER", "HH_DUP_BOTH_PARENTS"):
        resp = {"HH_DUP_MOTHER": "Mother", "HH_DUP_FATHER": "Father", "HH_DUP_BOTH_PARENTS": "Father aur Mother, dono"}[r]
        return f"{enum} ke {girl} ({village}) ke household ka {resp} ka record dobara submit hua, same identity aur location fields ke sath."
    if r == "HVG_CE_GPS_MISMATCH":
        d = num(v.get("dist_m")) or 0
        return f"{enum} ke {girl} ({village}) ke Girls form ka GPS Mother ke Household GPS se {fmt_int(d)} meter door tha (limit 500 m)."
    if r == "GVH_CE_01":
        return f"{enum} ke {girl} ({village}) ka Girls interview conduct ho chuka hai lekin is girl ka mukammal Household interview record maujood nahi."
    if r == "HH_CR_05":
        return f"{who} roster ke tamam members ki age 18 saal se kam thi, koi adult record nahi hua."
    if r == "HH_CR_13":
        m = re.search(r"age=([\d.]+)", str(row["Value"]))
        return f"{who} parent mark kiye gaye member ki age sirf {m.group(1) if m else '?'} saal darj hui."
    if r == "GL_CE_CONSENT_REFUSED_COMPLETE":
        return f"{who} consent inkaar tha lekin survey_status “Complete” (1) select hua."
    if r == "HH_DUP_OTHER":
        return f"{enum} ke {girl} ({village}) ke household ka form dobara submit hua, respondent “Unknown” tha."
    if r == "GL_QF_DIST_MODE":
        m = re.search(r"mode_transport: ([^;]+)", str(row["Value"]))
        return f"{who} school ka faasla 0 darj tha lekin transport “{m.group(1).strip() if m else '?'}” select hua."
    if r == "HH_QF_03":
        field = str(row["Field"]).split(",")[0].strip()
        return f"{who} {field} sirf “{v.get(field, '?')}” darj tha, placeholder jaisa laga."
    return f"{who} {row['Title']}."


def enum_list(sub):
    counts = sub.groupby(["Enum", "District"]).size().sort_values(ascending=False)
    if len(counts) == 1:
        (e, d), n = next(iter(counts.items()))
        return f"Yeh mistake sirf {e} ({d}) ne ki hai, {n}x."
    return "Yeh mistake in enumerators ne ki: " + ", ".join(f"{e} ({d}) {n}x" for (e, d), n in counts.items()) + "."


# ---------------------------------------------------------------------------
# Section 6: important points from the raw survey data (comments + consent)
# ---------------------------------------------------------------------------
DISTRICT_CODES = {1: "D.I. Khan", 2: "Hangu"}
TEMPLATE_RE = r"participate|decline"
MOVED_RE = r"moved|shifted"
SPELLING_RE = r"\bserve\b|\bsurve\b|\bpare\b|have participate"


def load_surveys():
    out = {}
    for name, f in (("HH", "Household_Survey.csv"), ("GL", "Girls_Survey.csv")):
        s = pd.read_csv(ROOT / "Surveys" / f, low_memory=False)
        s = s[s["district"].isin(DISTRICT_CODES)].copy()
        s["Dist"] = s["district"].map(DISTRICT_CODES)
        s["Enum"] = s["enumerator_name"].astype(str).str.split(" (", regex=False).str[0].map(fix_name)
        s["st"] = parse_dt(s["starttime"])
        s["sub"] = parse_dt(s["SubmissionDate"])
        s = s[in_window(s["sub"])].copy()
        s["cmt"] = s["survey_comments"].fillna("").astype(str).str.strip()
        s["girl"] = s["girl"].astype(str)
        out[name] = s
    return out["HH"], out["GL"]


def who_list(sub):
    c = sub.groupby(["Enum", "Dist"]).size().sort_values(ascending=False)
    return ", ".join(f"{e} ({d}) {n}x" for (e, d), n in c.items())


def info_box(doc, heading, lines, fill="E8F0F7", color=None):
    from build_session_analysis import BLUE
    from wajah_hal_common import shade_cell, set_cell_margins, tbl_borders_light
    tbl = doc.add_table(rows=1, cols=1)
    tbl_borders_light(tbl)
    cell = tbl.rows[0].cells[0]
    shade_cell(cell, fill)
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    tr_pr = tbl.rows[0]._tr.get_or_add_trPr()
    tr_pr.append(OxmlElement("w:cantSplit"))  # keep the box on one page
    add_run(cell.paragraphs[0], heading, size=8.5, bold=True, color=color or BLUE)
    for label, text in lines:
        p = cell.add_paragraph()
        if label:
            add_run(p, label, size=9.5, bold=True, color=INK)
        add_run(p, text, size=9.5, color=INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(6)


def fixed_table(doc, headers, rows, widths, **kw):
    """simple_table, but with per-cell widths so Word keeps the column sizes."""
    simple_table(doc, headers, rows, widths, **kw)
    tbl = doc.tables[-1]
    tbl.autofit = False
    for row in tbl.rows:
        for cell, w in zip(row.cells, widths):
            cell.width = Cm(w)


def t(ts):
    return ts.strftime("%d-%b %I:%M %p").replace(" 0", " ") if pd.notna(ts) else "?"


def important_points(doc):
    hh, gl = load_surveys()
    section_heading(doc, "6. Aham Nukaat (Important Points)",
                    "Yeh do masle error log ke rules mein nahi aate, lekin Household aur Girls ke asal forms "
                    "parhne par saamne aaye hain")

    # ---- 6.1 Survey comments ----
    sub_heading(doc, "6.1 Survey Comments Saaf Aur Mukammal Na Likhna")
    no_int = hh[hh["respondent"].isna()]
    blank = no_int[no_int["cmt"] == ""]
    allc = pd.concat([hh.assign(F="Household"), gl.assign(F="Girls")])
    short = allc[allc["cmt"].str.len().between(1, 40)
                 & ~allc["cmt"].str.contains(f"{TEMPLATE_RE}|{MOVED_RE}", case=False)]
    template = hh[hh["cmt"].str.contains(TEMPLATE_RE, case=False)]
    moved = allc[allc["cmt"].str.contains(MOVED_RE, case=False)]
    both_wrong = hh[hh["cmt"].str.contains("both pare", case=False)
                    & (hh["available"].astype(str).str.strip() != "1 2")]
    gl_done_refuse = gl[(gl["child_consent_agree"] == 1) & gl["cmt"].str.contains("participate", case=False)]
    gl_voice = gl[(gl["parental_consent_agree"] == 0) & gl["cmt"].str.startswith("I ")]
    spelling = allc[allc["cmt"].str.contains(SPELLING_RE, case=False)]
    n_issue = len(set().union(*(set(x["KEY"]) for x in (blank, short, template, moved, both_wrong,
                                                           gl_done_refuse, gl_voice, spelling))))

    rule_card(
        doc, "SURVEY_COMMENTS", "Survey comments khali, adhoore ya copy-paste likhna", f"{n_issue} forms",
        "Jab interview nahi hota (inkaar, ghar shift, member available nahi) to survey_comments hi wahid jagah hai "
        "jahan se pata chalta hai ke asal mein kya hua. Enumerators yeh field khali chhod dete hain, ek lafz "
        "(“No”, “Not”) likh dete hain, ya har form mein ek hi ratta hua jumla copy kar dete hain. Is se na wajah "
        "pata chalti hai, na yeh ke dobara visit ho sakti hai ya nahi.",
        "Har adhoore ya refusal form mein 4 cheezein zaroor likhein: (1) KAUN — kis ne inkaar kiya ya kaun "
        "available nahi tha (mother, father, girl); (2) KYA HUA; (3) KYUN — respondent ki batayi hui wajah; "
        "(4) AAGE KYA — dobara visit ka waqt, naya pata ya contact number. Comment form ke data se match karna "
        "chahiye.",
    )

    rows = []
    if len(blank):
        ex = blank.iloc[0]
        rows.append(["Interview nahi hua lekin comment bilkul khali", len(blank),
                     f"{ex['girlname_label']} (Girl ID {ex['girl']}, {ex['village_label']}) — form submit hua, respondent koi nahi, "
                     f"comment khali.", who_list(blank)])
    if len(short):
        exs = "; ".join(f"“{r['cmt']}” ({r['girlname_label']}, Girl ID {r['girl']}, {r['F']})" for _, r in short.head(3).iterrows())
        rows.append(["Ek lafz ya adhoora comment", len(short), exs, who_list(short)])
    if len(template):
        rows.append(["Har refusal mein ek hi ratta hua jumla — kaun aur kyun nahi likha", len(template),
                     "“We don't want to participate in this survey” / “Both parents declined the survey…” — "
                     "wajah aur dobara visit ka zikr nahi.", who_list(template)])
    if len(moved):
        rows.append(["“They have moved somewhere else” — kahan, kab aur naya contact nahi", len(moved),
                     f"{moved.iloc[0]['girlname_label']} (Girl ID {moved.iloc[0]['girl']}, {moved.iloc[0]['village_label']}) — naya pata ya "
                     f"number nahi likha, tracking ke liye koi rasta nahi.", who_list(moved)])
    wrong = []
    for _, r in both_wrong.iterrows():
        wrong.append((r, f"{r['girlname_label']} (Girl ID {r['girl']}, {r['village_label']}): comment “Both parents declined” "
                         f"lekin form mein sirf mother available thi"))
    for _, r in gl_done_refuse.iterrows():
        wrong.append((r, f"{r['girlname_label']} (Girl ID {r['girl']}, {r['village_label']}): girl ne consent “agree” kiya, "
                         f"phir bhi comment “I don't want to participate”"))
    if wrong:
        sub = pd.DataFrame([r for r, _ in wrong])
        rows.append(["Comment form ke data se match nahi karta", len(wrong),
                     "; ".join(x for _, x in wrong), who_list(sub)])
    if len(gl_voice):
        rows.append(["Girls form: inkaar parent ne kiya, comment girl ki zubani (“I don't want…”)", len(gl_voice),
                     "Parental consent “disagree” hai, lekin comment se lagta hai girl ne khud inkaar kiya — "
                     "asal mein kis ne inkaar kiya, clear nahi.", who_list(gl_voice)])
    if len(spelling):
        exs = "; ".join(f"“{c}”" for c in spelling["cmt"].unique()[:3])
        rows.append(["Ghalat spelling / jumla", len(spelling), exs, who_list(spelling)])
    fixed_table(doc, ["Masla", "Forms", "Asal Misal", "Kis ne kiya"], rows, [4.0, 1.4, 5.8, 4.3], font_size=8.5)

    info_box(doc, "ACHHA COMMENT KAISE LIKHEIN (MISAL)", [
        ("Ghalat: ", "“We don't want to participate in this survey”"),
        ("Sahi: ", "“Mother ne consent se inkaar kiya, kehti hain father ki ijazat ke baghair baat nahi karein gi. "
                   "Father Karachi mein hai. Mother ne 2 hafte baad dobara aane ka kaha, number 03xx-xxxxxxx.”"),
        ("Ghalat: ", "“They have moved somewhere else”"),
        ("Sahi: ", "“Family 3 maah pehle Peshawar (Hayatabad) shift ho gayi, padosi ne bataya. Padosi ka number "
                   "03xx-xxxxxxx, family ka naya number available nahi.”"),
    ], fill="EAF4EC")

    # ---- 6.2 Consent refused then agreed ----
    sub_heading(doc, "6.2 Mother Ka Consent Pehle “Inkaar”, Phir “Haan”")
    refused_girls = hh[hh["agree_consent_mother"] == 0]["girl"].unique()
    pattern_a, pattern_b, pattern_c = [], [], []
    for gid in refused_girls:
        h = hh[hh["girl"] == gid].sort_values("st")
        g = gl[gl["girl"] == gid].sort_values("st")
        ref = h[h["agree_consent_mother"] == 0].iloc[0]
        agreed_hh = h[h["agree_consent_mother"] == 1]
        g_parent_yes = g[g["parental_consent_agree"] == 1]
        name = f"{ref['girlname_label']} ({ref['village_label']})\nGirl ID: {gid}"
        if len(agreed_hh) == 0 and len(g_parent_yes):
            gr = g_parent_yes.iloc[0]
            mins = (gr["st"] - ref["st"]).total_seconds() / 60 if pd.notna(gr["st"]) and pd.notna(ref["st"]) else None
            if mins is not None and mins < 0:
                pattern_c.append([name, f"Girls form {t(gr['st'])} ({gr['Enum']}): parent consent “agree”, "
                                        f"interview mukammal",
                                  f"Household form {t(ref['st'])} ({ref['Enum']}): mother ne inkaar kiya, comment "
                                  f"{'khali' if not ref['cmt'] else '“' + ref['cmt'] + '”'}", ref])
            else:
                pattern_a.append([name, f"{t(ref['st'])}: Mother “disagree”, Father "
                                        f"“{'disagree' if ref['agree_consent_father'] == 0 else '-'}”",
                                  f"{t(gr['st'])}: Parent “agree”, girl “"
                                  f"{'disagree' if gr['child_consent_agree'] == 0 else 'agree'}”",
                                  f"{mins:.0f} min" if mins is not None else "?", ref])
        elif len(agreed_hh):
            ag = agreed_hh.iloc[0]
            if ag["st"] > ref["st"]:
                pattern_b.append([name, f"{t(ref['st'])} ({ref['Enum']}): Mother aur Father dono ne inkaar kiya, "
                                        f"comment {'khali' if not ref['cmt'] else '“' + ref['cmt'] + '”'}",
                                  f"{t(ag['st'])} ({ag['Enum']}): dono ne consent “agree” kiya aur interview "
                                  f"mukammal hua", ref])
            else:
                pattern_c.append([name, f"{t(ag['st'])} ({ag['Enum']}): Mother ne consent “agree” kiya, interview "
                                        f"mukammal",
                                  f"{t(ref['st'])} ({ref['Enum']}): isi girl ka naya form jismein mother ne "
                                  f"inkaar kiya, comment {'khali' if not ref['cmt'] else '“' + ref['cmt'] + '”'}",
                                  ref])
    n_total = len(pattern_a) + len(pattern_b) + len(pattern_c)

    rule_card(
        doc, "CONSENT_REFUSED_THEN_AGREED", "Mother ka consent ek form mein “inkaar”, doosre mein “haan”",
        f"{n_total} girls",
        "Ek hi girl ke liye Household form mein Mother (aksar Father bhi) ka consent “disagree” darj hai, lekin "
        "usi din ya agle din doosre form mein — Household ya Girls — parent ka consent “agree” mark hai. Ya to "
        "pehla consent ghalat tap hua, ya refusal ke baad dobara mana kar interview kiya gaya aur yeh baat kahin "
        "likhi nahi gayi. Dono surton mein data aapas mein contradict karta hai aur consent par sawal uthta hai.",
        "Consent ka jawab respondent se sun kar hi select karein. Agar refusal ke baad respondent khud raazi ho "
        "jaye to naye form ke comment mein saaf likhein ke pehle inkaar kyun tha aur ab kyun raazi hue. Agar "
        "Household mein parents ne inkaar kiya hai to Girls form mein parent consent “agree” mark na karein. "
        "Jis household ka interview mukammal ho chuka ho, us par naya refusal form submit na karein — pehle "
        "supervisor se status confirm karein.",
    )

    if pattern_a:
        sub = pd.DataFrame([r[-1] for r in pattern_a])
        p = doc.add_paragraph()
        add_run(p, f"(A) Household mein parents ka inkaar, lekin Girls form mein parent consent “agree” — "
                   f"{len(pattern_a)} girls ({who_list(sub)})", size=10, bold=True, color=RED)
        p2 = doc.add_paragraph()
        add_run(p2, "Parents ne Household form mein consent se inkaar kiya, aur chand minute baad usi girl ke Girls "
                    "form mein parent consent “agree” mark kar diya gaya (sirf girl ne inkaar kiya). Agar parents ne "
                    "inkaar kiya tha to Girls form mein bhi parent consent “disagree” hona chahiye tha.",
                size=9.5, color=INK)
        fixed_table(doc, ["Girl (Village) / ID", "Household form", "Girls form", "Farq"],
                     [r[:4] for r in pattern_a], [3.8, 4.8, 4.8, 1.6], font_size=8.5)
    if pattern_b:
        p = doc.add_paragraph()
        add_run(p, f"(B) Pehle dono parents ka inkaar, baad mein “haan” — {len(pattern_b)} girls",
                size=10, bold=True, color=RED)
        p2 = doc.add_paragraph()
        add_run(p2, "Refusal form submit hua, phir usi girl ka naya form jismein dono parents ne consent diya. "
                    "Naye form mein koi comment nahi ke pehle inkaar kyun tha aur ab kyun raazi hue.",
                size=9.5, color=INK)
        fixed_table(doc, ["Girl (Village) / ID", "Pehla form", "Baad wala form"],
                     [r[:3] for r in pattern_b], [3.8, 5.6, 5.6], font_size=8.5)
    if pattern_c:
        p = doc.add_paragraph()
        add_run(p, f"(C) Pehle consent “haan” aur interview mukammal, baad mein refusal form — "
                   f"{len(pattern_c)} girls", size=10, bold=True, color=RED)
        p2 = doc.add_paragraph()
        add_run(p2, "Interview pehle hi mukammal ho chuka tha, lekin baad mein isi girl par naya form submit hua "
                    "jismein mother ka inkaar darj hai. Yeh ya to ghalat household par visit hai, ya pehle se "
                    "mukammal case ka status check kiye baghair naya form bhara gaya.",
                size=9.5, color=INK)
        fixed_table(doc, ["Girl (Village) / ID", "Pehla form", "Baad wala form"],
                     [r[:3] for r in pattern_c], [3.8, 5.6, 5.6], font_size=8.5)


# ---------------------------------------------------------------------------
# Part A: patterns, repeats and trend since survey start
# ---------------------------------------------------------------------------
HEAT = [(12, "C0504D", True), (6, "E8908A", False), (3, "F4C7C3", False), (1, "FBEAEA", False)]
STATUS_COLOR = {"Kam ho gaya": "2F7A44", "Is hafte barha": "B42A2A", "Kam nahi hua": "A15C12",
                "Naya masla": "B42A2A", "Kam hua, is hafte thoda barha": "A15C12"}


FOCUS_FIX = {
    "Consent tap": "Session mein ek enumerator consent zor se parh kar sunaye, baqi dekhein — poora consent "
                   "parhne mein kam az kam 1–2 minute lagte hain. Supervisor agle 3 din mein in ke kam az kam ek "
                   "interview mein khud baith kar consent sunein.",
    "Dummy neighbour number": "Number na mile to “not available” select karna hai, “0” nahi. Tablet par yeh option "
                              "dikha kar practice karwayein. Padosi se number lene ki koshish pehle karein.",
    "Dummy identity/location": "Landmark mein “nil” / “no” nahi likhna. Ghar ke qareeb ki koi bhi pehchaan likhein "
                               "— masjid, school, dukaan, chowk ya bijli ka khamba (misal: “Jamia Masjid ke "
                               "peeche, doosra ghar”).",
    "GPS missing": "Yeh ghalti poore din ke liye hoti hai: subah GPS off reh jaye to us din ke saare forms mein GPS "
                   "nahi aata. Har subah pehla form kholne se pehle GPS ON check karein, aur supervisor din ke pehle "
                   "submission par GPS confirm kare.",
    "Speed warnings": "Zyada tar Girls form mein. Sawal poora parh kar poochein, jawab ka intezar karein — options "
                      "khud se tap na karein. Reading/maths test mein girl ko waqt dein.",
}


def focus_pattern(lab, g):
    """One data-driven line on how this error actually shows up (g = window rows for the label)."""
    if lab == "Consent tap":
        sv = g["Survey"].value_counts()
        return f"Girls form mein {sv.get('Girls', 0)}, Household form mein {sv.get('Household', 0)}."
    if lab == "Dummy neighbour number":
        vals = g["Value"].map(lambda v: kv(v).get("neighbor_phonenumber", "?")).value_counts()
        return "Darj kiye gaye number: " + ", ".join(f"“{k}” {n}x" for k, n in vals.head(3).items()) + "."
    if lab == "Dummy identity/location":
        vals = g["Value"].astype(str).str.split(";").str[0].str.replace("_label", "").value_counts()
        return "Darj kiya gaya text: " + ", ".join(f"{k} ({n}x)" for k, n in vals.head(3).items()) + "."
    if lab == "GPS missing":
        burst = g.groupby(["Enum", "day"]).size().sort_values(ascending=False)
        big = burst[burst >= 3]
        return (f"{int(big.sum())} cases sirf {len(big)} dinon mein aaye — "
                + ", ".join(f"{e} {dd:%d-%b} ({n} forms)" for (e, dd), n in big.items())
                + ". Yani GPS poore din off raha.") if len(big) else "Alag alag dinon mein."
    if lab == "Speed warnings":
        sv = g["Survey"].value_counts()
        cnt = g["Message"].str.extract(r"has (\d+) speed warnings \(threshold (\d+)")
        med, thr = cnt[0].astype(float).median(), cnt[1].astype(float).median()
        return (f"Girls form mein {sv.get('Girls', 0)}, Household mein {sv.get('Household', 0)}. Ek form mein "
                f"average {med:.0f} speed warnings (limit {thr:.0f}).")
    return ""


def week_no(day):
    return (day - SURVEY_START).days // 7 + 1


def week_name(w):
    a = SURVEY_START + pd.Timedelta(days=7 * (w - 1))
    return f"Hafta {w} ({a:%d-%b} – {a + pd.Timedelta(days=6):%d-%b})"


def trend_status(first, prev, last, tol):
    if first == 0 and prev == 0 and last > 0:
        return "Naya masla"
    if last > prev * 1.2 and last - prev >= tol:
        return "Kam hua, is hafte thoda barha" if last <= first * 0.6 else "Is hafte barha"
    if last <= first * 0.6:
        return "Kam ho gaya"
    return "Kam nahi hua"


def grid(doc, headers, rows, widths, font_size=8, fills=None, header_fill=TEAL_HEADER_HEX):
    """Table whose body cells can carry their own fill / text colour: fills[r][c] = (hex, white_text, bold)."""
    from wajah_hal_common import shade_cell, set_cell_margins, tbl_borders_light, WHITE
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.autofit = False
    tbl_borders_light(tbl)
    for i, h in enumerate(headers):
        c = tbl.rows[0].cells[i]
        shade_cell(c, header_fill)
        set_cell_margins(c, top=50, bottom=50, left=70, right=70)
        add_run(c.paragraphs[0], h, size=font_size, bold=True, color=WHITE)
    for r_i, row in enumerate(rows):
        cells = tbl.add_row().cells
        for i, val in enumerate(row):
            fill, white, bold = (fills[r_i][i] if fills and fills[r_i][i] else
                                 ("F6F7F5" if r_i % 2 else "FFFFFF", False, False))
            shade_cell(cells[i], fill)
            set_cell_margins(cells[i], top=50, bottom=50, left=70, right=70)
            add_run(cells[i].paragraphs[0], str(val), size=font_size, bold=bold,
                    color=WHITE if white else INK)
    for row in tbl.rows:
        for cell, w in zip(row.cells, widths):
            cell.width = Cm(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)


def note(doc, text, italic=True, size=9, color=None, bold=False):
    p = doc.add_paragraph()
    add_run(p, text, size=size, italic=italic, bold=bold, color=color or INK_SOFT)
    p.paragraph_format.space_after = Pt(6)
    return p


def heat_fill(n):
    for lo, hexc, white in HEAT:
        if n >= lo:
            return (hexc, white, n >= 6)
    return None


def status_fill(s):
    return ("FFFFFF", False, True) if s not in STATUS_COLOR else None


def load_full():
    """Full-period HH/Girls errors and forms for D.I. Khan + Hangu (for the trend section)."""
    df = pd.read_excel(LOG, sheet_name="errors")
    e = df[df["District"].isin(DISTRICTS) & df["Survey"].isin(SURVEYS)].copy()
    e["Enum"] = e["Enumerator Name"].map(fix_name)
    e["day"] = parse_dt(e["Submission Date"]).dt.normalize()
    e["Lab"] = e["Rule ID"].map(lambda r: RULES[r][1])
    f = []
    for name in ("Household_Survey.csv", "Girls_Survey.csv"):
        s = pd.read_csv(ROOT / "Surveys" / name, usecols=["KEY", "district", "enumerator_name", "SubmissionDate"],
                        low_memory=False)
        s = s[s["district"].isin(DISTRICT_CODES)].copy()
        s["Dist"] = s["district"].map(DISTRICT_CODES)
        s["Enum"] = s["enumerator_name"].astype(str).str.split(" (", regex=False).str[0].map(fix_name)
        s["day"] = parse_dt(s["SubmissionDate"]).dt.normalize()
        f.append(s[["KEY", "Dist", "Enum", "day"]])
    f = pd.concat(f, ignore_index=True)
    f = f[f["day"] < WINDOW_END]
    e = e[e["day"] < WINDOW_END]
    e["wk"], f["wk"] = e["day"].map(week_no), f["day"].map(week_no)
    return e, f


def colored_status(rows, status_col, extra=None):
    fills = []
    for r in rows:
        fr = [None] * len(r)
        s = r[status_col]
        if s in STATUS_COLOR:
            fr[status_col] = (STATUS_COLOR[s], True, True)
        if extra:
            extra(r, fr)
        fills.append(fr)
    return fills


def pattern_sections(doc, w):
    """w = window errors (already filtered). Adds Part A before the rule cards."""
    e, f = load_full()
    w = w.copy()
    w["Lab"] = w["Rule ID"].map(lambda r: RULES[r][1])
    fw = f[in_window(f["day"])]
    weeks = sorted(f["wk"].unique())
    wk1, wkp, wkl = weeks[0], weeks[-2], weeks[-1]
    n_days = f["day"].nunique()

    section_heading(doc, "A. Session Ka Khulasa: Patterns, Repeat Aur Trend",
                    "Pehle yeh hissa discuss karein: kaun si ghalti, kaun kar raha hai, kahan, aur kya behtari aa "
                    "rahi hai")

    # ---- A1 Trend ----
    sub_heading(doc, "A1. Waqt Ke Saath Errors: Kam Ho Rahe Hain Ya Barh Rahe Hain?")
    note(doc, f"Yeh hissa survey shuru hone ({f['day'].min():%d-%b}) se {f['day'].max():%d-%b-%Y} tak ke "
              f"{n_days} working days (jin dinon forms submit hue) ko dekhta hai, sirf pichle do hafte nahi. Tamam "
              f"purana data bhi aaj ke rules se dobara check hua hai, is liye har hafte ka muqabla barabar hai. "
              f"Errors/Form = errors ÷ submitted Household + Girls forms; Saaf forms = jin forms mein ek bhi error "
              f"nahi.")
    wrows, stats = [], {}
    for wk in weeks:
        ew, fwk = e[e["wk"] == wk], f[f["wk"] == wk]
        nf = len(fwk)
        crit = int((ew["Severity"] == "CRITICAL").sum())
        clean = 100 - ew["Record Key"].nunique() / nf * 100
        stats[wk] = (len(ew) / nf, crit / nf, clean)
        wrows.append([week_name(wk), fwk["day"].nunique(), nf, len(ew), crit, f"{len(ew) / nf:.2f}",
                      f"{crit / nf:.2f}", f"{clean:.0f}%"])
    grid(doc, ["Hafta", "Working Days", "Forms", "Errors", "Critical", "Errors / Form", "Critical / Form",
               "Saaf Forms"], wrows, [4.6, 1.6, 1.4, 1.4, 1.4, 1.9, 1.9, 1.8], font_size=8.5)

    s1, sp, sl = stats[wk1], stats[wkp], stats[wkl]
    drop = (1 - sl[0] / s1[0]) * 100
    verdict = (f"Errors control ho rahe hain: Hafta 1 mein har form mein average {s1[0]:.2f} errors the, ab "
               f"{sl[0]:.2f} hain ({drop:.0f}% kami). Bina kisi error ke forms {s1[2]:.0f}% se barh kar "
               f"{sl[2]:.0f}% ho gaye. Critical errors per form {s1[1]:.2f} se {sl[1]:.2f} par aa gaye.")
    if sl[0] > sp[0]:
        verdict += (f" Lekin dhyan dein: pichle hafte ({sp[0]:.2f}) ke muqable mein is hafte errors per form "
                    f"phir thode barhe hain ({sl[0]:.2f}). Behtari ruk gayi hai, wajah neeche district aur "
                    f"enumerator tables mein hai.")
    info_box(doc, "NATIJA (VERDICT)", [("", verdict)], fill="FBF0E2" if sl[0] > sp[0] else "EAF4EC", color=AMBER)

    # Daily bars
    note(doc, "Rozana tasveer (har working day): bar jitni lambi, utne zyada errors per form. Laal = 1.5 se "
              "zyada, narangi = 1.0–1.5, hara = 1.0 se kam. 15 se kam forms wale din ka number kam bharosemand "
              "hai.")
    drows, dfills = [], []
    daily_f, daily_e = f.groupby("day").size(), e.groupby("day").size()
    for i, day in enumerate(sorted(daily_f.index), 1):
        nf, ne = int(daily_f[day]), int(daily_e.get(day, 0))
        r = ne / nf
        col = "B42A2A" if r >= 1.5 else "A15C12" if r >= 1.0 else "2F7A44"
        drows.append([i, f"{day:%a %d-%b}", nf, ne, f"{r:.2f}" + (" *" if nf < 15 else ""),
                      "█" * max(1, round(r * 10))])
        dfills.append([None] * 5 + [("FFFFFF", False, False)])
    grid(doc, ["#", "Din", "Forms", "Errors", "Err / Form", "Errors per form (bar)"], drows,
         [0.8, 2.4, 1.4, 1.4, 1.8, 8.2], font_size=7.5, fills=dfills)
    # colour the bars
    tbl = doc.tables[-1]
    for row, (_, _, nf, ne, *_rest) in zip(tbl.rows[1:], drows):
        r = ne / nf
        for run in row.cells[5].paragraphs[0].runs:
            from docx.shared import RGBColor
            run.font.color.rgb = RGBColor.from_string("B42A2A" if r >= 1.5 else "A15C12" if r >= 1.0 else "2F7A44")

    # District trend
    sub_heading(doc, "District Ka Trend (Errors / Form)")
    rows = []
    for dist in DISTRICTS:
        vals = []
        for wk in weeks:
            nf = len(f[(f["Dist"] == dist) & (f["wk"] == wk)])
            ne = len(e[(e["District"] == dist) & (e["wk"] == wk)])
            vals.append(ne / nf if nf else 0)
        rows.append([dist] + [f"{v:.2f}" for v in vals] + [trend_status(vals[0], vals[-2], vals[-1], 0.15)])
    grid(doc, ["District"] + [f"Hafta {wk}" for wk in weeks] + ["Status"], rows,
         [3.0] + [2.2] * len(weeks) + [3.6], font_size=8.5, fills=colored_status(rows, len(weeks) + 1))

    # Error-type trend
    sub_heading(doc, "Kaun Si Ghalti Kam Hui, Kaun Si Abhi Bhi Jari Hai (har 100 forms par)")
    fw_n = f.groupby("wk").size()
    rt = e.groupby(["Lab", "wk"]).size().unstack(fill_value=0).reindex(columns=weeks, fill_value=0)
    rt = rt.div(fw_n, axis=1) * 100
    order = w["Lab"].value_counts().index[:14]
    rows = []
    for lab in order:
        v = rt.loc[lab].tolist() if lab in rt.index else [0] * len(weeks)
        rows.append([lab] + [f"{x:.1f}" for x in v] + [trend_status(v[0], v[-2], v[-1], 1.0)])
    grid(doc, ["Ghalti"] + [f"Hafta {wk}" for wk in weeks] + ["Status"], rows,
         [4.4] + [2.0] * len(weeks) + [3.4], font_size=8, fills=colored_status(rows, len(weeks) + 1))
    note(doc, "Misal: 23.5 ka matlab hai har 100 forms mein 23–24 dafa yeh ghalti aayi. List pichle do hafte ki "
              "sab se zyada aane wali ghaltiyon ki hai.")

    # Enumerator trend
    sub_heading(doc, "Enumerator Ka Trend (Errors / Form)")
    ef, ee = f.groupby(["Enum", "wk"]).size(), e.groupby(["Enum", "wk"]).size()
    rows = []
    for enum in w["Enum"].value_counts().index:
        dist = w[w["Enum"] == enum]["District"].iloc[0]
        vals = []
        for wk in weeks:
            nf = int(ef.get((enum, wk), 0))
            vals.append(ee.get((enum, wk), 0) / nf if nf >= 5 else None)
        known = [v for v in vals if v is not None]
        status = (trend_status(known[0], known[-2], known[-1], 0.15) if len(known) >= 2 and vals[-1] is not None
                  else "Data kam")
        if status == "Naya masla":
            status = "Is hafte barha"
        rows.append([f"{enum} ({'DIK' if dist == 'D.I. Khan' else 'HNG'})"]
                    + ["-" if v is None else f"{v:.2f}" for v in vals] + [status])
    grid(doc, ["Enumerator"] + [f"Hafta {wk}" for wk in weeks] + ["Status"], rows,
         [3.6] + [2.0] * len(weeks) + [3.4], font_size=8, fills=colored_status(rows, len(weeks) + 1))
    note(doc, "“-” = us hafte 5 se kam forms. Status pehle hafte ko is hafte se, aur pichle hafte ko is hafte "
              "se compare karta hai.")

    # ---- A2 Top critical / quality ----
    sub_heading(doc, "A2. Sab Se Zyada Repeat Hone Wale Critical Aur Quality Errors (pichle 2 hafte)")
    for sev, label, fill in (("CRITICAL", "Critical", RED_HEADER_HEX), ("FLAG", "Quality", GREEN_HEADER_HEX)):
        g = w[w["Severity"] == sev]
        x = (g.groupby("Lab").agg(n=("Lab", "size"), enums=("Enum", "nunique"), days=("day", "nunique"))
             .sort_values("n", ascending=False).head(8))
        rows = []
        for lab, r in x.iterrows():
            top = g[g["Lab"] == lab]["Enum"].value_counts()
            rows.append([lab, r["n"], f"{r['n'] / len(g) * 100:.0f}%", r["enums"], r["days"],
                         ", ".join(f"{k} {v}x" for k, v in top.head(3).items())])
        note(doc, f"{label} errors: kul {len(g)}", italic=False, bold=True, color=INK, size=9.5)
        grid(doc, ["Ghalti", "Cases", "Hissa", "Kitne Enum.", "Kitne Din", "Sab se zyada kis ne"], rows,
             [4.2, 1.3, 1.3, 1.6, 1.5, 7.5], font_size=8, header_fill=fill)
    top_c = w[w["Severity"] == "CRITICAL"]["Lab"].value_counts()
    note(doc, f"Sirf ek ghalti, “{top_c.index[0]}”, akele {top_c.iloc[0]} critical errors "
              f"({top_c.iloc[0] / top_c.sum() * 100:.0f}%) ki zimmedar hai. Agar yeh ek ghalti khatam ho jaye to "
              f"critical errors adhe se bhi kam reh jayenge.", italic=False, color=INK, size=9.5)

    # ---- A2.1 Top 5 focus errors ----
    sub_heading(doc, "Session Ke 5 Focus Errors")
    focus5 = w["Lab"].value_counts().head(5)
    last_wk_start = SURVEY_START + pd.Timedelta(days=7 * (wkl - 1))
    note(doc, f"Yeh 5 ghaltiyan mil kar {focus5.sum()} errors ({focus5.sum() / len(w) * 100:.0f}%) hain. Session ka "
              f"zyada waqt inhi par lagayein.", italic=False, color=INK, size=9.5)
    for rank, (lab, n) in enumerate(focus5.items(), 1):
        g = w[w["Lab"] == lab]
        rid = g["Rule ID"].value_counts().index[0]
        title, _, _, hal = RULES[rid]
        sev = "Critical" if g["Severity"].iloc[0] == "CRITICAL" else "Quality"
        v = rt.loc[lab].tolist()
        status = trend_status(v[0], v[-2], v[-1], 1.0)
        trend = f"Har 100 forms par: Hafta 1 = {v[0]:.1f}, Hafta {wkp} = {v[-2]:.1f}, Hafta {wkl} = {v[-1]:.1f} ({status})."
        now = g[g["day"] >= last_wk_start]["Enum"].value_counts()
        who = ("Is hafte bhi kar rahe hain: " + ", ".join(f"{e} {k}x" for e, k in now.items()) + "."
               if len(now) else "Is hafte kisi ne nahi ki.")
        stopped = sorted(set(g["Enum"]) - set(now.index))
        if stopped:
            who += " Ruk gaye: " + ", ".join(stopped) + "."
        rule_card(doc, f"#{rank} FOCUS · {sev.upper()}", f"{lab}: {title}", f"{n} cases ({n / len(w) * 100:.0f}%)",
                  f"{focus_pattern(lab, g)} {trend}", FOCUS_FIX.get(lab, hal), who,
                  labels=("DATA KYA BATATA HAI", "SESSION MEIN KYA KARNA HAI", "KAUN KAR RAHA HAI"))

    # ---- A3 Enumerator x error heat map ----
    sub_heading(doc, "A3. Enumerator Aur Error Ka Pattern (Heat Map)")
    note(doc, "Har khane mein us enumerator ki us ghalti ki tadaad (pichle 2 hafte). Jitna gehra laal, utni "
              "zyada repeat. Is se foran nazar aata hai ke har enumerator ki apni “signature” ghalti kya hai.")
    cols = w["Lab"].value_counts().index[:8].tolist()
    m = w.pivot_table(index="Enum", columns="Lab", values="Rule ID", aggfunc="size", fill_value=0)
    nf_enum = fw.groupby("Enum").size()
    rows, fills = [], []
    for enum in w["Enum"].value_counts().index:
        dist = w[w["Enum"] == enum]["District"].iloc[0]
        vals = [int(m.loc[enum].get(c, 0)) for c in cols]
        other = int(m.loc[enum].sum()) - sum(vals)
        tot = int(m.loc[enum].sum())
        nf = int(nf_enum.get(enum, 0))
        rows.append([f"{enum} ({'DIK' if dist == 'D.I. Khan' else 'HNG'})"] + [v or "" for v in vals]
                    + [other or "", tot, f"{tot / nf:.2f}" if nf else "-"])
        fills.append([None] + [heat_fill(v) for v in vals] + [None, ("EEF1EF", False, True), None])
    grid(doc, ["Enumerator"] + cols + ["Baqi", "Total", "Err / Form"], rows,
         [3.0] + [1.45] * len(cols) + [1.1, 1.1, 1.3], font_size=7.5, fills=fills)

    p = note(doc, "Har enumerator ki signature ghalti:", italic=False, bold=True, color=INK, size=9.5)
    for enum in w["Enum"].value_counts().index:
        g = w[w["Enum"] == enum]
        if len(g) < 5:
            continue
        top = g["Lab"].value_counts().head(2)
        share = top.sum() / len(g) * 100
        dist = g["District"].iloc[0]
        p = doc.add_paragraph(style="List Bullet")
        add_run(p, f"{enum} ({dist}): ", size=9.5, bold=True, color=INK)
        add_run(p, f"{' + '.join(f'{k} ({v}x)' for k, v in top.items())} = uske {len(g)} errors ka "
                   f"{share:.0f}%.", size=9.5, color=INK)

    # ---- A4 Same enumerator, same error ----
    sub_heading(doc, "A4. Kaun Enumerator Same Ghalti Baar Baar Kar Raha Hai?")
    last_wk_start = SURVEY_START + pd.Timedelta(days=7 * (wkl - 1))
    c = (w.groupby(["Enum", "District", "Lab", "Severity"])
         .agg(n=("day", "size"), days=("day", "nunique"), first=("day", "min"), last=("day", "max"))
         .reset_index())
    c = c[c["n"] >= 3].sort_values(["n", "days"], ascending=False)
    rows, fills = [], []
    for _, r in c[c["n"] >= 4].iterrows():
        active = r["last"] >= last_wk_start
        habit = r["days"] >= 3
        status = "Abhi bhi jari" if active else "Ruk gaya"
        rows.append([f"{r['Enum']} ({'DIK' if r['District'] == 'D.I. Khan' else 'HNG'})", r["Lab"],
                     "Critical" if r["Severity"] == "CRITICAL" else "Quality", f"{r['n']}x", r["days"],
                     f"{r['first']:%d-%b} → {r['last']:%d-%b}", status + (" (aadat)" if habit and active else "")])
        fills.append([None, None, ("FBEAEA", False, True) if r["Severity"] == "CRITICAL" else None, None, None,
                      None, ("B42A2A", True, True) if active and habit else
                      ("A15C12", True, True) if active else ("2F7A44", True, True)])
    grid(doc, ["Enumerator", "Ghalti", "Type", "Kitni Baar", "Alag Din", "Pehli → Aakhri", "Status"], rows,
         [3.2, 3.6, 1.5, 1.4, 1.3, 2.8, 3.4], font_size=7.5, fills=fills)
    habits = c[(c["last"] >= last_wk_start) & (c["days"] >= 3)]
    note(doc, f"Table mein wo cases hain jahan ek enumerator ne ek hi ghalti 4 ya zyada baar ki (3 baar wale "
              f"A6 plan mein shamil hain). “Aadat” = 3 ya zyada alag dinon mein wohi ghalti, aur is hafte ({last_wk_start:%d-%b} se) bhi hui. "
              f"Aise {len(habits)} cases hain (3+ baar wale mila kar). Yeh training ki kami nahi, aadat ban chuki hai, is liye in "
              f"enumerators ke saath supervisor ek interview mein khud baithein. “Ruk gaya” = yeh ghalti is "
              f"hafte nahi hui.")

    # ---- A5 District pattern ----
    sub_heading(doc, "A5. Kaun Sa District Kaun Si Ghalti Zyada Karta Hai?")
    fd = fw.groupby("Dist").size()
    dm = w.pivot_table(index="Lab", columns="District", values="Rule ID", aggfunc="size", fill_value=0)
    dm = dm.reindex(columns=DISTRICTS, fill_value=0)
    dm["n"] = dm.sum(axis=1)
    rows, fills = [], []
    lead = {d_: [] for d_ in DISTRICTS}
    for lab, r in dm.sort_values("n", ascending=False).head(14).iterrows():
        per = {d_: r[d_] / fd.get(d_, 1) * 100 for d_ in DISTRICTS}
        a, b_ = per[DISTRICTS[0]], per[DISTRICTS[1]]
        if max(a, b_) >= 2 * max(min(a, b_), 0.5):
            more = DISTRICTS[0] if a > b_ else DISTRICTS[1]
            lead[more].append((lab, max(a, b_)))
        else:
            more = "Dono barabar"
        rows.append([lab, r[DISTRICTS[0]], f"{a:.1f}", r[DISTRICTS[1]], f"{b_:.1f}", more])
        fills.append([None] * 5 + [("FBEAEA", False, True) if more != "Dono barabar" else None])
    grid(doc, ["Ghalti", "D.I. Khan", "DIK / 100 forms", "Hangu", "HNG / 100 forms", "Zyada kahan"], rows,
         [4.4, 1.6, 2.4, 1.6, 2.4, 2.6], font_size=8, fills=fills)
    note(doc, f"Forms (pichle 2 hafte): D.I. Khan {fd.get('D.I. Khan', 0)}, Hangu {fd.get('Hangu', 0)}. "
              f"“Zyada kahan” tab likha hai jab ek district ka rate doosre se kam az kam do guna ho.")
    lines = []
    for d_ in DISTRICTS:
        if lead[d_]:
            lines.append((f"{d_}: ", ", ".join(f"{lab} ({v:.1f}/100)" for lab, v in lead[d_][:5])))
    info_box(doc, "HAR DISTRICT KI APNI GHALTIYAN", lines)

    # ---- A6 Session plan ----
    sub_heading(doc, "A6. Session Plan: Kis Ko Kya Batana Hai Taake Ghalti Repeat Na Ho")
    rows = []
    for enum in w["Enum"].value_counts().index:
        g = w[w["Enum"] == enum]
        if len(g) < 5:
            continue
        cc = c[(c["Enum"] == enum)].head(3)
        focus = "; ".join(f"{r['Lab']} {r['n']}x" + (" (jari)" if r["last"] >= last_wk_start else "")
                          for _, r in cc.iterrows()) or g["Lab"].value_counts().index[0]
        rows.append([f"{enum} ({'DIK' if g['District'].iloc[0] == 'D.I. Khan' else 'HNG'})", len(g), focus,
                     "0 " + " / 0 ".join(dict.fromkeys(cc["Lab"].tolist()[:2])) if len(cc) else "-"])
    grid(doc, ["Enumerator", "Errors (2 hafte)", "Focus ghaltiyan (3+ baar)", "Agle hafte ka target"], rows,
         [3.4, 1.6, 8.0, 4.4], font_size=8)

    act = c[c["last"] >= last_wk_start]  # only mistakes still happening this week
    lines = []
    for i, lab in enumerate(focus5.index, 1):
        names = act[act["Lab"] == lab].sort_values("n", ascending=False)["Enum"].tolist()
        fix = FOCUS_FIX.get(lab, RULES[w[w["Lab"] == lab]["Rule ID"].iloc[0]][3])
        lines.append((f"{i}. {lab}: ", fix + (f" Khaas tor par: {', '.join(names)}." if names else "")))
    lines += [
        (f"{len(lines) + 1}. Rozana check: ", "Har subah supervisor pichle din ke error log se har enumerator ki "
                                              "ghaltiyan us ko batayein. Jo ghalti 2 din lagatar aaye, us din "
                                              "spot-check zaroor ho."),
        (f"{len(lines) + 2}. Agla session: ", f"Target: errors per form {sl[0]:.2f} se 0.50 se neeche, aur "
                                              f"“aadat” wali list khatam. Agle session mein yahi tables dobara "
                                              f"compare honge."),
    ]
    info_box(doc, "REPEAT ROKNE KA TAREEQA (SESSION KE BAAD)", lines, fill="EAF4EC")


# ---------------------------------------------------------------------------
# Section 7: client data-quality notes + backcheck results, verified against our data
# ---------------------------------------------------------------------------
def haversine_m(a, b_, c, d):
    import math
    p1, p2 = math.radians(a), math.radians(c)
    h = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(d - b_) / 2) ** 2)
    return 2 * 6371000 * math.asin(math.sqrt(h))


def phone_digits(v):
    if pd.isna(v):
        return ""
    s = str(v).strip()
    s = s[:-2] if re.fullmatch(r"\d+\.0", s) else s
    return re.sub(r"\D", "", s)


def load_notes_data():
    """All-period HH/Girls forms (D.I. Khan + Hangu) with the extra fields the note checks need."""
    out = {}
    for name, f in (("HH", "Household_Survey.csv"), ("GL", "Girls_Survey.csv")):
        s = pd.read_csv(ROOT / "Surveys" / f, low_memory=False)
        s = s[s["district"].isin(DISTRICT_CODES)].copy()
        s["Dist"] = s["district"].map(DISTRICT_CODES)
        s["girl"] = s["girl"].astype(str)
        s["Enum"] = s["enumerator_name"].astype(str).str.split(" (", regex=False).str[0].map(fix_name)
        s["sub"] = parse_dt(s["SubmissionDate"])
        s["mins"] = pd.to_numeric(s["duration"], errors="coerce") / 60
        s["manual"] = (parse_dt(s["Endtime1"]) - parse_dt(s["starttime1"])).dt.total_seconds() / 60
        s["win"] = in_window(s["sub"])
        out[name] = s
    hh, gl = out["HH"], out["GL"]
    hh["resp"] = pd.to_numeric(hh["respondent"], errors="coerce")
    return hh, gl


def who_counts(s, top=6):
    c = s.value_counts()
    return ", ".join(f"{e} {n}x" for e, n in c.head(top).items())


def external_notes(doc):
    hh, gl = load_notes_data()
    done_hh = hh[hh["resp"].isin([1, 2])]
    done_gl = gl[gl["child_consent_agree"] == 1]
    w_hh, w_gl = done_hh[done_hh["win"]], done_gl[done_gl["win"]]
    father, mother = w_hh[w_hh["resp"] == 1], w_hh[w_hh["resp"] == 2]

    # --- computations -------------------------------------------------------
    gl20, fa20 = w_gl[w_gl["mins"] < 20], father[father["mins"] < 20]
    dev_gap = pd.concat([w_hh, w_gl])
    dev_gap = dev_gap[(dev_gap["manual"] - dev_gap["mins"] > 30) & (dev_gap["manual"] > dev_gap["mins"] * 1.5)]

    def drift(r):
        pts = [(r[f"geo_location{i}-Latitude"], r[f"geo_location{i}-Longitude"]) for i in (1, 2)
               if pd.notna(r.get(f"geo_location{i}-Latitude"))]
        return haversine_m(*pts[0], *pts[1]) if len(pts) == 2 else None
    dr = w_hh.assign(d=w_hh.apply(drift, axis=1)).dropna(subset=["d"])
    drift_mid = dr[(dr["d"] > 100) & (dr["d"] < 2000)]

    pts = (w_hh.dropna(subset=["geo_location1-Latitude"]).groupby("girl")
           .agg(lat=("geo_location1-Latitude", "first"), lon=("geo_location1-Longitude", "first"),
                Enum=("Enum", "first")).reset_index())
    pairs = []
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            m = haversine_m(pts.lat[i], pts.lon[i], pts.lat[j], pts.lon[j])
            if m <= 20:
                pairs.append((pts.girl[i], pts.girl[j], pts.Enum[i], pts.Enum[j], m))
    pairs = pd.DataFrame(pairs, columns=["g1", "g2", "e1", "e2", "m"])
    pair_enum = pd.concat([pairs["e1"], pairs["e2"]])

    hp = (mother.dropna(subset=["geo_location1-Latitude"]).groupby("girl")
          [["geo_location1-Latitude", "geo_location1-Longitude"]].first())
    gp = (w_gl.dropna(subset=["geo_location1-Latitude"]).groupby("girl")
          .agg(lat=("geo_location1-Latitude", "first"), lon=("geo_location1-Longitude", "first"),
               Enum=("Enum", "first")))
    jg = gp.join(hp, how="inner")
    jg["d"] = [haversine_m(a, b_, c, d) for a, b_, c, d in
               zip(jg["lat"], jg["lon"], jg["geo_location1-Latitude"], jg["geo_location1-Longitude"])]
    far = jg[jg["d"] > 500].sort_values("d", ascending=False)

    addr = mother["Address"].astype(str).str.strip().str.lower()
    weak_addr = mother[(addr == mother["village_label"].astype(str).str.strip().str.lower())
                       | addr.isin(["nan", "", "1", "6", "..."]) | (addr.str.split().str.len() <= 2)]

    ph = mother.assign(p=mother["phonenumber"].map(phone_digits))
    ph = ph[ph["p"].str.fullmatch(r"0?3\d{9}") & ~ph["p"].str.fullmatch(r"0?30{8,}\d?")]
    shared = ph.groupby("p").agg(n=("girl", "nunique"), enums=("Enum", lambda s: ", ".join(sorted(set(s)))))
    shared = shared[shared["n"] > 1].sort_values("n", ascending=False)

    one_hh = hh[hh["win"]].drop_duplicates("girl")
    fu = pd.to_numeric(one_hh["father_unavailable1"], errors="coerce")
    abroad = one_hh[fu == 4]
    n_girls_dist = one_hh["Dist"].value_counts()
    refused_present = []
    for gid, g in hh[hh["win"]].groupby("girl"):
        av = set(" ".join(g["available"].astype(str)).split())
        if "1" in av and not (g["resp"] == 1).any() and (pd.to_numeric(g["agree_consent_father"], errors="coerce") == 0).any():
            refused_present.append(g["Enum"].iloc[0])
    refused_present = pd.Series(refused_present, dtype=str)

    avail_diff = []
    for gid, g in hh[hh["win"]].groupby("girl"):
        m, f = g[g["resp"] == 2], g[g["resp"] == 1]
        if len(m) and len(f) and str(m.iloc[0]["available"]) != str(f.iloc[0]["available"]):
            avail_diff.append((gid, m.iloc[0]["girlname_label"], m.iloc[0]["Enum"],
                               str(m.iloc[0]["available"]), str(f.iloc[0]["available"])))
    avail_diff = pd.DataFrame(avail_diff, columns=["girl", "name", "Enum", "m", "f"])
    miss_mother = []
    for gid, g in hh.groupby("girl"):
        av = set(" ".join(g["available"].astype(str)).split())
        if ("2" in av and not (g["resp"] == 2).any()
                and not (pd.to_numeric(g["agree_consent_mother"], errors="coerce") == 0).any()):
            miss_mother.append((gid, g["girlname_label"].iloc[0], g["Enum"].iloc[0], g["sub"].min(), bool(g["win"].any())))

    skip = ("key", "time", "date", "device", "geo", "gps", "duration", "enumerator", "name", "phone", "label",
            "audit", "girl", "village", "district", "sub", "mins", "manual", "win", "dist", "enum", "resp",
            "violation", "age", "dob", "num_", "count")
    dk_rows = []
    for x in (w_hh, w_gl):
        cols = [c for c in x.columns if not any(k in c.lower() for k in skip)]
        num = x[cols].apply(pd.to_numeric, errors="coerce")
        dk_rows.append(pd.DataFrame({"Enum": x["Enum"],
                                     "dk": num.isin([-99, -98, -88, -77, 97, 98, 99, 888, 999]).sum(axis=1)}))
    dk = pd.concat(dk_rows).groupby("Enum")["dk"].agg(["sum", "size"])
    dk["per"] = dk["sum"] / dk["size"]
    dk = dk.sort_values("per", ascending=False)
    team_med = dk["per"].median()

    sib = mother.groupby("Enum")["num_siblings"].agg(["mean", "size"])
    sib = sib[sib["size"] >= 5]["mean"].sort_values()  # skip enumerators with too few mother forms

    def lbl(d):
        return "DIK" if d == "D.I. Khan" else "HNG"

    # --- section ------------------------------------------------------------
    doc.add_page_break()
    section_heading(doc, "7. Client Notes Aur Backcheck Findings: Verification Aur Hal",
                    "Client ki data quality notes (6-Oct aur pehle ki) aur backcheck calls ke har point ko hamare "
                    "data se check kiya gaya")
    note(doc, "Har point ko Household_Survey.csv, Girls_Survey.csv aur error log se dobara check kiya gaya. Jo "
              "pehle se is document mein cover hai uska hawala diya gaya hai; jo naya hai uska card neeche hai. "
              "Module-wise timing, learning test ka waqt aur test photos SurveyCTO server (text audit / media) "
              "par hain, local data mein nahi — woh client ki analysis ke mutabiq diye gaye hain.")
    info_box(doc, "DHYAN DEIN: BACKCHECK NOTE MEIN DISTRICT ULTE LIKHE HAIN", [
        ("", "Backcheck note mein Naureen Khan, Shafaq Zahra, Javairia, Asma Bibi, Irum Ikram aur Shazia begum ko "
             "“Hangu” aur Mahnoor, Nadia bibi, Laiba Shams, Summiya Hayat ko “DIK” likha gaya hai. Survey data ke "
             "mutabiq ulta hai: pehle wale sab D.I. Khan ke hain aur doosre Hangu ke. Is section mein sahi district "
             "use kiya gaya hai."),
    ], fill="FBF0E2", color=AMBER)

    V, C, N, P, X, O = ("Verified", "Pehle se cover", "Naya", "Partially", "Check nahi ho saka", "Purana — ab theek")
    rows = [
        ["Girls/Father survey 20 min se kam (Saira 11.8, Abeera 13.8, Shenaz father 14.8, Pareena father 15.9, "
         "Saira father 16.5)", f"Sab naam confirm. Pichle 2 hafte: Girls {len(gl20)}/{len(w_gl)} "
         f"({len(gl20) / len(w_gl) * 100:.0f}%), Father {len(fa20)}/{len(father)} ({len(fa20) / len(father) * 100:.0f}%) "
         f"20 min se kam. Error log sirf 15 min se kam pakadta hai.", f"{V} · {N}", "7.1"],
        ["Module-wise rushing (aspiration, mobility, learning, transport)", "Text audit server par hai, local data "
         "mein nahi. Client ke tables ke mutabiq.", X, "7.1"],
        ["Device duration manual time se bohat kam (Ateeqa 32.1 vs 104 min)", f"Ateeqa confirm (32.1 vs 104.0). "
         f"Pichle 2 hafte mein {len(dev_gap)} aur forms.", f"{V} · {N}", "7.2"],
        ["GPS missing (3/5 Oct: Mahnoor 5, Asma 1, Shafaq 1; pehle Javairia 5, Naureen 1; ‘20% missing’)",
         "Sab confirm. Trend: Hafta 1 mein 27% forms bina GPS, ab 4%.", f"{V} · {C}", "A2 #4"],
        ["Interview ke andar GPS drift (9% HH >100m; Razia 719m, Khadija 295m)", f"Confirm: {len(dr[dr['d'] > 100])}/"
         f"{len(dr)} ({len(dr[dr['d'] > 100]) / len(dr) * 100:.0f}%). Error log sirf 2 km se zyada pakadta hai — "
         f"{len(drift_mid)} cases 100m–2km miss.", f"{V} · {N}", "7.3"],
        ["Alag households ek hi GPS jagah par (clusters, Asma Bibi 3/4 pairs, ‘13 shared locations’)",
         f"Confirm: {len(pairs)} jodiyan (20 m ke andar), {len(set(pairs['g1']) | set(pairs['g2']))} girls.",
         f"{V} · {N}", "7.4"],
        ["HH aur Girls GPS mein farq (1311 7 km, Razia 4.5 km …)", f"{len(far)} girls ka Girls GPS mother ke HH GPS "
         f"se 500 m+ door. Error log ka rule sab se qareeb point leta hai is liye sirf 2 pakde.", f"{V} · {P} cover",
         "7.4"],
        ["Shared address / ek jaisa address alag landmark", f"Wajah mili: {len(weak_addr)}/{len(mother)} "
         f"({len(weak_addr) / len(mother) * 100:.0f}%) mother forms mein address sirf village ka naam hai.",
         f"{V} · {N}", "7.5"],
        ["Ek phone number 4 households mein; alag girls ka same alternate number (Kinza/Qurtulain)",
         f"Confirm: {shared.index[0] if len(shared) else '-'} {int(shared['n'].iloc[0]) if len(shared) else 0} "
         f"households ({shared['enums'].iloc[0] if len(shared) else ''}). Kul {len(shared)} numbers 2+ households "
         f"mein.", f"{V} · {N}", "7.6"],
        ["Dummy/placeholder primary number (Tanzila “3000000000”, Shumaila “33333333333”)",
         "Dummy number rule cover karta hai. Tanzila wala (14-Sep) miss hua; Shumaila doosre district ka hai.",
         f"{P} · {C}", "Section 1"],
        ["Backcheck: ~20% numbers invalid / ghalat shakhs ka number", "Number exist karta hai ya nahi data se check "
         "nahi ho sakta. Format sab theek; shared numbers 7.6 mein.", X, "7.6"],
        ["Backcheck: father maujood tha lekin survey nahi hua; ‘bahar mulk/sheher’ ghalat mark",
         f"Data mein {len(refused_present)} cases mein father available + consent “inkaar”. Father “doosre mulk” "
         f"Hangu mein {len(abroad[abroad['Dist'] == 'Hangu'])}/{n_girls_dist.get('Hangu', 0)} girls, D.I. Khan mein "
         f"{len(abroad[abroad['Dist'] == 'D.I. Khan'])}/{n_girls_dist.get('D.I. Khan', 0)}.", f"{P} · {N}", "7.7"],
        ["Mother/Father form mein availability alag (Shenaz Bibi, Humaira 1-14256-…-14)",
         f"Dono confirm. Pichle 2 hafte: {len(avail_diff)} girls.", f"{V} · {N}", "7.8"],
        ["Mother available lekin mother interview nahi (Asma 1381, Adila)",
         f"Confirm: {len(miss_mother)} cases, sab {min(x[3] for x in miss_mother):%d-%b} – "
         f"{max(x[3] for x in miss_mother):%d-%b} ke. Pichle 2 hafte mein naya case nahi."
         if miss_mother and not any(x[4] for x in miss_mother) else f"{len(miss_mother)} cases.",
         O if miss_mother and not any(x[4] for x in miss_mother) else V, "7.8"],
        ["DK/refuse zyada (Mahnoor 20.9%; Naureen Khan sab se zyada)", f"Hamare hisaab se sab se zyada: "
         f"{', '.join(f'{e} {r:.1f}' for e, r in dk['per'].head(3).items())} DK per form (team median "
         f"{team_med:.1f}). Mahnoor zyada hai lekin akeli nahi.", f"{P} · {N}", "7.9"],
        ["Backcheck: siblings roster mein bache kam", f"Call data hamare paas nahi. Roster average sab se kam: "
         f"{', '.join(f'{e} {v:.1f}' for e, v in sib.head(3).items())}.", f"{P} · {N}", "7.10"],
        ["Learning test 5 min se kam, booklet istemal nahi, correct/incorrect mark nahi, English passage option",
         "Text audit aur photos server par. Client ke mutabiq.", X, "7.11"],
        ["Listed girl roster mein nahi (Mariyam/Asma Bibi; Hanifa, Ayesha Jalil, Tanzila)",
         "Sab error log mein flag hain (Mariyam 322, 3-Oct).", f"{V} · {C}", "Section 1"],
        ["Listed girl pehli row par nahi (Kainat, Haleema, Alina)", "Sab error log mein flag.", f"{V} · {C}",
         "Section 1"],
        ["Roster khali (Afeera 1125, Mahnoor 1-39399-…-8)", "Confirm (num_siblings = 0), lekin error log ka "
         "“Roster khali” rule abhi koi row nahi de raha — DQA script mein check karna hai.", f"{V} · {P} cover",
         "Section 1"],
        ["Mother/Father education status alag (637 Shazia Bibi; Hanifa)", "637 flag hai; Hanifa (10-Sep) ke father "
         "form mein listed girl ka education khali hai.", f"{V} · {C}", "Section 1"],
        ["Duplicate girl ID do enumerators se (1775 Aleena, 1776 Kinza)", "Dono duplicate rule mein flag (11/13-Sep).",
         f"{V} · {C}", "Section 1"],
        ["Raat ko interview (Alina 1777, 10:44 PM)", "Late night rule mein flag.", f"{V} · {C}", "Section 1"],
        ["Shazia Bibi roz 6 HH surveys", "Sirf 10-Sep ko 6; average 2.6, pichle 2 hafte max 3.", O, "-"],
        ["Consent tez tap / speed", "Session ka #1 error.", f"{V} · {C}", "A2 #1"],
    ]
    fills = []
    for r in rows:
        s = r[2]
        col = ("B42A2A" if "Naya" in s else "2F7A44" if ("cover" in s or "theek" in s) else
               "6B7280" if s == X else "A15C12")
        fills.append([None, None, (col, True, True), None])
    sub_heading(doc, "7.0 Har Point Ka Verification")
    grid(doc, ["Client / backcheck point", "Hamare data mein kya mila", "Status", "Kahan"], rows,
         [5.0, 7.6, 2.8, 1.6], font_size=7.5, fills=fills)
    note(doc, "Laal = naya masla (neeche card hai). Hara = pehle se cover ya ab theek. Narangi = jazvi tor par "
              "confirm. Grey = local data se check nahi ho saka.")

    # --- cards --------------------------------------------------------------
    labels = ("WAJAH", "HAL", "ASAL DATA SE MISAL")

    def card(num, title, count, wajah, hal, ex):
        rule_card(doc, f"CLIENT NOTE · {num}", title, count, wajah, hal, ex, labels=labels)

    card("7.1", "Interview 20 minute se kam (khaas tor par Girls aur Father)",
         f"{len(gl20) + len(fa20)} forms",
         f"Pichle 2 hafte mein Girls ke {len(gl20) / len(w_gl) * 100:.0f}% aur Father ke "
         f"{len(fa20) / len(father) * 100:.0f}% interviews 20 minute se kam mein khatam hue. Hafta 1 se yeh "
         f"share kam nahi hua. Client ke text audit ke mutabiq aspiration, mobility, learning aur transport "
         f"modules sab se zyada jaldi mein ho rahe hain — yani sawal poore parhe nahi ja rahe.",
         "Har module ka minimum waqt yaad rakhein; aspiration aur mobility ke sawal raye (opinion) ke hain, "
         "respondent ko sochne ka waqt dein. Supervisor rozana sab se chhote 2 interviews ka text audit dekh kar "
         "enumerator se baat kare. 20 minute se kam Girls interview supervisor ko report ho.",
         f"Saira (Shafaq Zahra) Girls 11.8 min, Abeera (Naureen Khan) 13.8 min; Shenaz Bibi ke father "
         f"(aisha.aman) 14.8 min, Pareena ke father (Asma Bibi) 15.9 min. Girls <20 min: {who_counts(gl20['Enum'])}. "
         f"Father <20 min: {who_counts(fa20['Enum'])}.")

    card("7.2", "Tablet ka active time aur form ke andar likha waqt match nahi karta",
         f"{len(dev_gap)} forms",
         "Form ke andar start/end time (manual) ke hisaab se interview bohat lamba hai, lekin tablet par form "
         "sirf thodi der khula raha. Iska matlab form beech mein band kar ke baad mein bhara gaya, ya manual "
         "time ghalat likha gaya.",
         "Interview ke dauran form khula rakhein aur usi waqt jawab darj karein — baad mein yaad se na bharein. "
         "Manual start/end time ghari dekh kar sahi likhein.",
         f"Ateeqa Bibi (Asma Bibi, 9/10-Sep) mother form: tablet par 32.1 min, manual 104 min. Pichle 2 hafte: "
         f"{who_counts(dev_gap['Enum'])}.")

    card("7.3", "Interview ke dauran GPS 100 m se zyada hil jana",
         f"{len(drift_mid)} forms",
         f"Household form ke do GPS points ke darmiyan 100 m se 2 km ka farq hai ({len(dr[dr['d'] > 100]) / len(dr) * 100:.0f}% "
         f"forms mein 100 m+). Error log sirf 2 km+ ko pakadta hai, is liye yeh cases pehle nazar nahi aaye. Ya "
         f"GPS lock hone se pehle point liya gaya, ya interview ka kuch hissa kahin aur hua.",
         "Dono GPS points ghar ke andar/darwaze par hi lein, aur accuracy 10–15 m se kam hone tak wait karein. "
         "Interview ek hi jagah poora karein.",
         f"Razia (Asma Bibi) 719 m, Khadija Bibi (Irum Ikram) 295 m. 100 m–2 km cases: {who_counts(drift_mid['Enum'])}.")

    card("7.4", "Alag households ka GPS ek hi jagah par / Girls aur Household GPS door door",
         f"{len(pairs)} jodiyan + {len(far)} girls",
         f"{len(pairs)} jodiyon mein do alag girls ke Household forms ka GPS 20 m ke andar hai — ya to forms ek "
         f"hi jagah (jaise kisi ek ghar ya rasta) se bhare gaye, ya interview asal ghar mein nahi hua. Aur "
         f"{len(far)} girls ka Girls form ka GPS unki mother ke Household GPS se 500 m se zyada door hai.",
         "Har household ka interview usi ghar mein karein aur GPS wahin lein. Agar do girls waqai ek hi ghar ki "
         "behnein hain to comment mein likhein “behnein, same ghar”. Girls interview bhi usi ghar mein ho jahan "
         "mother ka hua.",
         f"Ek hi jagah: {who_counts(pair_enum, 8)}. Misal: Kinza aur Qurtulain (Shafaq Zahra) 1.8 m; Sorta Bibi "
         f"(Asma Bibi) aur Namra (Shazia Bibi) 5.4 m. GPS door: "
         + ", ".join(f"{gid} ({r['Enum']}) {r['d'] / 1000:.1f} km" for gid, r in far.head(4).iterrows()) + ".")

    card("7.5", "Address mein sirf village ka naam likhna",
         f"{len(weak_addr)} forms ({len(weak_addr) / len(mother) * 100:.0f}%)",
         "Address field mein sirf “Kharu wali”, “Dhalla”, “Tir Garah” jaisa village ka naam likha ja raha hai. "
         "Is liye ek hi village ke kai ghar “same address” lagte hain aur dobara ghar dhoondna mushkil hai.",
         "Address mein mohalla/gali, ghar ki pehchaan (rang, darwaza, kis ka ghar) aur qareebi jagah likhein. "
         "Misal: “Mohalla Syedan, gali no. 2, masjid ke saamne hara darwaza, Kharu Wali”.",
         f"Kis ne: {who_counts(weak_addr['Enum'], 8)}.")

    sh_txt = "; ".join(f"{p} → {int(r['n'])} households ({r['enums']})" for p, r in shared.head(4).iterrows())
    card("7.6", "Ek hi phone number kai households mein",
         f"{len(shared)} numbers",
         "Ek hi primary number alag alag girls ke households mein darj hai, kabhi alag enumerators ke forms mein. "
         "Backcheck mein bhi ~20% numbers band ya ghalat shakhs ke nikle. Lagta hai respondent ka apna number "
         "lene ke bajaye kisi aur (padosi, rishtedar, khud ka) number likh diya jata hai.",
         "Number respondent se le kar wahin call/missed call de kar confirm karein. Number kis ka hai (khud, "
         "shohar, beta) likhein. Kisi doosre ghar ka number primary mein na likhein.",
         f"{sh_txt}. Kinza aur Qurtulain (Shafaq Zahra) ka alternate number bhi same hai, jab keh walid alag hain.")

    card("7.7", "Father ko ghalat “available nahi / bahar mulk” mark karna (backcheck)",
         f"{len(abroad)} bahar mulk, {len(refused_present)} inkaar",
         f"Backcheck calls mein fathers ne kaha ke woh ghar par the ya family ke saath rehte hain, lekin form mein "
         f"“doosre sheher/mulk” ya interview nahi hua. Data mein Hangu ke "
         f"{len(abroad[abroad['Dist'] == 'Hangu']) / max(n_girls_dist.get('Hangu', 1), 1) * 100:.0f}% girls ke "
         f"father “doosre mulk” mark hain jab keh D.I. Khan mein "
         f"{len(abroad[abroad['Dist'] == 'D.I. Khan']) / max(n_girls_dist.get('D.I. Khan', 1), 1) * 100:.0f}%. "
         f"{len(refused_present)} cases mein father “available” tha lekin consent “inkaar” darj hua.",
         "Father ka status mother se poochein aur khud confirm karein. Father ghar par ho to us se interview ki "
         "koshish karein; inkaar kare to comment mein us ki wajah likhein. “Doosra mulk” sirf tab chunein jab "
         "waqai bahar ho.",
         f"Father “doosre mulk”: {who_counts(abroad['Enum'])}. Father available + inkaar: "
         f"{who_counts(refused_present)}.")

    ad = avail_diff.head(4)
    card("7.8", "Mother aur Father ke forms mein availability ka jawab alag",
         f"{len(avail_diff)} girls",
         "Ek hi ghar ke Mother aur Father forms mein “kaun available hai” ka jawab alag hai — jaise father ke form "
         "mein mother “available nahi”, jab keh mother ka interview pehle ho chuka tha. Survey ka logic isi sawal "
         "par chalta hai.",
         "Doosra form shuru karne se pehle pehle wale form ka availability jawab dekh lein, aur dono mein ek jaisa "
         "rakhein. Agar haalat badli ho to comment mein likhein.",
         "; ".join(f"{r['name']} ({r['Enum']}): mother form “{r['m']}”, father form “{r['f']}”"
                   for _, r in ad.iterrows()) + ". (1 = Father, 2 = Mother)")

    card("7.9", "Don't know / refuse jawabat zyada",
         f"{int((dk['per'] >= 2 * team_med).sum())} enumerators",
         "Kuch enumerators ke forms mein “pata nahi / jawab nahi dena” baqi team se kai guna zyada hai. Yeh "
         "is baat ka ishara hai ke sawal poora samjhaya nahi gaya ya jaldi mein DK chun liya gaya.",
         "DK sirf tab chunein jab respondent ne khud kaha ho, aur ek dafa sawal dobara samjha kar poochein. "
         "Supervisor in enumerators ke ek interview mein baith kar dekhein.",
         ", ".join(f"{e}: {r['per']:.1f} DK per form" for e, r in dk.head(4).iterrows())
         + f" (team median {team_med:.1f}).")

    card("7.10", "Siblings roster mein bache kam darj (backcheck)",
         "Backcheck",
         "Backcheck calls mein har ghar ne roster se zyada bache bataye. Roster jaldi mein banaya jata hai aur "
         "shadi-shuda, bahar rehne wale ya chhote bache reh jate hain.",
         "Roster banate waqt mother se poochein: “Aap ke kul kitne bache hain — jo zinda hain, shadi-shuda, ghar se "
         "bahar ya chhote?” Phir ek ek naam likhein aur aakhir mein ginti dobara confirm karein.",
         "Pichle 2 hafte ka average roster size sab se kam: "
         + ", ".join(f"{e} {v:.1f}" for e, v in sib.head(4).items())
         + f" (team average {mother['num_siblings'].mean():.1f}).")

    card("7.11", "Learning test ka tareeqa ek jaisa nahi (client)",
         "Client note",
         "Client ke mutabiq ~25% tests 5 minute se kam mein hue; kuch enumerators printed booklet istemal nahi kar "
         "rahe; kuch paper par correct/incorrect mark karte hain kuch nahi; aur kuch papers mein English passage "
         "option hai kuch mein nahi.",
         "Har test printed booklet se hi ho, girl khud parhe. Paper par har lafz ussi waqt correct/incorrect mark "
         "karein aur photo saaf lein. Sab enumerators ek hi version ka paper istemal karein — supervisor session "
         "mein sab ke papers check kare.",
         "Text audit aur test photos server par hain; local data se check nahi ho saka. Reading data ke masle "
         "Section 1 (Reading inconsistent) mein hain.")


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def load():
    df = pd.read_excel(LOG, sheet_name="errors")
    d = df[df["District"].isin(DISTRICTS) & df["Survey"].isin(SURVEYS)].copy()
    d["Enum"] = d["Enumerator Name"].map(fix_name)
    d["SubDate"] = parse_dt(d["Submission Date"])
    d = d[in_window(d["SubDate"])].copy()
    missing = sorted(set(d["Rule ID"]) - set(RULES))
    if missing:
        raise SystemExit(f"No text defined for rules: {missing}")

    lookup = {}
    for f in ("Household_Survey.csv", "Girls_Survey.csv"):
        s = pd.read_csv(ROOT / "Surveys" / f, usecols=["KEY", "girlname_label", "village_label", "girl"],
                        low_memory=False)
        for k, g, vl, gid in s[["KEY", "girlname_label", "village_label", "girl"]].itertuples(index=False):
            lookup[k] = (str(g), str(vl), str(gid))
    return d, lookup


def build():
    d, lookup = load()
    d = d.sort_values("SubDate")
    total = len(d)
    crit = int((d["Severity"] == "CRITICAL").sum())
    qual = total - crit
    n_enum = d["Enum"].nunique()
    n_rules = d["Rule ID"].nunique()
    by_dist = d["District"].value_counts()
    first, last = WINDOW_START, WINDOW_END - pd.Timedelta(days=1)
    span = f"{first:%d-%b} se {last:%d-%b-%Y}"

    # Group HH/GL variants that share the same text into one card.
    d["Group"] = d["Rule ID"].map(lambda r: RULES[r][0])
    groups = []
    for title, g in d.groupby("Group"):
        ids = g["Rule ID"].value_counts()
        main = ids.index[0]
        top_enum = g[g["Rule ID"] == main]["Enum"].value_counts().index[0]
        cand = g[(g["Rule ID"] == main) & (g["Enum"] == top_enum)]
        if main == "GL_CE_READING_INCONSISTENT":
            pref = cand[cand["Message"].str.contains("last_word=0 but")]
            cand = pref if len(pref) else cand
        example = example_text(cand.iloc[0], lookup) + " " + enum_list(g)
        _, _, wajah, hal = RULES[main]
        groups.append((len(g), ",".join(ids.index), title, wajah, hal, example))
    groups.sort(key=lambda x: -x[0])

    cum, top_n = 0, 0
    for n, *_ in groups:
        cum += n
        top_n += 1
        if cum / total >= 0.895:
            break
    top, rest = groups[:top_n], groups[top_n:]
    top_sum = sum(g[0] for g in top)

    doc = Document()
    sec = doc.sections[0]
    sec.left_margin = sec.right_margin = Cm(1.6)
    sec.top_margin = sec.bottom_margin = Cm(1.4)
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(10.5)

    doc_heading(doc, f"{total} Total Errors ({crit} Critical + {qual} Quality)  |  2 Districts  |  "
                     f"{n_enum} Enumerators  |  {n_rules} Rule Types  |  {DATE_LABEL}")
    # Heading band text says "(updated)" like the 18-Sep version and covers the full period.
    band_p = doc.tables[0].rows[0].cells[0].paragraphs[2]
    for run in band_p.runs:
        run.text = run.text.replace("error log se banaya gaya hai.",
                                    f"error log se banaya gaya hai (sirf pichle do hafte, {span}).")

    intro_box(doc, [
        ("Maqsad: ", True),
        (f"Yeh session D.I. Khan aur Hangu ke Household aur Girls surveys ke {total} asal errors par mabni hai "
         f"({by_dist.get('D.I. Khan', 0)} D.I. Khan, {by_dist.get('Hangu', 0)} Hangu), jo pichle do hafte "
         f"({span}) ke submissions mein identify hue. Har error ka apna girl, village aur enumerator record hai, is liye har "
         f"mistake ko real example ke sath samjhaya gaya hai, sirf rule ka naam nahi.", False),
    ])
    stat_tiles(doc, [
        ("TOTAL ERRORS", str(total), TEAL_DEEP),
        ("CRITICAL", str(crit), RED),
        ("QUALITY", str(qual), AMBER),
        ("CRITICAL %", f"{crit / total * 100:.1f}%", RED),
        ("ENUMERATORS", str(n_enum), TEAL_DEEP),
        ("RULE TYPES", str(n_rules), TEAL_DEEP),
    ])

    pattern_sections(doc, d.assign(day=d["SubDate"].dt.normalize()))

    # ---- Section 1 ----
    section_heading(doc, "1. Sabse Zyada Aane Wali Errors",
                    f"Yeh {len(top)} rules mil kar {total} mein se {top_sum} errors "
                    f"({top_sum / total * 100:.1f}%) ke zimmedar hain")
    for n, code, title, wajah, hal, ex in top:
        rule_card(doc, code, title, f"{n} cases", wajah, hal, ex)

    rest_rules = sum(len(g[1].split(",")) for g in rest)
    sub_heading(doc, f"Baqi Errors — Koi Bhi Rule Miss Nahi ({total - top_sum} errors, {rest_rules} rules)")
    p = doc.add_paragraph()
    add_run(p, f"Yeh rules kam frequency ke hain lekin koi bhi error is document se bahar nahi chhoda gaya, "
               f"sab {n_rules} rule types yahan cover hain.", size=9.5, italic=True, color=INK_SOFT)
    p.paragraph_format.space_after = Pt(8)
    for n, code, title, wajah, hal, ex in rest:
        rule_card(doc, code, title, f"{n} cases", wajah, hal, ex)

    # ---- Section 2 ----
    section_heading(doc, "2. District Wise Analysis", "D.I. Khan aur Hangu ke darmiyan errors ka farq aur wajahat")
    drows, dstats = [], {}
    for dist in DISTRICTS:
        g = d[d["District"] == dist]
        c = int((g["Severity"] == "CRITICAL").sum())
        dstats[dist] = (len(g), c / len(g) * 100)
        drows.append([dist, len(g), c, len(g) - c, f"{c / len(g) * 100:.1f}%", g["Rule ID"].nunique()])
    simple_table(doc, ["District", "Total", "Critical", "Quality", "Critical %", "Rule Types"],
                 drows, [3.0, 2.0, 2.0, 2.0, 2.2, 2.2])

    for dist in DISTRICTS:
        g = d[d["District"] == dist]
        n, cr = dstats[dist]
        other = [x for x in DISTRICTS if x != dist][0]
        e3 = g["Enum"].value_counts().head(3)
        top_labels = []
        for rid in g["Rule ID"].value_counts().index:
            lab = RULES[rid][1].lower()
            if lab not in top_labels:
                top_labels.append(lab)
            if len(top_labels) == 4:
                break
        if n >= dstats[other][0]:
            lead = f"{dist} mein sab se zyada errors ({n}) hain, aur critical rate {cr:.1f}% hai."
        elif cr > dstats[other][1]:
            lead = f"{dist} mein errors kam hain ({n}) lekin critical rate {other} se bhi zyada hai ({cr:.1f}%)."
        else:
            lead = f"{dist} mein errors kam hain ({n}) aur critical rate {cr:.1f}% hai."
        names = f"{e3.index[0]}, {e3.index[1]} aur {e3.index[2]}"
        text = (f"{lead} Teen enumerators, {names}, mil kar {e3.sum()} errors ({e3.sum() / n * 100:.0f}%) is "
                f"district ke zimmedar hain. Sab se badi wajah {top_labels[0]}, {top_labels[1]} aur "
                f"{top_labels[2]} hain, plus {top_labels[3]} bhi bar bar aati hai.")
        sub_heading(doc, dist)
        p = doc.add_paragraph()
        add_run(p, text, size=10, color=INK)
        p.paragraph_format.space_after = Pt(6)
        simple_table(doc, ["Rule", "Count"], [[k, v] for k, v in g["Rule ID"].value_counts().head(5).items()],
                     [10.5, 2.5], header_fill=TEAL_HEADER_HEX, font_size=8.5)

    # ---- Section 3 ----
    section_heading(doc, "3. Enumerator Wise Error Breakdown", "Har enumerator ke naam ke saamne uska district likha hai")
    hh_s, gl_s = load_surveys()
    forms = pd.concat([hh_s, gl_s], ignore_index=True)
    forms = forms.assign(day=forms["sub"].dt.normalize())
    erows = []
    for (enum, dist), g in sorted(d.groupby(["Enum", "District"]), key=lambda x: -len(x[1])):
        ids = " + ".join(str(i) for i in sorted(g["Enumerator ID"].unique()))
        c = int((g["Severity"] == "CRITICAL").sum())
        rid, rn = g["Rule ID"].value_counts().index[0], g["Rule ID"].value_counts().iloc[0]
        f = forms[forms["Enum"] == enum]
        days = f["day"].nunique()
        erows.append([f"{enum} ({dist})", ids, days, len(f), len(g), c, len(g) - c,
                      f"{len(g) / days:.1f}" if days else "-", f"{RULES[rid][1]} ({rn}x)"])
    fixed_table(doc, ["Enumerator (District)", "ID", "Field Days", "Forms", "Total Errors", "Critical", "Quality",
                      "Errors / Day", "Sabse Zyada Mistake"],
                erows, [3.3, 1.7, 1.2, 1.2, 1.3, 1.3, 1.3, 1.3, 3.2], font_size=8)
    p = doc.add_paragraph()
    add_run(p, "Field Days = jin dinon mein enumerator ne kam az kam ek Household ya Girls form submit kiya. "
               "Forms = Household + Girls forms ki kul tadaad. Errors / Day = Total Errors ÷ Field Days.",
            size=9, italic=True, color=INK_SOFT)

    if d[d["Enum"] == "Naureen Khan"]["Enumerator ID"].nunique() > 1:
        p = doc.add_paragraph()
        add_run(p, "Note: Naureen Khan ka data system mein 2 alag Enumerator ID (373716 aur 453925) ke neeche darj "
                   "tha, lekin yeh ek hi enumerator hai, is liye is table mein ek row mein combine kiya gaya hai.",
                size=9, italic=True, color=INK_SOFT)
        p.paragraph_format.space_after = Pt(8)
    sub_heading(doc, "3.1 Enumerator Day-wise Errors")
    p = doc.add_paragraph()
    add_run(p, "Har enumerator ke errors submission ki date ke hisaab se. Khali khana = us din koi form/error nahi; "
               "“0” = us din form bhare lekin koi error nahi aaya.", size=9, italic=True, color=INK_SOFT)
    d["day"] = d["SubDate"].dt.normalize()
    all_days = sorted(set(d["day"].dropna()) | set(forms["day"].dropna()))
    mat = d.groupby(["Enum", "day"]).size()
    worked = set(zip(forms["Enum"], forms["day"]))
    drows = []
    for (enum, dist), g in sorted(d.groupby(["Enum", "District"]), key=lambda x: -len(x[1])):
        row = [f"{enum} ({'DIK' if dist == 'D.I. Khan' else 'HNG'})"]
        for day in all_days:
            n = int(mat.get((enum, day), 0))
            row.append(str(n) if n or (enum, day) in worked else "")
        row.append(len(g))
        drows.append(row)
    tot = ["Total"] + [str(int(d[d["day"] == day].shape[0])) for day in all_days] + [len(d)]
    drows.append(tot)
    name_w, tot_w = 2.9, 1.0
    day_w = round((17.8 - name_w - tot_w) / len(all_days), 2)
    fixed_table(doc, ["Enumerator"] + [f"{x:%d-%b}" for x in all_days] + ["Total"], drows,
                [name_w] + [day_w] * len(all_days) + [tot_w], font_size=6.5)

    # ---- Section 4 ----
    section_heading(doc, "4. Baar Baar Hone Wali Ghaltiyan (Repeat Offenders)",
                    "Yeh wo enumerator hain jinhon ne ek hi mistake baar baar dohrai hai")
    combos = (d.groupby(["Enum", "District", "Rule ID", "Survey"]).size()
              .sort_values(ascending=False).reset_index(name="n"))
    card_min = 12
    for _, c in combos[combos["n"] >= card_min].iterrows():
        title, label, _, hal = RULES[c["Rule ID"]]
        srv = form_label(c["Survey"]) or c["Survey"]
        repeat_offender_card(doc, f"{c['Enum']} ({c['District']})", f"{label} ({srv})", int(c["n"]),
                             f"{c['n']} alag forms mein yeh mistake dohrai gayi — {title[0].lower() + title[1:]}.", hal)
    tail = combos[(combos["n"] >= 4) & (combos["n"] < card_min)]
    p = doc.add_paragraph()
    add_run(p, f"Inke ilawa {len(tail)} aur enumerator-rule combinations hain jinmein mistake 4 se {card_min - 1} "
               f"baar dohrai gayi — yeh neeche table mein reference ke liye diye gaye hain.",
            size=9.5, italic=True, color=INK_SOFT)
    simple_table(doc, ["Enumerator (District)", "Mistake", "Repeat"],
                 [[f"{c['Enum']} ({c['District']})",
                   f"{RULES[c['Rule ID']][1]} ({form_label(c['Survey']) or c['Survey']})", f"{c['n']}x"]
                  for _, c in tail.iterrows()],
                 [6.0, 6.5, 2.5], font_size=8.5)

    # ---- Section 5 ----
    section_heading(doc, "5. Mukammal Correction Checklist (Quick Reference)",
                    f"Sab {n_rules} rules (jo Section 1 mein detail se cover hue) ek nazar mein, session ke dauran "
                    f"jaldi dekhne ke liye")
    sev = d.groupby("Rule ID")["Severity"].first()
    for label, s, fill, widths in (("Critical Rules", "CRITICAL", RED_HEADER_HEX, [7.0, 4.0, 4.5]),
                                   ("Quality Flags", "FLAG", GREEN_HEADER_HEX, [6.0, 4.0, 5.5])):
        sub_heading(doc, label)
        rows = [[rid, RULES[rid][0], RULES[rid][3]] for rid in sorted(sev[sev == s].index)]
        simple_table(doc, ["Rule", "Mistake", "Fix"], rows, widths, header_fill=fill, font_size=8.5)

    important_points(doc)
    external_notes(doc)

    # ---- Footer ----
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    pbdr = OxmlElement("w:pBdr")
    top_b = OxmlElement("w:top")
    for k, val in (("w:val", "single"), ("w:sz", "6"), ("w:color", "DDE3E0"), ("w:space", "4")):
        top_b.set(qn(k), val)
    pbdr.append(top_b)
    p._p.get_or_add_pPr().append(pbdr)
    add_run(p, "KP-RAP M&E  |  Data Quality Session  |  D.I. Khan aur Hangu", size=8.5, color=INK_SOFT)
    p2 = doc.add_paragraph()
    add_run(p2, f"Source: Daily_Error_Log.xlsx, D.I. Khan + Hangu, Household/Girls scope incl. HH–Girls cross checks "
                f"({total} rows, last two weeks: submissions {span}, regenerated {DATE_LABEL}). Section 3 forms aur "
                f"Section 6: Household_Survey.csv aur Girls_Survey.csv (D.I. Khan + Hangu, isi window ke forms)", size=8.5, color=INK_SOFT)

    OUT.parent.mkdir(exist_ok=True)
    doc.save(OUT)
    print(f"Saved: {OUT}")
    print(f"total={total} crit={crit} top={len(top)} ({top_sum}) rest={len(rest)} span={span}")


if __name__ == "__main__":
    build()
