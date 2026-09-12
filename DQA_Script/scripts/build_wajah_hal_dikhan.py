"""
D.I. Khan companion: "Ghalti ki Wajah aur Hal" Word document.
"""

from wajah_hal_common import build_document

SUMMARY_LINE = (
    "Yeh D.I. Khan Error Quality Report (10-Sep-2026) ka saathi document hai. Har error ki simple "
    "wajah aur hal is mein likha hai, taake field team ko samajh aaye aur error dobara na ho."
)
STATS_LINE = "D.I. Khan  |  25 Critical + 28 Quality issues  |  16 rules"

CRITICAL_RULES = [
    ("HH_QF_CONSENT_SPEED / GL_QF_CONSENT_SPEED", "Consent screen ko jaldi tap kar dena", "11 cases",
     "Enumerator consent screen parhe bina, 1 ya 2 second mein hi \"samajh gaya / manzoor\" tap kar "
     "deta hai. Respondent ko consent theek se samjhaya nahi jata.",
     "Har consent screen zaban se parh kar respondent ko sunayein. Respondent samjhe, us ke baad hi "
     "agla button dabayein. Jaldi tap na karein."),
    ("GL_CE_READING_INCONSISTENT", "Reading test ka data match nahi karta", "3 cases",
     "Girl jo lafz parhti hai woh dhyan se mark nahi hote. last_word wahan set nahi hota jahan girl "
     "ne rukna tha, aur incorrect count bhi sahi nahi hota.",
     "Girl jaise jaise parhe, har lafz ussi waqt mark karein. last_word usi lafz par set karein jahan "
     "girl ruki. Incorrect count ko dobara gin kar confirm karein. Test jaldi khatam na karein."),
    ("HH_CR_GPS_JUMP", "GPS location interview ke beech mein achanak badal jana", "3 cases",
     "Tablet ki location theek se lock nahi hoti, ya enumerator location capture hone se pehle hi "
     "ghar se chala jata hai.",
     "Interview shuru karne se pehle GPS lock hone ka wait karein. Tablet settings mein High Accuracy "
     "mode on rakhein. Location capture hone tak wahi ruke rahein."),
    ("HH_CR_GPS_REMOTE_FROM_VILLAGE / GL_CE_GPS_REMOTE_FROM_VILLAGE", "GPS village ke baqi interviews se bohat door", "4 cases",
     "Ya to interview ghalat address par hui, ya tablet ka GPS off tha is liye system ne purani ya "
     "ghalat location save kar li.",
     "Interview shuru karne se pehle confirm karein ke aap sahi household mein hain. GPS ON karein aur "
     "sahi signal aane tak wait karein. Coordinates check kar lein ke sahi village show ho raha hai."),
    ("HH_CR_LISTED_GIRL_NOT_IN_ROSTER", "Select ki gayi girl ka naam roster mein nahi hai", "2 cases",
     "Roster banate waqt kisi bacche ki entry reh jati hai ya naam ghalat likha jata hai, is liye "
     "selected girl ka naam roster se match nahi karta.",
     "Roster mein ghar ke tamam bachon ka naam dhyan se likhein. Girl select karne se pehle uska naam "
     "roster mein check karein, phir form submit karein."),
    ("GL_AN_FAST_DURATION", "Girls interview bohat jaldi khatam ho jana", "1 case",
     "Poora interview itni kam der mein khatam ho jata hai jo mumkin nahi hai. Sawal jaldi jaldi tap "
     "ho jate hain, theek se poochay nahi jate.",
     "Har sawal ko poora waqt dein aur girl ka jawab sunein. Jaldbazi na karein, khas kar sensitive "
     "sections mein."),
]

