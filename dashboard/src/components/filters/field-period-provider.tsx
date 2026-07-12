"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  FIELD_PERIOD_START,
  FIELD_PERIOD_START_LABEL,
  FIELD_PERIOD_STORAGE_KEY,
  fieldPeriodDateFrom,
} from "@/lib/data/field-period";

interface FieldPeriodContextValue {
  /** When true, dashboards default to submissions from FIELD_PERIOD_START onward. */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  dateFrom: string;
  startIso: string;
  startLabel: string;
}

const FieldPeriodContext = createContext<FieldPeriodContextValue | null>(null);

const DEFAULT_ENABLED = true;

function readStoredEnabled(): boolean {
  try {
    const stored = window.localStorage.getItem(FIELD_PERIOD_STORAGE_KEY);
    if (stored === "0") return false;
    if (stored === "1") return true;
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
  return DEFAULT_ENABLED;
}

/** Notify subscribers when this tab updates the preference. */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === FIELD_PERIOD_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function emitChange() {
  for (const listener of listeners) listener();
}

function getServerSnapshot() {
  // Must match SSR HTML during hydration — never read localStorage here.
  return DEFAULT_ENABLED;
}

export function FieldPeriodProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = useSyncExternalStore(
    subscribe,
    readStoredEnabled,
    getServerSnapshot
  );

  const setEnabled = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(FIELD_PERIOD_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage failures.
    }
    emitChange();
  }, []);

  const value = useMemo<FieldPeriodContextValue>(
    () => ({
      enabled,
      setEnabled,
      dateFrom: fieldPeriodDateFrom(enabled),
      startIso: FIELD_PERIOD_START,
      startLabel: FIELD_PERIOD_START_LABEL,
    }),
    [enabled, setEnabled]
  );

  return (
    <FieldPeriodContext.Provider value={value}>
      {children}
    </FieldPeriodContext.Provider>
  );
}

export function useFieldPeriod(): FieldPeriodContextValue {
  const ctx = useContext(FieldPeriodContext);
  if (!ctx) {
    throw new Error("useFieldPeriod must be used within FieldPeriodProvider");
  }
  return ctx;
}

/** Apply / clear the field-period start on an existing filter object's dateFrom. */
export function applyFieldPeriodDateFrom<T extends { dateFrom: string }>(
  filters: T,
  enabled: boolean
): T {
  return {
    ...filters,
    dateFrom: fieldPeriodDateFrom(enabled),
  };
}
