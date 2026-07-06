"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchAppQueries } from "@/lib/queries/app-data";

/** Warm common survey queries after the shell mounts so tab switches feel instant. */
export function PrefetchAppData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    prefetchAppQueries(queryClient);
  }, [queryClient]);

  return null;
}
