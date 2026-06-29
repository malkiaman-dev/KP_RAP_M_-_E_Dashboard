"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { loading, canAccess, defaultRoute } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !canAccess(pathname)) {
      router.replace(defaultRoute);
    }
  }, [loading, pathname, canAccess, defaultRoute, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  if (!canAccess(pathname)) {
    return null;
  }

  return <>{children}</>;
}
