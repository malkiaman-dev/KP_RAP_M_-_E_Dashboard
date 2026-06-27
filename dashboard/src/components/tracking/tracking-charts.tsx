"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  toggleTrackingFilters,
  UNTRACKED_REASON_BY_LABEL,
  type TrackingFilters,
  type TrackingMetrics,
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

const chartDateTickFormatter = (value: string) => formatDisplayDate(value) || value;

export function TrackingCharts({
  metrics,
  loading,
  filters,
  onFilterChange,
}: {
  metrics?: TrackingMetrics;
  loading?: boolean;
  filters: TrackingFilters;
  onFilterChange: (filters: TrackingFilters) => void;
}) {
  if (loading) {
    return (
      <ChartGridSkeleton
        count={8}
        className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[300px_300px_380px]"
      />
    );
  }

  if (!metrics) return null;

  const pick = (patch: Partial<TrackingFilters>) =>
    onFilterChange(toggleTrackingFilters(filters, patch));

  const pickDate = (iso: string) =>
    onFilterChange({
      ...filters,
      todayOnly: false,
      ...toggleDateRange(filters.dateFrom, filters.dateTo, iso),
    });

  const districtActive = (district: string) =>
    filters.district === "all" || filters.district === district;

  const villageActive = (villageId: string) =>
    filters.village === "all" || filters.village === villageId;

  const enumActive = (id: string) =>
    filters.enumerator === "all" || filters.enumerator === id;

  const groupActive = (group: string) =>
    filters.trackingGroup === "all" || filters.trackingGroup === group;

  const enrollActive = (status: string) =>
    filters.enrollStatus === "all" || filters.enrollStatus === status;

  const primaryAlternateData = [
    { name: "Enrolled", value: metrics.primaryAlternate.enrolled, color: "#21A1AA" },
    {
      name: "Dropped Out",
      value: metrics.primaryAlternate.droppedOut,
      color: "#EDCA5C",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[300px_300px_380px] lg:items-stretch">
      <ChartCard
        title="Top Villages with Untracked Girls"
        subtitle={`Unique girls not yet tracked · ${CHART_CLICK_HINT}`}
        className="lg:col-start-1 lg:row-start-1"
      >
        <ChartArea>
          <BarChart
            data={metrics.topVillagesUntracked}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 6, bottom: 6 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="village"
              width={110}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={false} />
            <Bar
              dataKey="count"
              name="Untracked"
              fill="url(#grad-red-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                const villageId = row?.villageId || row?.village;
                if (!villageId) return;
                pick({ village: villageId });
              }}
            >
              {metrics.topVillagesUntracked.map((entry) => (
                <Cell
                  key={entry.village}
                  fillOpacity={villageActive(entry.villageId) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Tracked by District"
        subtitle={`Successfully tracked girls · ${CHART_CLICK_HINT}`}
        className="lg:col-start-2 lg:row-start-1"
      >
        <ChartArea>
          <BarChart
            data={metrics.trackedByDistrict}
            layout="vertical"
            margin={{ top: 6, bottom: 6 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={90}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={false} />
            <Bar
              dataKey="tracked"
              name="Tracked"
              fill="url(#grad-teal-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.district) return;
                pick({ district: row.district });
              }}
            >
              {metrics.trackedByDistrict.map((entry) => (
                <Cell
                  key={entry.district}
                  fillOpacity={districtActive(entry.district) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Why Girls Remain Untracked"
        subtitle={`Breakdown of unsuccessful attempts · ${CHART_CLICK_HINT}`}
        className="lg:col-start-3 lg:row-start-1"
      >
        <ChartArea>
          <BarChart
            data={metrics.untrackedReasons}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 6, bottom: 6 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="reason"
              width={120}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={false} />
            <Bar
              dataKey="count"
              name="Girls"
              fill="url(#grad-red-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                const reason = row?.reason;
                if (!reason) return;
                const key = UNTRACKED_REASON_BY_LABEL[reason];
                if (!key) return;
                pick({ untrackedReason: key });
              }}
            >
              {metrics.untrackedReasons.map((entry) => {
                const key = UNTRACKED_REASON_BY_LABEL[entry.reason];
                const selected = key && filters.untrackedReason === key;
                const dim =
                  filters.untrackedReason !== "all" && !selected;
                return (
                  <Cell key={entry.reason} fillOpacity={dim ? 0.35 : 1} />
                );
              })}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Untracked Girls by District"
        subtitle={`Girls in data not yet tracked · ${CHART_CLICK_HINT}`}
        className="lg:col-start-1 lg:row-start-2"
      >
        <ChartArea>
          <BarChart
            data={metrics.trackedByDistrict}
            layout="vertical"
            margin={{ top: 6, bottom: 6 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={90}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={false} />
            <Bar
              dataKey="untracked"
              name="Untracked"
              fill="url(#grad-red-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.district) return;
                pick({ district: row.district });
              }}
            >
              {metrics.trackedByDistrict.map((entry) => (
                <Cell
                  key={entry.district}
                  fillOpacity={districtActive(entry.district) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Tracking Trend Over Time"
        subtitle={`Cumulative girls tracked · ${CHART_CLICK_HINT}`}
        className="lg:col-start-2 lg:row-start-2"
      >
        <ChartArea>
          <LineChart data={metrics.trackingTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={chartDateTickFormatter}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={false}
              labelFormatter={(label) => chartDateTickFormatter(String(label))}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Girls Tracked"
              stroke="#21A1AA"
              strokeWidth={2}
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
                    r={selected ? 5 : 3}
                    fill={selected ? "#EDCA5C" : "#21A1AA"}
                    stroke={selected ? "#0B7080" : "none"}
                    strokeWidth={selected ? 2 : 0}
                    style={{ cursor: "pointer" }}
                    onClick={() => date && pickDate(date)}
                  />
                );
              }}
              activeDot={{
                r: 6,
                onClick: (_e, payload) => {
                  const date = String(
                    (payload as { payload?: { date?: string } })?.payload?.date ??
                      ""
                  );
                  if (date) pickDate(date);
                },
              }}
            />
          </LineChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Tracked Girls (Enrolled vs Dropped Out)"
        subtitle={`Enrolled vs dropped out at tracking · ${CHART_CLICK_HINT}`}
        className="lg:col-start-3 lg:row-start-2"
      >
        <ChartArea>
          <PieChart>
            <Pie
              data={primaryAlternateData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              dataKey="value"
              paddingAngle={3}
              style={{ cursor: "pointer" }}
              onClick={(entry) => {
                const status = (entry as { name?: string })?.name;
                if (status) pick({ enrollStatus: status });
              }}
            >
              {primaryAlternateData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  fillOpacity={enrollActive(entry.name) ? 1 : 0.35}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} cursor={false} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Baseline vs New Sample Progress"
        subtitle={`Successfully tracked vs remaining · ${CHART_CLICK_HINT}`}
        className="lg:col-span-2 lg:col-start-1 lg:row-start-3"
      >
        <ChartArea>
          <BarChart data={metrics.cohortProgress}>
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={false} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="tracked"
              name="Successfully tracked"
              stackId="progress"
              fill="url(#grad-teal)"
              radius={[0, 0, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.trackingGroup) return;
                pick({ trackingGroup: row.trackingGroup });
              }}
            >
              {metrics.cohortProgress.map((entry) => (
                <Cell
                  key={`t-${entry.cohort}`}
                  fillOpacity={groupActive(entry.trackingGroup) ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Bar
              dataKey="remaining"
              name="Remaining to target"
              stackId="progress"
              fill="url(#grad-gold)"
              radius={[4, 4, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.trackingGroup) return;
                pick({ trackingGroup: row.trackingGroup });
              }}
            >
              {metrics.cohortProgress.map((entry) => (
                <Cell
                  key={`r-${entry.cohort}`}
                  fillOpacity={groupActive(entry.trackingGroup) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Untracked Girls Rate by Enumerator (%)"
        subtitle={`Share of assigned girls not yet tracked · ${CHART_CLICK_HINT}`}
        className="lg:col-start-3 lg:row-start-3"
      >
        <ChartArea>
          <BarChart
            data={metrics.enumeratorUntrackedRate}
            layout="vertical"
            margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={EnumeratorAxisTick}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={false}
              labelFormatter={enumeratorTooltipLabel}
              formatter={(value, _name, props) => {
                const v = typeof value === "number" ? value : 0;
                const payload = props?.payload as { untracked?: number; total?: number };
                return [
                  `${v.toFixed(1)}% (${payload?.untracked ?? 0}/${payload?.total ?? 0})`,
                  "Untracked rate",
                ];
              }}
            />
            <Bar
              dataKey="rate"
              name="Untracked %"
              fill="url(#grad-deepteal-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.id) return;
                pick({ enumerator: row.id });
              }}
            >
              {metrics.enumeratorUntrackedRate.map((entry) => (
                <Cell
                  key={entry.id}
                  fillOpacity={enumActive(entry.id) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>
    </div>
  );
}

function EnumeratorAxisTick(props: {
  x?: string | number;
  y?: string | number;
  payload?: { value?: string };
}) {
  const x = typeof props.x === "number" ? props.x : Number(props.x ?? 0);
  const y = typeof props.y === "number" ? props.y : Number(props.y ?? 0);

  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={9}
      fill="var(--muted-foreground)"
    >
      {props.payload?.value ?? ""}
    </text>
  );
}

