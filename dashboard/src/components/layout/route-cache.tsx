"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type RouteCacheApi = {
  displayPath: string;
  pendingPath: string | null;
  navigate: (href: string) => void;
  isNavigating: boolean;
};

const RouteCacheContext = createContext<RouteCacheApi>({
  displayPath: "/",
  pendingPath: null,
  navigate: () => {},
  isNavigating: false,
});

const RoutePageContext = createContext<React.ReactNode>(null);

export function useRouteCache() {
  return useContext(RouteCacheContext);
}

// Next owns the page lifecycle. QueryClient keeps previously fetched data warm.
// Retaining multiple Next page slots renders copies of the current route.
export function RouteCacheProvider({
  page,
  children,
}: {
  page: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isNavigating = isPending && pendingPath !== pathname;

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname) return;
      setPendingPath(href);
      startTransition(() => router.push(href));
    },
    [pathname, router]
  );

  return (
    <RouteCacheContext.Provider
      value={{
        displayPath: pathname,
        pendingPath: isNavigating ? pendingPath : null,
        navigate,
        isNavigating,
      }}
    >
      <RoutePageContext.Provider value={page}>
        {children}
      </RoutePageContext.Provider>
    </RouteCacheContext.Provider>
  );
}

export function RouteCacheOutlet() {
  return <>{useContext(RoutePageContext)}</>;
}

export function TabNavProgress() {
  const { isNavigating } = useRouteCache();
  if (!isNavigating) return null;
  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/10"
      aria-hidden="true"
    >
      <div className="h-full w-1/3 animate-[tabProgress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  );
}
