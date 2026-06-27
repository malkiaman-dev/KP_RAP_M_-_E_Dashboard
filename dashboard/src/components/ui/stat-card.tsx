"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: number;
  icon?: LucideIcon;
  /** Tailwind text-color class, e.g. "text-teal". Drives icon, value and glow. */
  color?: string;
  hint?: string;
  suffix?: string;
  decimals?: number;
  index?: number;
  /** Subtle muted surface (used for secondary/operational metric rows). */
  muted?: boolean;
  /** Rich breakdown shown in a tooltip on hover (e.g. 2nd / 3rd revisit split). */
  hoverDetail?: string;
  /** When set, the card becomes clickable (e.g. download export). */
  onClick?: () => void;
}

/**
 * Unified KPI card used across Tracking, Monitoring and Error Report.
 *
 * The `color` text class also tints the icon chip (`bg-current/10`) and the
 * hover glow (`bg-current`) via `currentColor`, so a single class controls the
 * whole accent without per-color config.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-foreground",
  hint,
  suffix = "",
  decimals = 0,
  index = 0,
  muted = false,
  hoverDetail,
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.035,
        type: "spring",
        stiffness: 260,
        damping: 24,
      }}
      whileHover={{ y: -3 }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "kpi-border group relative overflow-hidden rounded-xl px-4 py-3",
        muted
          ? "border border-border/50 bg-muted/30 transition-colors hover:border-teal/30 hover:bg-card"
          : "surface-card",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
      )}
      title={hoverDetail ? undefined : hint}
    >
      {hoverDetail && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-border/80 bg-card px-3 py-2 text-[10px] leading-relaxed text-foreground shadow-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          {hoverDetail}
        </div>
      )}
      <div
        className={cn(
          "pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-current opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-15",
          color
        )}
        aria-hidden="true"
      />

      {Icon && (
        <span
          className={cn(
            "mb-2 flex h-6 w-6 items-center justify-center rounded-md bg-current/10 transition-transform duration-300 group-hover:scale-110",
            color
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}

      <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground wrap-break-word">
        {label}
      </p>

      <p className={cn("mt-1 text-xl font-bold tabular-nums", color)}>
        <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
      </p>

      {hint && (
        <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
          {hint}
        </p>
      )}
    </motion.div>
  );
}

/** Shimmer skeleton card for KPI loading states. */
export function StatCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-[104px] rounded-xl" />
      ))}
    </>
  );
}
