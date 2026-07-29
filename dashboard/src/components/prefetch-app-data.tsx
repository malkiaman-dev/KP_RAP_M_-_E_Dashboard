"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchAppQueries } from "@/lib/queries/app-data";
import { preloadRouteChunks } from "@/lib/queries/route-chunks";
import { useRouteCache } from "@/components/layout/route-cache";

/** Warm survey queries so tab switches feel instant. */
export function PrefetchAppData() {
  const queryClient = useQueryClient();
  const { displayPath } = useRouteCache();

  useEffect(() => {
    prefetchAppQueries(queryClient, displayPath);
    preloadRouteChunks(displayPath);
  }, [queryClient, displayPath]);

  return null;
}
