"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/components/auth/auth-provider";
import { ROLE_LABELS } from "@/lib/auth/roles";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Surveys",
    items: [
      { href: "/surveys", label: "All Surveys", icon: ClipboardList },
      { href: "/tracking", label: "Tracking", icon: MapPin },
      { href: "/surveys/household", label: "Household", icon: ClipboardList },
      { href: "/surveys/girls", label: "Girls", icon: ClipboardList },
      { href: "/surveys/errors", label: "Error Report", icon: AlertTriangle },
      { href: "/monitoring", label: "Monitoring", icon: Activity },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/team", label: "Team Management", icon: UserCog },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { canAccess, user } = useAuth();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar shadow-lg shadow-black/[0.03] dark:shadow-black/20"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Logo collapsed={collapsed} />
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" role="navigation">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <AnimatePresence>
              {!collapsed && (
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
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
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
                          {!collapsed && (
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
                        {collapsed && (
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
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "text-primary"
                          : "text-sidebar-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-xl bg-primary/10 dark:bg-primary/15"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-indicator"
                          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary glow-teal"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                          isActive && "text-primary"
                        )}
                      />
                      <AnimatePresence>
                        {!collapsed && (
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
            collapsed && "flex justify-center p-2"
          )}
        >
          {!collapsed ? (
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
    </motion.aside>
  );
}
