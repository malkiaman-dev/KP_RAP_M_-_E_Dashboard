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
import type { Session } from "@/lib/auth/types";

interface AuthContextValue {
  user: Session | null;
  allowedRoutes: string[];
  defaultRoute: string;
  loading: boolean;
  canAccess: (href: string) => boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Session | null>(null);
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);
  const [defaultRoute, setDefaultRoute] = useState("/");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshAuth = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      setUser(null);
      setAllowedRoutes([]);
      setDefaultRoute("/");
      return;
    }

    const data = await res.json();
    setUser(data.user ?? null);
    setAllowedRoutes(data.allowedRoutes ?? []);
    setDefaultRoute(data.defaultRoute ?? "/");
  }, []);

  useEffect(() => {
    refreshAuth().finally(() => setLoading(false));
  }, [refreshAuth]);

  const canAccess = useCallback(
    (href: string) => isPathAllowed(allowedRoutes, href),
    [allowedRoutes]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setAllowedRoutes([]);
    setDefaultRoute("/");
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        allowedRoutes,
        defaultRoute,
        loading,
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
