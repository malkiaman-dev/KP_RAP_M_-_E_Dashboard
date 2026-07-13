"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  type TooltipContentProps,
} from "recharts";
import {
  toggleErrorFilters,
  type ErrorFilters,
  type ErrorMetrics,
} from "@/lib/data/error-metrics";

import {
  barPayload,
  CHART_CLICK_HINT,
  enumeratorTooltipLabel,
  pointerBarStyle,
} from "@/lib/chart-cross-filter";
import {
  ChartArea,
  ChartCard,
  ChartGridSkeleton,
} from "@/components/ui/chart-card";
import { tooltipStyle, ChartGradients, chartMargin, legendProps } from "@/components/ui/chart-theme";
import { useFirm } from "@/components/brand/firm-provider";
import type { FirmPalette } from "@/lib/brand";

function scoreColor(score: number, palette: FirmPalette): string {
  if (score >= 90) return palette.teal;
  if (score >= 75) return palette.gold;
  return "#EF4444";
}

type RuleErrorPoint = {
  ruleId?: string;
  title?: string;
  count?: number;
};

/** Full rule id + title; parents use allowOverflow so this is not clipped. */
function RuleErrorTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload as RuleErrorPoint;
  const count = payload[0].value ?? row.count ?? 0;
  return (
    <div style={tooltipStyle} className="max-w-[260px]">
      <p className="break-all font-mono text-[10px] text-muted-foreground">
        {row.ruleId}
      </p>
      <p className="mt-0.5 text-xs font-medium text-foreground">{row.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {Number(count).toLocaleString()} errors
      </p>
    </div>
  );
}

const escapeTooltipProps = {
  allowEscapeViewBox: { x: true, y: true } as const,
  reverseDirection: { x: true, y: false } as const,
  offset: 16,
  wrapperStyle: { zIndex: 1000, outline: "none" } as const,
};

