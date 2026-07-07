"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  canRoleSwitchFirm,
  applyFirmTheme,
  FIRMS,
  getDefaultFirmForRole,
  type FirmBrand,
  type FirmId,
  type FirmPalette,
} from "@/lib/brand";
import type { Session } from "@/lib/auth/types";

const STORAGE_KEY = "dashboard-firm";

interface FirmContextValue {
  firmId: FirmId;
  firm: FirmBrand;
  palette: FirmPalette;
  canSwitchFirm: boolean;
  setFirm: (firmId: FirmId) => void;
}

const FirmContext = createContext<FirmContextValue | null>(null);

function readStoredFirm(): FirmId {
  if (typeof window === "undefined") return "alliance";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "pidc" ? "pidc" : "alliance";
}

function applyDocumentBrand(firm: FirmBrand) {
  document.title = `${firm.name} | M&E Dashboard`;

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = firm.favicon;
}

export function FirmProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<Session | null>(null);
  const [firmId, setFirmId] = useState<FirmId>("alliance");
  const [mounted, setMounted] = useState(false);

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

    if (canSwitch) {
      setFirmId(readStoredFirm());
      return;
    }

    setFirmId(getDefaultFirmForRole(role));
  }, [user, mounted]);

  const firm = FIRMS[firmId];

  useEffect(() => {
    applyFirmTheme(firmId);
  }, [firmId]);

  useEffect(() => {
    if (!mounted) return;
    applyDocumentBrand(firm);
  }, [firm, mounted]);

  const setFirm = useCallback(
    (nextFirmId: FirmId) => {
      if (!canRoleSwitchFirm(user?.role)) return;
      setFirmId(nextFirmId);
      localStorage.setItem(STORAGE_KEY, nextFirmId);
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
