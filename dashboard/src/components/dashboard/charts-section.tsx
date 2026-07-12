"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
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
import { hexToRgba, paletteGradient } from "@/lib/brand";
import {
  toggleDashboardFilters,
  type DashboardFilters,
  type DashboardMetrics,
} from "@/lib/data/survey-metrics";
import { formatDisplayDate } from "@/lib/utils";

interface ChartsSectionProps {
  metrics: DashboardMetrics;
  loading?: boolean;
  filters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
}

const chartDateTickFormatter = (value: string) =>
  formatDisplayDate(value) || value;

const SURVEY_TYPE_BY_NAME: Record<string, string> = {
  Tracking: "tracking",
  Household: "household",
  Girls: "girls",
};

function buildDailyVelocity(trend: { date: string; count: number }[]) {
  return trend.slice(-14).map((point) => ({
    date: point.date,
    daily: point.count,
  }));
}

export function ChartsSection({
  metrics,
  loading,
  filters,
  onFilterChange,
}: ChartsSectionProps) {
  const { palette } = useFirm();
  const distributionColors = [palette.teal, palette.deepTeal, palette.gold];

  if (loading) {
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

  const volumeByDistrict = [...metrics.districtPerformance].sort(
    (a, b) => b.submissions - a.submissions
  );

  const velocity = buildDailyVelocity(
    metrics.allSubmissionsTrend.length > 0
      ? metrics.allSubmissionsTrend
      : metrics.trackingTrend
  );

  const cumulativeSeries = (
    metrics.allSubmissionsTrend.length > 0
      ? metrics.allSubmissionsTrend
      : metrics.trackingTrend
  ).map((point, index, arr) => ({
    date: point.date,
    daily: point.count,
    cumulative: arr
      .slice(0, index + 1)
      .reduce((sum, row) => sum + row.count, 0),
  }));

  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Intelligence Charts
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Interactive field analytics · {CHART_CLICK_HINT}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Field Momentum"
          subtitle="Daily volume with cumulative submissions"
          index={0}
          className="xl:col-span-2"
        >
          <ChartArea>
            <ComposedChart data={cumulativeSeries} margin={chartMargin.withLegend}>
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
                yAxisId="left"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                labelFormatter={(label) => chartDateTickFormatter(String(label))}
              />
              <Legend {...legendProps} />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                name="Cumulative"
                stroke={palette.deepTeal}
                fill="url(#grad-deepteal-area)"
                strokeWidth={2}
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
              <Bar
                yAxisId="left"
                dataKey="daily"
                name="Daily"
                fill="url(#grad-teal)"
                radius={[4, 4, 0, 0]}
                style={pointerBarStyle}
                onClick={(data) => {
                  const row = barPayload(data);
                  if (row?.date) pickDate(row.date);
                }}
              />
            </ComposedChart>
          </ChartArea>
        </ChartCard>

        <ChartCard
          title="Survey Mix"
          subtitle="Tracking forms · households started · girls forms"
          index={1}
        >
          <div className="flex flex-1 flex-col">
            <ChartArea>
              <PieChart>
                <Pie
                  data={metrics.surveyDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={4}
                  dataKey="value"
                  style={pointerBarStyle}
                  onClick={(entry) => {
                    const name = (entry as { name?: string }).name;
                    const surveyType = name
                      ? SURVEY_TYPE_BY_NAME[name]
                      : undefined;
                    if (surveyType) pick({ surveyType });
                  }}
                >
                  {metrics.surveyDistribution.map((entry, index) => {
                    const surveyType = SURVEY_TYPE_BY_NAME[entry.name];
                    const selected =
                      surveyType && filters.surveyType === surveyType;
                    const dim = filters.surveyType !== "all" && !selected;
                    return (
                      <Cell
                        key={entry.name}
                        fill={distributionColors[index] ?? entry.color}
                        fillOpacity={dim ? 0.35 : 1}
                        stroke={selected ? palette.selected : "transparent"}
                        strokeWidth={selected ? 2 : 0}
                      />
                    );
                  })}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} cursor={false} />
                <text
                  x="50%"
                  y="47%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-2xl font-bold"
                >
                  {(
                    metrics.surveyMixTotal ?? metrics.totalSubmissions
                  ).toLocaleString()}
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px] uppercase tracking-wide"
                >
                  Total
                </text>
              </PieChart>
            </ChartArea>
            <div className="mt-1 flex flex-wrap justify-center gap-3">
              {metrics.surveyDistribution.map((d, index) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => {
                    const surveyType = SURVEY_TYPE_BY_NAME[d.name];
                    if (surveyType) pick({ surveyType });
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-muted/60"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: distributionColors[index] ?? d.color,
                    }}
                  />
                  <span className="text-muted-foreground">
                    {d.name}:{" "}
                    <strong className="text-foreground">
                      {d.value.toLocaleString()}
                    </strong>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="District Quality"
          subtitle="Completion rates by district"
          index={2}
          className="xl:col-span-2"
        >
          <ChartArea>
            <BarChart
              data={metrics.districtPerformance}
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
                {metrics.districtPerformance.map((d) => (
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
                {metrics.districtPerformance.map((d) => (
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
                {metrics.districtPerformance.map((d) => (
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
          title="14-Day Velocity"
          subtitle="Recent daily submission pace"
          index={3}
        >
          <ChartArea>
            <AreaChart data={velocity} margin={chartMargin.default}>
              <ChartGradients />
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={chartDateTickFormatter}
                minTickGap={20}
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
              <Area
                type="monotone"
                dataKey="daily"
                name="Daily forms"
                stroke={palette.gold}
                fill="url(#grad-gold-area)"
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
            </AreaChart>
          </ChartArea>
        </ChartCard>

        <ChartCard
          title="District Volume"
          subtitle="Submission load by geography"
          index={4}
        >
          <ChartArea>
            <BarChart
              data={volumeByDistrict}
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
                dataKey="label"
                width={88}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={false} />
              <Bar
                dataKey="submissions"
                name="Submissions"
                fill="url(#grad-teal-h)"
                radius={[0, 8, 8, 0]}
                style={pointerBarStyle}
                onClick={(data) => {
                  const row = barPayload(data);
                  if (!row?.district) return;
                  pick({ district: row.district });
                }}
              >
                {volumeByDistrict.map((d) => (
                  <Cell
                    key={`vol-${d.district}`}
                    fillOpacity={districtActive(d.district) ? 1 : 0.35}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartArea>
        </ChartCard>

        <ChartCard
          title="District Heatmap"
          subtitle="Blended performance intensity"
          index={5}
        >
          <div className="grid flex-1 grid-cols-2 content-center gap-3 p-1">
            {metrics.districtPerformance.map((d, i) => {
              const intensity = Math.round(
                (d.trackingRate + d.hhCompletion + d.girlsCompletion) / 3
              );
              const selected = filters.district === d.district;
              return (
                <motion.button
                  key={d.district}
                  type="button"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => pick({ district: d.district })}
                  className="cursor-pointer rounded-xl border p-4 text-left transition-shadow hover:shadow-md"
                  style={{
                    background: paletteGradient(palette, intensity),
                    borderColor: selected
                      ? hexToRgba(palette.selected, 0.6)
                      : "var(--border)",
                    boxShadow: selected
                      ? `0 0 0 2px ${hexToRgba(palette.selected, 0.35)}`
                      : undefined,
                  }}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {d.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {intensity}%
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {d.submissions.toLocaleString()} submissions
                  </p>
                </motion.button>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
