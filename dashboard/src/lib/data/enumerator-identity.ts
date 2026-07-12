/**
 * Shared enumerator identity helpers.
 *
 * Field data often repeats the same worker under different IDs, casing, or
 * spellings ("Lati khan" / "Lati Khan", "Naureen" / "Nareen Khan"). Filter
 * lists and counts should treat those as one person.
 */

/** Known spelling variants → canonical lowercase slug. */
const ENUMERATOR_NAME_ALIASES: Record<string, string> = {
  javairia: "javeria",
  jaweria: "javeria",
  javeria: "javeria",
  naureen: "naureen khan",
  "naureen khan": "naureen khan",
  nareen: "naureen khan",
  "nareen khan": "naureen khan",
  "nureen khan": "naureen khan",
  "norreen khan": "naureen khan",
  lati: "lati khan",
  "lati khan": "lati khan",
};

/** Preferred Title Case labels for merged identities. */
const CANONICAL_ENUMERATOR_LABELS: Record<string, string> = {
  javeria: "Javeria",
  "naureen khan": "Naureen Khan",
  "lati khan": "Lati Khan",
};

export function cleanEnumeratorName(name?: string): string {
  if (!name) return "";
  return name.replace(/\(.*\)/, "").trim();
}

export function normalizeEnumeratorNameSlug(name?: string): string {
  const slug = cleanEnumeratorName(name).toLowerCase().replace(/\s+/g, " ").trim();
  if (!slug || slug === "unknown") return "";
  return ENUMERATOR_NAME_ALIASES[slug] ?? slug;
}

function titleCaseName(slug: string): string {
  return slug
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function displayEnumeratorLabel(slugOrName: string): string {
  const slug = normalizeEnumeratorNameSlug(slugOrName) || slugOrName;
  return (
    CANONICAL_ENUMERATOR_LABELS[slug] ??
    titleCaseName(slug) ??
    cleanEnumeratorName(slugOrName) ??
    "Unknown"
  );
}

/**
 * Canonical identity key for an enumerator (name-based, case/alias normalized).
 * Falls back to enumerator_id when no usable name is present.
 */
export function enumeratorIdentityKey(row: {
  enumerator_id?: string;
  enumerator_name?: string;
}): string {
  const slug = normalizeEnumeratorNameSlug(row.enumerator_name);
  if (slug) return slug;
  const id = (row.enumerator_id || "").trim();
  if (id) return `id:${id}`;
  return "unknown";
}

/** Build deduped filter options from rows that carry enumerator fields. */
export function buildEnumeratorFilterOptions<
  T extends { enumerator_id?: string; enumerator_name?: string },
>(rows: T[]): { value: string; label: string }[] {
  const groups = new Map<string, string[]>();

  for (const row of rows) {
    const key = enumeratorIdentityKey(row);
    if (!key || key === "unknown") continue;
    const label = cleanEnumeratorName(row.enumerator_name);
    if (!groups.has(key)) groups.set(key, []);
    if (label) groups.get(key)!.push(label);
  }

  return [...groups.entries()]
    .map(([value, labels]) => {
      const canonical = CANONICAL_ENUMERATOR_LABELS[value];
      if (canonical) return { value, label: canonical };

      // Prefer the most common raw casing variant, then title-case the slug.
      const counts = new Map<string, number>();
      for (const label of labels) {
        counts.set(label, (counts.get(label) || 0) + 1);
      }
      const preferred =
        counts.size > 0
          ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0]
          : displayEnumeratorLabel(value);

      return { value, label: preferred };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Match a row against a selected enumerator filter value. */
export function matchesEnumeratorFilter(
  row: { enumerator_id?: string; enumerator_name?: string },
  filterValue: string
): boolean {
  if (!filterValue || filterValue === "all") return true;
  return enumeratorIdentityKey(row) === filterValue;
}
