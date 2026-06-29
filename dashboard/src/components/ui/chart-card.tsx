"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ResponsiveContainer } from "recharts";

/**
 * Shared chart container - animated entrance, hover elevation and an animated
 * gradient accent bar across the top edge. Used by every chart grid so the
 * dashboard reads as one cohesive design system.
 */
export function ChartCard({
  title,
  subtitle,
  children,
  className,
  index = 0,
  allowOverflow = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  index?: number;
  /** Let content (e.g. wide tooltips) spill past the card edge instead of being clipped. */
  allowOverflow?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 240,
        damping: 26,
      }}
      className={cn(
        "surface-card chart-accent group relative flex h-full min-h-[300px] min-w-0 flex-col rounded-2xl p-5 lg:min-h-0",
        allowOverflow ? "overflow-visible" : "overflow-hidden",
        className
      )}
    >
      <h3 className="shrink-0 text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && (
        <p className="mb-3 shrink-0 text-[11px] text-muted-foreground">
          {subtitle}
        </p>
      )}
      {children}
    </motion.div>
  );
}

export function ChartArea({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-full min-h-[240px] w-full min-w-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Shimmer grid placeholder for a chart section while data loads. */
export function ChartGridSkeleton({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-full min-h-[300px] rounded-2xl" />
      ))}
    </div>
  );
}
