"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  canRoleSwitchFirm,
  applyFirmTheme,
  FIRMS,
  FIRM_STORAGE_KEY,
  getDefaultFirmForRole,
  persistFirmPreference,
  type FirmBrand,
  type FirmId,
  type FirmPalette,
} from "@/lib/brand";
import type { Session } from "@/lib/auth/types";

interface FirmContextValue {
  firmId: FirmId;
  firm: FirmBrand;
  palette: FirmPalette;
  canSwitchFirm: boolean;
  setFirm: (firmId: FirmId) => void;
}

const FirmContext = createContext<FirmContextValue | null>(null);

function readBootstrappedFirm(): FirmId {
  if (typeof document === "undefined") return "alliance";
  const fromDom = document.documentElement.dataset.firm;
  if (fromDom === "pidc" || fromDom === "alliance") return fromDom;
  const stored = localStorage.getItem(FIRM_STORAGE_KEY);
  return stored === "pidc" ? "pidc" : "alliance";
}

function applyDocumentBrand(firm: FirmBrand) {
  if (typeof document === "undefined") return;

  document.title = `${firm.name} | M&E Dashboard`;

  for (const rel of ["icon", "shortcut icon", "apple-touch-icon"]) {
    let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = firm.favicon;
  }
}

function applyFirm(firmId: FirmId) {
  applyFirmTheme(firmId);
  applyDocumentBrand(FIRMS[firmId]);
}

export function FirmProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<Session | null>(null);
  const [firmId, setFirmId] = useState<FirmId>(readBootstrappedFirm);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const bootstrapped = readBootstrappedFirm();
    setFirmId(bootstrapped);
    applyFirm(bootstrapped);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setMounted(true));
  }, [pathname]);

  useEffect(() => {
    if (!mounted) return;

    const role = user?.role ?? null;
    const canSwitch = canRoleSwitchFirm(role);
    const nextFirmId = canSwitch
      ? readBootstrappedFirm()
      : getDefaultFirmForRole(role);

    setFirmId(nextFirmId);
    if (canSwitch) {
      persistFirmPreference(nextFirmId);
    } else {
      document.documentElement.dataset.firm = nextFirmId;
    }
    applyFirm(nextFirmId);
  }, [user, mounted]);

  const firm = FIRMS[firmId];

  useLayoutEffect(() => {
    applyFirm(firmId);
  }, [firmId]);

  const setFirm = useCallback(
    (nextFirmId: FirmId) => {
      if (!canRoleSwitchFirm(user?.role)) return;
      setFirmId(nextFirmId);
      persistFirmPreference(nextFirmId);
      applyFirm(nextFirmId);
    },
    [user?.role]
  );

  const value = useMemo(
    () => ({
      firmId,
      firm,
      palette: firm.palette,
      canSwitchFirm: canRoleSwitchFirm(user?.role),
      setFirm,
    }),
    [firmId, firm, user?.role, setFirm]
  );

  return <FirmContext.Provider value={value}>{children}</FirmContext.Provider>;
}

export function useFirm() {
  const context = useContext(FirmContext);
  if (!context) {
    throw new Error("useFirm must be used within FirmProvider");
  }
  return context;
}
