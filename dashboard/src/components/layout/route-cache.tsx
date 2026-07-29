"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";

const MAX_CACHED_ROUTES = 12;

type RouteCacheApi = {
  displayPath: string;
  pendingPath: string | null;
  navigate: (href: string) => void;
  isCached: (href: string) => boolean;
  isNavigating: boolean;
};

const RouteCacheContext = createContext<RouteCacheApi>({
  displayPath: "/",
  pendingPath: null,
  navigate: () => {},
  isCached: () => false,
  isNavigating: false,
});

const RouteCachePanesContext = createContext<React.ReactNode>(null);

export function useRouteCache() {
  return useContext(RouteCacheContext);
}

function touchOrder(order: string[], path: string) {
  const next = order.filter((p) => p !== path);
  next.push(path);
  return next;
}

/**
 * Keeps recently visited tabs mounted for instant flips.
 * Always keeps the Next.js router in sync with the URL.
 * Caches only after pathname + page children have committed together
 * (never during render — that caused wrong pages under the wrong URL).
 */
export function RouteCacheProvider({
  page,
  children,
}: {
  page: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const cacheRef = useRef(new Map<string, React.ReactNode>());
  const orderRef = useRef<string[]>([]);
  const displayPathRef = useRef(pathname);
  const [displayPath, setDisplayPath] = useState(pathname);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [, startTransition] = useTransition();

  displayPathRef.current = displayPath;

  // Commit the matching page into the cache after Next finishes navigating.
  useEffect(() => {
    cacheRef.current.set(pathname, page);
    orderRef.current = touchOrder(orderRef.current, pathname);

    while (orderRef.current.length > MAX_CACHED_ROUTES) {
      const evict = orderRef.current.shift();
      if (
        evict &&
        evict !== pathname &&
        evict !== displayPathRef.current
      ) {
        cacheRef.current.delete(evict);
      }
    }

    setDisplayPath(pathname);
    setPendingPath(null);
    setCacheVersion((v) => v + 1);
  }, [pathname, page]);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      if (cacheRef.current.has(path)) {
        setDisplayPath(path);
        setPendingPath(null);
      } else {
        setPendingPath(path);
      }
      startTransition(() => {
        router.replace(path);
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [router]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [displayPath]);

  const isCached = useCallback(
    (href: string) => cacheRef.current.has(href),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheVersion]
  );

  const navigate = useCallback(
    (href: string) => {
      if (href === displayPath && !pendingPath && pathname === href) return;

      // Show cached pane immediately while Next syncs the route.
      if (cacheRef.current.has(href)) {
        setDisplayPath(href);
        setPendingPath(null);
      } else {
        setPendingPath(href);
      }

      startTransition(() => {
        router.push(href);
      });
    },
    [displayPath, pendingPath, pathname, router]
  );

  void cacheVersion;

  const panes = (
    <div className="relative">
      {[...cacheRef.current.entries()].map(([path, node]) => {
        const active = path === displayPath;
        return (
          <div
            key={path}
            aria-hidden={!active}
            className={
              active
                ? "relative animate-[tabFade_120ms_ease-out]"
                : "pointer-events-none invisible absolute inset-x-0 top-0 -z-10 w-full [content-visibility:auto]"
            }
          >
            {node}
          </div>
        );
      })}
    </div>
  );

  return (
    <RouteCacheContext.Provider
      value={{
        displayPath,
        pendingPath,
        navigate,
        isCached,
        isNavigating: pendingPath != null && pendingPath !== displayPath,
      }}
    >
      <RouteCachePanesContext.Provider value={panes}>
        {children}
      </RouteCachePanesContext.Provider>
    </RouteCacheContext.Provider>
  );
}

export function RouteCacheOutlet() {
  return <>{useContext(RouteCachePanesContext)}</>;
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
