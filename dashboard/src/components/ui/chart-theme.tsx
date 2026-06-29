"use client";

/** Shared Recharts tooltip styling - soft elevation + rounded corners. */
export const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  fontSize: "12px",
  boxShadow: "0 12px 32px -12px rgba(15, 23, 42, 0.25)",
  padding: "8px 12px",
} as const;

type Stop = { from: string; to: string };

const GRADIENTS: Record<string, Stop> = {
  teal: { from: "#2DBCC6", to: "#178891" },
  deepteal: { from: "#21A1AA", to: "#0E6B73" },
  gold: { from: "#F4D67F", to: "#E0B53F" },
  red: { from: "#F87171", to: "#DC2626" },
  sky: { from: "#56C6F5", to: "#2B8FD6" },
  indigo: { from: "#818CF8", to: "#4F46E5" },
};

/**
 * Reusable gradient + soft-shadow defs for charts. Drop `<ChartGradients />`
 * inside any Recharts chart, then reference fills as `url(#grad-teal)` (vertical
 * bars / areas) or `url(#grad-teal-h)` (horizontal bars, layout="vertical").
 */
export function ChartGradients() {
  return (
    <defs>
      {Object.entries(GRADIENTS).map(([key, { from, to }]) => (
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
      {Object.entries(GRADIENTS).map(([key, { from, to }]) => (
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
      {Object.entries(GRADIENTS).map(([key, { from, to }]) => (
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