QUALITY_RULES = [
    ("HH_CR_SCHOOLING_PARENT_MISMATCH", "Schooling status: Maa aur Baap ke jawab match nahi karte", "9 cases",
     "Mother aur Father se bache ke school jane ke baray mein alag jawab milte hain. Enumerator dono "
     "jawab aapas mein check nahi karta.",
     "Dono parents se sawal poochne ke baad agar jawab mein farq aaye, submit se pehle household mein "
     "hi sahi jawab confirm karein. Dono forms mein wahi jawab darj karein."),
    ("HH_QF_DUMMY_NEIGHBOR_PHONE / HH_QF_DUMMY_ALT_PHONE", "Neighbour ya alternative number fake dalna", "10 cases",
     "Form jaldi khatam karne ke liye number field mein fake ya repeat digits, jaise 0000000000, dal "
     "diye jate hain. Asal number poochha hi nahi jata.",
     "Respondent se sahi number zaroor poochein. Number available na ho to \"not available\" option "
     "select karein. Dummy number kabhi na dalein."),
    ("GL_QF_HARASSMENT_NOT_PRIVATE", "Harassment section private tareeqe se conduct na hona", "2 cases",
     "Harassment ke sensitive sawal ghar ke doosre afraad ki mojoodgi mein poochay gaye. Form ki "
     "guidance ke mutabiq yeh section private hona chahiye.",
     "Section shuru karne se pehle ghar ke doosre afraad se thodi der bahar jane ki request karein. "
     "Sirf respondent girl ke saath akele yeh sawal poochein."),
    ("HH_QF_EDU_SPEND_OUTLIER", "Education expenditure ka amount ghair mamuli", "2 cases",
     "Kharch ki amount bohat zyada ya bohat kam darj ho jati hai. Aksar respondent ko time period, "
     "mahana ya salana, ki confusion hoti hai ya enumerator jaldi mein galat digit type kar deta hai.",
     "Amount darj karne se pehle respondent se currency aur time period, mahana ya salana, clear "
     "karein. Phir amount zaban se repeat kar ke confirm karein."),
    ("HH_QF_LISTED_GIRL_SPELLING", "Girl ka naam roster aur girl form mein alag likha jana", "2 cases",
     "Roster mein naam ek tarah likha jata hai aur girl ke apne form, girl_label, mein spelling thodi "
     "alag ho jati hai. Jaldi mein type karne se aisa hota hai.",
     "Naam har jagah bilkul ek jaisa likhein. Submit karne se pehle roster aur girl form ka naam "
     "compare kar lein."),
    ("HH_QF_SMALL_HOUSEHOLD", "Household mein afraad ki tadaad ghair mamuli kam", "2 cases",
     "Roster banate waqt kuch members, jaise chhote bache ya bujurg, count hone se reh jate hain. Is "
     "liye household size asal se kam nazar aata hai.",
     "Roster complete karte waqt ghar ke har fard ko shamil karein, bache se le kar bujurg tak. Koi "
     "bhi member chootna nahi chahiye."),
    ("GL_QF_GPS_MISSING", "Interview ka GPS capture na hona", "1 case",
     "Tablet ki location ya GPS service interview ke waqt off thi. Is liye system location record "
     "nahi kar saka.",
     "Har interview shuru karne se pehle tablet ki GPS setting ON karein. Confirm karein ke location "
     "signal mil raha hai."),
]

ENUMERATORS = [
    ("Asma Bibi", "Score 39",
     "Consent screen jaldi tap karna (4 baar)",
     "Consent screen zaban se parh kar sunayein. 2 second se pehle manzoor tap na karein."),
    ("Naureen Khan", "Score 68",
     "Reading test ka data match na karna (2 baar)",
     "Girl jaise parhe, har lafz ussi waqt mark karein. Test jaldi khatam na karein."),
    ("Irum Ikram", "Score 68",
     "Harassment section private na hona (2 baar)",
     "Section shuru karne se pehle ghar ke doosre afraad se bahar jane ki request karein."),
    ("Shazia Bibi", "Score 84",
     "Schooling status Maa aur Baap mein match na hona (3 baar)",
     "Dono parents ke jawab compare karein. Farq ho to household mein hi sahi jawab tay karein."),
]

if __name__ == "__main__":
    build_document(
        district="D.I. Khan",
        summary_line=SUMMARY_LINE,
        stats_line=STATS_LINE,
        critical_rules=CRITICAL_RULES,
        quality_rules=QUALITY_RULES,
        enumerators=ENUMERATORS,
        out_path="D_I_Khan_Error Root Cause & Prevention Guide_10-Sep-2026.docx",
    )
