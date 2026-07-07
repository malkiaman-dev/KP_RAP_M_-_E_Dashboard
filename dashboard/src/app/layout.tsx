import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import { FIRM_THEME_BOOTSTRAP, FIRMS } from "@/lib/brand";
import { getServerFirmContext } from "@/lib/brand-server";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { firmId } = await getServerFirmContext();
  const firm = FIRMS[firmId];

  return {
    title: `${firm.name} | M&E Dashboard`,
    description:
      "Enterprise monitoring and evaluation platform for survey tracking, field operations, and impact analytics.",
    icons: {
      icon: [{ url: `${firm.favicon}?firm=${firmId}`, type: "image/png" }],
      apple: [{ url: `${firm.favicon}?firm=${firmId}`, type: "image/png" }],
      shortcut: [{ url: `${firm.favicon}?firm=${firmId}`, type: "image/png" }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { firmId, locked } = await getServerFirmContext();

  return (
    <html
      lang="en"
      data-firm={firmId}
      data-firm-locked={locked ? "true" : undefined}
      suppressHydrationWarning
      className={`${dmSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: FIRM_THEME_BOOTSTRAP }} />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full bg-background font-sans antialiased"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
