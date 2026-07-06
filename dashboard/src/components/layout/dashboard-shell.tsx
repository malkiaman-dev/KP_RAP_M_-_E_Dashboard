"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { PrefetchAppData } from "@/components/prefetch-app-data";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const sidebarWidth = collapsed ? 72 : 260;

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div
      className="mesh-bg min-h-screen"
      style={{ "--sidebar-w": `${sidebarWidth}px` } as React.CSSProperties}
    >
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <PrefetchAppData />
      <div className="min-h-screen transition-[margin] duration-300 lg:ml-(--sidebar-w)">
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8" id="main-content" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
