"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth/auth-provider";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
