"""
D.I. Khan (11-Sep-2026) companion: "Ghalti ki Wajah aur Hal" Word document.
"""

from wajah_hal_common import build_document

SUMMARY_LINE = (
    "Yeh D.I. Khan Error Quality Report (11-Sep-2026) ka saathi document hai. Har error ki simple "
    "wajah aur hal is mein likha hai, taake field team ko samajh aaye aur error dobara na ho."
)
STATS_LINE = "D.I. Khan  |  22 Critical + 63 Quality issues  |  16 rules"

CRITICAL_RULES = [
    ("HH_QF_CONSENT_SPEED / GL_QF_CONSENT_SPEED", "Consent screen ko jaldi tap kar dena", "11 cases",
     "Enumerator consent screen parhe bina, 1 ya 2 second mein hi \"samajh gaya / manzoor\" tap kar "
     "deta hai. Respondent ko consent theek se samjhaya nahi jata.",
     "Har consent screen zaban se parh kar respondent ko sunayein. Respondent samjhe, us ke baad hi "
     "agla button dabayein. Jaldi tap na karein."),
    ("HH_AN_LONG_DURATION", "Household interview ghair mamuli lamba ho jana", "2 cases",
     "Interview normal se bohat zyada waqt le leta hai. Enumerator beech mein form chhor kar wapis "
     "aata hai, ya tablet khula chhor deta hai jab interview asal mein nahi ho raha hota.",
     "Interview ko ek hi baithak mein shuru se end tak poora karein. Agar beech mein rukna zaroori "
     "ho to app ko sahi tarah pause karein, tablet khula chhor kar kahin na jayein."),
    ("HH_CR_GPS_JUMP / GL_CE_GPS_JUMP", "GPS location interview ke beech mein achanak badal jana", "3 cases",
     "Tablet ki location theek se lock nahi hoti, ya enumerator location capture hone se pehle hi "
     "ghar se chala jata hai.",
     "Interview shuru karne se pehle GPS lock hone ka wait karein. Tablet settings mein High Accuracy "
     "mode on rakhein. Location capture hone tak wahi ruke rahein."),
    ("HH_CR_LISTED_GIRL_NOT_IN_ROSTER", "Select ki gayi girl ka naam roster mein nahi hai", "2 cases",
     "Roster banate waqt kisi bacche ki entry reh jati hai ya naam ghalat likha jata hai, is liye "
     "selected girl ka naam roster se match nahi karta.",
     "Roster mein ghar ke tamam bachon ka naam dhyan se likhein. Girl select karne se pehle uska naam "
     "roster mein check karein, phir form submit karein."),
    ("GL_CE_READING_INCONSISTENT", "Reading test ka data match nahi karta", "1 case",
     "Girl jo lafz parhti hai woh dhyan se mark nahi hote. last_word wahan set nahi hota jahan girl "
     "ne rukna tha, aur incorrect count bhi sahi nahi hota.",
     "Girl jaise jaise parhe, har lafz ussi waqt mark karein. last_word usi lafz par set karein jahan "
     "girl ruki. Incorrect count ko dobara gin kar confirm karein. Test jaldi khatam na karein."),
    ("HH_AN_FAST_DURATION", "Household interview ghair mamuli jaldi khatam hona", "1 case",
     "Poora household interview itni kam der mein khatam ho jata hai jo mumkin nahi hai. Sawal jaldi "
     "jaldi tap ho jate hain, theek se poochay nahi jate.",
     "Har sawal ko poora waqt dein aur respondent ka jawab sunein. Jaldbazi na karein."),
]

