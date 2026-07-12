"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

export function FieldPeriodProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default ON per product requirement; hydrate from localStorage after mount.
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FIELD_PERIOD_STORAGE_KEY);
      if (stored === "0") setEnabledState(false);
      else if (stored === "1") setEnabledState(true);
    } catch {
      // Ignore storage failures (private mode, etc.).
    }
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      window.localStorage.setItem(FIELD_PERIOD_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage failures.
    }
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
