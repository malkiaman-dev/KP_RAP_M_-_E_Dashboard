import type { Metadata } from "next";
import { PROJECT_BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${PROJECT_BRAND.name} | Sign In`,
  icons: {
    icon: [{ url: `${PROJECT_BRAND.logo}?page=login`, type: "image/png" }],
    apple: [{ url: `${PROJECT_BRAND.logo}?page=login`, type: "image/png" }],
    shortcut: [{ url: `${PROJECT_BRAND.logo}?page=login`, type: "image/png" }],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
