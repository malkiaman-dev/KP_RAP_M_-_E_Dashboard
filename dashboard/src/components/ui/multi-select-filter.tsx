"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterFieldClassName } from "@/components/ui/filter-select";
import {
  PortalDropdownPanel,
  useCloseOnNavigation,
  useDismissiblePanel,
} from "@/components/ui/use-floating-panel";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  /**
   * Selected values. In "clearable" mode (default), an empty array means
   * "all" (no filter applied) -- good for large/dynamic lists like District.
   * In "guarded" mode, every option is expected to be selected by default
   * (meaning "no filter"), unchecking narrows the selection, and the last
   * remaining checked option can't be unchecked -- good for small, fixed
   * lists like Survey type, where "nothing selected" would look like "show
   * nothing" rather than "show everything".
   */
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  /** Label shown in the closed field, and on the "select everything" row. */
  allLabel?: string;
  mode?: "clearable" | "guarded";
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  /** Reports near the page bottom can flip up when space below is tight. */
  placement?: "down" | "auto";
}

export function MultiSelectFilter({
  values,
  options,
  onChange,
  allLabel = "All",
  mode = "clearable",
  className,
  disabled = false,
  "aria-label": ariaLabel,
  placement = "down",
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(240);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const close = () => setOpen(false);

  useDismissiblePanel(open, close, anchorRef, panelRef);
  useCloseOnNavigation(close);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    setPanelWidth(Math.max(240, anchorRef.current.getBoundingClientRect().width));
  }, [open]);

  const isAllState =
    mode === "guarded"
      ? values.length === options.length
      : values.length === 0;

  const displayLabel = isAllState
    ? allLabel
    : values.length === 1
      ? (options.find((o) => o.value === values[0])?.label ?? values[0])
      : `${values.length} selected`;

  const toggleValue = (value: string) => {
    if (disabled) return;
    const selected = values.includes(value);
    if (mode === "guarded" && selected && values.length <= 1) return; // keep at least one checked
    const next = selected
      ? values.filter((v) => v !== value)
      : [...values, value];
    // Clearable mode: checking every listed option is meant to mean "All" --
    // collapse back to the empty array so filtering is a true no-op again
    // (an explicit list of every known value would otherwise still exclude
    // any row whose value isn't in `options`, e.g. a blank/stray district).
    if (mode === "clearable" && next.length === options.length) {
      onChange([]);
      return;
    }
    onChange(next);
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(mode === "guarded" ? options.map((o) => o.value) : []);
  };

  return (
    <div ref={anchorRef} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={cn(
          filterFieldClassName,
          open && "border-teal/60 ring-2 ring-teal/20",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <PortalDropdownPanel
        open={open}
        anchorRef={anchorRef}
        panelRef={panelRef}
        width={panelWidth}
        placement={placement}
      >
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="max-h-[var(--panel-max-height,70vh)] overflow-auto rounded-xl border border-border/70 bg-card p-1 shadow-lg shadow-black/10 dark:shadow-black/30"
        >
          <li
            role="option"
            aria-selected={isAllState}
            onClick={selectAll}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              isAllState
                ? "bg-teal/15 font-medium text-teal"
                : "text-foreground hover:bg-muted/60"
            )}
          >
            <span className="truncate">{allLabel}</span>
            {isAllState && (
              <Check className="h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
            )}
          </li>
          {options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={checked}
                onClick={() => toggleValue(option.value)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  checked
                    ? "bg-teal/10 text-foreground"
                    : "text-foreground hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-teal bg-teal"
                      : "border-border/70 bg-transparent"
                  )}
                  aria-hidden="true"
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="truncate">{option.label}</span>
              </li>
            );
          })}
        </ul>
      </PortalDropdownPanel>
    </div>
  );
}
