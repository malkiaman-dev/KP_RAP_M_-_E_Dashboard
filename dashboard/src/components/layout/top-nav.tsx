"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Search,
  Sun,
  Moon,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopNavProps {
  sidebarWidth: number;
}

export function TopNav({ sidebarWidth }: TopNavProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={false}
      animate={{ marginLeft: sidebarWidth }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/60 px-6 transition-shadow duration-300",
        scrolled
          ? "bg-background/80 shadow-md shadow-black/[0.04] backdrop-blur-xl dark:shadow-black/20"
          : "bg-background/60 backdrop-blur-sm"
      )}
    >
      <div className="flex flex-1 items-center gap-4">
        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search surveys, enumerators, beneficiaries..."
            className="h-10 w-full rounded-xl border border-border bg-card/50 pl-10 pr-16 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Global search"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </button>
        )}

        <button
          className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 pr-3 transition-colors hover:bg-muted"
          aria-label="User profile"
        >
          <Image
            src="/executive-user.jpg"
            alt="Executive User"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg object-cover"
          />
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold leading-none">Executive User</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Admin</p>
          </div>
        </button>
      </div>
    </motion.header>
  );
}
