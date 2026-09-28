"""
Data Quality Session document (26-Sep-2026): D.I. Khan + Hangu, Household/Girls
scope, cumulative from survey start till date. Same layout as the 12-Sep and
18-Sep session documents, but every number, enumerator list and real example
is computed directly from Error_log/Daily_Error_Log.xlsx.
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
OUT = ROOT / "Data Quality Sessions" / "DI_Khan_Hangu_Data_Quality_Session_26-Sep-2026.docx"
DATE_LABEL = "26-Sep-2026"
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
        s["st"] = pd.to_datetime(s["starttime"].astype(str).str.replace("Sept", "Sep"),
                                 format="%d-%b-%Y, %I:%M:%S %p", errors="coerce")
        s["sub"] = pd.to_datetime(
            s["SubmissionDate"].astype(str).str.replace(" ", " ").str.replace("Sept", "Sep"),
            format="%d-%b-%Y, %I:%M:%S %p", errors="coerce")
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
# Build
# ---------------------------------------------------------------------------
def load():
    df = pd.read_excel(LOG, sheet_name="errors")
    d = df[df["District"].isin(DISTRICTS) & df["Survey"].isin(SURVEYS)].copy()
    d["Enum"] = d["Enumerator Name"].map(fix_name)
    d["SubDate"] = pd.to_datetime(
        d["Submission Date"].astype(str).str.replace(" ", " ").str.replace("Sept", "Sep"),
        format="%d-%b-%Y, %I:%M:%S %p", errors="coerce")
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
    first, last = d["SubDate"].min(), d["SubDate"].max()
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
                                    f"error log se banaya gaya hai (survey shuru hone se aaj tak, {span}).")

    intro_box(doc, [
        ("Maqsad: ", True),
        (f"Yeh session D.I. Khan aur Hangu ke Household aur Girls surveys ke {total} asal errors par mabni hai "
         f"({by_dist.get('D.I. Khan', 0)} D.I. Khan, {by_dist.get('Hangu', 0)} Hangu), jo survey shuru hone se "
         f"aaj tak ({span}) identify hue. Har error ka apna girl, village aur enumerator record hai, is liye har "
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
                f"({total} rows, submissions {span}, regenerated {DATE_LABEL}). Section 6: Household_Survey.csv "
                f"aur Girls_Survey.csv (D.I. Khan + Hangu forms)", size=8.5, color=INK_SOFT)

    OUT.parent.mkdir(exist_ok=True)
    doc.save(OUT)
    print(f"Saved: {OUT}")
    print(f"total={total} crit={crit} top={len(top)} ({top_sum}) rest={len(rest)} span={span}")


if __name__ == "__main__":
    build()
