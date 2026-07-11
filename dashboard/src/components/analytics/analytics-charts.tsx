"use client";

import { motion } from "framer-motion";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartArea,
  ChartCard,
  ChartGridSkeleton,
} from "@/components/ui/chart-card";
import {
  ChartGradients,
  chartMargin,
  legendProps,
  tooltipStyle,
} from "@/components/ui/chart-theme";
import { useFirm } from "@/components/brand/firm-provider";
import {
  barPayload,
  CHART_CLICK_HINT,
  pointerBarStyle,
  toggleDateRange,
} from "@/lib/chart-cross-filter";
import {
  buildTargetTrend,
  computeModuleHealth,
  type ProtocolProgress,
} from "@/lib/data/analytics-insights";
import {
  toggleDashboardFilters,
  type DashboardFilters,
  type DashboardMetrics,
} from "@/lib/data/survey-metrics";
import type { TrackingMetrics } from "@/lib/data/tracking-metrics";
import { formatDisplayDate } from "@/lib/utils";

interface AnalyticsChartsProps {
  dashboard?: DashboardMetrics;
  tracking?: TrackingMetrics;
  progress?: ProtocolProgress;
  filters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
  loading?: boolean;
}

const chartDateTickFormatter = (value: string) =>
  formatDisplayDate(value) || value;

