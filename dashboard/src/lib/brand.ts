export type FirmId = "alliance" | "pidc";

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

export const ALLIANCE_PALETTE: FirmPalette = {
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

export const FIRM_PALETTES: Record<FirmId, FirmPalette> = {
  alliance: ALLIANCE_PALETTE,
  pidc: PIDC_PALETTE,
};

export const FIRMS: Record<FirmId, FirmBrand> = {
  alliance: {
    id: "alliance",
    name: "Alliance of Excellence",
    shortName: "AOE",
    tagline: "Monitoring & Evaluation Intelligence",
    logo: "/alliance-logo.png",
    logoMark: "/alliance-logo.png",
    favicon: "/alliance-favicon.png",
    palette: ALLIANCE_PALETTE,
  },
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
};

/** @deprecated Use `FIRMS` or `useFirm()` instead */
export const brand = FIRMS.alliance;

/** @deprecated Use `FIRM_PALETTES` or `useFirm().palette` instead */
export const colors = {
  teal: ALLIANCE_PALETTE.teal,
  deepTeal: ALLIANCE_PALETTE.deepTeal,
  gold: ALLIANCE_PALETTE.gold,
  lightGold: ALLIANCE_PALETTE.lightGold,
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

/** Inline script applied before paint to reduce palette flash on reload. */
export const FIRM_THEME_BOOTSTRAP = `(function(){try{var r=document.documentElement,f=localStorage.getItem("dashboard-firm");if(f==="pidc"||f==="alliance")r.dataset.firm=f;}catch(e){}})();`;
