"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Flag, Gauge, RotateCcw, SlidersHorizontal, Target, Trophy } from "lucide-react";
import { ModeToggle } from "@/components/ui/page-hero";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { cn, formatDisplayDate } from "@/lib/utils";
import {
  defaultDistrictPlan,
  projectDistrictPlan,
  type DistrictPlan,
  type HhGirlsDistrictTargetRow,
  type HhGirlsDistrictTargets,
} from "@/lib/data/hh-girls-district-targets";
import {
  HH_GIRLS_PROGRESS_BASIS_LABELS,
  type HhGirlsProgressBasis,
} from "@/lib/data/hh-girls-progress-basis";

interface PlannedRow extends HhGirlsDistrictTargetRow {
  plan: DistrictPlan;
  planned: ReturnType<typeof projectDistrictPlan>;
  /** True when the plan differs from what the data shows. */
  changed: boolean;
}

function etaText(r: PlannedRow): string {
  if (r.remaining === 0) return "Target met";
  if (r.planned.fieldDaysToTarget === null || !r.planned.projectedDate) {
    if (r.plan.enumerators === 0) return r.lastActivity ? `No enumerators planned · last work ${formatDisplayDate(r.lastActivity)}` : "Not started · set a plan";
    return "Set a speed above 0";
  }
  return `~${r.planned.fieldDaysToTarget.toLocaleString()} field days · ${formatDisplayDate(r.planned.projectedDate)}`;
}

