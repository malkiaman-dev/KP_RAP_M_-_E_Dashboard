"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { isPathAllowed } from "@/lib/auth/nav-tabs";
import type { ServerAuthState } from "@/lib/auth/server-auth";
import type { Session } from "@/lib/auth/types";

export type AuthRefreshResult = "authenticated" | "unauthenticated" | "error";

interface AuthContextValue {
  user: Session | null;
  allowedRoutes: string[];
  defaultRoute: string;
  loading: boolean;
  authError: boolean;
  canAccess: (href: string) => boolean;
  refreshAuth: () => Promise<AuthRefreshResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialAuth = null,
}: {
  children: React.ReactNode;
  initialAuth?: ServerAuthState | null;
}) {
  const [user, setUser] = useState<Session | null>(initialAuth?.user ?? null);
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>(
    initialAuth?.allowedRoutes ?? []
  );
  const [defaultRoute, setDefaultRoute] = useState(
    initialAuth?.defaultRoute ?? "/"
  );
  const [loading, setLoading] = useState(!initialAuth);
  const [authError, setAuthError] = useState(false);
  const router = useRouter();

  const applyAuth = useCallback((state: ServerAuthState | null) => {
    if (!state) {
      setUser(null);
      setAllowedRoutes([]);
      setDefaultRoute("/");
      return;
    }

    setUser(state.user);
    setAllowedRoutes(state.allowedRoutes);
    setDefaultRoute(state.defaultRoute);
  }, []);

  const refreshAuth = useCallback(async (): Promise<AuthRefreshResult> => {
    try {
      const res = await fetch("/api/auth/me");

      if (res.status === 401) {
        applyAuth(null);
        setAuthError(false);
        return "unauthenticated";
      }

      if (!res.ok) {
        setAuthError(true);
        return "error";
      }

      const data = (await res.json()) as ServerAuthState & { user: Session };
      if (!data.user) {
        applyAuth(null);
        setAuthError(false);
        return "unauthenticated";
      }

      applyAuth({
        user: data.user,
        allowedRoutes: data.allowedRoutes ?? [],
        defaultRoute: data.defaultRoute ?? "/",
      });
      setAuthError(false);
      return "authenticated";
    } catch {
      setAuthError(true);
      return "error";
    }
  }, [applyAuth]);

  useEffect(() => {
    let cancelled = false;

    async function syncAuth() {
      // Server already hydrated a valid session — skip the immediate /api/auth/me
      // round-trip so the first paint is not blocked on auth.
      if (initialAuth?.user) {
        setLoading(false);
        return;
      }

      if (initialAuth) {
        setLoading(false);
      }

      for (let attempt = 0; attempt < 8; attempt++) {
        if (cancelled) return;

        const result = await refreshAuth();
        if (result === "authenticated" || result === "unauthenticated") {
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 750 * (attempt + 1))
        );
      }

      if (!cancelled) setLoading(false);
    }

    void syncAuth();

    return () => {
      cancelled = true;
    };
  }, [initialAuth, refreshAuth]);

  const canAccess = useCallback(
    (href: string) => isPathAllowed(allowedRoutes, href),
    [allowedRoutes]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    applyAuth(null);
    setAuthError(false);
    router.push("/login");
    router.refresh();
  }, [applyAuth, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        allowedRoutes,
        defaultRoute,
        loading,
        authError,
        canAccess,
        refreshAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
