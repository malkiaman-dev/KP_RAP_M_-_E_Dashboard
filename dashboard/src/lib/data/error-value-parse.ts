/** Client-safe parsers for Error Detail Log value strings. */

/** Parse `k=v; k2=v2` evidence strings. */
export function parseErrorValueParts(value?: string): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = (value || "").trim();
  if (!raw) return out;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

/** Strip context keys so "Value entered" stays the raw field evidence. */
export function stripContextFromValue(value?: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const parts = raw
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => {
      const key = p.split("=")[0]?.trim().toLowerCase();
      return !["girl_name", "girlname", "village", "school"].includes(key || "");
    });
  return parts.join("; ");
}
