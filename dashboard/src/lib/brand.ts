export type FirmId = "pidc" | "aoe" | "kprap";

export const FIRM_IDS: readonly FirmId[] = ["pidc", "aoe", "kprap"] as const;

export const FIRM_COOKIE = "dashboard-firm";
export const FIRM_STORAGE_KEY = "dashboard-firm";
/** Default firm for users who can switch (e.g. Malki) when no preference is saved. */
export const DEFAULT_FIRM_ID: FirmId = "pidc";

export function parseFirmPreference(
  value: string | null | undefined
): FirmId | null {
  if (value === "pidc" || value === "aoe" || value === "kprap") return value;
  // Legacy cookie/localStorage from the old 2-firm switcher
  if (value === "alliance") return "pidc";
  return null;
}

export function resolveFirmPreference(
  value: string | null | undefined
): FirmId {
  return parseFirmPreference(value) ?? DEFAULT_FIRM_ID;
}

/** Cycle PIDC → AoE → KP-RAP → PIDC */
export function getNextFirm(firmId: FirmId): FirmId {
  const index = FIRM_IDS.indexOf(firmId);
  return FIRM_IDS[(index + 1) % FIRM_IDS.length];
}

/** @deprecated Use `getNextFirm` */
export function getOtherFirm(firmId: FirmId): FirmId {
  return getNextFirm(firmId);
}

/** Fixed project branding shown on the login page (not firm-specific). */
export const PROJECT_BRAND = {
  name: "KP-RAP Project",
  platformLabel: "M&E Platform",
  logo: "/kprap-logo.png",
  tagline: "Monitoring & Evaluation Intelligence",
} as const;

export interface FirmPalette {
  teal: string;
  deepTeal: string;
  gold: string;
  lightGold: string;
  tealLight: string;
  deepTealDark: string;
  goldDark: string;
  selected: string;
  tealRgb: string;
  deepTealRgb: string;
  goldRgb: string;
}

export interface FirmBrand {
  id: FirmId;
  name: string;
  shortName: string;
  tagline: string;
  logo: string;
  /** Compact mark for sidebar, nav, and other square slots */
  logoMark: string;
  favicon: string;
  palette: FirmPalette;
}

/** Teal + gold palette from AoE brand assets */
export const AOE_PALETTE: FirmPalette = {
  teal: "#21A1AA",
  deepTeal: "#178891",
  gold: "#EDCA5C",
  lightGold: "#F4D67F",
  tealLight: "#2DBCC6",
  deepTealDark: "#0E6B73",
  goldDark: "#E0B53F",
  selected: "#0B7080",
  tealRgb: "33, 161, 170",
  deepTealRgb: "23, 136, 145",
  goldRgb: "237, 202, 92",
};

/** @deprecated Use `AOE_PALETTE` */
export const ALLIANCE_PALETTE = AOE_PALETTE;

/** Blue + green palette derived from PIDC brand assets */
export const PIDC_PALETTE: FirmPalette = {
  teal: "#2060A0",
  deepTeal: "#164A7E",
  gold: "#39B54A",
  lightGold: "#6BCB77",
  tealLight: "#3B82C4",
  deepTealDark: "#123D66",
  goldDark: "#2D9A3E",
  selected: "#0F4D82",
  tealRgb: "32, 96, 160",
  deepTealRgb: "22, 74, 126",
  goldRgb: "57, 181, 74",
};

/** Green-forward palette for KP-RAP / provincial branding */
export const KPRAP_PALETTE: FirmPalette = {
  teal: "#1B7A4E",
  deepTeal: "#145C3A",
  gold: "#C4A035",
  lightGold: "#D4B84A",
  tealLight: "#2A9B63",
  deepTealDark: "#0E4028",
  goldDark: "#A8862A",
  selected: "#0F5C38",
  tealRgb: "27, 122, 78",
  deepTealRgb: "20, 92, 58",
  goldRgb: "196, 160, 53",
};

export const FIRM_PALETTES: Record<FirmId, FirmPalette> = {
  pidc: PIDC_PALETTE,
  aoe: AOE_PALETTE,
  kprap: KPRAP_PALETTE,
};

export const FIRMS: Record<FirmId, FirmBrand> = {
  pidc: {
    id: "pidc",
    name: "PIDC",
    shortName: "PIDC",
    tagline: "Monitoring & Evaluation Intelligence",
    logo: "/pidc-logo.png",
    logoMark: "/pidc-favicon.png",
    favicon: "/pidc-favicon.png",
    palette: PIDC_PALETTE,
  },
  aoe: {
    id: "aoe",
    name: "Alliance of Experts",
    shortName: "AoE",
    tagline: "Monitoring & Evaluation Intelligence",
    logo: "/alliance-logo.png",
    logoMark: "/alliance-favicon.png",
    favicon: "/alliance-favicon.png",
    palette: AOE_PALETTE,
  },
  kprap: {
    id: "kprap",
    name: "KP-RAP Project",
    shortName: "KP-RAP",
    tagline: "Monitoring & Evaluation Intelligence",
    logo: "/kprap-logo.png",
    logoMark: "/kprap-favicon.png",
    favicon: "/kprap-favicon.png",
    palette: KPRAP_PALETTE,
  },
};

