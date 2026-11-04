import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { Meter } from '../../components/Meter';
import { formatMoney } from '../../utils/money';
import { useBudgets } from '../budgets/budgetsApi';
import { budgetStatus } from '../budgets/budgetStatus';

const MAX_SHOWN = 4;

/** Budget utilisation for the period containing `date` (FR-059), most-used first. */
export function BudgetStatusCard({ date }: { date: string }) {
  const budgets = useBudgets(date);
  const active = (budgets.data ?? [])
    .filter((b) => b.summary.period)
    .sort((a, b) => b.summary.overall.utilizationPercent - a.summary.overall.utilizationPercent);

  return (
    <Card sx={{ height: '100%' }} component="section" aria-label="Budgets">
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
            Budgets
          </Typography>
          <Button component={RouterLink} to="/budgets" size="small">
            {active.length ? 'View all' : 'Set a budget'}
          </Button>
        </Stack>

        {budgets.isPending && <Skeleton variant="rounded" height={96} />}
        {budgets.data && active.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No budgets for this period.
          </Typography>
        )}

        <Stack spacing={2}>
          {active.slice(0, MAX_SHOWN).map(({ budget, summary }) => {
            const status = budgetStatus(summary.overall);
            return (
              <Box key={budget.id}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.75, gap: 1 }}>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {budget.name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {formatMoney(summary.overall.spentPaise, budget.currency)} /{' '}
                    {formatMoney(summary.overall.limitPaise, budget.currency)}
                  </Typography>
                </Stack>
                <Meter
                  percent={summary.overall.utilizationPercent}
                  severity={status.severity}
                  statusLabel={`${summary.overall.utilizationPercent}% · ${status.label}`}
                  valueText={`${budget.name}: ${formatMoney(summary.overall.spentPaise, budget.currency)} of ${formatMoney(summary.overall.limitPaise, budget.currency)}`}
                  markerPercent={summary.elapsedPercent}
                  markerLabel={`${summary.elapsedPercent}% of the period has passed`}
                />
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
