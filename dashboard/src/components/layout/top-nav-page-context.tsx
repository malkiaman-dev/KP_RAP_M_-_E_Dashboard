"use client";

import { usePathname } from "next/navigation";
import { NAV_TABS } from "@/lib/auth/nav-tabs";

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

export function TopNavPageContext() {
  const pathname = usePathname();
  const { label, section } = getPageContext(pathname);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {section}
        </p>
        <p className="truncate text-sm font-semibold leading-tight text-foreground">
          {label}
        </p>
      </div>
      <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-2.5 py-1 text-[10px] font-medium text-teal md:inline-flex">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal" />
        </span>
        Live data
      </span>
    </div>
  );
}
