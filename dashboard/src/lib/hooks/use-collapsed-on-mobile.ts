"use client";

import { useEffect, useState } from "react";

/**
 * Returns expand/collapse state for panels that should start collapsed on
 * mobile (<= 767px) and expanded on larger screens.
 */
export function useCollapsedOnMobile() {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
    ) {
      setExpanded(false);
    }
  }, []);

  return [expanded, setExpanded] as const;
}
