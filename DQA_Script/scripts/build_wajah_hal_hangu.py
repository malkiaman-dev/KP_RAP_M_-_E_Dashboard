"""
Hangu companion: "Ghalti ki Wajah aur Hal" Word document.
"""

from wajah_hal_common import build_document

SUMMARY_LINE = (
    "Yeh Hangu Error Quality Report (10-Sep-2026) ka saathi document hai. Har error ki simple "
    "wajah aur hal is mein likha hai, taake field team ko samajh aaye aur error dobara na ho."
)
STATS_LINE = "Hangu  |  8 Critical + 26 Quality issues  |  11 rules"

CRITICAL_RULES = [
    ("HH_QF_CONSENT_SPEED / GL_QF_CONSENT_SPEED", "Consent screen ko jaldi tap kar dena", "7 cases",
     "Enumerator consent screen parhe bina, 1 ya 2 second mein hi \"samajh gaya / manzoor\" tap kar "
     "deta hai. Respondent ko consent theek se samjhaya nahi jata.",
     "Har consent screen zaban se parh kar respondent ko sunayein. Respondent samjhe, us ke baad hi "
     "agla button dabayein. Jaldi tap na karein."),
    ("GL_CE_READING_INCONSISTENT", "Reading test ka data match nahi karta", "1 case",
     "Girl jo lafz parhti hai woh dhyan se mark nahi hote. last_word wahan set nahi hota jahan girl "
     "ne rukna tha, aur incorrect count bhi sahi nahi hota.",
     "Girl jaise jaise parhe, har lafz ussi waqt mark karein. last_word usi lafz par set karein jahan "
     "girl ruki. Incorrect count ko dobara gin kar confirm karein. Test jaldi khatam na karein."),
]

QUALITY_RULES = [
    ("HH_QF_DUMMY_NEIGHBOR_PHONE / HH_QF_DUMMY_ALT_PHONE", "Neighbour ya alternative number fake dalna", "8 cases",
     "Form jaldi khatam karne ke liye number field mein fake ya repeat digits, jaise 0000000000, dal "
     "diye jate hain. Asal number poochha hi nahi jata.",
     "Respondent se sahi number zaroor poochein. Number available na ho to \"not available\" option "
     "select karein. Dummy number kabhi na dalein."),
    ("HH_QF_GPS_MISSING / GL_QF_GPS_MISSING", "Interview ka GPS capture na hona", "10 cases",
     "Tablet ki location ya GPS service interview ke waqt off thi. Is liye system location record "
     "nahi kar saka.",
     "Har interview shuru karne se pehle tablet ki GPS setting ON karein. Confirm karein ke location "
     "signal mil raha hai."),
    ("HH_QF_LISTED_GIRL_SPELLING", "Girl ka naam roster aur girl form mein alag likha jana", "5 cases",
     "Roster mein naam ek tarah likha jata hai aur girl ke apne form, girl_label, mein spelling thodi "
     "alag ho jati hai. Jaldi mein type karne se aisa hota hai.",
     "Naam har jagah bilkul ek jaisa likhein. Submit karne se pehle roster aur girl form ka naam "
     "compare kar lein."),
    ("HH_CR_SCHOOLING_PARENT_MISMATCH", "Schooling status: Maa aur Baap ke jawab match nahi karte", "1 case",
     "Mother aur Father se bache ke school jane ke baray mein alag jawab milte hain. Enumerator dono "
     "jawab aapas mein check nahi karta.",
     "Dono parents se sawal poochne ke baad agar jawab mein farq aaye, submit se pehle household mein "
     "hi sahi jawab confirm karein. Dono forms mein wahi jawab darj karein."),
    ("HH_QF_03", "Dummy ya placeholder naam darj karna", "1 case",
     "Respondent ka asal naam poochne ke bajaye field mein abc, xyz ya koi placeholder naam type kar "
     "diya jata hai, jaldi mein ya bhool se.",
     "Har respondent ka poora aur sahi naam poochein aur wahi darj karein. Naam confirm kiye bina "
     "agle sawal par na jayein."),
    ("HH_QF_SPEED_WARNINGS", "SurveyCTO ki speed warning zyada aana", "1 case",
     "Bohat se sawalat bohat kam waqt mein answer kiye jate hain, is liye system automatic speed "
     "warning deta hai. Yeh interview jaldbazi mein hone ki nishani hai.",
     "Har sawal ko poora waqt dein aur respondent se dhyan se sunein. Warning aaye to ruk kar us "
     "section ko dobara dhyan se karein."),
]

ENUMERATORS = [
    ("Mahnoor", "Score 60",
     "Consent screen jaldi tap karna (3 baar)",
     "Consent screen zaban se parh kar sunayein. 2 second se pehle manzoor tap na karein."),
    ("Laiba Shams", "Score 76",
     "Interview GPS missing, tablet location off (4 baar)",
     "Submit karne se pehle ages, grades, durations aur contacts dobara check karein. Jahan mumkin "
     "ho field mein hi galti theek karein."),
    ("Nadia Bibi", "Score 94",
     "Dummy alternative contact number (1 baar)",
     "Sirf real alternate number darj karein jab woh mojood ho. Kabhi bhi digits invent na karein, "
     "jaise 0000000 ya 1234567."),
]

if __name__ == "__main__":
    build_document(
        district="Hangu",
        summary_line=SUMMARY_LINE,
        stats_line=STATS_LINE,
        critical_rules=CRITICAL_RULES,
        quality_rules=QUALITY_RULES,
        enumerators=ENUMERATORS,
        out_path="Hangu_Error Root Cause & Prevention Guide_10-Sep-2026.docx",
    )
