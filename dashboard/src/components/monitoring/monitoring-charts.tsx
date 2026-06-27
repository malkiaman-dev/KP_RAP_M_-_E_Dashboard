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
  toggleTrackingFilters,
  type MonitoringMetrics,
  type TrackingFilters,
} from "@/lib/data/tracking-metrics";
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
import { tooltipStyle, ChartGradients } from "@/components/ui/chart-theme";
import { formatDisplayDate } from "@/lib/utils";

const dateTick = (value: string) => formatDisplayDate(value) || value;
const dateLabel = (value: unknown) => dateTick(String(value ?? ""));

export function MonitoringCharts({
  metrics,
  loading,
  filters,
  onFilterChange,
}: {
  metrics?: MonitoringMetrics;
  loading?: boolean;
  filters: TrackingFilters;
  onFilterChange: (filters: TrackingFilters) => void;
}) {
  if (loading) {
    return (
      <ChartGridSkeleton
        count={4}
        className="grid gap-6 lg:grid-cols-2 lg:grid-rows-[320px_360px]"
      />
    );
  }

  if (!metrics) return null;

  const target = metrics.dailyTarget;

  const pick = (patch: Partial<TrackingFilters>) =>
    onFilterChange(toggleTrackingFilters(filters, patch));

  const pickDate = (iso: string) =>
    onFilterChange({
      ...filters,
      ...toggleDateRange(filters.dateFrom, filters.dateTo, iso),
    });

  const dateActive = (date: string) =>
    !filters.dateFrom ||
    (filters.dateFrom === date && filters.dateTo === date);

  const enumActive = (id: string) =>
    filters.enumerator === "all" || filters.enumerator === id;

  const topByAvg = [...metrics.enumeratorPerformance]
    .sort((a, b) => b.avgTrackedPerDay - a.avgTrackedPerDay)
    .slice(0, 15);

  const topBySubmissions = [...metrics.enumeratorPerformance]
    .sort((a, b) => b.submissions - a.submissions)
    .slice(0, 15);

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:grid-rows-[320px_360px] lg:items-stretch">
      <ChartCard
        title="Daily Tracking vs Target"
        subtitle={`Girls tracked per day vs expected (active enumerators × ${target}) · ${CHART_CLICK_HINT}`}
        className="lg:col-start-1 lg:row-start-1"
      >
        <ChartArea>
          <ComposedChart data={metrics.dailyTrend} margin={{ left: 4, right: 12 }}>
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="trackedGirls"
              name="Tracked"
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
              dataKey="expectedTracked"
              name="Expected (target)"
              stroke="#EDCA5C"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </ComposedChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Daily Field Activity"
        subtitle={`Submissions and active enumerators per day · ${CHART_CLICK_HINT}`}
        className="lg:col-start-2 lg:row-start-1"
      >
        <ChartArea>
          <ComposedChart data={metrics.dailyTrend} margin={{ left: 4, right: 12 }}>
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="left"
              dataKey="submissions"
              name="Submissions"
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
              stroke="#21A1AA"
              strokeWidth={2}
              dot={{ r: 2, cursor: "pointer" }}
              activeDot={{
                r: 5,
                onClick: (_e, payload) => {
                  const date = String(
                    (payload as { payload?: { date?: string } })?.payload?.date ??
                      ""
                  );
                  if (date) pickDate(date);
                },
              }}
            />
          </ComposedChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Avg Girls Tracked / Day by Enumerator"
        subtitle={`Daily target of ${target} · ${CHART_CLICK_HINT}`}
        className="lg:col-start-1 lg:row-start-2"
      >
        <ChartArea>
          <BarChart data={topByAvg} margin={{ left: 4, right: 12, bottom: 56 }}>
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
              formatter={(value) => [Number(value).toFixed(1), "Avg tracked/day"]}
            />
            <ReferenceLine
              y={target}
              stroke="#EDCA5C"
              strokeDasharray="5 4"
              strokeWidth={2}
            />
            <Bar
              dataKey="avgTrackedPerDay"
              name="Avg tracked/day"
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
                  fill={e.avgTrackedPerDay >= target ? "#21A1AA" : "#EF4444"}
                  fillOpacity={enumActive(e.id) ? 1 : 0.35}
                  stroke={filters.enumerator === e.id ? "#0B7080" : undefined}
                  strokeWidth={filters.enumerator === e.id ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Submissions vs Tracked by Enumerator"
        subtitle={`Workload vs outcomes (top 15) · ${CHART_CLICK_HINT}`}
        className="lg:col-start-2 lg:row-start-2"
      >
        <ChartArea>
          <BarChart
            data={topBySubmissions}
            margin={{ left: 4, right: 12, bottom: 56 }}
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="submissions"
              name="Submissions"
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
              dataKey="trackedGirls"
              name="Tracked"
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
                  key={`t-${e.id}`}
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

