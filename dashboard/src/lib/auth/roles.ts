import type { Role } from "./types";

const ALL_ROUTES = [
  "/",
  "/analytics",
  "/reports",
  "/surveys",
  "/tracking",
  "/surveys/household",
  "/surveys/girls",
  "/surveys/errors",
  "/monitoring",
  "/team",
  "/settings",
] as const;

const TRACKING_ONLY_ROUTES = ["/tracking"] as const;
const TRACKING_ONLY_API = ["/api/tracking"] as const;

const ROLE_ROUTES: Record<Role, readonly string[]> = {
  malki: ALL_ROUTES,
  pidc: ["/tracking", "/monitoring", "/surveys/errors"],
  "world-bank": TRACKING_ONLY_ROUTES,
  piu: TRACKING_ONLY_ROUTES,
};

const ROLE_API_ROUTES: Record<Role, readonly string[]> = {
  malki: ["/api/tracking", "/api/errors", "/api/metrics"],
  pidc: ["/api/tracking", "/api/errors"],
  "world-bank": TRACKING_ONLY_API,
  piu: TRACKING_ONLY_API,
};

export const ROLE_LABELS: Record<Role, string> = {
  malki: "Malki",
  pidc: "PIDC",
  "world-bank": "World Bank",
  piu: "PIU",
};

export function getDefaultRoute(role: Role): string {
  return ROLE_ROUTES[role][0];
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  const routes = ROLE_ROUTES[role];
  if (routes.length === ALL_ROUTES.length) return true;

  return routes.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(route))
  );
}

export function canAccessApi(role: Role, pathname: string): boolean {
  const routes = ROLE_API_ROUTES[role];
  return routes.some((route) => pathname === route || pathname.startsWith(route));
}

export function isRouteAllowed(role: Role, href: string): boolean {
  return canAccessRoute(role, href);
}
