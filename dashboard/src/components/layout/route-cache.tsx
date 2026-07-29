"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

const MAX_CACHED_ROUTES = 10;

type RouteCacheApi = {
  /** Instantly show a cached tab, then sync the URL. Returns true if cached. */
  switchTab: (href: string) => boolean;
  /** Currently visible tab (may lead the URL during optimistic switches). */
  displayPath: string;
};

const RouteCacheContext = createContext<RouteCacheApi>({
  switchTab: () => false,
  displayPath: "/",
});

const RouteCachePanesContext = createContext<React.ReactNode>(null);

export function useRouteCache() {
  return useContext(RouteCacheContext);
}

/**
 * Keeps visited pages mounted and enables instant sidebar tab switches.
 * Wrap the shell; render `<RouteCacheOutlet />` where page content goes.
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
  const [displayPath, setDisplayPath] = useState(pathname);

  // Cache each route only once — never replace with a remounted tree.
  if (!cacheRef.current.has(pathname)) {
    cacheRef.current.set(pathname, page);
    if (!orderRef.current.includes(pathname)) {
      orderRef.current.push(pathname);
    }

    while (orderRef.current.length > MAX_CACHED_ROUTES) {
      const evict = orderRef.current.shift();
      if (evict && evict !== pathname && evict !== displayPath) {
        cacheRef.current.delete(evict);
      }
    }
  }

  useEffect(() => {
    setDisplayPath(pathname);
  }, [pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [displayPath]);

  const switchTab = useCallback(
    (href: string) => {
      if (href === displayPath) return true;
      if (cacheRef.current.has(href)) {
        setDisplayPath(href);
        router.push(href);
        return true;
      }
      return false;
    },
    [displayPath, router]
  );

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
                ? "relative animate-[tabFade_140ms_ease-out]"
                : "pointer-events-none invisible absolute inset-x-0 top-0 -z-10 w-full"
            }
          >
            {node}
          </div>
        );
      })}
    </div>
  );

  return (
    <RouteCacheContext.Provider value={{ switchTab, displayPath }}>
      <RouteCachePanesContext.Provider value={panes}>
        {children}
      </RouteCachePanesContext.Provider>
    </RouteCacheContext.Provider>
  );
}

export function RouteCacheOutlet() {
  return <>{useContext(RouteCachePanesContext)}</>;
}
