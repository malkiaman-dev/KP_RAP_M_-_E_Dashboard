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
  type FirmBrand,
  type FirmId,
  type FirmPalette,
} from "@/lib/brand";
import type { ServerAuthState } from "@/lib/auth/server-auth";
import type { Session } from "@/lib/auth/types";

interface FirmContextValue {
  firmId: FirmId;
  firm: FirmBrand;
  palette: FirmPalette;
  canSwitchFirm: boolean;
  setFirm: (firmId: FirmId) => void;
}

const FirmContext = createContext<FirmContextValue | null>(null);

function readStoredFirm(): FirmId | null {
  if (typeof window === "undefined") return null;
  return parseFirmPreference(localStorage.getItem(FIRM_STORAGE_KEY));
}

export function FirmProvider({
  children,
  initialAuth = null,
  initialFirmId,
  firmLocked = false,
}: {
  children: React.ReactNode;
  initialAuth?: ServerAuthState | null;
  /** Must match the SSR `data-firm` / cookie so hydration stays consistent. */
  initialFirmId: FirmId;
  firmLocked?: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState<Session | null>(initialAuth?.user ?? null);
  // Always start from the server snapshot — never localStorage during init.
  const [firmId, setFirmId] = useState<FirmId>(initialFirmId);

  const effectiveRole = user?.role ?? initialAuth?.user.role ?? null;
  const canSwitch = canRoleSwitchFirm(effectiveRole);

  useLayoutEffect(() => {
    applyFirmTheme(firmId);
  }, [firmId]);

  useLayoutEffect(() => {
    if (!canSwitch || firmLocked) {
      const lockedFirm = getDefaultFirmForRole(effectiveRole);
      setFirmId(lockedFirm);
      document.documentElement.dataset.firm = lockedFirm;
      applyFirmTheme(lockedFirm);
      return;
    }

    const stored = readStoredFirm();
    if (!stored || stored === firmId) {
      persistFirmPreference(firmId);
      applyFirmTheme(firmId);
      return;
    }

    setFirmId(stored);
    persistFirmPreference(stored);
    applyFirmTheme(stored);
    router.refresh();
  }, [effectiveRole, canSwitch, firmLocked]); // eslint-disable-line react-hooks/exhaustive-deps -- hydrate once per role/lock

  useEffect(() => {
    if (initialAuth?.user) {
      setUser(initialAuth.user);
      return;
    }

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, [initialAuth?.user]);

  const setFirm = useCallback(
    (nextFirmId: FirmId) => {
      if (!canRoleSwitchFirm(effectiveRole)) return;
      setFirmId(nextFirmId);
      persistFirmPreference(nextFirmId);
      applyFirmTheme(nextFirmId);
      router.refresh();
    },
    [effectiveRole, router]
  );

  const firm = FIRMS[firmId];

  const value = useMemo(
    () => ({
      firmId,
      firm,
      palette: firm.palette,
      canSwitchFirm: canSwitch,
      setFirm,
    }),
    [firmId, firm, canSwitch, setFirm]
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
