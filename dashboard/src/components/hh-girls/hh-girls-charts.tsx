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
import type { HhGirlsMetrics } from "@/lib/data/hh-girls-metrics";
import { ChartArea, ChartCard, ChartGridSkeleton } from "@/components/ui/chart-card";
import { tooltipStyle, ChartGradients, chartMargin, legendProps } from "@/components/ui/chart-theme";
import { useFirm } from "@/components/brand/firm-provider";
import { formatDisplayDate } from "@/lib/utils";

export function HhGirlsCharts({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
}) {
  const { palette } = useFirm();

  if (loading || !metrics) {
    return <ChartGridSkeleton count={6} className="grid gap-4 lg:grid-cols-2" />;
  }

  const c = metrics.core;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Survey Mix" subtitle="Father, mother, and girls forms" index={0}>
        <ChartArea>
          <PieChart>
            <Pie
              data={c.surveyMix}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {c.surveyMix.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
          </PieChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Unavailability" subtitle="By tracked girl" index={1}>
        <ChartArea>
          <BarChart data={c.unavailabilityBreakdown} margin={chartMargin.default}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-12} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" name="Girls" radius={[4, 4, 0, 0]}>
              {c.unavailabilityBreakdown.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Completed Households by District" index={2}>
        <ChartArea>
          <BarChart data={c.completionByDistrict} margin={chartMargin.default}>
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
            <Bar dataKey="completed" name="Completed" fill="url(#grad-teal)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="partial" name="In progress" fill="url(#grad-gold)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Consent Outcome" subtitle="All survey forms combined" index={3}>
        <ChartArea>
          <PieChart>
            <Pie
              data={c.consentOutcome}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {c.consentOutcome.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
          </PieChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Survey Forms by Enumerator"
        subtitle="Father, mother, and girls stacked"
        index={4}
      >
        <ChartArea>
          <BarChart data={c.surveyFormsByEnumerator} margin={chartMargin.verticalBar} layout="vertical">
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
            <Bar dataKey="father" name="Father" fill="url(#grad-gold-h)" stackId="a" />
            <Bar dataKey="mother" name="Mother" fill="url(#grad-teal-h)" stackId="a" />
            <Bar dataKey="girls" name="Girls" fill="#3B82F6" stackId="a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Daily Submissions" subtitle="Father, mother, and girls over time" index={5}>
        <ChartArea>
          <LineChart data={c.combinedTrend} margin={chartMargin.default}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatDisplayDate(v)}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(v) => formatDisplayDate(String(v))}
            />
            <Legend {...legendProps} />
            <Line type="monotone" dataKey="father" name="Father" stroke="#EDCA5C" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="mother" name="Mother" stroke={palette.teal} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="girls" name="Girls" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Rollout Progress"
        subtitle={`${metrics.targetN.toLocaleString()} completed households target`}
        className="lg:col-span-2"
        index={6}
      >
        <div className="flex flex-col items-center justify-center py-4">
          <p className="text-4xl font-bold text-teal">
            {c.completedHouseholds.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            completed households · {c.progressToTarget.toFixed(1)}% of target
          </p>
          <div className="relative mt-4 h-4 w-full max-w-md overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-linear-to-r from-teal to-gold transition-all"
              style={{ width: `${Math.min(c.progressToTarget, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {c.fatherSurveys} father · {c.motherSurveys} mother · {c.girlsSurveys} girls
            surveys · {c.consentRefused} consent refusals
          </p>
        </div>
      </ChartCard>
    </div>
  );
}
