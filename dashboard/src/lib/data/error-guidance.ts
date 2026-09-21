/**
 * Field-facing guidance for DQA rule IDs.
 * Used on the district Error Analytics page so supervisors/enumerators
 * know what to fix first and how to avoid repeating the issue.
 *
 * `avoidUrdu` is the Roman Urdu version of `avoid`, written for the
 * exported Error Quality Report (PDF/DOCX) coaching table.
 */

export interface RuleGuidance {
  focus: string;
  avoid: string;
  avoidUrdu: string;
}

/** Exact rule guidance (highest priority). */
const RULE_GUIDANCE: Record<string, RuleGuidance> = {
  // ---- Tracking (TRK_) ----
  TRK_HH_CR_TRACKED_BUT_HH_MISSING: {
    focus:
      "Girls marked successfully tracked must also have a completed household survey.",
    avoid:
      "After a successful track, complete (or confirm) the household form for that girl before moving on. Check the HH queue daily for tracked girls still missing HH.",
    avoidUrdu:
      "Girl ko successfully track karne ke foran baad uska Household form bhi complete karein. Har roz check karein ke kaunsi tracked girls ka HH form abhi tak baaki hai.",
  },
  TRK_HH_QF_HH_EXISTS_NOT_TRACKED: {
    focus: "A Household record exists for a girl who is not in the successfully-tracked set.",
    avoid:
      "Only complete the Household survey for girls who have already been confirmed as successfully tracked.",
    avoidUrdu:
      "Household survey sirf un girls ke liye complete karein jo tracking mein confirm ho chuki hain. Pehle tracking status zaroor check karein.",
  },
  TRK_CE_MISSING_PHONE: {
    focus: "Listed girl phone numbers are missing after tracking attempts.",
    avoid:
      "Always capture or update the girl's phone (or a reliable alternate) during tracking. Do not leave phone fields blank when a contact exists in the household.",
    avoidUrdu:
      "Tracking ke dauran girl ka phone number (ya koi bharosemand alternate number) zaroor darj karein. Agar ghar mein contact mojood hai to phone field khali na chhodein.",
  },
  TRK_CE_CONSENT_REFUSED_COMPLETE: {
    focus: "Consent was refused but the tracking form was marked Complete.",
    avoid:
      "If the respondent refuses consent, mark survey_status as Incomplete. Never mark a refused-consent visit as Complete.",
    avoidUrdu:
      "Agar respondent consent dene se inkar kare to survey_status ko Incomplete mark karein. Consent refuse hone par form ko kabhi bhi Complete mark na karein.",
  },
  TRK_CE_CONSENT_MISSING: {
    focus: "Girl was found and the form is Complete, but consent is blank.",
    avoid:
      "When the girl is found, complete the consent questions before submitting. Do not leave consent empty on a Complete form.",
    avoidUrdu:
      "Girl milne ke baad submit karne se pehle consent ke sawal zaroor poochein. Complete form par consent field khali na chhodein.",
  },
  TRK_CE_VISIT_DATE_INVALID: {
    focus: "Visit date field is filled but the value cannot be parsed as a valid date.",
    avoid:
      "Enter the visit date in the correct format on the day of the actual visit. Do not leave it malformed or type an impossible date.",
    avoidUrdu:
      "Visit date hamesha sahi format mein aur usi din ki tareekh likhein jis din interview hua. Adhoori ya ghalat tareekh darj na karein.",
  },
  TRK_AN_FAST_DURATION: {
    focus: "Tracking form completed faster than the minimum plausible duration.",
    avoid:
      "Take the full time needed to verify identity, location, and outcome before submitting. Do not rush through a tracking visit.",
    avoidUrdu:
      "Tracking form itni jaldi complete na karein. Girl ki identity, location aur outcome achi tarah confirm karne ke baad hi submit karein.",
  },
  TRK_QF_05: {
    focus: "Tracking surveys completed unusually fast.",
    avoid:
      "Take enough time to verify identity, location, and outcomes. Rushing raises quality flags — follow the full visit protocol even for short callbacks.",
    avoidUrdu:
      "Identity, location aur outcome confirm karne ke liye poora waqt lein. Chhoti callback visits mein bhi poora protocol follow karein, jaldbazi na karein.",
  },
  TRK_QF_02: {
    focus: "This enumerator submitted an unusually high number of forms within a single hour.",
    avoid:
      "Space out visits realistically. Do not submit many forms back-to-back within the same hour — each case needs its own proper visit time.",
    avoidUrdu:
      "Ek hi ghante mein bohat sari forms jaldi jaldi submit na karein. Har case ko uska poora, alag waqt dein.",
  },
  TRK_QF_DUMMY_VILLAGE: {
    focus: "Village name looks like placeholder/dummy text.",
    avoid: "Write the real village name every time. Never enter test text where a village name is required.",
    avoidUrdu:
      "Village ka asal naam likhein. Jahan village ka naam zaroori hai wahan kabhi test ya placeholder text na dalein.",
  },
  TRK_CE_DUP_INSTANCE: {
    focus: "This submission's instanceID duplicates another submission.",
    avoid: "Do not resubmit the same form. If a submission seems to have failed, check the list before starting a new one.",
    avoidUrdu:
      "Ek hi form ko dobara submit na karein. Agar submit fail lage to pehle list mein check karein ke woh pehle se mojood hai ya nahi.",
  },
  TRK_QF_DUP_RECORD_KEY: {
    focus: "This submission's KEY duplicates another submission.",
    avoid: "Check the existing case list before creating a new record for the same girl/visit.",
    avoidUrdu: "Naya record banane se pehle list mein check karein ke yeh case pehle se mojood to nahi.",
  },
  TRK_CE_OUTCOME_MISSING: {
    focus: "Girl's name and father's name are filled but the tracking outcome (found/not found) is missing.",
    avoid: "After entering the girl and father's name, always select the tracking outcome before submitting.",
    avoidUrdu:
      "Girl aur father ka naam likhne ke baad uska tracking outcome (mili ya nahi mili) zaroor select karein, khali na chhodein.",
  },
  TRK_QF_DUMMY_GIRL_NAME: {
    focus: "Girl's name in this block looks like placeholder/dummy text.",
    avoid: "Always write the girl's real, full name as told by the household.",
    avoidUrdu: "Girl ka asal, poora naam likhein jo ghar walon ne bataya, placeholder ya dummy naam na likhein.",
  },
  TRK_QF_DUMMY_FATHER_NAME: {
    focus: "Father's name in this block looks like placeholder/dummy text.",
    avoid: "Ask for and record the father's real name only.",
    avoidUrdu: "Father ka asal naam poochein aur wahi darj karein, test ya dummy naam na likhein.",
  },
  TRK_QF_DUMMY_ADDRESS: {
    focus: "Address text looks like placeholder/dummy text.",
    avoid: "Record the household's real, complete address — never a dummy or incomplete one.",
    avoidUrdu: "Ghar ka poora aur asal address likhein, dummy ya adhoora address na dalein.",
  },
  TRK_QF_DUMMY_LANDMARK: {
    focus: "Landmark text looks like placeholder/dummy data.",
    avoid: "Write a real, specific landmark (shop name, mosque, school). Never use test text like “abc”, “xxx”, or “N/A” when a landmark exists.",
    avoidUrdu:
      "Landmark mein asal aur specific jagah likhein (dukan, masjid, school ka naam). Landmark mojood ho to kabhi 'abc', 'xxx' ya 'N/A' jaisa test text na likhein.",
  },
  TRK_QF_DUMMY_NEW_GIRL_NAME: {
    focus: "Newly-found girl's name in this block looks like placeholder/dummy text.",
    avoid: "Ask for and record the newly-found girl's real name only.",
    avoidUrdu: "Nayi mili girl ka asal naam poochein aur sahi darj karein, dummy naam na likhein.",
  },
  TRK_QF_DUMMY_NEW_FATHER_NAME: {
    focus: "Newly-found girl's father's name in this block looks like placeholder/dummy text.",
    avoid: "Ask for and record the newly-found girl's father's real name only.",
    avoidUrdu: "Nayi mili girl ke father ka asal naam poochein aur sahi darj karein, dummy naam na likhein.",
  },
  TRK_CE_02: {
    focus: "House was not marked found/moved, and both the address and landmark are missing, weak, or dummy.",
    avoid:
      "When a house cannot be located, still record a clear, specific address and landmark so the case can be found later.",
    avoidUrdu:
      "Agar ghar na mile to bhi address aur landmark clearly aur sahi likhein, taake baad mein woh ghar dobara asaani se talash ho sake.",
  },
  TRK_QF_INVALID_GIRL_FOUND: {
    focus: "The girl_found outcome code is not one of the valid options.",
    avoid: "Select the tracking outcome only from the valid listed options — do not type or select an out-of-range code.",
    avoidUrdu: "Tracking outcome sirf diye gaye valid options mein se select karein, khud se koi aur code na likhein.",
  },
  TRK_CE_01: {
    focus: "Girl was marked found, but the father's name does not match the original listing.",
    avoid: "Before marking a girl as found, confirm her father's name matches the listing exactly. Do not track the wrong girl.",
    avoidUrdu:
      "Girl ko 'mil gayi' mark karne se pehle uske father ka naam listing se dobara match karein, taake ghalat girl track na ho.",
  },
  TRK_QF_07: {
    focus: "Father's name matches the listing, but the girl's name differs.",
    avoid: "Even when the father matches, confirm and record the girl's name exactly as in the listing.",
    avoidUrdu: "Father ka naam match hone ke bawajood girl ka naam bhi listing ke mutabiq hi likhein.",
  },
  TRK_QF_DUP_GIRL_WITHIN_SUB: {
    focus: "The same girl appears in more than one block of the same submission.",
    avoid: "Record each girl only once per submission — do not repeat the same girl in a second block.",
    avoidUrdu: "Ek hi form mein ek girl ko sirf ek hi baar record karein, dobara na likhein.",
  },
  TRK_QF_NEW_GIRLS_FOUND_MISMATCH: {
    focus: "new_girls_found was answered No, but new-girl blocks were still filled in.",
    avoid: "Keep the new_girls_found answer consistent with whether you actually filled a new-girl block.",
    avoidUrdu:
      "Agar naye girl ka block bhar rahe hain to 'new_girls_found' ka jawab bhi 'Haan' rakhein, dono jawabon mein tazad na aaye.",
  },
  TRK_QF_NEW_GIRLS_FOUND_EMPTY: {
    focus: "new_girls_found was answered Yes, but no valid new-girl block was filled in.",
    avoid: "If you report finding new girls, fill in their details in the corresponding block before submitting.",
    avoidUrdu: "Agar naye girls milne ka jawab 'Haan' diya hai to un ki maloomat wala block bhi zaroor bharein.",
  },
  TRK_QF_NUM_NEW_GIRLS_MISMATCH: {
    focus: "The reported number of new girls does not match the number of filled blocks.",
    avoid: "Count the new-girl blocks you actually filled and enter that same number.",
    avoidUrdu: "Naye girls ki jo tadad likhein woh utni hi honi chahiye jitne blocks aap ne asal mein bhare hain.",
  },
  TRK_QF_DUP_GIRL_EXACT: {
    focus: "Exact duplicate girl records in tracking.",
    avoid:
      "Search the assignment list before starting a new form. Do not re-submit the same girl. If unsure, check with your supervisor instead of creating a new case.",
    avoidUrdu:
      "Naya form shuru karne se pehle assignment list mein check kar lein. Ek hi girl ka form dobara submit na karein. Confusion ho to supervisor se poochein, khud se naya case na banayein.",
  },
  TRK_QF_DUP_GIRL_NEAR_MISMATCH: {
    focus: "Possible duplicate girls with a near-matching name/father across submissions.",
    avoid: "Double-check name and father spelling before submitting a new girl to avoid an accidental near-duplicate.",
    avoidUrdu: "Naam aur father ki spelling submit karne se pehle dhyan se check karein, taake accidental duplicate na bane.",
  },
  TRK_QF_DUP_GIRL_MISMATCH: {
    focus: "Possible duplicate girls with mismatched details.",
    avoid:
      "Compare name, ID, and village carefully before submitting. Fix wrong IDs on the original record; do not create a second conflicting form.",
    avoidUrdu:
      "Naam, ID aur village submit karne se pehle dhyan se compare karein. Ghalat ID asal record par theek karein; dusra tazadi form na banayein.",
  },
  TRK_QF_INVALID_ENROLLED_CODE: {
    focus: "confirm_enrolled code is outside the valid set of options.",
    avoid: "Select the enrollment confirmation only from the valid listed options.",
    avoidUrdu: "Enrollment confirm karte waqt sirf diye gaye valid options mein se hi select karein.",
  },
  TRK_QF_MISSING_UPDATE_AFTER_TRACK: {
    focus: "Tracking outcome updated without a proper revisit/update trail.",
    avoid: "When you change a tracking status, complete the update steps in the form. Do not skip revisit fields after a successful track.",
    avoidUrdu:
      "Tracking outcome update karte waqt form ke tamam zaroori steps complete karein. Successful track ke baad revisit fields skip na karein.",
  },
  TRK_QF_DUP_PHONE_MULTI_GIRL: {
    focus: "Same phone number used for multiple girls.",
    avoid:
      "Confirm whose phone it is. Shared household phones are OK only when recorded correctly; do not copy one number across unrelated girls.",
    avoidUrdu:
      "Confirm karein ke number kis ka hai. Ek hi ghar ka shared phone number sahi tarah likha ja sakta hai, lekin ek number ko alag-alag, na-mutaliq girls ke liye copy na karein.",
  },

  // ---- Household (HH_) ----
  HH_CR_01: {
    focus: "Same household member (name+age+gender) recorded twice in the roster.",
    avoid: "Check the roster before adding a new member — do not enter the same person twice.",
    avoidUrdu: "Roster banate waqt check karein ke woh member pehle se to darj nahi. Ek hi shaks ko dobara na likhein.",
  },
  HH_CR_02: {
    focus: "Roster shows an impossible parent-child relationship (age gap too small).",
    avoid: "Confirm ages when recording relationships — a parent must be plausibly older than their child.",
    avoidUrdu:
      "Roster mein relationship darj karte waqt age dhyan se confirm karein — parent ki age bacche se kaafi zyada honi chahiye.",
  },
  HH_CR_03: {
    focus:
      "Sibling's marriage information is invalid (e.g. marriage age exceeds current age, or marked never-married with a marriage age filled).",
    avoid: "Only fill marriage age when the sibling is actually married, and make sure it is less than their current age.",
    avoidUrdu: "Marriage age sirf tab bharein jab sibling waqai shadi shuda ho, aur woh unki current age se kam honi chahiye.",
  },
  HH_CR_04: {
    focus: "Roster education answers contradict each other (e.g. enrolled=No but grade filled, or enrolled=Yes but grade missing).",
    avoid: "Keep enrollment status and grade consistent for every roster member.",
    avoidUrdu: "Har roster member ke liye enrollment status aur grade ka jawab aapas mein mutabiq rakhein — tazad na aaye.",
  },
  HH_CR_05: {
    focus: "No adult (18+) exists anywhere in the household roster.",
    avoid: "Make sure the roster includes at least one adult household member.",
    avoidUrdu: "Roster mein kam az kam ek balig (18 saal ya us se zyada) fard zaroor shamil karein.",
  },
  HH_CR_06: {
    focus: "Reported household size does not match the actual roster count.",
    avoid: "Count the roster you actually entered and make sure hh_size matches it exactly.",
    avoidUrdu: "Household size wahi likhein jitne members aap ne roster mein asal mein darj kiye hain.",
  },
  HH_CR_07: {
    focus: "Date of birth and reported age do not match (or DOB is in the future).",
    avoid: "Cross-check date of birth against reported age before submitting.",
    avoidUrdu: "Date of birth aur age ko submit se pehle aapas mein cross-check karein.",
  },
  HH_CR_08: {
    focus: "A negative age was recorded for a roster or sibling member.",
    avoid: "Re-check the age entry — it can never be negative.",
    avoidUrdu: "Age dobara check karein — yeh kabhi bhi negative nahi ho sakti.",
  },
  HH_CR_11: {
    focus: "The same girl ID is linked to different names in different Household records.",
    avoid: "Confirm the girl's ID against the tracking list before submitting; one ID must always map to the same girl.",
    avoidUrdu: "Submit se pehle girl ID tracking list se confirm karein; ek ID hamesha ek hi girl ke liye honi chahiye.",
  },
  HH_CR_12: {
    focus: "days_school value is outside the valid 0-12 range.",
    avoid: "Enter days attended in the last two weeks as a number between 0 and 12 only.",
    avoidUrdu: "Pichhle do hafton ke hazri ke din sirf 0 se 12 ke darmiyan hi likhein.",
  },
  HH_CE_DAYS_SCHOOL_MISSING: {
    focus: "Girl is currently attending school but days_school is blank.",
    avoid: "When the listed girl is currently attending, always enter days attended in the last two weeks (0-12). Do not skip this question.",
    avoidUrdu:
      "Jab listed girl abhi school jati ho to pichhle do hafton mein hazri ke din (0-12) zaroor darj karein. Yeh sawal skip na karein.",
  },
  HH_CR_SCHOOLING_PARENT_MISMATCH: {
    focus: "Mother and father report different schooling status for the same girl.",
    avoid: "Ask both parents the same schooling questions carefully. Reconcile contradictions in the household before submitting mother and father forms.",
    avoidUrdu:
      "Dono parents se schooling ka sawal dhyan se poochein. Submit se pehle Mother aur Father ke jawab mein tazad reconcile karein.",
  },
  HH_CR_LISTED_GIRL_NOT_IN_ROSTER: {
    focus: "Listed girl is missing from the siblings roster.",
    avoid: "Include the listed (sample) girl in the roster first. Double-check every listed girl appears in the household members list.",
    avoidUrdu:
      "Pehle listed (sample) girl ko roster mein shamil karein. Submit se pehle confirm karein ke har listed girl household members list mein maujood hai.",
  },
  HH_CR_LISTED_GIRL_NOT_FIRST: {
    focus: "Listed girl is not recorded as the first eligible girl where required.",
    avoid: "The listed (sample) girl must always be the first entry in the household roster — place her before any other siblings.",
    avoidUrdu: "Listed girl roster mein hamesha first entry honi chahiye — usay baqi siblings se pehle likhein.",
  },
  HH_CR_TRANSPORT_MODULE_MISSING: {
    focus: "Required transport module was skipped.",
    avoid: "Complete every required module shown in the form. Do not jump ahead or leave transport questions blank when they appear.",
    avoidUrdu: "Form mein jo bhi zaroori module aaye usay poora karein. Transport ke sawalat aane par unhein skip ya khali na chhodein.",
  },
  HH_CR_LONG_DURATION: {
    focus: "Household interview ran longer than expected (critical ≥180 min, quality ≥120 min).",
    avoid:
      "Stay on protocol, avoid long idle pauses with the form open, and finish modules in one sitting when possible. Pause/resume correctly if interrupted.",
    avoidUrdu:
      "Protocol follow karein, form ko khula chhor kar lambi khamoshi na rakhein, aur mumkin ho to modules ek hi baithak mein khatam karein. Interruption ho to form sahi tarah pause/resume karein.",
  },
  HH_AN_LONG_DURATION: {
    focus: "Implausibly long household interview duration (≥120 min, escalating at 180 min).",
    avoid:
      "Stay on protocol, avoid long idle pauses with the form open, and finish modules in one sitting when possible. Pause/resume correctly if interrupted.",
    avoidUrdu:
      "Protocol follow karein, form ko khula chhor kar lambi khamoshi na rakhein, aur mumkin ho to modules ek hi baithak mein khatam karein. Interruption ho to form sahi tarah pause/resume karein.",
  },
  // Legacy alias — older error logs may still use the warning-tier rule id.
  HH_QF_LONG_DURATION_WARN: {
    focus: "Household interview ran longer than expected (critical ≥180 min, quality ≥120 min).",
    avoid:
      "Stay on protocol, avoid long idle pauses with the form open, and finish modules in one sitting when possible. Pause/resume correctly if interrupted.",
    avoidUrdu:
      "Protocol follow karein, form ko khula chhor kar lambi khamoshi na rakhein, aur mumkin ho to modules ek hi baithak mein khatam karein. Interruption ho to form sahi tarah pause/resume karein.",
  },
  HH_AN_FAST_DURATION: {
    focus: "Household interview completed at or under the minimum plausible duration for this respondent.",
    avoid: "A Household survey (Mother or Father) should never take less than 30 minutes. Take the full time needed with each respondent — do not rush through the interview.",
    avoidUrdu:
      "Household survey (Mother ho ya Father) kabhi bhi 30 minute se kam waqt mein complete nahi honi chahiye. Har respondent ke sath poora waqt lagayein, interview ko jaldi mein khatam na karein.",
  },
  HH_QF_DUMMY_ALT_PHONE: {
    focus: "Alternative contact number looks fake or placeholder.",
    avoid: "Enter a real alternate number only when one exists. Never invent digits (e.g. 0000000, 1234567).",
    avoidUrdu:
      "Sirf tab alternate number darj karein jab woh asal mein mojood ho. Kabhi bhi digits khud se na banayein (jaise 0000000, 1234567).",
  },
  HH_QF_DUMMY_NEIGHBOR_PHONE: {
    focus: "Neighbour contact number looks fake or placeholder.",
    avoid:
      "Ask the respondent for the neighbour's real number first. If a number is genuinely not available, entering zeros is acceptable — just don't invent a fake number when a real one exists.",
    avoidUrdu:
      "Neighbour se pehle asal number poochein. Agar number waqai available na ho to zeros enter kar sakte hain — lekin jab asal number mojood ho to dummy number kabhi na likhein.",
  },
  HH_QF_DUMMY_PRIMARY_PHONE: {
    focus: "Primary contact number looks fake or placeholder.",
    avoid: "Enter a real primary phone number only.",
    avoidUrdu: "Primary phone number mein sirf asal number darj karein, dummy ya placeholder number na dalein.",
  },
  HH_QF_DUMMY_PRIMARY_PHONE_2: {
    focus: "Primary contact number (confirmation field) looks fake or placeholder.",
    avoid: "Enter a real primary phone number only.",
    avoidUrdu: "Primary phone number mein sirf asal number darj karein, dummy ya placeholder number na dalein.",
  },
  HH_QF_05: {
    focus: "Grade and age combination looks implausible.",
    avoid: "Confirm the girl's age and current class with the respondent. Correct typos before submit — age and grade must make sense together.",
    avoidUrdu:
      "Girl ki age aur current class respondent se confirm karein. Submit se pehle typo theek karein — age aur grade ek dusre se mutabiq honi chahiye.",
  },
  HH_CE_FAST_10: {
    focus: "Household survey completed too quickly (critical under 10 min, quality under 15 min active duration).",
    avoid:
      "A Household survey (Mother or Father) should never take less than 30 minutes. Read questions fully and verify answers. Do not skip sections or submit incomplete interviews — review extreme cases with your supervisor.",
    avoidUrdu:
      "Household survey (Mother ho ya Father) kabhi bhi 30 minute se kam waqt mein complete nahi honi chahiye. Sawalat poore parh kar jawab verify karein. Sections skip na karein ya adhoore interview submit na karein — bohat extreme cases supervisor ke sath review karein.",
  },
  // Legacy alias — older error logs may still use the quality-tier rule id.
  HH_QF_07: {
    focus: "Household survey completed too quickly (critical under 10 min, quality under 15 min active duration).",
    avoid:
      "A Household survey (Mother or Father) should never take less than 30 minutes. Read questions fully and verify answers. Do not skip sections or submit incomplete interviews — review extreme cases with your supervisor.",
    avoidUrdu:
      "Household survey (Mother ho ya Father) kabhi bhi 30 minute se kam waqt mein complete nahi honi chahiye. Sawalat poore parh kar jawab verify karein. Sections skip na karein ya adhoore interview submit na karein — bohat extreme cases supervisor ke sath review karein.",
  },
  HH_SCHED_REQUIRED_MISSING: {
    focus: "Parent temporarily unavailable but revisit schedule was not recorded.",
    avoid: "For unavailability reasons 1, 2, or 6, record available days/hours so the team can revisit. Do not leave the schedule blank.",
    avoidUrdu:
      "Unavailability reason 1, 2 ya 6 par available din/waqt zaroor darj karein taake team dobara visit kar sake. Schedule khali na chhodein.",
  },
  HH_QF_UNAVAIL_OTHER_NO_SPECIFY: {
    focus: "Parent unavailability is Other but the specify text is blank.",
    avoid: "If you select Other, type the real reason. The team needs it to decide revisit vs permanent absence.",
    avoidUrdu: "Agar 'Other' select karein to asal wajah type karein. Team ko revisit ya permanent absence decide karne ke liye yeh zaroori hai.",
  },
  HH_QF_TIME_USE_OVER_24: {
    focus: "Yesterday's time-use activities add up to more than 24 hours.",
    avoid: "Check hours and minutes for looking-after, chores, and leisure. Totals for one day cannot exceed 24 hours.",
    avoidUrdu: "Dekh-bhal, ghar ke kaam aur aaram ke ghante/minute dhyan se check karein. Ek din ka total 24 ghante se zyada nahi ho sakta.",
  },
  HH_QF_WTP_MAX_FEE: {
    focus: "WTP fee-tier answer conflicts with the stated maximum fee.",
    avoid: "If the household would use government transport at a given monthly fee, max_fee must be at least that amount. Re-ask both questions carefully.",
    avoidUrdu:
      "Agar household government transport kisi fee par use karega, to max_fee usi amount ya us se zyada honi chahiye. Dono sawal dobara dhyan se poochein.",
  },
  HH_QF_WTP_FREE_REFUSE_MAX_FEE: {
    focus: "Household refused free transport but reported a positive max fee.",
    avoid: "If they would keep the girl home even when transport is free, max_fee should normally be 0. Confirm both answers with the respondent.",
    avoidUrdu:
      "Agar transport free hone par bhi girl ko ghar rakhenge, to max_fee aam tor par 0 honi chahiye. Dono jawab respondent se confirm karein.",
  },
  HH_QF_AGE_HEAPING: {
    focus: "Many roster ages end in 0 or 5 (possible guessing).",
    avoid: "Ask exact ages or dates of birth. Do not round ages to the nearest 5 years.",
    avoidUrdu: "Exact age ya date of birth poochein. Ages ko 5 ke qareeb round na karein.",
  },
  HH_QF_PHONE_INVALID: {
    focus: "Phone number is not a valid 11-digit number.",
    avoid: "Enter phones as 03XXXXXXXXX (11 digits). Do not leave incomplete or malformed numbers.",
    avoidUrdu: "Phone number 03XXXXXXXXX (11 digits) format mein likhein. Adhoora ya ghalat number na chhodein.",
  },
  HH_QF_ALT_PHONE_INVALID: {
    focus: "Alternative phone number is not a valid 11-digit number.",
    avoid: "Enter alternate phones as 03XXXXXXXXX, or leave blank if none exists.",
    avoidUrdu: "Alternate phone 03XXXXXXXXX format mein likhein, ya agar mojood nahi to khali chhod dein.",
  },
  HH_QF_NEIGHBOR_PHONE_INVALID: {
    focus: "Neighbour phone number is not a valid 11-digit number.",
    avoid: "Enter neighbour phones as 03XXXXXXXXX, or leave blank if none exists.",
    avoidUrdu: "Neighbour ka phone 03XXXXXXXXX format mein likhein, ya agar mojood nahi to khali chhod dein.",
  },
  HH_QF_01: {
    focus: "Household size is unusually large (over 20 members).",
    avoid: "Double-check the roster count when a household seems very large — confirm every member actually lives there.",
    avoidUrdu: "Household bohat bara lagay to roster dobara check karein — confirm karein ke har member waqai wahan rehta hai.",
  },
  HH_QF_02: {
    focus: "Household reports no electricity but owns a power-dependent asset with no alternate power source noted.",
    avoid: "When a household has no electricity, check carefully how they power such assets and record the alternate source.",
    avoidUrdu: "Agar ghar mein bijli nahi hai to us jaisay asset ko chalane ka zariya (alternate power) zaroor poochein aur darj karein.",
  },
  HH_QF_06: {
    focus: "Respondent role is recorded as 'child' even though an adult exists in the roster.",
    avoid: "Prefer interviewing an available adult household member as the respondent.",
    avoidUrdu: "Jab ghar mein koi balig mojood ho to respondent unhi ko banayein, bacche ko nahi.",
  },
  HH_QF_EDU_SPEND_OUTLIER: {
    focus:
      "This household's education expenditure for a sibling is far above the normal range (statistical outlier, roughly above 20,000 PKR).",
    avoid:
      "Before entering the amount, confirm the currency and time period (monthly or yearly) with the respondent, then repeat the number back to confirm it.",
    avoidUrdu:
      "Amount darj karne se pehle respondent se currency aur time period (mahana ya salana) clear karein, phir amount zaban se repeat kar ke confirm karein.",
  },
  HH_QF_LISTED_GIRL_SPELLING: {
    focus: "The listed girl's name in the roster and in the girl-label field are spelled differently.",
    avoid:
      "The listed girl's name spelling must exactly match the name you received from tracking — do not respell it differently on the roster or girl form.",
    avoidUrdu:
      "Listed girl ki naam ki spelling bilkul wahi honi chahiye jo tracking se mili thi. Roster aur girl form dono mein tracking wali spelling hi use karein, alag tarah se na likhein.",
  },
  HH_QF_SMALL_HOUSEHOLD: {
    focus: "Very few members (2 or fewer) were listed in the household roster.",
    avoid: "Include every household member in the roster, from the youngest to the oldest — do not miss anyone.",
    avoidUrdu:
      "Roster complete karte waqt ghar ke har fard ko shamil karein, bache se le kar bujurg tak. Koi bhi member chootna nahi chahiye.",
  },
  HH_QF_HIGH_DK_REFUSE: {
    focus: "This enumerator's rate of 'Don't Know'/refused answers is much higher than the team's.",
    avoid: "Probe respondents patiently for a real answer before recording Don't Know or Refused.",
    avoidUrdu: "Jawab record karne se pehle respondent se sabar ke sath dobara poochein, foran Don't Know ya Refused na likhein.",
  },
  HH_QF_04: {
    focus: "Dummy or placeholder identity/location darj karna",
    avoid: "Enter every respondent's real, complete name and location.",
    avoidUrdu: "Har respondent ka poora aur sahi naam aur sahi location darj karein.",
  },
  HH_QF_03: {
    focus: "Dummy or placeholder name darj karna",
    avoid: "Ask for and record the respondent's real, complete name in the roster.",
    avoidUrdu: "Roster mein asal naam likhein, abc/xyz na likhein.",
  },
  HH_DUP_BOTH_PARENTS: {
    focus: "Household duplicated for both the Father and Mother respondent.",
    avoid:
      "Do not re-submit an interview that already exists for either parent. Keep the latest complete KEY per respondent and void the rest after supervisor review.",
    avoidUrdu:
      "Aisi interview dobara submit na karein jo Father ya Mother, kisi ke bhi liye pehle se mojood ho. Har girl ka sirf ek complete KEY rakhein, baqi supervisor review ke baad void karein.",
  },
  HH_DUP_FATHER: {
    focus: "Father household survey duplicated for this girl (Mother not duplicated).",
    avoid: "Do not re-submit the Father interview. Keep the latest complete KEY and void the rest after supervisor review.",
    avoidUrdu: "Father ka interview dobara submit na karein. Sirf latest complete KEY rakhein, baqi supervisor review ke baad void karein.",
  },
  HH_DUP_MOTHER: {
    focus: "Mother household survey duplicated for this girl (Father not duplicated).",
    avoid: "Do not re-submit the Mother interview. Keep the latest complete KEY and void the rest after supervisor review.",
    avoidUrdu: "Mother ka interview dobara submit na karein. Sirf latest complete KEY rakhein, baqi supervisor review ke baad void karein.",
  },
  HH_CR_INCOMPLETE_SUPERSEDED: {
    focus:
      "A blank-respondent record shares identity/location with another submission for the same household — likely an abandoned or incomplete attempt.",
    avoid:
      "Always select a respondent (Father/Mother) before submitting. If a form is abandoned mid-way, do not leave it as a separate incomplete record once the household has been properly interviewed.",
    avoidUrdu:
      "Submit karne se pehle hamesha respondent (Father/Mother) select karein. Agar form beech mein chhoot jaye to household ka interview mukammal hone ke baad usay alag adhoore record ki soorat mein na chhodein.",
  },
  HH_DUP_OTHER: {
    focus: "Duplicate household record where the respondent (Father/Mother) could not be determined.",
    avoid: "Confirm the respondent for each copy, keep the latest complete KEY, and void the rest after supervisor review.",
    avoidUrdu: "Har copy ka respondent confirm karein, sirf latest complete KEY rakhein aur baqi supervisor review ke baad void karein.",
  },
  HH_CR_13: {
    focus: "Parent age is unrealistically low.",
    avoid: "Re-check parent date of birth / age with the household. Fix entry errors before submitting.",
    avoidUrdu: "Parent ki date of birth/age household se dobara confirm karein. Submit se pehle entry ki ghalti theek karein.",
  },
  HH_CR_GPS_OUT_OF_DISTRICT: {
    focus: "Household-interview GPS is outside the assigned district (including Mansehra).",
    avoid: "Capture GPS at the household. Do not delete and re-type forms from another district.",
    avoidUrdu: "GPS household par hi capture karein. Doosre district se form delete kar ke dobara type na karein.",
  },
  HH_CR_GPS_JUMP: {
    focus: "GPS moved a long distance during the same household interview.",
    avoid: "Finish the household form at the house. Do not continue it after travelling away.",
    avoidUrdu: "Household ka form ghar par hi complete karein. Ghar se bahar ja kar interview continue na karein.",
  },
  HH_CR_GPS_REMOTE_FROM_VILLAGE: {
    focus: "This household's GPS point is far (2km+) from the village's other interviews.",
    avoid: "Confirm you are at the correct household before capturing GPS, and wait for a proper signal.",
    avoidUrdu: "GPS lene se pehle confirm karein ke aap sahi household mein hain, aur sahi signal aane tak wait karein.",
  },
  HH_QF_GPS_VILLAGE_CLUSTER: {
    focus: "The same household GPS point is stored under many village names.",
    avoid: "Choose the village that matches the household you are in. Confirm the GPS reading before submit.",
    avoidUrdu: "Jis household mein hain usi ke mutabiq sahi village select karein. Submit se pehle GPS reading confirm karein.",
  },
  HH_QF_GPS_MISSING: {
    focus: "No auto-captured GPS point is stored on this Household form (tablet location was likely off).",
    avoid: "Turn on the tablet's GPS setting before starting every interview. Confirm a location signal is present before beginning the form.",
    avoidUrdu:
      "Har interview shuru karne se pehle tablet ki GPS setting ON karein. Confirm karein ke location signal mil raha hai, tab hi form shuru karein.",
  },
  HH_QF_CONSENT_SPEED: {
    focus: "Household consent screens triggered SurveyCTO speed warnings.",
    avoid:
      "Read the consent script when those screens are open. Spend at least 10 seconds on each consent screen — do not tap understand/agree faster than that.",
    avoidUrdu:
      "Consent screen khulte hi script parh kar sunayein. Har consent screen par kam az kam 10 second zaroor dein, is se jaldi tap na karein.",
  },
  HH_QF_SPEED_WARNINGS: {
    focus: "This household interview has a very high SurveyCTO speed-warning count.",
    avoid: "Read questions fully. High speed-warning counts mean too many items were on screen for under about two seconds.",
    avoidUrdu:
      "Sawalat poore parh kar poochein. Zyada speed-warning ka matlab hai bohat se sawal do second se kam waqt mein screen par rahe.",
  },
  HH_QF_LATE_NIGHT: {
    focus: "Household interview started late at night.",
    avoid: "Interview during agreed field hours. Phone or midnight household interviews were not an approved method.",
    avoidUrdu: "Interview mutayyen field hours mein hi karein. Phone ya raat ko household interview approved method nahi tha.",
  },
  HH_QF_TIMESTAMP_YEAR: {
    focus: "Household start/end time has an impossible year.",
    avoid: "Check tablet date/time before every interview.",
    avoidUrdu: "Har interview se pehle tablet ki date/time zaroor check karein.",
  },
  HH_CR_REENUM_COMPLETED: {
    focus: "A different enumerator re-interviewed a household that was already completed.",
    avoid: "Do not re-enter another enumerator's completed household (including by phone). Supervisor-approved corrections only.",
    avoidUrdu:
      "Kisi doosre enumerator ka mukammal household (phone ke zariye bhi) dobara enter na karein. Sirf supervisor-approved correction hi karein.",
  },
  HH_QF_LATE_REINTERVIEW: {
    focus: "Late-night re-interview of a household that was already completed.",
    avoid: "Do not reopen completed households at night. If the roster was incomplete, the supervisor must assign the correction.",
    avoidUrdu: "Raat ko mukammal households dobara open na karein. Agar roster adhoora tha to correction supervisor hi assign karega.",
  },
  HH_ENUM_NONCONSENT_GT5: {
    focus: "This enumerator has an unusually high number of explicit non-consent interviews.",
    avoid: "Read the consent script fully and address respondent concerns before recording a refusal.",
    avoidUrdu: "Consent script poori tarah parhein aur respondent ke sawalat ka jawab dein, jaldi se refusal record na karein.",
  },
  HH_AVAIL_RESP_MISMATCH_FATHER: {
    focus: "Availability was marked for the father, but the respondent/consent fields indicate the mother actually answered.",
    avoid: "Make sure the availability answer and the actual respondent match — record whichever parent truly answered.",
    avoidUrdu: "Availability ka jawab aur asal respondent mutabiq hone chahiye — jo parent waqai jawab de raha hai wahi darj karein.",
  },
  HH_AVAIL_RESP_MISMATCH_MOTHER: {
    focus: "Availability was marked for the mother, but the respondent/consent fields indicate the father actually answered.",
    avoid: "Make sure the availability answer and the actual respondent match — record whichever parent truly answered.",
    avoidUrdu: "Availability ka jawab aur asal respondent mutabiq hone chahiye — jo parent waqai jawab de raha hai wahi darj karein.",
  },
  HH_NONE_AVAILABLE_BUT_PARENT_CONSENT: {
    focus: "Both parents were marked unavailable, yet a parent consent field is filled.",
    avoid: "If neither parent is available, leave the parent consent fields blank rather than filling them in.",
    avoidUrdu: "Agar dono parents available nahi hain to parent consent fields khali chhodein, unhein bharein na.",
  },
  HH_SCHED_SHOULD_NOT_EXIST: {
    focus: "A revisit schedule was recorded even though the unavailability reason does not call for one.",
    avoid: "Only record a revisit schedule for the unavailability reasons that require it.",
    avoidUrdu: "Revisit schedule sirf un unavailability reasons ke liye darj karein jinke liye yeh zaroori hai.",
  },
  HH_MISSED_FOLLOWUP: {
    focus: "The scheduled revisit date has passed and this parent's survey is still missing.",
    avoid: "Track scheduled revisit dates and complete the follow-up visit on time.",
    avoidUrdu: "Scheduled revisit dates ko track karein aur waqt par follow-up visit complete karein.",
  },
  // ---- Girls (GL_) ----
  GL_CE_00: {
    focus: "Girl age is outside the expected 10-17 range.",
    avoid: "Confirm age and date of birth carefully. If the girl is outside the eligible range, follow supervisor guidance instead of forcing an in-range value.",
    avoidUrdu:
      "Age aur date of birth dhyan se confirm karein. Agar girl eligible range se bahar hai to force kar ke range mein value dalne ke bajaye supervisor guidance follow karein.",
  },
  GL_CE_06: {
    focus: "Girl is enrolled but both school ID and school name are missing.",
    avoid: "When a girl is enrolled, always record her school ID and school name.",
    avoidUrdu: "Jab girl enrolled ho to uska school ID aur school ka naam zaroor darj karein.",
  },
  GL_CE_09: {
    focus: "Recorded marriage age is greater than the girl's current age.",
    avoid: "Confirm both current age and marriage age with the respondent — marriage age cannot exceed current age.",
    avoidUrdu: "Current age aur marriage age dono respondent se confirm karein — marriage age current age se zyada nahi ho sakti.",
  },
  GL_CE_10: {
    focus: "Recorded marriage age is negative or implausibly low.",
    avoid: "Re-check the marriage age with the respondent before entering it.",
    avoidUrdu: "Marriage age darj karne se pehle respondent se dobara confirm karein.",
  },
  GL_CE_12: {
    focus: "Village ID is missing.",
    avoid: "Always select the correct village ID before submitting.",
    avoidUrdu: "Submit se pehle sahi village ID zaroor select karein.",
  },
  GL_CE_13: {
    focus: "Girl ID is missing.",
    avoid: "Always select/enter the correct girl ID before submitting.",
    avoidUrdu: "Submit se pehle sahi girl ID zaroor darj karein.",
  },
  GL_CE_15: {
    focus: "Marital status code is outside the valid set of options.",
    avoid: "Select marital status only from the valid listed options.",
    avoidUrdu: "Marital status sirf diye gaye valid options mein se hi select karein.",
  },
  GL_CE_DIST_NEG: {
    focus: "Distance to school (how_far) is recorded as negative.",
    avoid: "Re-check and enter the actual distance to school as a positive number.",
    avoidUrdu: "School ka fasla dobara check kar ke sahi (positive) number mein likhein.",
  },
  GL_CE_INCOME_NEG: {
    focus: "Monthly income is recorded as negative.",
    avoid: "Re-check and enter the actual monthly income as a positive number.",
    avoidUrdu: "Mahana amdani dobara check kar ke sahi (positive) number mein likhein.",
  },
  GL_CE_TEACHER_OTHER_NO_NAME: {
    focus: "Teacher type is Other but the teacher's name is missing.",
    avoid: "When selecting Other for teacher type, always write the teacher's actual name.",
    avoidUrdu: "Teacher type mein 'Other' select karte waqt teacher ka asal naam zaroor likhein.",
  },
  GL_CE_TEST_PHOTO_MISSING: {
    focus: "The reading test was administered but no photo was uploaded.",
    avoid: "Always take and upload the required photo after administering the reading test.",
    avoidUrdu: "Reading test lene ke baad zaroori photo zaroor lein aur upload karein.",
  },
  GL_CE_TIME_NEG: {
    focus: "The interview's end time is before its start time.",
    avoid: "Check the tablet's date and time before starting, so start/end times are recorded correctly.",
    avoidUrdu: "Interview shuru karne se pehle tablet ki date aur time check karein, taake start/end time sahi record ho.",
  },
  GL_CE_FAST_10: {
    focus: "Girls interview completed too quickly (critical under 10 min, quality under 15 min) despite reading/math modules.",
    avoid:
      "A Girls survey should never take less than 15 minutes. Allow enough time for reading passages and math questions. Do not skip test modules or rush consent/demographics.",
    avoidUrdu:
      "Girls survey kabhi bhi 15 minute se kam waqt mein complete nahi honi chahiye. Reading passage aur math sawalat ke liye poora waqt dein. Test modules skip na karein ya consent/demographics jaldi mein na karein.",
  },
  // Legacy alias — older error logs may still use the quality-tier rule id.
  GL_QF_10: {
    focus: "Girls interview completed too quickly (critical under 10 min, quality under 15 min) despite reading/math modules.",
    avoid:
      "A Girls survey should never take less than 15 minutes. Allow enough time for reading passages and math questions. Do not skip test modules or rush consent/demographics.",
    avoidUrdu:
      "Girls survey kabhi bhi 15 minute se kam waqt mein complete nahi honi chahiye. Reading passage aur math sawalat ke liye poora waqt dein. Test modules skip na karein ya consent/demographics jaldi mein na karein.",
  },
  GL_AN_FAST_DURATION: {
    focus: "Girls interview completed at or under the minimum plausible duration.",
    avoid: "A Girls survey should never take less than 15 minutes. Give reading and math modules their full time — do not rush the interview.",
    avoidUrdu:
      "Girls survey kabhi bhi 15 minute se kam waqt mein complete nahi honi chahiye. Reading aur math modules ko poora waqt dein, interview jaldi mein khatam na karein.",
  },
  GL_QF_CONSENT_PARENT_UNDERSTAND: {
    focus: "Parental consent was agreed, but the understanding confirmation is missing.",
    avoid: "After the parent agrees to consent, also confirm and record that they understood it.",
    avoidUrdu: "Parent ke consent dene ke baad yeh bhi confirm karein aur darj karein ke unhein consent samajh aaya.",
  },
  GL_QF_CONSENT_PARENT_COPY: {
    focus: "Parental consent was agreed, but the consent copy confirmation is missing.",
    avoid: "After the parent agrees to consent, record whether a copy was offered/accepted.",
    avoidUrdu: "Parent ke consent dene ke baad consent ki copy offer/accept hone ka jawab bhi zaroor darj karein.",
  },
  GL_CE_CONSENT_CHILD: {
    focus: "Girl is available but child consent was not confirmed.",
    avoid: "When the girl is home, complete child consent. If she refuses, mark the survey Incomplete — do not continue as Complete.",
    avoidUrdu: "Jab girl ghar par ho to child consent zaroor complete karein. Agar woh inkar kare to survey ko Complete ki bajaye Incomplete mark karein.",
  },
  GL_CE_CONSENT_REFUSED_COMPLETE: {
    focus: "Consent was refused but the Girls survey was marked Complete.",
    avoid: "If parental or child consent is refused, survey_status must be Incomplete per Girls Survey Instructions.",
    avoidUrdu: "Agar parental ya child consent refuse ho, to Girls Survey Instructions ke mutabiq survey_status Incomplete honi chahiye.",
  },
  GL_CE_GRADE_MISSING: {
    focus: "Girl is currently studying but grade is missing.",
    avoid: "If currently_studying = Yes, always enter the current grade before submit.",
    avoidUrdu: "Agar currently_studying=Yes hai to submit se pehle current grade zaroor likhein.",
  },
  GL_CE_TRANSPORT_INCOMPLETE: {
    focus: "Girl is currently studying but distance/transport fields are blank.",
    avoid: "For girls in school, complete how_far and mode_transport. These are required for commuting analysis.",
    avoidUrdu: "School jane wali girls ke liye how_far aur mode_transport zaroor complete karein. Yeh commuting analysis ke liye zaroori hain.",
  },
  GL_SCHED_REQUIRED_MISSING: {
    focus: "Girl temporarily unavailable but revisit schedule was not recorded.",
    avoid: "If she is gone to school or temporarily unavailable (reason 1 or 4), record available days/hours for revisit.",
    avoidUrdu: "Agar girl school gayi hui ho ya temporarily unavailable ho (reason 1 ya 4), to revisit ke liye available din/waqt darj karein.",
  },
  GL_QF_CONSENT_CHILD_UNDERSTAND: {
    focus: "Child consent agreed but understand confirmation is missing.",
    avoid: "After agreement, confirm that the girl understood the consent statement.",
    avoidUrdu: "Consent agree hone ke baad confirm karein ke girl ne consent statement samajh liya.",
  },
  GL_QF_CONSENT_CHILD_COPY: {
    focus: "Child consent agreed but copy confirmation is missing.",
    avoid: "Record whether a consent copy was offered/accepted after the girl agrees.",
    avoidUrdu: "Girl ke agree karne ke baad record karein ke consent ki copy offer/accept hui ya nahi.",
  },
  GL_QF_UNAVAIL_OTHER_NO_SPECIFY: {
    focus: "Girl unavailability is Other but specify text is blank.",
    avoid: "If reason is Other, type the actual reason so supervisors can decide on revisits.",
    avoidUrdu: "Agar reason 'Other' hai to asal wajah type karein taake supervisor revisit decide kar sakein.",
  },
  GL_QF_TIME_USE_OVER_24: {
    focus: "Yesterday's time-use activities add up to more than 24 hours.",
    avoid: "Check hours and minutes carefully. Looking-after + chores + leisure cannot exceed 24 hours in one day.",
    avoidUrdu: "Ghante aur minute dhyan se check karein. Dekh-bhal + ghar ke kaam + aaram ek din mein 24 ghante se zyada nahi ho sakte.",
  },
  GL_QF_HARASSMENT_NOT_PRIVATE: {
    focus: "Harassment module was conducted with siblings, father, or other adults present.",
    avoid: "Mother, other kids, or no one else present are fine for harassment questions — but ask siblings, father, or other adults to step out before that section.",
    avoidUrdu:
      "Harassment sawalat ke doran maa, doosre bache, ya koi bhi mojood na hona theek hai — lekin bhai behnon, walid, ya doosre bare afraad se yeh section shuru karne se pehle bahar jane ki request karein.",
  },
  GL_QF_TRAVEL_TIME_DISTANCE: {
    focus: "Travel time to school does not match reported distance.",
    avoid: "Re-check how far the school is and how long the trip takes. Extreme mismatches usually mean a typing error.",
    avoidUrdu: "School kitni door hai aur safar mein kitna waqt lagta hai dobara check karein. Bara mismatch aksar typing ki ghalti hoti hai.",
  },
  GL_CE_14: {
    focus: "Duplicate Girls record for the same girl in the same village.",
    avoid: "Do not submit the same girl twice. Retain the latest complete KEY and void earlier duplicates after supervisor review.",
    avoidUrdu: "Ek hi girl ko dobara submit na karein. Latest complete KEY rakhein aur pehle wale duplicates supervisor review ke baad void karein.",
  },
  GL_CE_DUP_GIRL_ID: {
    focus: "Same girl ID appears in Girls survey more than once across villages.",
    avoid: "Confirm the correct village and girl ID before submit. Retain one KEY after supervisor review.",
    avoidUrdu: "Submit se pehle sahi village aur girl ID confirm karein. Supervisor review ke baad sirf ek KEY rakhein.",
  },
  GL_CE_DUP_GIRL_MISMATCH: {
    focus: "Duplicate girl ID with conflicting name/village/age across Girls submissions.",
    avoid: "Fix identity fields so one girl ID maps to one identity. Retain the latest correct KEY after supervisor review.",
    avoidUrdu: "Identity fields theek karein taake ek girl ID sirf ek hi identity se mutabiq ho. Supervisor review ke baad latest sahi KEY rakhein.",
  },
  GL_DUP_GIRLS_SURVEY: {
    focus: "This Girls survey duplicates another submission for the same girl.",
    avoid: "Do not resubmit the same girl's Girls survey. Keep the latest complete KEY and void the rest after supervisor review.",
    avoidUrdu: "Ek hi girl ka Girls survey dobara submit na karein. Sirf latest complete KEY rakhein, baqi supervisor review ke baad void karein.",
  },
  HVG_QF_IDENTITY_MISMATCH: {
    focus: "Girl name in Household does not match Girls survey for the same girl ID.",
    avoid: "Confirm the girl's name against the tracking list before submit. Align Household and Girls identity fields.",
    avoidUrdu: "Submit se pehle girl ka naam tracking list se confirm karein. Household aur Girls survey ki identity fields ek jaisi rakhein.",
  },
  GL_QF_08: {
    focus: "Transport mode is Other but the specify details are missing.",
    avoid: "When selecting Other for transport, always write the actual mode used.",
    avoidUrdu: "Transport mode mein 'Other' select karte waqt asal tareeqa likhein.",
  },
  GL_QF_12: {
    focus: "Reported working hours per week are unusually high.",
    avoid: "Confirm working hours carefully with the respondent — do not overstate them.",
    avoidUrdu: "Kaam ke ghante respondent se dhyan se confirm karein, ghalat ya barha kar na likhein.",
  },
  GL_QF_13: {
    focus: "A months value is out of the valid range.",
    avoid: "Enter months between valid limits only (e.g. 0-11 where applicable). Check for typos.",
    avoidUrdu: "Months ki value sirf valid range mein hi likhein (jaise 0-11 jahan applicable ho). Typo check karein.",
  },
  GL_QF_30: {
    focus: "Village ID is present but the village label/name is missing.",
    avoid: "Always fill in the village name alongside its ID.",
    avoidUrdu: "Village ID ke sath uska naam bhi zaroor likhein.",
  },
  GL_QF_31: {
    focus: "Girl ID is present but the girl's name label is missing.",
    avoid: "Always fill in the girl's name alongside her ID.",
    avoidUrdu: "Girl ID ke sath uska naam bhi zaroor likhein.",
  },
  GL_QF_32: {
    focus: "Girl's age is under 10 but her marital status is married-type.",
    avoid: "Re-confirm both age and marital status with the respondent when they seem inconsistent.",
    avoidUrdu: "Age aur marital status mein tazad lagay to dono respondent se dobara confirm karein.",
  },
  GL_QF_34: {
    focus: "Class size is not a number.",
    avoid: "Enter class size as a plain number only.",
    avoidUrdu: "Class size sirf number ki soorat mein likhein.",
  },
  GL_QF_35: {
    focus: "Class size is zero or negative.",
    avoid: "Enter the real number of students in the class. Never use 0 or negative values as placeholders.",
    avoidUrdu: "Class mein asal students ki tadad likhein. Placeholder ke tor par kabhi 0 ya negative value na likhein.",
  },
  GL_QF_36: {
    focus: "Class size is unusually high.",
    avoid: "Confirm the real class size with the teacher/school before entering it.",
    avoidUrdu: "Class size darj karne se pehle teacher/school se asal tadad confirm karein.",
  },
  GL_QF_DIST_MODE: {
    focus: "Distance to school is 0 but transport mode suggests travel.",
    avoid: "Keep distance and transport mode consistent — if there's real travel, distance should not be 0.",
    avoidUrdu: "Fasla aur transport mode mutabiq rakhein — agar safar ho raha hai to fasla 0 nahi hona chahiye.",
  },
  GL_QF_DUMMY: {
    focus: "Text in a name/village/teacher/school/comment field looks like placeholder/dummy text.",
    avoid: "Always write real information in these fields — never test or placeholder text.",
    avoidUrdu: "In fields mein hamesha asal maloomat likhein, kabhi test ya placeholder text na dalein.",
  },
  GL_QF_DUMMY_PRIMARY_PHONE: {
    focus: "Primary phone number looks fake or placeholder.",
    avoid: "Enter a real primary phone number only.",
    avoidUrdu: "Primary phone number mein sirf asal number darj karein.",
  },
  GL_QF_READING_ENUM_DISTRIBUTION: {
    focus: "This enumerator's reading-test scores deviate significantly from the team average.",
    avoid: "Administer and mark the reading test exactly per protocol, consistent with the rest of the team.",
    avoidUrdu: "Reading test protocol ke mutabiq hi administer aur mark karein, team ke tareeqe se mutabiq rakhein.",
  },
  GL_CE_READING_INCONSISTENT: {
    focus: "Reading-test word marks, last_word, and incorrect total do not agree.",
    avoid:
      "Mark each story word as the girl reads. last_word must be the last word she attempted, and incorrect must equal the number of words marked Incorrect. Do not tap through the test.",
    avoidUrdu:
      "Girl jaise jaise lafz parhe, ussi waqt mark karein. last_word wahi hona chahiye jahan girl ruki, aur incorrect ki tadad Incorrect mark hue lafzon ke barabar honi chahiye. Test bina administer kiye mark na karein.",
  },
  GL_CE_GPS_OUT_OF_DISTRICT: {
    focus: "Girls-interview GPS is outside the assigned district (including Mansehra).",
    avoid: "Complete the form at the interview location. Do not delete and re-enter forms from another district. Confirm GPS is on before starting.",
    avoidUrdu:
      "Interview location par hi form complete karein. Doosre district se form delete kar ke dobara enter na karein. Shuru karne se pehle GPS on confirm karein.",
  },
  GL_CE_GPS_JUMP: {
    focus: "GPS moved a long distance during the same Girls interview.",
    avoid: "Stay on site until submit. Do not continue or finish the form after travelling to another location.",
    avoidUrdu: "Submit tak wahin ruke rahein. Doosri jagah ja kar form continue ya complete na karein.",
  },
  GL_CE_GPS_REMOTE_FROM_VILLAGE: {
    focus: "This Girls interview's GPS point is far from the village's other interviews.",
    avoid: "Confirm you are at the correct location before capturing GPS.",
    avoidUrdu: "GPS lene se pehle confirm karein ke aap sahi jagah par hain.",
  },
  GL_QF_GPS_VILLAGE_CLUSTER: {
    focus: "The same GPS point is recorded under many different village names.",
    avoid: "Select the correct village for the household you are in. Do not reuse a previous GPS/village combination.",
    avoidUrdu: "Jis household mein hain uske mutabiq sahi village select karein. Pichli GPS/village combination dobara use na karein.",
  },
  GL_QF_GPS_MISSING: {
    focus: "No auto-captured GPS point is stored on this Girls form (tablet location was likely off).",
    avoid: "Turn on the tablet's GPS setting before starting every interview. Confirm a location signal is present before beginning the form.",
    avoidUrdu:
      "Har interview shuru karne se pehle tablet ki GPS setting ON karein. Confirm karein ke location signal mil raha hai, tab hi form shuru karein.",
  },
  GL_QF_HIGH_DK_REFUSE: {
    focus: "This enumerator's rate of 'Don't Know'/refused answers is much higher than the team's.",
    avoid: "Probe respondents patiently for a real answer before recording Don't Know or Refused.",
    avoidUrdu: "Jawab record karne se pehle respondent se sabar ke sath dobara poochein, foran Don't Know ya Refused na likhein.",
  },
  GL_QF_CONSENT_SPEED: {
    focus: "Parental and child consent screens triggered SurveyCTO speed warnings.",
    avoid:
      "When the consent screens appear, read the scripts aloud. Spend at least 10 seconds on each consent screen — do not tap through faster than that even if consent was discussed earlier.",
    avoidUrdu:
      "Jab consent screens aayen to script zaban se parhein. Har consent screen par kam az kam 10 second zaroor dein, consent pehle discuss ho chuka ho tab bhi is se jaldi tap na karein.",
  },
  GL_QF_SPEED_WARNINGS: {
    focus: "This Girls interview has a very high SurveyCTO speed-warning count.",
    avoid: "Leave each question on screen long enough to read it. Rushing produces speed warnings and weak learning-test data.",
    avoidUrdu: "Har sawal screen par itni dair rakhein ke parha ja sake. Jaldbazi speed warnings aur kamzor learning-test data deti hai.",
  },
  GL_QF_LATE_NIGHT: {
    focus: "Girls interview started late at night.",
    avoid: "Interview during agreed field hours. Do not complete or re-enter Girls forms by phone at night unless a supervisor approved it.",
    avoidUrdu: "Interview mutayyen field hours mein karein. Raat ko phone se ya dobara Girls forms complete na karein jab tak supervisor approve na kare.",
  },
  GL_QF_TIMESTAMP_YEAR: {
    focus: "Tablet start/end time has an impossible year.",
    avoid: "Set the tablet date and time correctly before starting any interview.",
    avoidUrdu: "Koi bhi interview shuru karne se pehle tablet ki date aur time sahi set karein.",
  },
  GL_CE_REENUM_COMPLETED: {
    focus: "A second enumerator re-interviewed a girl who was already surveyed.",
    avoid: "Do not re-enter another enumerator's completed Girls form. If a correction is needed, the supervisor must assign it.",
    avoidUrdu: "Doosre enumerator ka mukammal Girls form dobara enter na karein. Correction zaroori ho to sirf supervisor hi assign kare.",
  },
  GL_QF_LATE_REINTERVIEW: {
    focus: "Late-night re-interview of a girl who already had a completed survey.",
    avoid: "Do not reopen completed Girls cases at night. Corrections go through the supervisor, not a second midnight form.",
    avoidUrdu: "Raat ko mukammal Girls cases dobara open na karein. Correction supervisor ke zariye hi ho, doosri midnight form se nahi.",
  },

  // ---- Household vs Girls cross-checks ----
  HVG_CE_01: {
    focus: "Household is completed for this girl, but no Girls record exists at all.",
    avoid: "After completing the Household interview, make sure the Girls interview is also conducted for the same girl.",
    avoidUrdu: "Household interview complete karne ke baad usi girl ka Girls interview bhi zaroor conduct karein.",
  },
  HVG_FL_01: {
    focus: "Household is completed but the Girls interview is not yet due (tracking attempts under 3).",
    avoid: "Continue tracking attempts for this girl until the Girls interview can be completed.",
    avoidUrdu: "Is girl ke liye tracking attempts jari rakhein taake Girls interview complete ho sake.",
  },
  GVH_CE_01: {
    focus: "Household survey missing after conducted girls interview",
    avoid: "Complete the Household survey for every girl whose Girls interview has been conducted.",
    avoidUrdu: "Jis girl ka Girls interview ho chuka hai uska Household survey bhi zaroor complete karein.",
  },
  HVG_CE_GPS_MISMATCH: {
    focus: "Mother's Household GPS and Girls GPS for the same girl are far apart (500m+).",
    avoid: "Capture GPS at the actual interview location every time, for both surveys.",
    avoidUrdu: "Har interview ke waqt GPS asal location par hi capture karein, dono surveys ke liye.",
  },
};

