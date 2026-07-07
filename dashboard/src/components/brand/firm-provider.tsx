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
import { useRouter } from "next/navigation";
import {
  canRoleSwitchFirm,
  applyFirmTheme,
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

export function FirmProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Session | null>(null);
  const [firmId, setFirmId] = useState<FirmId>(readBootstrappedFirm);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    applyFirmTheme(firmId);
  }, [firmId]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setMounted(true));
  }, []);

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
    applyFirmTheme(nextFirmId);
  }, [user, mounted]);

  const setFirm = useCallback(
    (nextFirmId: FirmId) => {
      if (!canRoleSwitchFirm(user?.role)) return;
      setFirmId(nextFirmId);
      persistFirmPreference(nextFirmId);
      applyFirmTheme(nextFirmId);
      router.refresh();
    },
    [user?.role, router]
  );

  const firm = FIRMS[firmId];

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
