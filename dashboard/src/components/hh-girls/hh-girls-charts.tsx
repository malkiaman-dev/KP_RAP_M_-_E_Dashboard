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

export function HhGirlsHouseholdCharts({
  metrics,
  loading,
}: {
  metrics?: HhGirlsMetrics;
  loading?: boolean;
}) {
  if (loading || !metrics) {
    return <ChartGridSkeleton count={7} className="grid gap-4 lg:grid-cols-2" />;
  }

  const hh = metrics.household;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Parent Availability" index={0}>
        <ChartArea>
          <PieChart>
            <Pie
              data={hh.parentAvailability}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {hh.parentAvailability.map((entry, i) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
          </PieChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Father vs Mother Surveys" subtitle="Submissions by enumerator" index={1}>
        <ChartArea>
          <BarChart data={hh.parentFormsByEnumerator} margin={chartMargin.verticalBar} layout="vertical">
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
            <Bar dataKey="father" name="Father" fill="url(#grad-teal-h)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="mother" name="Mother" fill="url(#grad-gold-h)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Missing Parent Surveys by Enumerator" index={2}>
        <ChartArea>
          <BarChart data={hh.missingParentByEnumerator} margin={chartMargin.verticalBar} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="missing" name="Missing parent form" fill="#EF4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Household Completion by District" index={3}>
        <ChartArea>
          <BarChart data={hh.householdCompletionByDistrict} margin={chartMargin.default}>
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
            <Bar dataKey="bothParents" name="Both parents" fill="url(#grad-teal)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="singleParent" name="Single parent" fill="url(#grad-gold)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Consent Agreed vs Refused" subtitle="By enumerator" index={4}>
        <ChartArea>
          <BarChart data={hh.consentAgreedDisagreed} margin={chartMargin.verticalBar} layout="vertical">
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
            <Bar dataKey="agreed" name="Agreed" fill="url(#grad-teal-h)" stackId="a" />
            <Bar dataKey="refused" name="Refused" fill="#EF4444" stackId="a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Consent Outcome" index={5} className="lg:col-span-2">
        <ChartArea>
          <PieChart>
            <Pie
              data={hh.consentOutcome}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {hh.consentOutcome.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
          </PieChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Household Surveys Over Time" className="lg:col-span-2" index={6}>
        <ChartArea>
          <LineChart data={hh.submissionTrend} margin={chartMargin.default}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatDisplayDate(v)}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(v) => formatDisplayDate(String(v))}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Submissions"
              stroke="#21A1AA"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartArea>
      </ChartCard>
    </div>
  );
}

export function HhGirlsGirlsCharts({
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

  const gs = metrics.girls;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Consent Outcome" index={0}>
        <ChartArea>
          <PieChart>
            <Pie
              data={gs.consentOutcome}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {gs.consentOutcome.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
          </PieChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Education Status of Girls" subtitle="By district" index={1}>
        <ChartArea>
          <BarChart data={gs.educationStatusByDistrict} margin={chartMargin.default}>
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
            <Bar dataKey="studying" name="Studying" fill="url(#grad-teal)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="notStudying" name="Not studying" fill="#94A3B8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Girl Availability Status" index={2}>
        <ChartArea>
          <PieChart>
            <Pie
              data={gs.availabilityStatus}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {gs.availabilityStatus.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
          </PieChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Girls Survey by Enumerator" subtitle="Top 10" index={3}>
        <ChartArea>
          <BarChart data={gs.girlsSurveyByEnumerator} margin={chartMargin.verticalBar} layout="vertical">
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" name="Submissions" fill="url(#grad-teal-h)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Girls Surveys Over Time" index={4}>
        <ChartArea>
          <LineChart data={gs.submissionTrend} margin={chartMargin.default}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatDisplayDate(v)}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(v) => formatDisplayDate(String(v))}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Submissions"
              stroke={palette.teal}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartArea>
      </ChartCard>

      <ChartCard title="Parent vs Child Consent Refusal" index={5}>
        <ChartArea>
          <BarChart data={gs.consentRefusalByEnumerator} margin={chartMargin.rotatedLabels}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend {...legendProps} />
            <Bar dataKey="parentRefused" name="Parent refused" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="childRefused" name="Child refused" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartArea>
      </ChartCard>

      <ChartCard
        title="Child Consent Rate"
        subtitle="Target: 90%"
        className="lg:col-span-2"
        index={6}
      >
        <div className="flex flex-col items-center justify-center py-4">
          <p className="text-4xl font-bold text-teal">
            {gs.childConsentRate.toFixed(1)}%
          </p>
          <div className="relative mt-4 h-4 w-full max-w-md overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal to-gold transition-all"
              style={{ width: `${Math.min(gs.childConsentRate, 100)}%` }}
            />
            <div className="absolute left-[90%] top-0 h-full w-0.5 bg-foreground/30" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Parental consent: {gs.parentalConsentRate.toFixed(1)}% · Completed:{" "}
            {gs.complete} · Revisits: {gs.revisits}
          </p>
        </div>
      </ChartCard>
    </div>
  );
}
