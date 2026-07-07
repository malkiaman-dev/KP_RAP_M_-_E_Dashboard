"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { isPathAllowed, NAV_TABS } from "@/lib/auth/nav-tabs";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

function getPageContext(pathname: string) {
  const match = NAV_TABS.filter(
    (tab) =>
      pathname === tab.href ||
      (tab.href !== "/" && pathname.startsWith(tab.href))
  ).sort((a, b) => b.href.length - a.href.length)[0];

  return (
    match ?? {
      href: "/",
      label: "Dashboard",
      section: "Overview",
      apis: [],
    }
  );
}

const JUMP_TO_HREFS = [
  "/surveys",
  "/surveys/errors",
  "/monitoring",
  "/reports",
] as const;

function isJumpLinkActive(pathname: string, href: string): boolean {
  if (href === "/surveys") return pathname === "/surveys";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNavPageContext() {
  const pathname = usePathname();
  const { allowedRoutes } = useAuth();
  const current = getPageContext(pathname);

  const quickLinks = JUMP_TO_HREFS.map((href) =>
    NAV_TABS.find((tab) => tab.href === href)
  ).filter(
    (tab): tab is (typeof NAV_TABS)[number] =>
      tab != null && isPathAllowed(allowedRoutes, tab.href)
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
      <div className="min-w-0 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {current.section}
        </p>
        <p className="truncate text-sm font-semibold leading-tight text-foreground">
          {current.label}
        </p>
      </div>

      <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-border/60 bg-card/40 px-2 py-1">
          <span className="shrink-0 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Jump to
          </span>
          {quickLinks.map((tab, index) => {
            const active = isJumpLinkActive(pathname, tab.href);

            return (
              <span key={tab.href} className="flex min-w-0 items-center">
                {index > 0 && (
                  <ChevronRight
                    className="mx-0.5 h-3 w-3 shrink-0 text-muted-foreground/35"
                    aria-hidden="true"
                  />
                )}
                {active ? (
                  <span
                    className="truncate rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                    aria-current="page"
                  >
                    {tab.label}
                  </span>
                ) : (
                  <Link
                    href={tab.href}
                    className={cn(
                      "truncate rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors",
                      "hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {tab.label}
                  </Link>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
