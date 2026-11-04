import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { TransactionSummary } from '../../types/transaction';
import { formatMoney } from '../../utils/money';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" component="p" color={color} noWrap sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** Income, expenses and net for the filtered set; one row per currency, never summed across currencies. */
export function TransactionSummaryCards({
  summaries,
  loading,
  fallbackCurrency,
}: {
  summaries: TransactionSummary[] | undefined;
  loading: boolean;
  fallbackCurrency: string;
}) {
  if (loading) {
    return (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={88} sx={{ flex: 1 }} />
        ))}
      </Stack>
    );
  }

  const rows = summaries?.length
    ? summaries
    : [{ currency: fallbackCurrency, incomePaise: 0, expensePaise: 0, netPaise: 0, transactionCount: 0 }];

  return (
    <Stack spacing={2}>
      {rows.map((row) => {
        const suffix = rows.length > 1 ? ` (${row.currency})` : '';
        return (
          <Stack key={row.currency} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Stat label={`Income${suffix}`} value={formatMoney(row.incomePaise, row.currency)} color="success.main" />
            <Stat label={`Expenses${suffix}`} value={formatMoney(row.expensePaise, row.currency)} color="error.main" />
            <Stat
              label={`Net cash flow${suffix}`}
              value={formatMoney(row.netPaise, row.currency)}
              color={row.netPaise < 0 ? 'error.main' : 'text.primary'}
            />
          </Stack>
        );
      })}
    </Stack>
  );
}
