"""
Hangu (11-Sep-2026) companion: "Ghalti ki Wajah aur Hal" Word document.
"""

from wajah_hal_common import build_document

SUMMARY_LINE = (
    "Yeh Hangu Error Quality Report (11-Sep-2026) ka saathi document hai. Har error ki simple "
    "wajah aur hal is mein likha hai, taake field team ko samajh aaye aur error dobara na ho."
)
STATS_LINE = "Hangu  |  2 Critical + 11 Quality issues  |  9 rules"

CRITICAL_RULES = [
    ("GL_QF_CONSENT_SPEED / HH_QF_CONSENT_SPEED", "Consent screen ko jaldi tap kar dena", "2 cases",
     "Enumerator consent screen parhe bina, 1 ya 2 second mein hi \"samajh gaya / manzoor\" tap kar "
     "deta hai. Respondent ko consent theek se samjhaya nahi jata.",
     "Har consent screen zaban se parh kar respondent ko sunayein. Respondent samjhe, us ke baad hi "
     "agla button dabayein. Jaldi tap na karein."),
]

QUALITY_RULES = [
    ("GL_QF_GPS_MISSING / HH_QF_GPS_MISSING", "Interview ka GPS capture na hona", "5 cases",
     "Tablet ki location ya GPS service interview ke waqt off thi. Is liye system location record "
     "nahi kar saka.",
     "Har interview shuru karne se pehle tablet ki GPS setting ON karein. Confirm karein ke location "
     "signal mil raha hai."),
    ("HH_QF_SMALL_HOUSEHOLD", "Household mein afraad ki tadaad ghair mamuli kam", "2 cases",
     "Roster banate waqt kuch members, jaise chhote bache ya bujurg, count hone se reh jate hain. Is "
     "liye household size asal se kam nazar aata hai.",
     "Roster complete karte waqt ghar ke har fard ko shamil karein, bache se le kar bujurg tak. Koi "
     "bhi member chootna nahi chahiye."),
    ("HH_CR_SCHOOLING_PARENT_MISMATCH", "Schooling status: Maa aur Baap ke jawab match nahi karte", "1 case",
     "Mother aur Father se bache ke school jane ke baray mein alag jawab milte hain. Enumerator dono "
     "jawab aapas mein check nahi karta.",
     "Dono parents se sawal poochne ke baad agar jawab mein farq aaye, submit se pehle household mein "
     "hi sahi jawab confirm karein. Dono forms mein wahi jawab darj karein."),
    ("HH_QF_04", "Dummy ya placeholder identity/location darj karna", "1 case",
     "Respondent ka asal naam ya location poochne ke bajaye field mein placeholder, jaise abc ya "
     "test, ya galat location type kar di jati hai, jaldi mein ya bhool se.",
     "Har respondent ka poora aur sahi naam aur sahi location darj karein. Confirm kiye bina agle "
     "sawal par na jayein."),
    ("HH_QF_DUMMY_NEIGHBOR_PHONE", "Neighbour ka number fake dalna", "1 case",
     "Form jaldi khatam karne ke liye number field mein fake ya repeat digits, jaise 0000000000, dal "
     "diye jate hain. Asal number poochha hi nahi jata.",
     "Respondent se sahi number zaroor poochein. Number available na ho to \"not available\" option "
     "select karein. Dummy number kabhi na dalein."),
    ("HH_QF_LISTED_GIRL_SPELLING", "Girl ka naam roster aur girl form mein alag likha jana", "1 case",
     "Roster mein naam ek tarah likha jata hai aur girl ke apne form, girl_label, mein spelling thodi "
     "alag ho jati hai. Jaldi mein type karne se aisa hota hai.",
     "Naam har jagah bilkul ek jaisa likhein. Submit karne se pehle roster aur girl form ka naam "
     "compare kar lein."),
]

ENUMERATORS = [
    ("Laiba Shams", "Score 80",
     "Interview GPS missing, tablet location off (3 baar)",
     "Jaldbazi na karein. Numeric ranges, jaise age, months, class size, dhyan se check karein aur "
     "har section poora karein."),
    ("Summiya Hayat", "Score 96",
     "Dummy ya placeholder identity/location darj karna (1 baar)",
     "Submit karne se pehle ages, grades, durations aur contacts dobara check karein. Jahan mumkin "
     "ho field mein hi galti theek karein."),
]

if __name__ == "__main__":
    build_document(
        district="Hangu",
        summary_line=SUMMARY_LINE,
        stats_line=STATS_LINE,
        critical_rules=CRITICAL_RULES,
        quality_rules=QUALITY_RULES,
        enumerators=ENUMERATORS,
        out_path="Hangu_Error Root Cause & Prevention Guide_11-Sep-2026.docx",
    )
