/**
 * Field-facing guidance for DQA rule IDs.
 * Used on the district Error Analytics page so supervisors/enumerators
 * know what to fix first and how to avoid repeating the issue.
 */

export interface RuleGuidance {
  focus: string;
  avoid: string;
}

/** Exact rule guidance (highest priority). */
const RULE_GUIDANCE: Record<string, RuleGuidance> = {
  TRK_HH_CR_TRACKED_BUT_HH_MISSING: {
    focus:
      "Girls marked successfully tracked must also have a completed household survey.",
    avoid:
      "After a successful track, complete (or confirm) the household form for that girl before moving on. Check the HH queue daily for tracked girls still missing HH.",
  },
  TRK_CE_MISSING_PHONE: {
    focus: "Listed girl phone numbers are missing after tracking attempts.",
    avoid:
      "Always capture or update the girl’s phone (or a reliable alternate) during tracking. Do not leave phone fields blank when a contact exists in the household.",
  },
  TRK_QF_05: {
    focus: "Tracking surveys completed unusually fast.",
    avoid:
      "Take enough time to verify identity, location, and outcomes. Rushing raises quality flags — follow the full visit protocol even for short callbacks.",
  },
  TRK_QF_DUP_GIRL_EXACT: {
    focus: "Exact duplicate girl records in tracking.",
    avoid:
      "Search the assignment list before starting a new form. Do not re-submit the same girl. If unsure, check with your supervisor instead of creating a new case.",
  },
  TRK_QF_DUP_GIRL_MISMATCH: {
    focus: "Possible duplicate girls with mismatched details.",
    avoid:
      "Compare name, ID, and village carefully before submitting. Fix wrong IDs on the original record; do not create a second conflicting form.",
  },
  TRK_QF_DUP_PHONE_MULTI_GIRL: {
    focus: "Same phone number used for multiple girls.",
    avoid:
      "Confirm whose phone it is. Shared household phones are OK only when recorded correctly; do not copy one number across unrelated girls.",
  },
  TRK_QF_DUMMY_LANDMARK: {
    focus: "Landmark text looks like placeholder/dummy data.",
    avoid:
      "Write a real, specific landmark (shop name, mosque, school). Never use test text like “abc”, “xxx”, or “N/A” when a landmark exists.",
  },
  TRK_QF_MISSING_UPDATE_AFTER_TRACK: {
    focus: "Tracking outcome updated without a proper revisit/update trail.",
    avoid:
      "When you change a tracking status, complete the update steps in the form. Do not skip revisit fields after a successful track.",
  },
  HH_CR_SCHOOLING_PARENT_MISMATCH: {
    focus: "Mother and father report different schooling status for the same girl.",
    avoid:
      "Ask both parents the same schooling questions carefully. Reconcile contradictions in the household before submitting mother and father forms.",
  },
  HH_CR_LISTED_GIRL_NOT_IN_ROSTER: {
    focus: "Listed girl is missing from the siblings roster.",
    avoid:
      "Include the listed (sample) girl in the roster first. Double-check every listed girl appears in the household members list.",
  },
  HH_CR_LISTED_GIRL_NOT_FIRST: {
    focus: "Listed girl is not recorded as the first eligible girl where required.",
    avoid:
      "Follow roster order rules: place the listed sample girl in the correct position before other girls.",
  },
  HH_CR_TRANSPORT_MODULE_MISSING: {
    focus: "Required transport module was skipped.",
    avoid:
      "Complete every required module shown in the form. Do not jump ahead or leave transport questions blank when they appear.",
  },
  HH_CR_LONG_DURATION: {
    focus:
      "Household interview ran longer than expected (critical ≥180 min, quality ≥120 min).",
    avoid:
      "Stay on protocol, avoid long idle pauses with the form open, and finish modules in one sitting when possible. Pause/resume correctly if interrupted.",
  },
  // Legacy alias — older error logs may still use the warning-tier rule id.
  HH_QF_LONG_DURATION_WARN: {
    focus:
      "Household interview ran longer than expected (critical ≥180 min, quality ≥120 min).",
    avoid:
      "Stay on protocol, avoid long idle pauses with the form open, and finish modules in one sitting when possible. Pause/resume correctly if interrupted.",
  },
  HH_QF_DUMMY_ALT_PHONE: {
    focus: "Alternative contact number looks fake or placeholder.",
    avoid:
      "Enter a real alternate number only when one exists. Never invent digits (e.g. 0000000, 1234567).",
  },
  HH_QF_DUMMY_NEIGHBOR_PHONE: {
    focus: "Neighbour contact number looks fake or placeholder.",
    avoid:
      "Ask for a real neighbour number, or leave blank if none. Do not type dummy patterns.",
  },
  HH_QF_05: {
    focus: "Grade and age combination looks implausible.",
    avoid:
      "Confirm the girl’s age and current class with the respondent. Correct typos before submit — age and grade must make sense together.",
  },
  HH_CE_FAST_10: {
    focus:
      "Household survey completed too quickly (critical under 10 min, quality under 15 min active duration).",
    avoid:
      "Read questions fully and verify answers. Do not skip sections or submit incomplete interviews — review extreme cases with your supervisor.",
  },
  // Legacy alias — older error logs may still use the quality-tier rule id.
  HH_QF_07: {
    focus:
      "Household survey completed too quickly (critical under 10 min, quality under 15 min active duration).",
    avoid:
      "Read questions fully and verify answers. Do not skip sections or submit incomplete interviews — review extreme cases with your supervisor.",
  },
  HH_CR_10: {
    focus: "Exact duplicate household record for the same respondent.",
    avoid:
      "Do not re-submit the same respondent interview. If a duplicate exists, keep the latest complete KEY and void the rest after supervisor review.",
  },
  HH_CR_SAME_RESP_MISMATCH: {
    focus: "Same girl + same respondent submitted more than once with conflicting identity/location fields.",
    avoid:
      "Never create a second interview for the same respondent. Confirm which KEY to retain (latest complete) and correct conflicting fields with supervisor guidance.",
  },
  HH_CR_13: {
    focus: "Parent age is unrealistically low.",
    avoid:
      "Re-check parent date of birth / age with the household. Fix entry errors before submitting.",
  },
  GL_CE_00: {
    focus: "Girl age is outside the expected 10–17 range.",
    avoid:
      "Confirm age and date of birth carefully. If the girl is outside the eligible range, follow supervisor guidance instead of forcing an in-range value.",
  },
  GL_CE_FAST_10: {
    focus:
      "Girls interview completed too quickly (critical under 10 min, quality under 15 min) despite reading/math modules.",
    avoid:
      "Allow enough time for reading passages and math questions. Do not skip test modules or rush consent/demographics.",
  },
  // Legacy alias — older error logs may still use the quality-tier rule id.
  GL_QF_10: {
    focus:
      "Girls interview completed too quickly (critical under 10 min, quality under 15 min) despite reading/math modules.",
    avoid:
      "Allow enough time for reading passages and math questions. Do not skip test modules or rush consent/demographics.",
  },
  GL_CE_14: {
    focus: "Duplicate Girls record for the same girl in the same village.",
    avoid:
      "Do not submit the same girl twice. Retain the latest complete KEY and void earlier duplicates after supervisor review.",
  },
  GL_CE_DUP_GIRL_ID: {
    focus: "Same girl ID appears in Girls survey more than once across villages.",
    avoid:
      "Confirm the correct village and girl ID before submit. Retain one KEY after supervisor review.",
  },
  GL_CE_DUP_GIRL_MISMATCH: {
    focus: "Duplicate girl ID with conflicting name/village/age across Girls submissions.",
    avoid:
      "Fix identity fields so one girl ID maps to one identity. Retain the latest correct KEY after supervisor review.",
  },
  HVG_QF_IDENTITY_MISMATCH: {
    focus: "Girl name in Household does not match Girls survey for the same girl ID.",
    avoid:
      "Confirm the girl’s name against the tracking list before submit. Align Household and Girls identity fields.",
  },
  GL_QF_13: {
    focus: "A months value is out of the valid range.",
    avoid:
      "Enter months between valid limits only (e.g. 0–11 where applicable). Check for typos.",
  },
  GL_QF_35: {
    focus: "Class size is zero or negative.",
    avoid:
      "Enter the real number of students in the class. Never use 0 or negative values as placeholders.",
  },
};

