"use client";

import { useMemo } from "react";
import { useFirm } from "@/components/brand/firm-provider";
import { buildChartGradients } from "@/lib/brand";

/** Shared Recharts tooltip styling - soft elevation + rounded corners. */
export const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  fontSize: "12px",
  boxShadow: "0 12px 32px -12px rgba(15, 23, 42, 0.25)",
  padding: "8px 12px",
} as const;

/** Recharts outer margins — leave room for axis ticks and legends inside the card. */
export const chartMargin = {
  default: { top: 8, right: 16, left: 8, bottom: 20 },
  verticalBar: { top: 8, right: 16, left: 8, bottom: 28 },
  withLegend: { top: 8, right: 16, left: 8, bottom: 40 },
  rotatedLabels: { top: 8, right: 12, left: 4, bottom: 56 },
  withLegendRotated: { top: 8, right: 12, left: 4, bottom: 72 },
} as const;

export const legendProps = {
  wrapperStyle: { fontSize: 11, paddingTop: 4 },
  verticalAlign: "bottom" as const,
};

/**
 * Reusable gradient + soft-shadow defs for charts. Drop `<ChartGradients />`
 * inside any Recharts chart, then reference fills as `url(#grad-teal)` (vertical
 * bars / areas) or `url(#grad-teal-h)` (horizontal bars, layout="vertical").
 */
export function ChartGradients() {
  const { palette } = useFirm();
  const gradients = useMemo(() => buildChartGradients(palette), [palette]);

  return (
    <defs>
      {Object.entries(gradients).map(([key, { from, to }]) => (
        <linearGradient
          key={`v-${key}`}
          id={`grad-${key}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={from} stopOpacity={0.95} />
          <stop offset="100%" stopColor={to} stopOpacity={0.85} />
        </linearGradient>
      ))}
      {Object.entries(gradients).map(([key, { from, to }]) => (
        <linearGradient
          key={`h-${key}`}
          id={`grad-${key}-h`}
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop offset="0%" stopColor={to} stopOpacity={0.85} />
          <stop offset="100%" stopColor={from} stopOpacity={0.95} />
        </linearGradient>
      ))}
      {Object.entries(gradients).map(([key, { from, to }]) => (
        <linearGradient
          key={`a-${key}`}
          id={`grad-${key}-area`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={from} stopOpacity={0.35} />
          <stop offset="100%" stopColor={to} stopOpacity={0.02} />
        </linearGradient>
      ))}
    </defs>
  );
}
