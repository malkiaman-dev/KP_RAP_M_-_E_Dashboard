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
  getDefaultFirmForRole,
  persistFirmPreference,
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
  // Server cookie/RSC snapshot is the only source of truth for the first paint.
  const [firmId, setFirmId] = useState<FirmId>(initialFirmId);

  const effectiveRole = user?.role ?? initialAuth?.user.role ?? null;
  const canSwitch = canRoleSwitchFirm(effectiveRole);

  // Keep client state aligned when the server sends a new firm (e.g. after refresh).
  useEffect(() => {
    setFirmId(initialFirmId);
  }, [initialFirmId]);

  useLayoutEffect(() => {
    applyFirmTheme(firmId);
  }, [firmId]);

  // After mount: lock role-based firms, or mirror the server firm into storage.
  // Never override the server firm from localStorage — that caused hydration mismatches.
  useEffect(() => {
    if (!canSwitch || firmLocked) {
      const lockedFirm = getDefaultFirmForRole(effectiveRole);
      setFirmId(lockedFirm);
      document.documentElement.dataset.firm = lockedFirm;
      applyFirmTheme(lockedFirm);
      return;
    }

    persistFirmPreference(firmId);
    applyFirmTheme(firmId);
  }, [effectiveRole, canSwitch, firmLocked, firmId]);

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
      canSwitchFirm: canSwitch && !firmLocked,
      setFirm,
    }),
    [firmId, firm, canSwitch, firmLocked, setFirm]
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