export function ErrorCharts({
  metrics,
  loading,
  filters,
  onFilterChange,
  lockDistrict = false,
}: {
  metrics?: ErrorMetrics;
  loading?: boolean;
  filters: ErrorFilters;
  onFilterChange: (filters: ErrorFilters) => void;
  /** Field accounts: ignore district toggles from chart clicks. */
  lockDistrict?: boolean;
}) {
  const { palette } = useFirm();

  if (loading) {
    return (
      <ChartGridSkeleton
        count={6}
        className="grid gap-6 overflow-visible lg:grid-cols-3 lg:grid-rows-[300px_340px_360px]"
      />
    );
  }

  if (!metrics) return null;

  const pick = (patch: Partial<ErrorFilters>) => {
    const next = { ...patch };
    if (lockDistrict) delete next.district;
    onFilterChange(toggleErrorFilters(filters, next));
  };

  const districtActive = (district: string) =>
    filters.district === "all" || filters.district === district;

  const surveyActive = (survey: string) =>
    filters.survey === "all" || filters.survey === survey;

  const ruleActive = (ruleId: string) =>
    filters.ruleId === "all" || filters.ruleId === ruleId;

  const enumActive = (id: string) =>
    filters.enumerator === "all" || filters.enumerator === id;

  return (
    <div className="grid gap-6 overflow-visible lg:grid-cols-3 lg:grid-rows-[300px_340px_360px] lg:items-stretch">
      <ChartCard
        title="Errors by Severity"
        subtitle={`Critical vs quality flags · ${CHART_CLICK_HINT}`}
        className="lg:col-start-1 lg:row-start-1"
      >
        <ChartArea>
          <PieChart margin={chartMargin.withLegend}>
            <Pie
              data={metrics.severityBreakdown}
              dataKey="value"
              nameKey="name"
              innerRadius="48%"
              outerRadius="68%"
              paddingAngle={2}
              style={pointerBarStyle}
              onClick={(entry) => {
                const name = (entry as { name?: string }).name;
                if (!name) return;
                pick({
                  severity: name === "Critical" ? "CRITICAL" : "FLAG",
                });
              }}
            >
              {metrics.severityBreakdown.map((d) => {
                const sev = d.name === "Critical" ? "CRITICAL" : "FLAG";
                const selected = filters.severity === sev;
                const dim =
                  filters.severity !== "all" && !selected;
                const fillColor =
                  d.name === "Critical" ? "#EF4444" : palette.gold;
                return (
                  <Cell
                    key={d.name}
                    fill={fillColor}
                    fillOpacity={dim ? 0.35 : 1}
                    stroke={selected ? palette.selected : undefined}
                    strokeWidth={selected ? 2 : 0}
                  />
                );
              })}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} {...escapeTooltipProps} />
            <Legend {...legendProps} />
          </PieChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Errors by District"
        subtitle={`Critical and quality issues per district · ${CHART_CLICK_HINT}`}
        className="lg:col-span-2 lg:col-start-2 lg:row-start-1"
      >
        <ChartArea>
          <BarChart data={metrics.byDistrict} margin={chartMargin.withLegend}>
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="district" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={false} {...escapeTooltipProps} />
            <Legend {...legendProps} />
            <Bar
              dataKey="critical"
              name="Critical"
              stackId="a"
              fill="url(#grad-red)"
              radius={[0, 0, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.district) return;
                pick({ district: row.district, severity: "CRITICAL" });
              }}
            >
              {metrics.byDistrict.map((entry) => (
                <Cell
                  key={`crit-${entry.district}`}
                  fillOpacity={districtActive(entry.district) ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Bar
              dataKey="flag"
              name="Quality"
              stackId="a"
              fill="url(#grad-gold)"
              radius={[4, 4, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.district) return;
                pick({ district: row.district, severity: "FLAG" });
              }}
            >
              {metrics.byDistrict.map((entry) => (
                <Cell
                  key={`flag-${entry.district}`}
                  fillOpacity={districtActive(entry.district) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Top Critical Errors"
        subtitle={`Most frequent critical validation rules · ${CHART_CLICK_HINT}`}
        className="lg:col-start-1 lg:row-start-2"
        allowOverflow
      >
        <ChartArea>
          <BarChart
            data={metrics.topCriticalRules}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 6, bottom: 6 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="ruleId" width={120} interval={0} tick={{ fontSize: 9 }} />
            <Tooltip
              content={RuleErrorTooltip}
              cursor={false}
              {...escapeTooltipProps}
            />
            <Bar
              dataKey="count"
              name="Critical"
              fill="url(#grad-red-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.ruleId) return;
                pick({ ruleId: row.ruleId, severity: "CRITICAL" });
              }}
            >
              {metrics.topCriticalRules.map((entry) => (
                <Cell
                  key={entry.ruleId}
                  fillOpacity={ruleActive(entry.ruleId) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Top Quality Errors"
        subtitle={`Most frequent quality-flag rules · ${CHART_CLICK_HINT}`}
        className="lg:col-start-2 lg:row-start-2"
        allowOverflow
      >
        <ChartArea>
          <BarChart
            data={metrics.topQualityRules}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 6, bottom: 6 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="ruleId" width={120} interval={0} tick={{ fontSize: 9 }} />
            <Tooltip
              content={RuleErrorTooltip}
              cursor={false}
              {...escapeTooltipProps}
            />
            <Bar
              dataKey="count"
              name="Quality"
              fill="url(#grad-gold-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.ruleId) return;
                pick({ ruleId: row.ruleId, severity: "FLAG" });
              }}
            >
              {metrics.topQualityRules.map((entry) => (
                <Cell
                  key={entry.ruleId}
                  fillOpacity={ruleActive(entry.ruleId) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Errors by Survey"
        subtitle={`Critical and quality issues per survey · ${CHART_CLICK_HINT}`}
        className="lg:col-start-3 lg:row-start-2"
      >
        <ChartArea>
          <BarChart
            data={metrics.bySurvey}
            layout="vertical"
            margin={chartMargin.withLegend}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="survey" width={120} interval={0} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={tooltipStyle} cursor={false} {...escapeTooltipProps} />
            <Legend {...legendProps} />
            <Bar
              dataKey="critical"
              name="Critical"
              stackId="a"
              fill="url(#grad-red-h)"
              radius={[0, 0, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.survey) return;
                pick({ survey: row.survey, severity: "CRITICAL" });
              }}
            >
              {metrics.bySurvey.map((entry) => (
                <Cell
                  key={`crit-${entry.survey}`}
                  fillOpacity={surveyActive(entry.survey) ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Bar
              dataKey="flag"
              name="Quality"
              stackId="a"
              fill="url(#grad-gold-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.survey) return;
                pick({ survey: row.survey, severity: "FLAG" });
              }}
            >
              {metrics.bySurvey.map((entry) => (
                <Cell
                  key={`flag-${entry.survey}`}
                  fillOpacity={surveyActive(entry.survey) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Critical Errors by Enumerator"
        subtitle={`Field enumerators with the most critical issues · ${CHART_CLICK_HINT}`}
        className="lg:col-span-1 lg:col-start-1 lg:row-start-3"
        allowOverflow
      >
        <ChartArea>
          <BarChart
            data={metrics.enumeratorCritical}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 6, bottom: 6 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={110} interval={0} tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={false}
              labelFormatter={enumeratorTooltipLabel}
              {...escapeTooltipProps}
            />
            <Bar
              dataKey="count"
              name="Critical errors"
              fill="url(#grad-red-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.id) return;
                pick({ enumerator: row.id, severity: "CRITICAL" });
              }}
            >
              {metrics.enumeratorCritical.map((entry) => (
                <Cell
                  key={entry.id}
                  fillOpacity={enumActive(entry.id) ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Enumerator Quality Score"
        subtitle={`Lowest 15 scores · ${CHART_CLICK_HINT}`}
        className="lg:col-span-2 lg:col-start-2 lg:row-start-3"
        allowOverflow
      >
        <ChartArea>
          <BarChart
            data={metrics.enumeratorQuality}
            margin={{ left: 4, right: 12, bottom: 56 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9 }}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={false}
              labelFormatter={enumeratorTooltipLabel}
              formatter={(value) => [value as number, "Quality score"]}
              {...escapeTooltipProps}
            />
            <Bar
              dataKey="score"
              name="Quality score"
              radius={[4, 4, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.id) return;
                pick({ enumerator: row.id });
              }}
            >
              {metrics.enumeratorQuality.map((e) => {
                const selected = filters.enumerator === e.id;
                const dim =
                  filters.enumerator !== "all" && !selected;
                return (
                  <Cell
                    key={e.id}
                    fill={scoreColor(e.score, palette)}
                    fillOpacity={dim ? 0.35 : 1}
                    stroke={selected ? palette.selected : undefined}
                    strokeWidth={selected ? 2 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>
    </div>
  );
}
