"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchAppQueries } from "@/lib/queries/app-data";
import { preloadRouteChunks } from "@/lib/queries/route-chunks";

/** Warm survey queries after the shell mounts so tab switches feel instant. */
export function PrefetchAppData() {
  const queryClient = useQueryClient();
  const pathname = usePathname();

  useEffect(() => {
    prefetchAppQueries(queryClient, pathname);
    preloadRouteChunks(pathname);
  }, [queryClient, pathname]);

  return null;
}
