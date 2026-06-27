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
import { tooltipStyle, ChartGradients } from "@/components/ui/chart-theme";

function scoreColor(score: number): string {
  if (score >= 90) return "#21A1AA";
  if (score >= 75) return "#EDCA5C";
  return "#EF4444";
}

export function ErrorCharts({
  metrics,
  loading,
  filters,
  onFilterChange,
}: {
  metrics?: ErrorMetrics;
  loading?: boolean;
  filters: ErrorFilters;
  onFilterChange: (filters: ErrorFilters) => void;
}) {
  if (loading) {
    return (
      <ChartGridSkeleton
        count={6}
        className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[300px_340px_360px]"
      />
    );
  }

  if (!metrics) return null;

  const pick = (patch: Partial<ErrorFilters>) =>
    onFilterChange(toggleErrorFilters(filters, patch));

  const districtActive = (district: string) =>
    filters.district === "all" || filters.district === district;

  const surveyActive = (survey: string) =>
    filters.survey === "all" || filters.survey === survey;

  const ruleActive = (ruleId: string) =>
    filters.ruleId === "all" || filters.ruleId === ruleId;

  const enumActive = (name: string) =>
    filters.enumerator === "all" || filters.enumerator === name;

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[300px_340px_360px] lg:items-stretch">
      <ChartCard
        title="Errors by Severity"
        subtitle={`Critical vs quality flags · ${CHART_CLICK_HINT}`}
        className="lg:col-start-1 lg:row-start-1"
      >
        <ChartArea>
          <PieChart>
            <Pie
              data={metrics.severityBreakdown}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="80%"
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
                return (
                  <Cell
                    key={d.name}
                    fill={d.color}
                    fillOpacity={dim ? 0.35 : 1}
                    stroke={selected ? "#0B7080" : undefined}
                    strokeWidth={selected ? 2 : 0}
                  />
                );
              })}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Errors by District"
        subtitle={`Critical and quality issues per district · ${CHART_CLICK_HINT}`}
        className="lg:col-span-2 lg:col-start-2 lg:row-start-1"
      >
        <ChartArea>
          <BarChart data={metrics.byDistrict} margin={{ left: 4, right: 12 }}>
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="district" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={false} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
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
              contentStyle={tooltipStyle}
              cursor={false}
              formatter={(value, _n, item) => [
                value as number,
                (item?.payload as { title?: string })?.title || "Errors",
              ]}
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
              contentStyle={tooltipStyle}
              cursor={false}
              formatter={(value, _n, item) => [
                value as number,
                (item?.payload as { title?: string })?.title || "Errors",
              ]}
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
            margin={{ left: 8, right: 16, top: 6, bottom: 6 }}
          >
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="survey" width={120} interval={0} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={tooltipStyle} cursor={false} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
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
            />
            <Bar
              dataKey="count"
              name="Critical errors"
              fill="url(#grad-red-h)"
              radius={[0, 4, 4, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.name) return;
                pick({ enumerator: row.name, severity: "CRITICAL" });
              }}
            >
              {metrics.enumeratorCritical.map((entry) => (
                <Cell
                  key={entry.name}
                  fillOpacity={enumActive(entry.name) ? 1 : 0.35}
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
            />
            <Bar
              dataKey="score"
              name="Quality score"
              radius={[4, 4, 0, 0]}
              style={pointerBarStyle}
              onClick={(data) => {
                const row = barPayload(data);
                if (!row?.name) return;
                pick({ enumerator: row.name });
              }}
            >
              {metrics.enumeratorQuality.map((e) => {
                const selected = filters.enumerator === e.name;
                const dim =
                  filters.enumerator !== "all" && !selected;
                return (
                  <Cell
                    key={e.name}
                    fill={scoreColor(e.score)}
                    fillOpacity={dim ? 0.35 : 1}
                    stroke={selected ? "#0B7080" : undefined}
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

