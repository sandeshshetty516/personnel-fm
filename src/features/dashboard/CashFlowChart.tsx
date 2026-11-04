import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney, formatMoneyCompact } from '../../utils/money';
import { bucketLabels, bucketRangeLabel } from './bucketLabel';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';
import { useChartTokens } from './chartTokens';
import type { CashFlowBucket } from './dashboardApi';

interface CashFlowChartProps {
  buckets: CashFlowBucket[] | undefined;
  currency: string;
  startDay: number;
  loading: boolean;
}

/** Monthly income vs expenses (FR-058): grouped columns, one shared axis, legend + hover tooltip. */
export function CashFlowChart({ buckets, currency, startDay, loading }: CashFlowChartProps) {
  const tokens = useChartTokens();
  const labels = bucketLabels(buckets ?? [], startDay);
  const data = (buckets ?? []).map((b, i) => ({ ...b, label: labels[i], range: bucketRangeLabel(b) }));
  const isEmpty = !loading && data.every((d) => d.incomePaise === 0 && d.expensePaise === 0);

  const series = [
    { key: 'incomePaise', name: 'Income', color: tokens.income },
    { key: 'expensePaise', name: 'Expenses', color: tokens.expense },
  ] as const;

  return (
    <ChartCard
      title="Income vs expenses"
      subtitle="Per financial month"
      loading={loading && !buckets}
      empty={
        isEmpty ? <Typography color="text.secondary">No income or expenses in these months yet.</Typography> : undefined
      }
      table={{
        columns: ['Month', 'Income', 'Expenses', 'Net'],
        rows: data.map((d) => [
          d.range,
          formatMoney(d.incomePaise, currency),
          formatMoney(d.expensePaise, currency),
          formatMoney(d.netPaise, currency),
        ]),
      }}
    >
      <Stack direction="row" spacing={2} sx={{ mb: 1 }} aria-label="Legend">
        {series.map((s) => (
          <Stack key={s.key} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: s.color }} />
            <Typography variant="body2" color="text.secondary">
              {s.name}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <ResponsiveContainer width="100%" height="88%" initialDimension={{ width: 600, height: 240 }}>
        <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={tokens.grid} />
          <XAxis
            dataKey="label"
            interval={0}
            tickLine={false}
            axisLine={{ stroke: tokens.axis }}
            tick={{ fill: tokens.textMuted, fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: tokens.textMuted, fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: tokens.accentWash }}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
              if (!row) return null;
              return (
                <ChartTooltip
                  title={row.range}
                  rows={[
                    { label: 'Income', value: formatMoney(row.incomePaise, currency), color: tokens.income },
                    { label: 'Expenses', value: formatMoney(row.expensePaise, currency), color: tokens.expense },
                    { label: 'Net', value: formatMoney(row.netPaise, currency) },
                  ]}
                />
              );
            }}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
