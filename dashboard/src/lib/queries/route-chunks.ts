/** Preload heavy dynamic-import chunks before the user navigates. */

const loaded = new Set<string>();

function preloadOnce(key: string, loader: () => Promise<unknown>) {
  if (loaded.has(key)) return;
  loaded.add(key);
  void loader();
}

export function preloadRouteChunks(href: string) {
  if (href === "/" || href === "/analytics" || href === "/surveys") {
    preloadOnce("dashboard-charts", () =>
      import("@/components/dashboard/charts-section")
    );
    preloadOnce("dashboard-table", () =>
      import("@/components/dashboard/data-table")
    );
  }

  if (
    href === "/tracking" ||
    href === "/monitoring" ||
    href === "/reports" ||
    href === "/analytics"
  ) {
    preloadOnce("tracking-charts", () =>
      import("@/components/tracking/tracking-charts")
    );
    preloadOnce("tracking-secondary-kpis", () =>
      import("@/components/tracking/tracking-secondary-kpis")
    );
    preloadOnce("tracking-revisit", () =>
      import("@/components/tracking/tracking-revisit-section")
    );
    preloadOnce("tracking-duplicate", () =>
      import("@/components/tracking/tracking-duplicate-section")
    );
  }
}
