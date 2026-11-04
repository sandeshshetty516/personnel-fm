import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { formatMoney } from '../../utils/money';
import { CategoryAvatar } from '../categories/CategoryAvatar';
import { ChartCard } from './ChartCard';
import { useChartTokens } from './chartTokens';
import type { CategorySlice } from './dashboardApi';

const MAX_ROWS = 6;

/** Keeps the largest categories and folds the tail into "Other", so the list stays readable. */
function foldTail(slices: CategorySlice[]): CategorySlice[] {
  if (slices.length <= MAX_ROWS) return slices;
  const head = slices.slice(0, MAX_ROWS - 1);
  const tail = slices.slice(MAX_ROWS - 1);
  const amountPaise = tail.reduce((sum, s) => sum + s.amountPaise, 0);
  return [
    ...head,
    {
      categoryId: 'other',
      name: `Other (${tail.length})`,
      icon: 'other',
      color: '#78909c',
      amountPaise,
      sharePercent: Math.round(tail.reduce((sum, s) => sum + s.sharePercent, 0) * 10) / 10,
      transactionCount: tail.reduce((sum, s) => sum + s.transactionCount, 0),
    },
  ];
}

/**
 * Where the money went (FR-057), as ranked horizontal bars in one hue on a shared baseline.
 * Bars compare more exactly than donut slices, and the amount and share are printed beside each bar.
 */
export function CategoryBreakdownCard({
  slices,
  totalPaise,
  currency,
  loading,
}: {
  slices: CategorySlice[] | undefined;
  totalPaise: number;
  currency: string;
  loading: boolean;
}) {
  const tokens = useChartTokens();
  const rows = foldTail(slices ?? []);
  const largest = rows[0]?.amountPaise ?? 0;

  return (
    <ChartCard
      title="Spending by category"
      subtitle={totalPaise > 0 ? `${formatMoney(totalPaise, currency)} in total` : undefined}
      loading={loading && !slices}
      height={300}
      empty={
        rows.length === 0 ? <Typography color="text.secondary">No expenses in this period.</Typography> : undefined
      }
      table={{
        columns: ['Category', 'Amount', 'Share', 'Transactions'],
        rows: (slices ?? []).map((s) => [
          s.name,
          formatMoney(s.amountPaise, currency),
          `${s.sharePercent}%`,
          s.transactionCount,
        ]),
      }}
    >
      <Stack component="ol" spacing={1.75} sx={{ listStyle: 'none', p: 0, m: 0 }} aria-label="Spending by category">
        {rows.map((slice) => (
          <Tooltip
            key={slice.categoryId}
            title={`${slice.name}: ${formatMoney(slice.amountPaise, currency)} · ${slice.sharePercent}% · ${slice.transactionCount} transaction${slice.transactionCount === 1 ? '' : 's'}`}
            placement="top"
          >
            <Box
              component="li"
              tabIndex={0}
              sx={{ outline: 'none', '&:focus-visible': { boxShadow: 2, borderRadius: 1 } }}
            >
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.5 }}>
                <CategoryAvatar icon={slice.icon} color={slice.color} size={24} />
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {slice.name}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(slice.amountPaise, currency)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                >
                  {slice.sharePercent}%
                </Typography>
              </Stack>
              <Box sx={{ height: 8, borderRadius: '4px', bgcolor: tokens.track, overflow: 'hidden' }} aria-hidden>
                <Box
                  sx={{
                    height: '100%',
                    width: `${largest > 0 ? (slice.amountPaise / largest) * 100 : 0}%`,
                    bgcolor: tokens.accent,
                    borderRadius: '0 4px 4px 0',
                  }}
                />
              </Box>
            </Box>
          </Tooltip>
        ))}
      </Stack>
    </ChartCard>
  );
}
