"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { FirmProvider } from "@/components/brand/firm-provider";
import { FieldPeriodProvider } from "@/components/filters/field-period-provider";
import type { ServerAuthState } from "@/lib/auth/server-auth";

export function Providers({
  children,
  initialAuth = null,
}: {
  children: React.ReactNode;
  initialAuth?: ServerAuthState | null;
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
      >
        <FirmProvider initialAuth={initialAuth}>
          <FieldPeriodProvider>{children}</FieldPeriodProvider>
        </FirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
