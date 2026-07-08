"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, canAccess, defaultRoute, refreshAuth, authError } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      void refreshAuth().then((result) => {
        if (result === "unauthenticated") {
          router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        }
      });
      return;
    }

    if (!canAccess(pathname)) {
      router.replace(defaultRoute);
    }
  }, [
    loading,
    user,
    pathname,
    canAccess,
    defaultRoute,
    router,
    refreshAuth,
  ]);

  useEffect(() => {
    if (loading || user || !authError) return;

    const timer = window.setInterval(() => {
      void refreshAuth();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [loading, user, authError, refreshAuth]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          {authError
            ? "Reconnecting to your session…"
            : "Checking your session…"}
        </p>
        {authError && (
          <button
            type="button"
            onClick={() => void refreshAuth()}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Retry now
          </button>
        )}
      </div>
    );
  }

  if (!canAccess(pathname)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
