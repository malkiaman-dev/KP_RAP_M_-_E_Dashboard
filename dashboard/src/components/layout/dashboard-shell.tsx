"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <div className="mesh-bg min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className="min-h-screen transition-[margin] duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <TopNav sidebarWidth={0} />
        <main className="p-6 lg:p-8" id="main-content" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
