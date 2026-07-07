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
  applyDocumentBrand,
  applyProjectDocumentBrand,
  FIRMS,
  FIRM_STORAGE_KEY,
  getDefaultFirmForRole,
  persistFirmPreference,
  parseFirmPreference,
  resolveFirmPreference,
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
  if (typeof document === "undefined") return "pidc";
  const fromDom = parseFirmPreference(document.documentElement.dataset.firm);
  if (fromDom) return fromDom;
  return resolveFirmPreference(localStorage.getItem(FIRM_STORAGE_KEY));
}

function applyFirm(firmId: FirmId, pathname: string) {
  applyFirmTheme(firmId);
  if (pathname === "/login") {
    applyProjectDocumentBrand();
    return;
  }
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
    applyFirm(bootstrapped, pathname);
  }, [pathname]);

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
    applyFirm(nextFirmId, pathname);
  }, [user, mounted, pathname]);

  const firm = FIRMS[firmId];

  useLayoutEffect(() => {
    applyFirm(firmId, pathname);
  }, [firmId, pathname]);

  const setFirm = useCallback(
    (nextFirmId: FirmId) => {
      if (!canRoleSwitchFirm(user?.role)) return;
      setFirmId(nextFirmId);
      persistFirmPreference(nextFirmId);
      applyFirm(nextFirmId, pathname);
    },
    [user?.role, pathname]
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
