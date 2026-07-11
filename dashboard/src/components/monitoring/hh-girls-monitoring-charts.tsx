"use client";

import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  toggleHhGirlsMonitoringFilters,
  type HhGirlsMonitoringFilters,
  type HhGirlsMonitoringMetrics,
} from "@/lib/data/hh-girls-monitoring";
import type { HhGirlsFilters } from "@/lib/data/hh-girls-metrics";
import {
  barPayload,
  CHART_CLICK_HINT,
  enumeratorTooltipLabel,
  pointerBarStyle,
  toggleDateRange,
} from "@/lib/chart-cross-filter";
import {
  ChartArea,
  ChartCard,
  ChartGridSkeleton,
} from "@/components/ui/chart-card";
import {
  tooltipStyle,
  ChartGradients,
  chartMargin,
  legendProps,
} from "@/components/ui/chart-theme";
import { useFirm } from "@/components/brand/firm-provider";
import { formatDisplayDate } from "@/lib/utils";

const dateTick = (value: string) => formatDisplayDate(value) || value;
const dateLabel = (value: unknown) => dateTick(String(value ?? ""));

export function HhGirlsMonitoringCharts({
  metrics,
  loading,
  filters,
  onFilterChange,
}: {
  metrics?: HhGirlsMonitoringMetrics;
  loading?: boolean;
  filters: HhGirlsMonitoringFilters;
  onFilterChange: (filters: HhGirlsFilters | HhGirlsMonitoringFilters) => void;
}) {
  const { palette } = useFirm();

  if (loading) {
    return (
      <ChartGridSkeleton
        count={4}
        className="grid gap-6 lg:grid-cols-2 lg:grid-rows-[340px_380px]"
      />
    );
  }

  if (!metrics) return null;

  const hhTarget = metrics.dailyHhTarget;
  const formsTarget = metrics.dailyFormsTarget;

  const pick = (patch: Partial<HhGirlsMonitoringFilters>) =>
    onFilterChange(toggleHhGirlsMonitoringFilters(filters, patch));

  const pickDate = (iso: string) =>
    onFilterChange({
      ...filters,
      todayOnly: false,
      ...toggleDateRange(filters.dateFrom, filters.dateTo, iso),
    });

  const dateActive = (date: string) =>
    !filters.dateFrom ||
    (filters.dateFrom === date && filters.dateTo === date);

  const enumActive = (id: string) =>
    filters.enumerator === "all" || filters.enumerator === id;

  const topByAvg = [...metrics.enumeratorPerformance]
    .sort((a, b) => b.avgCompletedPerDay - a.avgCompletedPerDay)
    .slice(0, 15);

  const topBySubmissions = [...metrics.enumeratorPerformance]
    .sort((a, b) => b.submissions - a.submissions)
    .slice(0, 15);

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:grid-rows-[340px_380px] lg:items-stretch">
      <ChartCard
        title="Daily Completed HH vs Target"
        subtitle={`Completed households per day vs expected (active enumerators × ${hhTarget}) · ${CHART_CLICK_HINT}`}
        className="lg:col-start-1 lg:row-start-1"
      >
        <ChartArea>
          <ComposedChart data={metrics.dailyTrend} margin={chartMargin.withLegend}>
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={dateTick}
              minTickGap={16}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={false} labelFormatter={dateLabel} />
            <Legend {...legendProps} />
            <Bar
              dataKey="completedHouseholds"
              name="Completed HH"
              fill="url(#grad-teal)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.date) return;
                pickDate(row.date);
              }}
            >
              {metrics.dailyTrend.map((entry) => (
                <Cell
                  key={entry.date}
                  fillOpacity={dateActive(entry.date) ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="expectedCompleted"
              name="Expected (HH target)"
              stroke={palette.gold}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </ComposedChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Daily Field Activity"
        subtitle={`Forms and active enumerators per day (forms target ${formsTarget}/enum) · ${CHART_CLICK_HINT}`}
        className="lg:col-start-2 lg:row-start-1"
      >
        <ChartArea>
          <ComposedChart data={metrics.dailyTrend} margin={chartMargin.withLegend}>
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={dateTick}
              minTickGap={16}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={false} labelFormatter={dateLabel} />
            <Legend {...legendProps} />
            <Bar
              yAxisId="left"
              dataKey="submissions"
              name="Forms"
              fill="url(#grad-indigo)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.date) return;
                pickDate(row.date);
              }}
            >
              {metrics.dailyTrend.map((entry) => (
                <Cell
                  key={entry.date}
                  fillOpacity={dateActive(entry.date) ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="activeEnumerators"
              name="Active Enumerators"
              stroke={palette.teal}
              strokeWidth={2}
              dot={{ r: 2, cursor: "pointer" }}
              activeDot={{
                r: 5,
                onClick: (_e, payload) => {
                  const date = String(
                    (payload as { payload?: { date?: string } })?.payload
                      ?.date ?? ""
                  );
                  if (date) pickDate(date);
                },
              }}
            />
          </ComposedChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Avg Completed HH / Day by Enumerator"
        subtitle={`Daily HH target of ${hhTarget} · ${CHART_CLICK_HINT}`}
        className="lg:col-start-1 lg:row-start-2"
      >
        <ChartArea>
          <BarChart data={topByAvg} margin={chartMargin.rotatedLabels}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9 }}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={false}
              labelFormatter={enumeratorTooltipLabel}
              formatter={(value) => [
                Math.round(Number(value)).toString(),
                "Avg completed HH/day",
              ]}
            />
            <ReferenceLine
              y={hhTarget}
              stroke={palette.gold}
              strokeDasharray="5 4"
              strokeWidth={2}
            />
            <Bar
              dataKey="avgCompletedPerDay"
              name="Avg completed HH/day"
              radius={[4, 4, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.id) return;
                pick({ enumerator: row.id });
              }}
            >
              {topByAvg.map((e) => (
                <Cell
                  key={e.id}
                  fill={
                    e.avgCompletedPerDay >= hhTarget ? palette.teal : "#EF4444"
                  }
                  fillOpacity={enumActive(e.id) ? 1 : 0.35}
                  stroke={
                    filters.enumerator === e.id ? palette.selected : undefined
                  }
                  strokeWidth={filters.enumerator === e.id ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Forms vs Completed HH by Enumerator"
        subtitle={`Workload vs outcomes (top 15) · forms target ${formsTarget}/day · ${CHART_CLICK_HINT}`}
        className="lg:col-start-2 lg:row-start-2"
      >
        <ChartArea>
          <BarChart
            data={topBySubmissions}
            margin={chartMargin.withLegendRotated}
            barGap={2}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9 }}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={false}
              labelFormatter={enumeratorTooltipLabel}
            />
            <Legend {...legendProps} />
            <Bar
              dataKey="submissions"
              name="Forms"
              fill="url(#grad-indigo)"
              radius={[4, 4, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.id) return;
                pick({ enumerator: row.id });
              }}
            >
              {topBySubmissions.map((e) => (
                <Cell
                  key={`s-${e.id}`}
                  fillOpacity={enumActive(e.id) ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Bar
              dataKey="completedHouseholds"
              name="Completed HH"
              fill="url(#grad-teal)"
              radius={[4, 4, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.id) return;
                pick({ enumerator: row.id });
              }}
            >
              {topBySubmissions.map((e) => (
                <Cell
                  key={`c-${e.id}`}
                  fillOpacity={enumActive(e.id) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>
    </div>
  );
}
