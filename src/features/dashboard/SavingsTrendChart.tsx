import Typography from '@mui/material/Typography';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney, formatMoneyCompact } from '../../utils/money';
import { bucketLabels, bucketRangeLabel } from './bucketLabel';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';
import { useChartTokens } from './chartTokens';
import type { SavingsBucket } from './dashboardApi';

interface SavingsTrendChartProps {
  buckets: SavingsBucket[] | undefined;
  currency: string;
  startDay: number;
  loading: boolean;
}

const formatRate = (rate: number | null) => (rate === null ? 'No income' : `${rate}%`);

/**
 * Running total of net savings: a single series, so the title names it and no legend is needed.
 * The zero baseline is drawn so months that ate into savings read as below the line.
 */
export function SavingsTrendChart({ buckets, currency, startDay, loading }: SavingsTrendChartProps) {
  const tokens = useChartTokens();
  const labels = bucketLabels(buckets ?? [], startDay);
  const data = (buckets ?? []).map((b, i) => ({ ...b, label: labels[i], range: bucketRangeLabel(b) }));
  const isEmpty = !loading && data.every((d) => d.netPaise === 0);

  return (
    <ChartCard
      title="Cumulative savings"
      subtitle="Net cash flow added up month by month"
      loading={loading && !buckets}
      empty={
        isEmpty ? (
          <Typography color="text.secondary">Savings appear once you record income and expenses.</Typography>
        ) : undefined
      }
      table={{
        columns: ['Month', 'Saved this month', 'Running total', 'Savings rate'],
        rows: data.map((d) => [
          d.range,
          formatMoney(d.netPaise, currency),
          formatMoney(d.cumulativeNetPaise, currency),
          formatRate(d.savingsRatePercent),
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={tokens.grid} />
          <XAxis
            dataKey="label"
            interval={0}
            padding={{ left: 16, right: 16 }}
            tickLine={false}
            axisLine={false}
            tick={{ fill: tokens.textMuted, fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: tokens.textMuted, fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke={tokens.axis} />
          <Tooltip
            cursor={{ stroke: tokens.axis, strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
              if (!row) return null;
              return (
                <ChartTooltip
                  title={row.range}
                  rows={[
                    {
                      label: 'Running total',
                      value: formatMoney(row.cumulativeNetPaise, currency),
                      color: tokens.accent,
                    },
                    { label: 'Saved this month', value: formatMoney(row.netPaise, currency) },
                    { label: 'Savings rate', value: formatRate(row.savingsRatePercent) },
                  ]}
                />
              );
            }}
          />
          <Area
            type="linear"
            dataKey="cumulativeNetPaise"
            name="Cumulative savings"
            stroke={tokens.accent}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill={tokens.accentWash}
            dot={{ r: 4, fill: tokens.accent, stroke: tokens.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: tokens.accent, stroke: tokens.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
