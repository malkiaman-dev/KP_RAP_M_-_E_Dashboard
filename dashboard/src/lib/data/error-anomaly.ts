/**
 * Explanations for implausible / technical anomaly rules.
 * These are intentionally NOT Critical or Quality field errors.
 */

export interface AnomalyExplanation {
  whyImplausible: string;
  likelyCause: string;
  whatToDo: string;
}

const EXPLANATIONS: Record<string, AnomalyExplanation> = {
  GL_AN_FAST_DURATION: {
    whyImplausible:
      "A completed Girls interview includes consent, modules, and a reading/math assessment with dozens of items (including ~72 word checks). Finishing a fully submitted form in under ~10–15 minutes of active duration is rarely realistic even if some questions were rushed.",
    likelyCause:
      "Tablet clock drift, SurveyCTO duration quirks, form pause/resume oddities, or a device that kept a short active timer while answers were already on the form.",
    whatToDo:
      "Do not coach as simple rushing first. Spot-check a few records: confirm learning items are populated, ask the enumerator about device time, and only escalate if answers look skipped or identical patterns appear.",
  },
  HH_AN_FAST_DURATION: {
    whyImplausible:
      "A completed Household interview spans roster, education history, and several modules. Filling that volume of answers in under ~10–15 active minutes is usually not feasible through normal interviewing.",
    likelyCause:
      "Device duration/clock anomaly, form left open then submitted quickly, or unusual sync timing — not necessarily that every question was skipped.",
    whatToDo:
      "Verify whether modules actually contain answers. Treat as a technical review case before counting it against enumerator quality coaching.",
  },
  TRK_AN_FAST_DURATION: {
    whyImplausible:
      "A submitted tracking visit with identity, location, and outcome fields completed in only a few active minutes is often shorter than a real doorstep protocol allows.",
    likelyCause:
      "Duration field/device timing issues, or a visit resumed from a previous partial form with a short final active segment.",
    whatToDo:
      "Check outcome and contact fields for completeness. Confirm with the enumerator before treating it as rushing.",
  },
  HH_AN_LONG_DURATION: {
    whyImplausible:
      "Multi-hour (or longer) continuous household interviewing is uncommon. Extremely long durations usually do not mean the enumerator asked questions for that entire period.",
    likelyCause:
      "Form left open overnight, long idle pause with the tablet unlocked on the survey, or wall-clock start/end spanning breaks.",
    whatToDo:
      "Prefer SurveyCTO active duration when available. Ask whether the form was paused; do not automatically treat as poor interview quality.",
  },
  // Legacy aliases from older logs
  TRK_QF_05: {
    whyImplausible:
      "Very short tracking duration with a submitted form is often technically implausible as pure field rushing.",
    likelyCause: "Device or duration timing anomaly.",
    whatToDo: "Verify completeness before coaching.",
  },
  HH_CE_FAST_10: {
    whyImplausible:
      "Very short household duration with modules filled is rarely possible through normal interviewing.",
    likelyCause: "Device/duration anomaly or form pause/resume.",
    whatToDo: "Technical review before quality coaching.",
  },
  HH_QF_07: {
    whyImplausible:
      "Short household duration with a completed form is often implausible as pure skipping.",
    likelyCause: "Device/duration anomaly.",
    whatToDo: "Technical review before quality coaching.",
  },
  GL_CE_FAST_10: {
    whyImplausible:
      "Girls learning assessment plus modules make sub-10-minute completes rarely realistic.",
    likelyCause: "Device/duration anomaly.",
    whatToDo: "Confirm learning answers before coaching as rushing.",
  },
  GL_QF_10: {
    whyImplausible:
      "Sub-15-minute Girls completes with assessment items filled are often implausible.",
    likelyCause: "Device/duration anomaly.",
    whatToDo: "Technical review before quality coaching.",
  },
  HH_CR_LONG_DURATION: {
    whyImplausible:
      "Extremely long HH durations usually reflect idle open forms, not continuous interviewing.",
    likelyCause: "Form left open / overnight pause.",
    whatToDo: "Verify pause behaviour; do not auto-coach as slow interviewing.",
  },
  HH_QF_LONG_DURATION_WARN: {
    whyImplausible:
      "Long HH durations often reflect idle open forms rather than continuous interviewing.",
    likelyCause: "Form left open / long pause.",
    whatToDo: "Verify pause behaviour before coaching.",
  },
};

const DEFAULT_EXPLANATION: AnomalyExplanation = {
  whyImplausible:
    "This case looks inconsistent with normal field interviewing and may be a technical anomaly rather than a standard data-quality error.",
  likelyCause: "Device timing, form pause/resume, or export quirks.",
  whatToDo:
    "Review the record manually before counting it against enumerator quality.",
};

export function getAnomalyExplanation(ruleId: string): AnomalyExplanation {
  return EXPLANATIONS[ruleId] ?? DEFAULT_EXPLANATION;
}