const PREFIX_GUIDANCE: { prefix: string; guidance: RuleGuidance }[] = [
  {
    prefix: "TRK_CE_",
    guidance: {
      focus: "Critical tracking completeness issue — data needed for follow-up is incomplete.",
      avoid: "Before leaving the household, check that required tracking fields (phone, status, attempts) are filled correctly.",
      avoidUrdu: "Ghar chhorne se pehle zaroori tracking fields (phone, status, attempts) sahi tarah bhar chuke hon, yeh check karein.",
    },
  },
  {
    prefix: "TRK_QF_DUP",
    guidance: {
      focus: "Possible duplicate tracking records.",
      avoid: "Always search existing cases before creating a new submission for the same girl.",
      avoidUrdu: "Naya submission banane se pehle hamesha existing cases mein dhoondh lein.",
    },
  },
  {
    prefix: "TRK_QF_DUMMY",
    guidance: {
      focus: "Placeholder or dummy text in tracking fields.",
      avoid: "Use real, specific information only. Never submit test or filler text.",
      avoidUrdu: "Sirf asal, specific maloomat darj karein. Test ya filler text kabhi submit na karein.",
    },
  },
  {
    prefix: "TRK_QF_",
    guidance: {
      focus: "Tracking quality concern that needs review.",
      avoid: "Slow down on identity checks, phones, and outcomes. Quality flags usually mean rushed or incomplete entries.",
      avoidUrdu: "Identity, phone number aur outcome par dhyan dein. Quality flags aksar jaldbazi ya adhoori entry ki wajah se aati hain.",
    },
  },
  {
    prefix: "TRK_HH_CR_",
    guidance: {
      focus: "Tracking and household linkage problem.",
      avoid: "Keep tracking and household work in sync — a successful track should be followed by a complete HH where required.",
      avoidUrdu: "Tracking aur household ka kaam sath sath rakhein — successful track ke baad zaroorat ho to household bhi complete karein.",
    },
  },
  {
    prefix: "HH_CR_",
    guidance: {
      focus: "Critical household data integrity issue.",
      avoid: "Complete all required HH modules, keep mother/father answers consistent, and include the listed girl in the roster.",
      avoidUrdu: "HH ke tamam zaroori modules complete karein, mother/father ke jawab mutabiq rakhein, aur listed girl ko roster mein shamil karein.",
    },
  },
  {
    prefix: "HH_QF_DUMMY",
    guidance: {
      focus: "Dummy/placeholder contact details in the household form.",
      avoid: "Only enter real phone numbers. Leave blank if no contact is available.",
      avoidUrdu: "Household form mein sirf asal phone numbers darj karein. Contact mojood na ho to khali chhod dein.",
    },
  },
  {
    prefix: "HH_QF_",
    guidance: {
      focus: "Household quality flag for review.",
      avoid: "Check ages, grades, durations, and contacts before submit. Fix inconsistencies in the field when possible.",
      avoidUrdu: "Submit se pehle ages, grades, duration aur contacts check karein. Field mein hi inconsistencies theek karein.",
    },
  },
  {
    prefix: "GL_CE_",
    guidance: {
      focus: "Critical girls-survey integrity issue.",
      avoid: "Verify age, IDs, and required girl fields carefully before ending the interview.",
      avoidUrdu: "Interview khatam karne se pehle age, IDs aur zaroori girl fields dhyan se verify karein.",
    },
  },
  {
    prefix: "GL_QF_",
    guidance: {
      focus: "Girls-survey quality concern.",
      avoid: "Avoid rushing; check numeric ranges (age, months, class size) and complete each section fully.",
      avoidUrdu: "Jaldbazi na karein; numeric ranges (age, months, class size) check karein aur har section poora karein.",
    },
  },
];

const FALLBACK: RuleGuidance = {
  focus: "This rule flagged a data-quality problem that needs field correction.",
  avoid:
    "Open the error message for this record, correct the field in a revisit or new submission as instructed by your supervisor, and double-check similar cases before submitting.",
  avoidUrdu:
    "Is record ka error message khol kar dekhein, supervisor ki hidayat ke mutabiq field mein correction ya nayi entry karein, aur aainda aise cases dobara check kar ke submit karein.",
};

export function getRuleGuidance(ruleId: string): RuleGuidance {
  const id = (ruleId || "").trim();
  if (!id) return FALLBACK;
  if (RULE_GUIDANCE[id]) return RULE_GUIDANCE[id];

  for (const { prefix, guidance } of PREFIX_GUIDANCE) {
    if (id.startsWith(prefix)) return guidance;
  }

  return FALLBACK;
}
