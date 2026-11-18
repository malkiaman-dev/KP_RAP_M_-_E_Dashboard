import type { SurveyRow } from "./survey-metrics";

// Dashboard filters, completion rules, charts, and recent-submission details.
const DASHBOARD_ROW_FIELDS = [
  "village",
  "village_label", "village_label_1", "village_label_b1", "village_label_b2",
  "enumerator_id", "enumerator_name", "girl", "girl_id", "girl_1", "girl_2",
  "girlname_label", "new_name", "girl_name", "name", "girl_label",
  "school_label", "new_school_label", "school", "survey_status", "visit_num",
  "attempt", "respondent", "respondent_selection", "available_caretaker",
  "agree_consent_father", "agree_consent_mother", "agree_consent_caregiver",
  "father_unavailable1", "mother_unavailable1", "father_unavailable_other",
  "mother_unavailable_other", "girl_available", "parental_consent_agree",
  "child_consent_agree", "house_found", "house_found_1", "girl_found",
  "girl_found_confirm_enrolled", "consent", "family_whereabouts",
  "family_moveadd_samevill", "check_villageelder", "check_lhw", "check_neighbour",
  "check_villageelder_1", "check_lhw_1", "check_neighbour_1",
] as const;

export function slimDashboardRows(rows: SurveyRow[]): SurveyRow[] {
  return rows.map((row) => {
    const slim: SurveyRow = {
      KEY: row.KEY,
      SubmissionDate: row.SubmissionDate,
      district: row.district,
      survey_type: row.survey_type,
    };
    for (const field of DASHBOARD_ROW_FIELDS) {
      const value = row[field];
      if (value !== undefined && value !== "") slim[field] = value;
    }
    return slim;
  });
}
