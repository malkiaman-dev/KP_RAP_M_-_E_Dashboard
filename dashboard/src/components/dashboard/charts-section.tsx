"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  toggleDashboardFilters,
  type DashboardFilters,
  type DashboardMetrics,
} from "@/lib/data/survey-metrics";
import {
  barPayload,
  CHART_CLICK_HINT,
  pointerBarStyle,
  toggleDateRange,
} from "@/lib/chart-cross-filter";
import { ChartGradients } from "@/components/ui/chart-theme";
import { formatDisplayDate } from "@/lib/utils";

interface ChartsSectionProps {
  metrics: DashboardMetrics;
  loading?: boolean;
  filters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
}

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  fontSize: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
};

const chartDateTickFormatter = (value: string) => formatDisplayDate(value) || value;

const SURVEY_TYPE_BY_NAME: Record<string, string> = {
  Tracking: "tracking",
  Household: "household",
  Girls: "girls",
};

export function ChartsSection({
  metrics,
  loading,
  filters,
  onFilterChange,
}: ChartsSectionProps) {
  if (loading) {
    return (
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-80 rounded-2xl" />
        ))}
      </div>
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

  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-2">
      <ChartCard
        title="Tracking Trend Over Time"
        subtitle={`Daily submissions · ${CHART_CLICK_HINT}`}
        index={0}
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={metrics.trackingTrend}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#21A1AA" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#21A1AA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={chartDateTickFormatter}
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
            <Line
              type="monotone"
              dataKey="count"
              name="Tracked"
              stroke="#21A1AA"
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload } = props;
                const date = String((payload as { date?: string })?.date ?? "");
                const selected =
                  filters.dateFrom === date && filters.dateTo === date;
                return (
                  <circle
                    key={date}
                    cx={cx}
                    cy={cy}
                    r={selected ? 6 : 4}
                    fill={selected ? "#EDCA5C" : "#21A1AA"}
                    stroke={selected ? "#0B7080" : "none"}
                    strokeWidth={selected ? 2 : 0}
                    style={{ cursor: "pointer" }}
                    onClick={() => date && pickDate(date)}
                  />
                );
              }}
              activeDot={{
                r: 7,
                onClick: (_e, payload) => {
                  const date = String(
                    (payload as { payload?: { date?: string } })?.payload?.date ??
                      ""
                  );
                  if (date) pickDate(date);
                },
              }}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="District Performance"
        subtitle={`Completion rates by district · ${CHART_CLICK_HINT}`}
        index={1}
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={metrics.districtPerformance}
            barGap={4}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
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
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Survey Distribution"
        subtitle={`Submissions by survey type · ${CHART_CLICK_HINT}`}
        index={2}
      >
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={metrics.surveyDistribution}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                style={pointerBarStyle}
                onClick={(entry) => {
                  const name = (entry as { name?: string }).name;
                  const surveyType = name ? SURVEY_TYPE_BY_NAME[name] : undefined;
                  if (surveyType) pick({ surveyType });
                }}
              >
                {metrics.surveyDistribution.map((entry, index) => {
                  const surveyType = SURVEY_TYPE_BY_NAME[entry.name];
                  const selected = surveyType && filters.surveyType === surveyType;
                  const dim = filters.surveyType !== "all" && !selected;
                  return (
                    <Cell
                      key={index}
                      fill={entry.color}
                      fillOpacity={dim ? 0.35 : 1}
                      stroke={selected ? "#0B7080" : "transparent"}
                      strokeWidth={selected ? 2 : 0}
                    />
                  );
                })}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} cursor={false} />
              <text
                x="50%"
                y="48%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-2xl font-bold"
              >
                {metrics.totalSubmissions}
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
              >
                Total
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-center gap-6">
          {metrics.surveyDistribution.map((d) => (
            <button
              key={d.name}
              type="button"
              onClick={() => {
                const surveyType = SURVEY_TYPE_BY_NAME[d.name];
                if (surveyType) pick({ surveyType });
              }}
              className="flex items-center gap-2 text-xs hover:opacity-80"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-muted-foreground">
                {d.name}: <strong className="text-foreground">{d.value}</strong>
              </span>
            </button>
          ))}
        </div>
      </ChartCard>

      <ChartCard
        title="District Heatmap"
        subtitle={`Performance intensity · ${CHART_CLICK_HINT}`}
        index={3}
      >
        <div className="grid grid-cols-2 gap-3 p-2">
          {metrics.districtPerformance.map((d, i) => {
            const intensity = Math.round(
              (d.trackingRate + d.hhCompletion + d.girlsCompletion) / 3
            );
            const selected = filters.district === d.district;
            return (
              <motion.button
                key={d.district}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => pick({ district: d.district })}
                className="cursor-pointer rounded-xl border p-4 text-left transition-shadow hover:shadow-md"
                style={{
                  background: `linear-gradient(135deg, rgba(33,161,170,${intensity / 200}) 0%, rgba(237,202,92,${intensity / 300}) 100%)`,
                  borderColor: selected
                    ? "rgba(11, 112, 128, 0.6)"
                    : "var(--border)",
                  boxShadow: selected ? "0 0 0 2px rgba(11, 112, 128, 0.35)" : undefined,
                }}
              >
                <p className="text-sm font-semibold text-foreground">{d.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{intensity}%</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {d.submissions} submissions
                </p>
              </motion.button>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  index = 0,
  children,
}: {
  title: string;
  subtitle: string;
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        delay: index * 0.06,
        type: "spring",
        stiffness: 240,
        damping: 26,
      }}
      className="surface-card chart-accent group relative overflow-hidden rounded-2xl p-6"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}