const PREFIX_GUIDANCE: { prefix: string; guidance: RuleGuidance }[] = [
  {
    prefix: "TRK_CE_",
    guidance: {
      focus: "Critical tracking completeness issue — data needed for follow-up is incomplete.",
      avoid:
        "Before leaving the household, check that required tracking fields (phone, status, attempts) are filled correctly.",
    },
  },
  {
    prefix: "TRK_QF_DUP",
    guidance: {
      focus: "Possible duplicate tracking records.",
      avoid:
        "Always search existing cases before creating a new submission for the same girl.",
    },
  },
  {
    prefix: "TRK_QF_DUMMY",
    guidance: {
      focus: "Placeholder or dummy text in tracking fields.",
      avoid: "Use real, specific information only. Never submit test or filler text.",
    },
  },
  {
    prefix: "TRK_QF_",
    guidance: {
      focus: "Tracking quality concern that needs review.",
      avoid:
        "Slow down on identity checks, phones, and outcomes. Quality flags usually mean rushed or incomplete entries.",
    },
  },
  {
    prefix: "TRK_HH_CR_",
    guidance: {
      focus: "Tracking and household linkage problem.",
      avoid:
        "Keep tracking and household work in sync — a successful track should be followed by a complete HH where required.",
    },
  },
  {
    prefix: "HH_CR_",
    guidance: {
      focus: "Critical household data integrity issue.",
      avoid:
        "Complete all required HH modules, keep mother/father answers consistent, and include the listed girl in the roster.",
    },
  },
  {
    prefix: "HH_QF_DUMMY",
    guidance: {
      focus: "Dummy/placeholder contact details in the household form.",
      avoid: "Only enter real phone numbers. Leave blank if no contact is available.",
    },
  },
  {
    prefix: "HH_QF_",
    guidance: {
      focus: "Household quality flag for review.",
      avoid:
        "Check ages, grades, durations, and contacts before submit. Fix inconsistencies in the field when possible.",
    },
  },
  {
    prefix: "GL_CE_",
    guidance: {
      focus: "Critical girls-survey integrity issue.",
      avoid:
        "Verify age, IDs, and required girl fields carefully before ending the interview.",
    },
  },
  {
    prefix: "GL_QF_",
    guidance: {
      focus: "Girls-survey quality concern.",
      avoid:
        "Avoid rushing; check numeric ranges (age, months, class size) and complete each section fully.",
    },
  },
];

const FALLBACK: RuleGuidance = {
  focus: "This rule flagged a data-quality problem that needs field correction.",
  avoid:
    "Open the error message for this record, correct the field in a revisit or new submission as instructed by your supervisor, and double-check similar cases before submitting.",
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
