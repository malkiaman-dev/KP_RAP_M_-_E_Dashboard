"use client";

import { cn, formatDisplayDate } from "@/lib/utils";
import { useFieldPeriod } from "@/components/filters/field-period-provider";
import { CalendarRange } from "lucide-react";

interface FieldPeriodToggleProps {
  className?: string;
  /** Compact inline control for filter bars / hero. */
  compact?: boolean;
}

export function FieldPeriodToggle({
  className,
  compact = false,
}: FieldPeriodToggleProps) {
  const { enabled, setEnabled, startIso, startLabel } = useFieldPeriod();

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-2",
        enabled && "border-teal/30 bg-teal/5",
        className
      )}
    >
      <CalendarRange
        className={cn(
          "h-4 w-4 shrink-0",
          enabled ? "text-teal" : "text-muted-foreground"
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">
          {compact ? `From ${startLabel}` : "Field period start"}
        </p>
        {!compact && (
          <p className="text-[11px] text-muted-foreground">
            When on, all tabs start from {formatDisplayDate(startIso) || startLabel}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`Start dashboards from ${startLabel}`}
        onClick={() => setEnabled(!enabled)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          enabled ? "bg-teal" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            enabled && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
}
