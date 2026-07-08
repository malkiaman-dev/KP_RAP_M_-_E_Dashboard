"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  ClipboardList,
  MapPin,
  Activity,
  AlertTriangle,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/components/auth/auth-provider";
import { getTabsBySection, isNavTabActive } from "@/lib/auth/nav-tabs";
import { ROLE_LABELS } from "@/lib/auth/roles";
import {
  fetchDashboardMetrics,
  fetchHhGirlsMetrics,
  fetchTrackingExports,
  fetchTrackingMetrics,
  QUERY_STALE_MS,
  DASHBOARD_METRICS_QUERY_KEY,
  HH_GIRLS_METRICS_QUERY_KEY,
  TRACKING_EXPORTS_QUERY_KEY,
  TRACKING_METRICS_QUERY_KEY,
} from "@/lib/queries/app-data";
import type { LucideIcon } from "lucide-react";

/** Tracks whether the viewport is below the `lg` breakpoint (drawer mode). */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

const TAB_ICONS: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/analytics": BarChart3,
  "/reports": FileText,
  "/surveys": ClipboardList,
  "/tracking": MapPin,
  "/surveys/hh-girls": ClipboardList,
  "/surveys/errors": AlertTriangle,
  "/monitoring": Activity,
  "/team": UserCog,
  "/settings": Settings,
};

const navSections = getTabsBySection().map((section) => ({
  ...section,
  items: section.items.map((item) => ({
    ...item,
    icon: TAB_ICONS[item.href] ?? ClipboardList,
  })),
}));

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { canAccess, user } = useAuth();
  const isMobile = useIsMobile();
  // On mobile the drawer is always full-width; collapse only applies on desktop.
  const effectiveCollapsed = collapsed && !isMobile;

  const prefetchRoute = (href: string) => {
    if (
      href === "/" ||
      href === "/analytics" ||
      href === "/surveys" ||
      href === "/surveys/hh-girls"
    ) {
      void queryClient.prefetchQuery({
        queryKey: [...DASHBOARD_METRICS_QUERY_KEY],
        queryFn: fetchDashboardMetrics,
        staleTime: QUERY_STALE_MS,
      });
      if (href === "/surveys/hh-girls") {
        void queryClient.prefetchQuery({
          queryKey: [...HH_GIRLS_METRICS_QUERY_KEY],
          queryFn: fetchHhGirlsMetrics,
          staleTime: QUERY_STALE_MS,
        });
      }
      return;
    }

    if (
      href === "/tracking" ||
      href === "/monitoring" ||
      href === "/reports"
    ) {
      void queryClient.prefetchQuery({
        queryKey: [...TRACKING_METRICS_QUERY_KEY],
        queryFn: fetchTrackingMetrics,
        staleTime: QUERY_STALE_MS,
      });
      if (href === "/tracking") {
        void queryClient.prefetchQuery({
          queryKey: [...TRACKING_EXPORTS_QUERY_KEY],
          queryFn: fetchTrackingExports,
          staleTime: QUERY_STALE_MS,
        });
      }
    }
  };

  return (
    <>
      <div
        onClick={onMobileClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-sidebar shadow-lg shadow-black/[0.03] transition-[width,transform] duration-300 dark:shadow-black/20",
          "w-[260px]",
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
        aria-label="Main navigation"
      >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Logo collapsed={effectiveCollapsed} />
        <button
          onClick={onToggle}
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onMobileClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" role="navigation">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <AnimatePresence>
              {!effectiveCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = isNavTabActive(pathname, item.href);
                const Icon = item.icon;
                const allowed = canAccess(item.href);
                const locked = !allowed;

                if (locked) {
                  return (
                    <li key={item.href}>
                      <div
                        title="Locked for your role"
                        className={cn(
                          "group relative flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                          "text-muted-foreground/50"
                        )}
                        aria-disabled="true"
                      >
                        <Icon className="relative z-10 h-[18px] w-[18px] shrink-0 opacity-50" />
                        <AnimatePresence>
                          {!effectiveCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              className="relative z-10 flex flex-1 items-center justify-between truncate"
                            >
                              <span className="truncate">{item.label}</span>
                              <Lock className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {effectiveCollapsed && (
                          <Lock className="absolute bottom-1 right-2 h-2.5 w-2.5 opacity-60" />
                        )}
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      onMouseEnter={() => prefetchRoute(item.href)}
                      onFocus={() => prefetchRoute(item.href)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "text-primary"
                          : "text-sidebar-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {isActive && (
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 rounded-xl bg-primary/10 dark:bg-primary/15"
                        />
                      )}
                      {isActive && (
                        <div
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary glow-teal"
                        />
                      )}
                      <Icon
                        className={cn(
                          "relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                          isActive && "text-primary"
                        )}
                      />
                      <AnimatePresence>
                        {!effectiveCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            className="relative z-10 truncate"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div
          className={cn(
            "glass-card rounded-xl p-3",
            effectiveCollapsed && "flex justify-center p-2"
          )}
        >
          {!effectiveCollapsed ? (
            <div>
              <p className="text-xs font-medium text-foreground">KPRAP Project</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {user ? ROLE_LABELS[user.role] : "SurveyCTO Live Data"}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
                </span>
                <span className="text-[10px] font-medium text-teal">Live</span>
              </div>
            </div>
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
            </span>
          )}
        </div>
      </div>
      </aside>
    </>
  );
}
