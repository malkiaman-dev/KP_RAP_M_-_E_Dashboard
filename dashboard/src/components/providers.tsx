"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { FirmProvider } from "@/components/brand/firm-provider";
import { FieldPeriodProvider } from "@/components/filters/field-period-provider";
import type { ServerAuthState } from "@/lib/auth/server-auth";
import type { FirmId } from "@/lib/brand";

export function Providers({
  children,
  initialAuth = null,
  initialFirmId,
  firmLocked = false,
}: {
  children: React.ReactNode;
  initialAuth?: ServerAuthState | null;
  initialFirmId: FirmId;
  firmLocked?: boolean;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange={false}
        // React 19 / Next 16: avoid client re-execution warning for the
        // blocking theme script (browser already ran the SSR-emitted copy).
        scriptProps={
          typeof window === "undefined"
            ? undefined
            : ({ type: "application/json" } as const)
        }
      >
        <FirmProvider
          initialAuth={initialAuth}
          initialFirmId={initialFirmId}
          firmLocked={firmLocked}
        >
          <FieldPeriodProvider>{children}</FieldPeriodProvider>
        </FirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