export function AnalyticsCharts({
  dashboard,
  tracking,
  progress,
  filters,
  onFilterChange,
  loading,
}: AnalyticsChartsProps) {
  const { palette } = useFirm();

  if (loading || !dashboard || !tracking || !progress) {
    return (
      <ChartGridSkeleton
        count={6}
        className="mb-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3"
      />
    );
  }

  const pick = (patch: Partial<DashboardFilters>) =>
    onFilterChange(toggleDashboardFilters(filters, patch));

  const pickDate = (iso: string) =>
    onFilterChange({
      ...filters,
      ...toggleDateRange(filters.dateFrom, filters.dateTo, iso),
    });

  const districtActive = (district: string) =>
    filters.district === "all" || filters.district === district;

  const targetTrend = buildTargetTrend(
    tracking.trackingTrend,
    tracking.successTarget
  );

  const moduleHealth = computeModuleHealth(dashboard);

  const cohortBars = tracking.cohortProgress.map((c) => ({
    ...c,
    progressPct: c.target > 0 ? (c.tracked / c.target) * 100 : 0,
  }));

  const enrollment = [
    { name: "Enrolled", value: tracking.primaryAlternate.enrolled },
    { name: "Dropped Out", value: tracking.primaryAlternate.droppedOut },
  ].filter((d) => d.value > 0);

  const enrollmentColors = [palette.teal, palette.gold];

  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Deep Dive Charts
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Target trajectory, district quality, and module health ·{" "}
          {CHART_CLICK_HINT}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Tracked vs Success Target"
          subtitle="Cumulative girls successfully tracked"
          index={0}
          className="xl:col-span-2"
        >
          <ChartArea>
            <ComposedChart data={targetTrend} margin={chartMargin.withLegend}>
              <ChartGradients />
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={chartDateTickFormatter}
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={false}
                labelFormatter={(label) => chartDateTickFormatter(String(label))}
              />
              <Legend {...legendProps} />
              <Area
                type="monotone"
                dataKey="tracked"
                name="Tracked"
                stroke={palette.teal}
                fill="url(#grad-teal-area)"
                strokeWidth={2.5}
                style={{ cursor: "pointer" }}
                activeDot={{
                  r: 6,
                  onClick: (_e, payload) => {
                    const date = String(
                      (payload as { payload?: { date?: string } })?.payload
                        ?.date ?? ""
                    );
                    if (date) pickDate(date);
                  },
                }}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Success target"
                stroke={palette.gold}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                legendType="plainline"
              />
            </ComposedChart>
          </ChartArea>
        </ChartCard>

        <ChartCard
          title="Cohort Progress"
          subtitle="Tracked share of each cohort target"
          index={1}
        >
          <ChartArea>
            <BarChart data={cohortBars} margin={chartMargin.default}>
              <ChartGradients />
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="cohort"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={false}
                formatter={(value, name, item) => {
                  const row = item?.payload as
                    | { tracked?: number; target?: number }
                    | undefined;
                  if (name === "Progress %") {
                    return [
                      `${Number(value).toFixed(1)}% (${(row?.tracked ?? 0).toLocaleString()} / ${(row?.target ?? 0).toLocaleString()})`,
                      "Progress",
                    ];
                  }
                  return [value, name];
                }}
              />
              <Bar
                dataKey="progressPct"
                name="Progress %"
                fill="url(#grad-teal)"
                radius={[8, 8, 0, 0]}
                style={pointerBarStyle}
                onClick={(data) => {
                  const row = barPayload(data) as
                    | { trackingGroup?: string }
                    | undefined;
                  if (!row?.trackingGroup) return;
                  // Cohort is tracking-only; keep district/date filters, clear survey type.
                  pick({ surveyType: "tracking" });
                }}
              >
                {cohortBars.map((row) => (
                  <Cell
                    key={row.cohort}
                    fill={
                      row.trackingGroup === "baseline"
                        ? "url(#grad-teal)"
                        : "url(#grad-deepteal)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartArea>
        </ChartCard>

        <ChartCard
          title="District Quality"
          subtitle={`Completion rates by district · ${CHART_CLICK_HINT}`}
          index={2}
          className="xl:col-span-2"
        >
          <ChartArea>
            <BarChart
              data={dashboard.districtPerformance}
              barGap={4}
              margin={chartMargin.withLegend}
            >
              <ChartGradients />
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={false} />
              <Legend {...legendProps} />
              <Bar
                dataKey="trackingRate"
                name="Tracking %"
                fill="url(#grad-teal)"
                radius={[6, 6, 0, 0]}
                style={pointerBarStyle}
                onClick={(data) => {
                  const row = barPayload(data);
                  if (!row?.district) return;
                  pick({ district: row.district, surveyType: "tracking" });
                }}
              >
                {dashboard.districtPerformance.map((d) => (
                  <Cell
                    key={`tr-${d.district}`}
                    fillOpacity={districtActive(d.district) ? 1 : 0.35}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="hhCompletion"
                name="HH %"
                fill="url(#grad-deepteal)"
                radius={[6, 6, 0, 0]}
                style={pointerBarStyle}
                onClick={(data) => {
                  const row = barPayload(data);
                  if (!row?.district) return;
                  pick({ district: row.district, surveyType: "household" });
                }}
              >
                {dashboard.districtPerformance.map((d) => (
                  <Cell
                    key={`hh-${d.district}`}
                    fillOpacity={districtActive(d.district) ? 1 : 0.35}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="girlsCompletion"
                name="Girls %"
                fill="url(#grad-gold)"
                radius={[6, 6, 0, 0]}
                style={pointerBarStyle}
                onClick={(data) => {
                  const row = barPayload(data);
                  if (!row?.district) return;
                  pick({ district: row.district, surveyType: "girls" });
                }}
              >
                {dashboard.districtPerformance.map((d) => (
                  <Cell
                    key={`g-${d.district}`}
                    fillOpacity={districtActive(d.district) ? 1 : 0.35}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartArea>
        </ChartCard>

        <ChartCard
          title="Untracked Reasons"
          subtitle="Why girls remain untracked in current filters"
          index={3}
        >
          <ChartArea>
            <BarChart
              data={tracking.untrackedReasons}
              layout="vertical"
              margin={chartMargin.verticalBar}
            >
              <ChartGradients />
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="reason"
                width={108}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={false} />
              <Bar
                dataKey="count"
                name="Girls"
                fill="url(#grad-gold-h)"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ChartArea>
        </ChartCard>

        <ChartCard
          title="Module Health"
          subtitle="Submissions and outcome rates by survey"
          index={4}
        >
          <ChartArea>
            <BarChart data={moduleHealth} margin={chartMargin.withLegend}>
              <ChartGradients />
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="module"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={false}
                formatter={(value, name, item) => {
                  const row = item?.payload as
                    | { rateLabel?: string }
                    | undefined;
                  if (name === "Outcome %") {
                    return [
                      `${Number(value).toFixed(1)}%`,
                      row?.rateLabel ?? "Rate",
                    ];
                  }
                  return [Number(value).toLocaleString(), "Submissions"];
                }}
              />
              <Legend {...legendProps} />
              <Bar
                yAxisId="left"
                dataKey="submissions"
                name="Submissions"
                fill="url(#grad-deepteal)"
                radius={[6, 6, 0, 0]}
                style={pointerBarStyle}
                onClick={(data) => {
                  const row = barPayload(data) as { module?: string } | undefined;
                  const map: Record<string, string> = {
                    Tracking: "tracking",
                    Household: "household",
                    Girls: "girls",
                  };
                  if (row?.module && map[row.module]) {
                    pick({ surveyType: map[row.module] });
                  }
                }}
              />
              <Bar
                yAxisId="right"
                dataKey="rate"
                name="Outcome %"
                fill="url(#grad-gold)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartArea>
        </ChartCard>

        <ChartCard
          title="Enrollment Mix"
          subtitle="Tracked girls by listing enrollment status"
          index={5}
        >
          {enrollment.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              No enrollment status available in the current filters
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:flex-row">
              <div className="h-[220px] w-full max-w-[240px]">
                <ChartArea>
                  <PieChart>
                    <Pie
                      data={enrollment}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {enrollment.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={enrollmentColors[index] ?? palette.teal}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ChartArea>
              </div>
              <div className="w-full space-y-2 sm:max-w-[160px]">
                {enrollment.map((entry, index) => (
                  <motion.div
                    key={entry.name}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            enrollmentColors[index] ?? palette.teal,
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {entry.value.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
