export type FirmId = "alliance" | "pidc";

export interface FirmBrand {
  id: FirmId;
  name: string;
  shortName: string;
  tagline: string;
  logo: string;
  /** Compact mark for sidebar, nav, and other square slots */
  logoMark: string;
  favicon: string;
}

export const FIRMS: Record<FirmId, FirmBrand> = {
  alliance: {
    id: "alliance",
    name: "Alliance of Excellence",
    shortName: "AOE",
    tagline: "Monitoring & Evaluation Intelligence",
    logo: "/alliance-logo.png",
    logoMark: "/alliance-logo.png",
    favicon: "/alliance-favicon.png",
  },
  pidc: {
    id: "pidc",
    name: "PIDC",
    shortName: "PIDC",
    tagline: "Monitoring & Evaluation Intelligence",
    logo: "/pidc-logo.png",
    logoMark: "/pidc-favicon.png",
    favicon: "/pidc-favicon.png",
  },
};

/** @deprecated Use `FIRMS` or `useFirm()` instead */
export const brand = FIRMS.alliance;

export const colors = {
  teal: "#21A1AA",
  deepTeal: "#178891",
  gold: "#EDCA5C",
  lightGold: "#F4D67F",
  white: "#FFFFFF",
  softGray: "#F5F7FA",
  darkSlate: "#0F172A",
  surface: "#111827",
  card: "#1E293B",
} as const;

export function getDefaultFirmForRole(
  role: "malki" | "pidc" | "world-bank" | "piu" | null | undefined
): FirmId {
  if (role === "pidc" || role === "piu") return "pidc";
  return "alliance";
}

export function canRoleSwitchFirm(
  role: "malki" | "pidc" | "world-bank" | "piu" | null | undefined
): boolean {
  return role === "malki";
}
