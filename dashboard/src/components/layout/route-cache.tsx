"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";

const MAX_CACHED_ROUTES = 10;

/**
 * Keeps recently visited route trees mounted (hidden) so switching sidebar tabs
 * reuses existing component state instead of remounting heavy pages.
 */
export function RouteCache({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cacheRef = useRef(new Map<string, React.ReactNode>());
  const orderRef = useRef<string[]>([]);

  cacheRef.current.set(pathname, children);

  if (!orderRef.current.includes(pathname)) {
    orderRef.current.push(pathname);
  } else {
    orderRef.current = [
      ...orderRef.current.filter((p) => p !== pathname),
      pathname,
    ];
  }

  while (orderRef.current.length > MAX_CACHED_ROUTES) {
    const evict = orderRef.current.shift();
    if (evict && evict !== pathname) {
      cacheRef.current.delete(evict);
    }
  }

  const entries = [...cacheRef.current.entries()];

  return (
    <>
      {entries.map(([path, node]) => {
        const active = path === pathname;
        return (
          <div
            key={path}
            hidden={!active}
            aria-hidden={!active}
            className={active ? undefined : "hidden"}
          >
            {node}
          </div>
        );
      })}
    </>
  );
}
