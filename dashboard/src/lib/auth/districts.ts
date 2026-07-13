/** Canonical district labels — must match DQA `DISTRICT_MAP` / error log. */
export const FIELD_DISTRICTS = [
  "D.I. Khan",
  "Hangu",
  "Lakki",
  "Torghar",
] as const;

export type FieldDistrict = (typeof FIELD_DISTRICTS)[number];

export function isFieldDistrict(value: string | undefined | null): value is FieldDistrict {
  return (
    typeof value === "string" &&
    (FIELD_DISTRICTS as readonly string[]).includes(value)
  );
}

export function fieldDistrictLabel(district: FieldDistrict): string {
  return district;
}