/** @deprecated Use `FIRMS` or `useFirm()` instead */
export const brand = FIRMS.kprap;

/** @deprecated Use `FIRM_PALETTES` or `useFirm().palette` instead */
export const colors = {
  teal: AOE_PALETTE.teal,
  deepTeal: AOE_PALETTE.deepTeal,
  gold: AOE_PALETTE.gold,
  lightGold: AOE_PALETTE.lightGold,
  white: "#FFFFFF",
  softGray: "#F5F7FA",
  darkSlate: "#0F172A",
  surface: "#111827",
  card: "#1E293B",
} as const;

const PALETTE_CSS_VARS: (keyof FirmPalette)[] = [
  "teal",
  "deepTeal",
  "gold",
  "lightGold",
  "tealLight",
  "deepTealDark",
  "goldDark",
  "selected",
  "tealRgb",
  "deepTealRgb",
  "goldRgb",
];

/** Apply firm palette to the document root (CSS variables + data attribute). */
export function applyFirmTheme(firmId: FirmId) {
  if (typeof document === "undefined") return;

  const palette = FIRM_PALETTES[firmId];
  const root = document.documentElement;
  root.dataset.firm = firmId;

  for (const key of PALETTE_CSS_VARS) {
    const cssKey =
      key === "deepTeal"
        ? "--brand-deep-teal"
        : key === "lightGold"
          ? "--brand-light-gold"
          : key === "tealLight"
            ? "--brand-teal-light"
            : key === "deepTealDark"
              ? "--brand-deep-teal-dark"
              : key === "goldDark"
                ? "--brand-gold-dark"
                : key === "tealRgb"
                  ? "--brand-teal-rgb"
                  : key === "deepTealRgb"
                    ? "--brand-deep-teal-rgb"
                    : key === "goldRgb"
                      ? "--brand-gold-rgb"
                      : key === "selected"
                        ? "--brand-selected"
                        : `--brand-${key}`;
    root.style.setProperty(cssKey, palette[key]);
  }

  root.style.setProperty("--primary", palette.teal);
  root.style.setProperty("--ring", palette.teal);
  root.style.setProperty("--accent", palette.gold);
}

export function getDefaultFirmForRole(
  role: "malki" | "pidc" | "world-bank" | "piu" | "district" | null | undefined
): FirmId {
  // Switchable users (Malki) and PIDC/PIU start on PIDC.
  if (role === "pidc" || role === "piu" || role === "malki" || role == null) {
    return DEFAULT_FIRM_ID;
  }
  // Locked project viewers keep KP-RAP branding.
  return "kprap";
}

export function canRoleSwitchFirm(
  role: "malki" | "pidc" | "world-bank" | "piu" | "district" | null | undefined
): boolean {
  // Before sign-in, allow branding preview; after sign-in only Malki can switch.
  if (role == null) return true;
  return role === "malki";
}

export function buildChartGradients(palette: FirmPalette) {
  return {
    teal: { from: palette.tealLight, to: palette.deepTeal },
    deepteal: { from: palette.teal, to: palette.deepTealDark },
    gold: { from: palette.lightGold, to: palette.goldDark },
    red: { from: "#F87171", to: "#DC2626" },
    sky: { from: "#56C6F5", to: "#2B8FD6" },
    indigo: { from: "#818CF8", to: "#4F46E5" },
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function paletteGradient(
  palette: FirmPalette,
  intensity: number
): string {
  return `linear-gradient(135deg, rgba(${palette.tealRgb}, ${intensity / 200}) 0%, rgba(${palette.goldRgb}, ${intensity / 300}) 100%)`;
}

/** Persist firm choice for SSR (cookie) and client reload (localStorage + data-firm). */
export function persistFirmPreference(firmId: FirmId) {
  if (typeof document === "undefined") return;
  localStorage.setItem(FIRM_STORAGE_KEY, firmId);
  document.cookie = `${FIRM_COOKIE}=${firmId};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.dataset.firm = firmId;
}

/** Title/favicon are managed by Next.js metadata — do not touch document.head here. */
export function applyDocumentBrand(_firm: FirmBrand) {}

/** Login title/favicon come from app/login/layout.tsx metadata. */
export function applyProjectDocumentBrand() {}
