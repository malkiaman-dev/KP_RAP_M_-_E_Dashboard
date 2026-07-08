"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth/auth-provider";
import { RouteGuard } from "@/components/auth/route-guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { ServerAuthState } from "@/lib/auth/server-auth";

export function AppShell({
  children,
  initialAuth = null,
}: {
  children: React.ReactNode;
  initialAuth?: ServerAuthState | null;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthProvider initialAuth={initialAuth}>
      <DashboardShell>
        <RouteGuard>{children}</RouteGuard>
      </DashboardShell>
    </AuthProvider>
  );
}
