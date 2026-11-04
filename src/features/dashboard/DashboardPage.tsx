import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { Link as RouterLink } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { useAuth } from '../../contexts/auth';
import { formatCalendarDate, PERIOD_LABELS, todayIn, type Period } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { useAccounts } from '../accounts/accountsApi';
import { useCategories } from '../categories/categoriesApi';
import { BudgetStatusCard } from './BudgetStatusCard';
import { CashFlowChart } from './CashFlowChart';
import { CategoryBreakdownCard } from './CategoryBreakdownCard';
import {
  useCashFlow,
  useCategoryBreakdown,
  useDashboardSummary,
  useRecentTransactions,
  useSavingsTrend,
} from './dashboardApi';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { SavingsTrendChart } from './SavingsTrendChart';
import { StatTile } from './StatTile';
import { DASHBOARD_PERIODS, useDashboardPeriod } from './useDashboardPeriod';

const filterSx = { minWidth: { xs: '100%', sm: 170 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } };

export function DashboardPage() {
  const { user } = useAuth();
  const state = useDashboardPeriod();
  const { range, trendRange, startDay } = state;
  const currency = state.currency ?? user?.currency ?? 'INR';
  const params = { ...range, currency };
  const today = todayIn(user?.timezone);

  const summary = useDashboardSummary(params);
  const cashFlow = useCashFlow({ ...trendRange, currency });
  const savings = useSavingsTrend({ ...trendRange, currency });
  const breakdown = useCategoryBreakdown({ ...params, type: 'EXPENSE' });
  const recent = useRecentTransactions({ ...params, limit: 6 });
  const accounts = useAccounts(true);
  const categories = useCategories(true).data ?? [];

  const s = summary.data;
  const currencies = s?.availableCurrencies ?? [];
  const refetching = [summary, cashFlow, savings, breakdown, recent].some((q) => q.isFetching && !q.isPending);
  const periodLabel = `${formatCalendarDate(range.from, 'D MMM')} – ${formatCalendarDate(range.to, 'D MMM YYYY')}`;

  if (accounts.data && accounts.data.length === 0) {
    return (
      <Stack spacing={3}>
        <PageHeader title="Dashboard" subtitle="Your monthly finances at a glance." />
        <EmptyState
          icon={<SavingsOutlined color="primary" sx={{ fontSize: 40 }} />}
          title="Welcome to MyFinance"
          description="Add your first account, then record income and expenses to see your dashboard come to life."
          action={
            <Button component={RouterLink} to="/accounts" variant="contained">
              Add an account
            </Button>
          }
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader title="Dashboard" subtitle={`${periodLabel} · ${currency}`} />

      {/* One row of filters above everything they scope. */}
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <TextField
          select
          size="small"
          label="Period"
          value={state.period}
          onChange={(e) => state.setPeriod(e.target.value as Period)}
          sx={filterSx}
        >
          {DASHBOARD_PERIODS.map((p) => (
            <MenuItem key={p} value={p}>
              {PERIOD_LABELS[p]}
            </MenuItem>
          ))}
        </TextField>
        {state.period === 'custom' && (
          <>
            <TextField
              type="date"
              size="small"
              label="From"
              value={state.customFrom}
              onChange={(e) => e.target.value && state.setCustomRange(e.target.value, state.customTo)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: state.customTo } }}
              sx={filterSx}
            />
            <TextField
              type="date"
              size="small"
              label="To"
              value={state.customTo}
              onChange={(e) => e.target.value && state.setCustomRange(state.customFrom, e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: state.customFrom } }}
              sx={filterSx}
            />
          </>
        )}
        {currencies.length > 1 && (
          <TextField
            select
            size="small"
            label="Currency"
            value={currency}
            onChange={(e) => state.setCurrency(e.target.value === user?.currency ? undefined : e.target.value)}
            sx={filterSx}
          >
            {currencies.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>

      {refetching && <LinearProgress aria-label="Updating dashboard" />}
      {summary.error && <QueryError error={summary.error} onRetry={() => summary.refetch()} />}

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 'grow' }}>
          <StatTile label="Income" value={s && formatMoney(s.incomePaise, currency)} loading={!s} />
        </Grid>
        <Grid size={{ xs: 6, md: 'grow' }}>
          <StatTile label="Expenses" value={s && formatMoney(s.expensePaise, currency)} loading={!s} />
        </Grid>
        <Grid size={{ xs: 6, md: 'grow' }}>
          <StatTile
            label="Net cash flow"
            value={s && formatMoney(s.netPaise, currency)}
            caption={s && (s.netPaise >= 0 ? 'Income minus expenses' : 'You spent more than you earned')}
            loading={!s}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 'grow' }}>
          <StatTile
            label="Savings rate"
            value={s && (s.savingsRatePercent === null ? null : `${s.savingsRatePercent}%`)}
            caption={s && (s.savingsRatePercent === null ? 'No income in this period' : 'Share of income kept')}
            loading={!s}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 'grow' }}>
          <StatTile
            label="Total balance"
            value={s && formatMoney(s.totalBalancePaise, currency)}
            caption={
              s && `Across ${s.activeAccountCount} active account${s.activeAccountCount === 1 ? '' : 's'}, today`
            }
            loading={!s}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <CashFlowChart
            buckets={cashFlow.data?.buckets}
            currency={currency}
            startDay={startDay}
            loading={cashFlow.isPending}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <CategoryBreakdownCard
            slices={breakdown.data?.categories}
            totalPaise={breakdown.data?.totalPaise ?? 0}
            currency={currency}
            loading={breakdown.isPending}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SavingsTrendChart
            buckets={savings.data?.buckets}
            currency={currency}
            startDay={startDay}
            loading={savings.isPending}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <RecentTransactionsCard
            transactions={recent.data?.transactions}
            accounts={accounts.data ?? []}
            categories={categories}
            loading={recent.isPending}
            viewAllHref={`/transactions?period=custom&from=${range.from}&to=${range.to}`}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          {/* Budgets for the latest month in the period that has started. */}
          <BudgetStatusCard date={range.to < today ? range.to : today} />
        </Grid>
      </Grid>
    </Stack>
  );
}
