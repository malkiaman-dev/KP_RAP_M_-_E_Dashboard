import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  ALL_TAB_HREFS,
  getApisForRoutes,
  isPathAllowed,
  NAV_TABS,
  type NavTab,
} from "./nav-tabs";
import type { Role } from "./types";

interface PermissionsFile {
  roles: Record<Role, string[]>;
}

const MALKI_REQUIRED_TABS = ["/team"];

let cachedPermissions: PermissionsFile | null = null;

export function permissionsPath(): string {
  return join(process.cwd(), "data", "role-permissions.json");
}

function serializePermissions(permissions: PermissionsFile): string {
  return `${JSON.stringify(permissions, null, 2)}\n`;
}

export function getPermissionsFileContent(): string {
  return serializePermissions(getPermissions());
}

const DEFAULT_PERMISSIONS: PermissionsFile = {
  roles: {
    malki: [...ALL_TAB_HREFS],
    pidc: ["/tracking", "/monitoring", "/surveys/errors"],
    "world-bank": ["/tracking"],
    piu: ["/tracking"],
  },
};

export function getPermissions(): PermissionsFile {
  if (cachedPermissions) return cachedPermissions;

  try {
    const raw = readFileSync(permissionsPath(), "utf-8");
    cachedPermissions = JSON.parse(raw) as PermissionsFile;
    return cachedPermissions;
  } catch {
    cachedPermissions = DEFAULT_PERMISSIONS;
    return cachedPermissions;
  }
}

export function savePermissions(permissions: PermissionsFile): void {
  cachedPermissions = permissions;
  try {
    writeFileSync(permissionsPath(), serializePermissions(permissions), "utf-8");
  } catch {
    // Read-only filesystem: persistence is handled by committing to GitHub.
  }
}

export function getAllowedRoutes(role: Role): string[] {
  const permissions = getPermissions();
  return permissions.roles[role] ?? [];
}

export function getDefaultRoute(role: Role): string {
  const routes = getAllowedRoutes(role);
  return routes[0] ?? "/tracking";
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  return isPathAllowed(getAllowedRoutes(role), pathname);
}

export function canAccessApi(role: Role, pathname: string): boolean {
  const apis = getApisForRoutes(getAllowedRoutes(role));
  return apis.some((api) => pathname === api || pathname.startsWith(api));
}

export function isRouteAllowed(role: Role, href: string): boolean {
  return canAccessRoute(role, href);
}

export function getAllRolePermissions(): Record<Role, string[]> {
  return getPermissions().roles;
}

function validateRoutes(routes: string[]): string[] {
  const unique = [...new Set(routes.filter((route) => ALL_TAB_HREFS.includes(route)))];

  if (unique.length === 0) {
    throw new Error("At least one tab must be enabled");
  }

  return unique;
}

export function updateRoleTabAccess(role: Role, routes: string[]): string[] {
  const permissions = getPermissions();
  let validated = validateRoutes(routes);

  if (role === "malki") {
    for (const required of MALKI_REQUIRED_TABS) {
      if (!validated.includes(required)) {
        validated = [...validated, required];
      }
    }
  }

  permissions.roles[role] = validated;
  savePermissions(permissions);
  return validated;
}

export function getPermissionTabs(): Pick<NavTab, "href" | "label" | "section">[] {
  return NAV_TABS.map((tab) => ({
    href: tab.href,
    label: tab.label,
    section: tab.section,
  }));
}
