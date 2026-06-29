"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { cn, DISPLAY_DATE_PLACEHOLDER, formatDisplayDate, toIsoDateString } from "@/lib/utils";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  FloatingPanel,
  useDismissiblePanel,
  useFloatingPanel,
} from "@/components/ui/use-floating-panel";

const filterFieldClassName = cn(
  "flex h-10 w-full items-center justify-between rounded-xl border border-border/70",
  "bg-gradient-to-b from-card to-muted/30 px-3.5 text-left text-sm font-medium text-foreground",
  "shadow-sm transition-all duration-200",
  "hover:border-teal/40 hover:shadow-md hover:shadow-teal/5",
  "focus:border-teal/60 focus:outline-none focus:ring-2 focus:ring-teal/20"
);

export interface SelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

export function FilterSelect({
  value,
  options,
  onChange,
  className,
  "aria-label": ariaLabel,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const { panelRef, position, mounted } = useFloatingPanel(open, anchorRef, 240);

  const selected =
    options.find((option) => option.value === value) ?? options[0];

  const close = () => {
    setOpen(false);
    setHighlighted(-1);
  };

  useDismissiblePanel(open, close, anchorRef, panelRef);

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    close();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        setOpen(true);
        setHighlighted(options.findIndex((option) => option.value === value));
      }
      return;
    }

    if (event.key === "Escape") {
      close();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => Math.min(current + 1, options.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      selectOption(options[highlighted].value);
    }
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
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={cn(
          filterFieldClassName,
          open && "border-teal/60 ring-2 ring-teal/20"
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <FloatingPanel
        open={open}
        mounted={mounted}
        position={position}
        panelRef={panelRef}
      >
        <ul
          id={listId}
          role="listbox"
          className="max-h-60 overflow-auto rounded-xl border border-border/70 bg-card p-1 shadow-lg shadow-black/10 dark:shadow-black/30"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlighted;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => selectOption(option.value)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  isSelected && "bg-teal/15 font-medium text-teal",
                  isHighlighted &&
                    !isSelected &&
                    "bg-muted/80 text-foreground",
                  !isSelected &&
                    !isHighlighted &&
                    "text-foreground hover:bg-muted/60"
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      </FloatingPanel>
    </div>
  );
}

interface FilterDateProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
  "aria-label"?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDisplay(value: string): string {
  return formatDisplayDate(value);
}

function isDateDisabled(
  day: Date,
  minDate: Date | null,
  maxDate: Date | null
): boolean {
  const normalized = startOfDay(day);
  if (minDate && isBefore(normalized, startOfDay(minDate))) return true;
  if (maxDate && isAfter(normalized, startOfDay(maxDate))) return true;
  return false;
}

export function FilterDate({
  value,
  onChange,
  min,
  max,
  className,
  "aria-label": ariaLabel,
}: FilterDateProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(
    () => parseDateValue(value) ?? new Date()
  );
  const anchorRef = useRef<HTMLDivElement>(null);
  const calendarId = useId();
  const { panelRef, position, mounted } = useFloatingPanel(open, anchorRef, 280);

  const minDate = useMemo(() => (min ? parseDateValue(min) : null), [min]);
  const maxDate = useMemo(() => (max ? parseDateValue(max) : null), [max]);
  const selectedDate = parseDateValue(value);
  const today = startOfDay(new Date());
  const todayDisabled = isDateDisabled(today, minDate, maxDate);

  const close = () => setOpen(false);

  useEffect(() => {
    const parsed = parseDateValue(value);
    if (parsed) setViewDate(parsed);
  }, [value]);

  useDismissiblePanel(open, close, anchorRef, panelRef);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectDate = (day: Date) => {
    if (isDateDisabled(day, minDate, maxDate)) return;
    onChange(toIsoDateString(day));
    close();
  };

  return (
    <div ref={anchorRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={calendarId}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          filterFieldClassName,
          open && "border-teal/60 ring-2 ring-teal/20"
        )}
      >
        <span
          className={cn("truncate", !value && "font-normal text-muted-foreground")}
        >
          {value ? formatDisplay(value) : DISPLAY_DATE_PLACEHOLDER}
        </span>
        <Calendar
          className="ml-2 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </button>

      <FloatingPanel
        open={open}
        mounted={mounted}
        position={position}
        panelRef={panelRef}
      >
        <div
          id={calendarId}
          className="rounded-xl border border-border/70 bg-card p-3 shadow-lg shadow-black/10 dark:shadow-black/30"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate((current) => subMonths(current, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-sm font-semibold text-foreground">
              {format(viewDate, "MMMM yyyy")}
            </p>
            <button
              type="button"
              onClick={() => setViewDate((current) => addMonths(current, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const disabled = isDateDisabled(day, minDate, maxDate);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const inMonth = isSameMonth(day, viewDate);
              const todayMatch = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDate(day)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors",
                    !inMonth && "text-muted-foreground/35",
                    inMonth && !selected && !disabled && "text-foreground",
                    !selected && !disabled && "hover:bg-muted/70",
                    todayMatch &&
                      !selected &&
                      "border border-teal/40 text-teal",
                    selected &&
                      "bg-teal font-semibold text-white shadow-sm shadow-teal/25",
                    disabled && "cursor-not-allowed opacity-30"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className="text-xs font-medium text-teal transition-colors hover:text-deep-teal"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={todayDisabled}
              onClick={() => selectDate(today)}
              className={cn(
                "text-xs font-medium transition-colors",
                todayDisabled
                  ? "cursor-not-allowed text-muted-foreground/50"
                  : "text-teal hover:text-deep-teal"
              )}
            >
              Today
            </button>
          </div>
        </div>
      </FloatingPanel>
    </div>
  );
}

interface FilterDateRangeProps {
  dateFrom: string;
  dateTo: string;
  onChange: (range: { dateFrom: string; dateTo: string }) => void;
  min?: string;
  max?: string;
  className?: string;
  "aria-label"?: string;
}

function formatRangeDisplay(dateFrom: string, dateTo: string): string {
  if (!dateFrom && !dateTo) return "Select date range";
  if (dateFrom && !dateTo) return `${formatDisplay(dateFrom)} – ...`;
  if (dateFrom && dateTo) {
    return `${formatDisplay(dateFrom)} – ${formatDisplay(dateTo)}`;
  }
  return "Select date range";
}

function resolveActiveViewDate(
  dateFrom: string,
  dateTo: string,
  minDate: Date | null,
  maxDate: Date | null
): Date {
  const today = startOfDay(new Date());
  const parsed =
    parseDateValue(dateFrom) ?? parseDateValue(dateTo) ?? today;

  if (minDate && isBefore(parsed, startOfDay(minDate))) return minDate;
  if (maxDate && isAfter(parsed, startOfDay(maxDate))) return maxDate;
  return parsed;
}

function isDayInRange(
  day: Date,
  from: Date | null,
  to: Date | null
): boolean {
  if (!from || !to) return false;
  const normalized = startOfDay(day);
  const start = startOfDay(from);
  const end = startOfDay(to);
  return !isBefore(normalized, start) && !isAfter(normalized, end);
}

export function FilterDateRange({
  dateFrom,
  dateTo,
  onChange,
  min,
  max,
  className,
  "aria-label": ariaLabel = "Submission date range",
}: FilterDateRangeProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const anchorRef = useRef<HTMLDivElement>(null);
  const calendarId = useId();
  const { panelRef, position, mounted } = useFloatingPanel(open, anchorRef, 300);

  const minDate = useMemo(() => (min ? parseDateValue(min) : null), [min]);
  const maxDate = useMemo(() => (max ? parseDateValue(max) : null), [max]);
  const fromDate = parseDateValue(dateFrom);
  const toDate = parseDateValue(dateTo);
  const today = startOfDay(new Date());
  const activeIso = toIsoDateString(today);

  const close = () => setOpen(false);

  useEffect(() => {
    if (open) {
      setViewDate(resolveActiveViewDate(dateFrom, dateTo, minDate, maxDate));
    }
  }, [open, dateFrom, dateTo, minDate, maxDate]);

  useDismissiblePanel(open, close, anchorRef, panelRef);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const applyRange = (from: string, to: string) => {
    onChange({ dateFrom: from, dateTo: to });
    close();
  };

  const selectDay = (day: Date) => {
    if (isDateDisabled(day, minDate, maxDate)) return;
    const iso = toIsoDateString(day);

    // First click: start a new selection (keep calendar open).
    if (!dateFrom || (dateFrom && dateTo)) {
      onChange({ dateFrom: iso, dateTo: "" });
      return;
    }

    // Second click: complete the range (same day = single-day filter).
    const start = fromDate!;
    if (isBefore(day, start)) {
      applyRange(iso, dateFrom);
    } else {
      applyRange(dateFrom, iso);
    }
  };

  return (
    <div ref={anchorRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={calendarId}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          filterFieldClassName,
          open && "border-teal/60 ring-2 ring-teal/20"
        )}
      >
        <span
          className={cn(
            "truncate",
            !dateFrom && !dateTo && "font-normal text-muted-foreground"
          )}
        >
          {formatRangeDisplay(dateFrom, dateTo)}
        </span>
        <Calendar
          className="ml-2 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </button>

      <FloatingPanel
        open={open}
        mounted={mounted}
        position={position}
        panelRef={panelRef}
      >
        <div
          id={calendarId}
          className="rounded-xl border border-border/70 bg-card p-3 shadow-lg shadow-black/10 dark:shadow-black/30"
        >
          <div className="mb-2">
            <p className="text-sm font-semibold text-foreground">Date range</p>
            <p className="text-[11px] text-muted-foreground">
              {dateFrom && !dateTo
                ? "Click the same day again for one day only, or another day for a range"
                : "Click a day to start — click again to finish (same day = single day)"}
            </p>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate((current) => subMonths(current, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-sm font-semibold text-foreground">
              {format(viewDate, "MMMM yyyy")}
            </p>
            <button
              type="button"
              onClick={() => setViewDate((current) => addMonths(current, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const disabled = isDateDisabled(day, minDate, maxDate);
              const inMonth = isSameMonth(day, viewDate);
              const todayMatch = isToday(day);
              const isStart = fromDate ? isSameDay(day, fromDate) : false;
              const isEnd = toDate ? isSameDay(day, toDate) : false;
              const inRange = isDayInRange(day, fromDate, toDate);
              const isActiveAnchor =
                !dateFrom && !dateTo && todayMatch && !disabled;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors",
                    !inMonth && "text-muted-foreground/35",
                    inMonth && !disabled && "text-foreground",
                    !disabled && !isStart && !isEnd && "hover:bg-muted/70",
                    inRange && !isStart && !isEnd && "bg-teal/10 text-teal",
                    todayMatch &&
                      !isStart &&
                      !isEnd &&
                      !inRange &&
                      "border border-teal/40 text-teal",
                    isActiveAnchor && "border border-teal/60 bg-teal/5 font-medium text-teal",
                    (isStart || isEnd) &&
                      "bg-teal font-semibold text-white shadow-sm shadow-teal/25",
                    disabled && "cursor-not-allowed opacity-30"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange({ dateFrom: "", dateTo: "" });
                close();
              }}
              className="text-xs font-medium text-teal transition-colors hover:text-deep-teal"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isDateDisabled(today, minDate, maxDate)}
              onClick={() => applyRange(activeIso, activeIso)}
              className={cn(
                "text-xs font-medium transition-colors",
                isDateDisabled(today, minDate, maxDate)
                  ? "cursor-not-allowed text-muted-foreground/50"
                  : "text-teal hover:text-deep-teal"
              )}
            >
              Today only
            </button>
          </div>
        </div>
      </FloatingPanel>
    </div>
  );
}