QUALITY_RULES = [
    ("HH_QF_DUMMY_NEIGHBOR_PHONE / HH_QF_DUMMY_ALT_PHONE", "Neighbour ya alternative number fake dalna", "21 cases",
     "Form jaldi khatam karne ke liye number field mein fake ya repeat digits, jaise 0000000000, dal "
     "diye jate hain. Asal number poochha hi nahi jata.",
     "Respondent se sahi number zaroor poochein. Number available na ho to \"not available\" option "
     "select karein. Dummy number kabhi na dalein."),
    ("HH_QF_GPS_MISSING / GL_QF_GPS_MISSING", "Interview ka GPS capture na hona", "18 cases",
     "Tablet ki location ya GPS service interview ke waqt off thi. Is liye system location record "
     "nahi kar saka.",
     "Har interview shuru karne se pehle tablet ki GPS setting ON karein. Confirm karein ke location "
     "signal mil raha hai."),
    ("HH_CR_SCHOOLING_PARENT_MISMATCH", "Schooling status: Maa aur Baap ke jawab match nahi karte", "7 cases",
     "Mother aur Father se bache ke school jane ke baray mein alag jawab milte hain. Enumerator dono "
     "jawab aapas mein check nahi karta.",
     "Dono parents se sawal poochne ke baad agar jawab mein farq aaye, submit se pehle household mein "
     "hi sahi jawab confirm karein. Dono forms mein wahi jawab darj karein."),
    ("GL_QF_HARASSMENT_NOT_PRIVATE", "Harassment section private tareeqe se conduct na hona", "4 cases",
     "Harassment ke sensitive sawal ghar ke doosre afraad ki mojoodgi mein poochay gaye. Form ki "
     "guidance ke mutabiq yeh section private hona chahiye.",
     "Section shuru karne se pehle ghar ke doosre afraad se thodi der bahar jane ki request karein. "
     "Sirf respondent girl ke saath akele yeh sawal poochein."),
    ("HH_QF_LISTED_GIRL_SPELLING", "Girl ka naam roster aur girl form mein alag likha jana", "4 cases",
     "Roster mein naam ek tarah likha jata hai aur girl ke apne form, girl_label, mein spelling thodi "
     "alag ho jati hai. Jaldi mein type karne se aisa hota hai.",
     "Naam har jagah bilkul ek jaisa likhein. Submit karne se pehle roster aur girl form ka naam "
     "compare kar lein."),
    ("HH_QF_EDU_SPEND_OUTLIER", "Education expenditure ka amount ghair mamuli", "3 cases",
     "Kharch ki amount bohat zyada ya bohat kam darj ho jati hai. Aksar respondent ko time period, "
     "mahana ya salana, ki confusion hoti hai ya enumerator jaldi mein galat digit type kar deta hai.",
     "Amount darj karne se pehle respondent se currency aur time period, mahana ya salana, clear "
     "karein. Phir amount zaban se repeat kar ke confirm karein."),
]

ENUMERATORS = [
    ("Javeria", "Score 30",
     "Consent screen jaldi tap karna (4 baar)",
     "Consent screen zaban se parh kar sunayein. 2 second se pehle manzoor tap na karein."),
    ("Shazia Bibi", "Score 51",
     "Interview GPS missing, tablet location off (7 baar)",
     "Submit karne se pehle ages, grades, durations aur contacts dobara check karein. Jahan mumkin "
     "ho field mein hi galti theek karein."),
    ("Asma Bibi", "Score 70",
     "Consent screen jaldi tap karna (2 baar)",
     "Consent screen zaban se parh kar sunayein. 2 second se pehle manzoor tap na karein."),
    ("Shafaq Zahra", "Score 72",
     "Dummy alternative contact number darj karna (2 baar)",
     "Sirf real alternate number darj karein jab woh mojood ho. Kabhi bhi digits invent na karein, "
     "jaise 0000000 ya 1234567."),
    ("Irum Ikram", "Score 96",
     "Harassment section private na hona (1 baar)",
     "Section shuru karne se pehle ghar ke doosre afraad se bahar jane ki request karein."),
]

if __name__ == "__main__":
    build_document(
        district="D.I. Khan",
        summary_line=SUMMARY_LINE,
        stats_line=STATS_LINE,
        critical_rules=CRITICAL_RULES,
        quality_rules=QUALITY_RULES,
        enumerators=ENUMERATORS,
        out_path="D_I_Khan_Error Root Cause & Prevention Guide_11-Sep-2026.docx",
    )