function ProgressCell({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-28 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums font-semibold text-foreground">{value.toFixed(1)}%</span>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  decimals = 0,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="flex items-baseline justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        <span className="text-xs font-semibold normal-case tracking-normal text-foreground tabular-nums">
          {value.toFixed(decimals)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-teal"
        aria-label={label}
      />
    </label>
  );
}

/**
 * Monitoring: each district's HH / Girls target (its successfully tracked
 * girls), how much is achieved, the gap, and a plan (enumerators, output per
 * enumerator, field days per week) that drives speed and time to target.
 * Plans start from the data (last 14 days) and can be changed with the sliders.
 */
export function HhGirlsDistrictTargetsSection({
  data,
  loading,
  basis,
  onBasisChange,
}: {
  data?: HhGirlsDistrictTargets;
  loading?: boolean;
  basis: HhGirlsProgressBasis;
  onBasisChange: (basis: HhGirlsProgressBasis) => void;
}) {
  // Slider changes, kept per basis so switching basis shows that basis's plan.
  const [overrides, setOverrides] = useState<Record<string, Partial<DistrictPlan>>>({});
  const achievedLabel = HH_GIRLS_PROGRESS_BASIS_LABELS[basis];

  const header = (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Achievement based on</span>
      <ModeToggle
        value={basis}
        onChange={onBasisChange}
        options={[
          { value: "completed", label: HH_GIRLS_PROGRESS_BASIS_LABELS.completed },
          { value: "attempted", label: HH_GIRLS_PROGRESS_BASIS_LABELS.attempted },
        ]}
      />
    </div>
  );

  if (loading || !data) {
    return (
      <div className="mb-6">
        {header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCardSkeleton count={5} />
        </div>
      </div>
    );
  }

  // Districts with no recent work start from the overall output per enumerator.
  const fallbackPerEnumerator =
    data.total.enumeratorsInWindow > 0
      ? data.total.speedPerFieldDay / data.total.enumeratorsInWindow
      : 0;
  const key = (district: string) => `${basis}|${district}`;
  const rows: PlannedRow[] = data.rows.map((r) => {
    const base = defaultDistrictPlan(r, data.windowDays, fallbackPerEnumerator);
    const plan = { ...base, ...overrides[key(r.district)] };
    return {
      ...r,
      plan,
      planned: projectDistrictPlan(r, plan, data.asOf),
      changed: Boolean(overrides[key(r.district)]),
    };
  });
  const setPlan = (district: string, patch: Partial<DistrictPlan>) =>
    setOverrides((prev) => ({ ...prev, [key(district)]: { ...prev[key(district)], ...patch } }));
  const resetPlans = () =>
    setOverrides((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${basis}|`)))
    );
  const anyChanged = rows.some((r) => r.changed);

  // All districts finish when the last one does; unknown if any district has no plan.
  const open = rows.filter((r) => r.remaining > 0);
  const unplanned = open.filter((r) => r.planned.fieldDaysToTarget === null);
  const last = open.reduce<PlannedRow | null>(
    (worst, r) =>
      (r.planned.fieldDaysToTarget ?? -1) > (worst?.planned.fieldDaysToTarget ?? -1) ? r : worst,
    null
  );
  const totalSpeed = rows.reduce((s, r) => s + r.planned.speed, 0);
  const totalEta =
    open.length === 0
      ? "Target met"
      : unplanned.length > 0
        ? `Needs a plan for ${unplanned.map((r) => r.label).join(", ")}`
        : `~${last!.planned.fieldDaysToTarget!.toLocaleString()} field days · ${formatDisplayDate(last!.planned.projectedDate!)} (last: ${last!.label})`;

  return (
    <div className="mb-6">
      {header}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          index={0}
          muted
          label="District targets (tracked girls)"
          value={data.total.target}
          icon={Target}
          color="text-slate-700 dark:text-slate-200"
          hint="Sum of each district's successfully tracked girls"
        />
        <StatCard
          index={1}
          muted
          label={`Achieved · ${achievedLabel}`}
          value={data.total.achieved}
          icon={Trophy}
          color="text-teal"
          hoverDetail={`${data.total.progress.toFixed(1)}% of district targets`}
        />
        <StatCard
          index={2}
          muted
          label="Remaining to targets"
          value={data.total.remaining}
          icon={Flag}
          color="text-red-600"
        />
        <StatCard
          index={3}
          muted
          label="Planned speed per field day"
          value={totalSpeed}
          icon={Gauge}
          color="text-sky-600"
          hint={`Data, last ${data.windowDays} days: ${data.total.speedPerFieldDay.toFixed(1)} (${data.total.achievedInWindow} in ${data.total.fieldDaysInWindow} field days)`}
        />
        <StatCard
          index={4}
          muted
          label="Field days until all districts finish"
          value={last?.planned.fieldDaysToTarget ?? 0}
          icon={CalendarClock}
          color="text-amber-600"
          hint={totalEta}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 rounded-2xl border border-border/60 bg-card shadow-sm"
      >
        <div className="flex flex-col gap-2 border-b border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-teal" aria-hidden="true" />
              Plan
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Starts from the data (last {data.windowDays} days), rounded to whole numbers. Move a slider to see how speed and time to target change.
            </p>
          </div>
          <button
            type="button"
            onClick={resetPlans}
            disabled={!anyChanged}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50 sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset to data
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((r) => (
            <div
              key={r.district}
              className={cn(
                "rounded-xl border p-3",
                r.changed ? "border-teal/40 bg-teal/5" : "border-border/50 bg-muted/20"
              )}
            >
              <p className="mb-2 flex items-center justify-between text-xs font-semibold text-foreground">
                {r.label}
                <span className="text-[10px] font-medium text-muted-foreground">
                  {r.planned.speed.toLocaleString()} / field day
                </span>
              </p>
              <div className="space-y-2">
                <RangeField
                  label="Enumerators"
                  value={r.plan.enumerators}
                  min={0}
                  max={20}
                  step={1}
                  onChange={(v) => setPlan(r.district, { enumerators: v })}
                />
                <RangeField
                  label={basis === "completed" ? "Completed HH / enumerator / day" : "Attempted girls / enumerator / day"}
                  value={r.plan.perEnumerator}
                  min={0}
                  max={10}
                  step={1}
                  onChange={(v) => setPlan(r.district, { perEnumerator: v })}
                />
                <RangeField
                  label="Field days / week"
                  value={r.plan.fieldDaysPerWeek}
                  min={1}
                  max={7}
                  step={1}
                  onChange={(v) => setPlan(r.district, { fieldDaysPerWeek: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card shadow-sm"
      >
        <div className="border-b border-border/60 px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">District target progress</h3>
          <p className="text-[11px] text-muted-foreground">
            Target = successfully tracked girls in the district · achieved = {achievedLabel.toLowerCase()} · speed and time
            to target follow the plan above (starts from the last {data.windowDays} days of data
            {data.asOf ? `, to ${formatDisplayDate(data.asOf)}` : ""}) · all dates, not the filters above
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-230 border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2 font-medium">District</th>
                <th className="px-3 py-2 text-right font-medium">Target</th>
                <th className="px-3 py-2 text-right font-medium">Achieved</th>
                <th className="px-3 py-2 font-medium">Progress</th>
                <th className="px-3 py-2 text-right font-medium">Remaining</th>
                <th className="px-3 py-2 text-right font-medium">Speed / field day</th>
                <th className="px-5 py-2 font-medium">Time to target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.district} className="border-b border-border/40">
                  <td className="px-5 py-2.5 text-foreground">{r.label}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.target.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.achieved.toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    <ProgressCell value={r.progress} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.remaining.toLocaleString()}</td>
                  <td
                    className="px-3 py-2.5 text-right tabular-nums"
                    title={`Data, last ${data.windowDays} days: ${r.achievedInWindow} in ${r.fieldDaysInWindow} field days by ${r.enumeratorsInWindow} enumerators`}
                  >
                    {r.planned.speed > 0 ? r.planned.speed.toLocaleString() : "–"}
                    {Math.abs(r.planned.speed - r.speedPerFieldDay) >= 0.05 && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        (data {r.fieldDaysInWindow > 0 ? r.speedPerFieldDay.toFixed(1) : "–"})
                      </span>
                    )}
                  </td>
                  <td className={cn("px-5 py-2.5", r.changed ? "font-medium text-teal" : "text-muted-foreground")}>
                    {etaText(r)}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td className="px-5 py-2.5 text-foreground">{data.total.label}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{data.total.target.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{data.total.achieved.toLocaleString()}</td>
                <td className="px-3 py-2.5">
                  <ProgressCell value={data.total.progress} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{data.total.remaining.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totalSpeed.toLocaleString()}</td>
                <td className="px-5 py-2.5 text-muted-foreground">{totalEta}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
