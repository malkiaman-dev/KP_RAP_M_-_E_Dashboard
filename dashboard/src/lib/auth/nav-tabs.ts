export interface NavTab {
  href: string;
  label: string;
  section: string;
  apis: string[];
}

export const NAV_TABS: NavTab[] = [
  { href: "/", label: "Dashboard", section: "Overview", apis: ["/api/metrics"] },
  { href: "/analytics", label: "Analytics", section: "Overview", apis: [] },
  { href: "/reports", label: "Reports", section: "Overview", apis: ["/api/tracking"] },
  { href: "/surveys", label: "All Surveys", section: "Surveys", apis: ["/api/metrics", "/api/errors"] },
  { href: "/tracking", label: "Tracking", section: "Surveys", apis: ["/api/tracking"] },
  {
    href: "/surveys/household",
    label: "Household",
    section: "Surveys",
    apis: ["/api/metrics"],
  },
  { href: "/surveys/girls", label: "Girls", section: "Surveys", apis: ["/api/metrics"] },
  {
    href: "/surveys/errors",
    label: "Error Report",
    section: "Surveys",
    apis: ["/api/errors"],
  },
  { href: "/monitoring", label: "Monitoring", section: "Surveys", apis: ["/api/tracking"] },
  {
    href: "/team",
    label: "Team Management",
    section: "Organization",
    apis: ["/api/team"],
  },
  { href: "/settings", label: "Settings", section: "Organization", apis: [] },
];

export const NAV_SECTIONS = [...new Set(NAV_TABS.map((tab) => tab.section))];

export const ALL_TAB_HREFS = NAV_TABS.map((tab) => tab.href);

export function getTabsBySection(): { label: string; items: NavTab[] }[] {
  return NAV_SECTIONS.map((section) => ({
    label: section,
    items: NAV_TABS.filter((tab) => tab.section === section),
  }));
}

export function getApisForRoutes(routes: string[]): string[] {
  const apis = new Set<string>();

  for (const tab of NAV_TABS) {
    if (routes.includes(tab.href)) {
      for (const api of tab.apis) {
        apis.add(api);
      }
    }
  }

  return [...apis];
}

export function isPathAllowed(allowedRoutes: string[], pathname: string): boolean {
  return allowedRoutes.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(route))
  );
}
