import Add from '@mui/icons-material/Add';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import PieChartOutlined from '@mui/icons-material/PieChartOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import type { Budget, BudgetWithSummary } from '../../types/budget';
import { financialMonth, formatCalendarDate, todayIn } from '../../utils/date';
import { formatMoney } from '../../utils/money';
import { useCategories } from '../categories/categoriesApi';
import { BudgetCard } from './BudgetCard';
import { BudgetFormDialog } from './BudgetFormDialog';
import { useBudgets, useDeleteBudget } from './budgetsApi';
import { budgetStatus } from './budgetStatus';

/** Alerts for every overall or category limit that has crossed a configured threshold (FR-036). */
function alertsFor(items: BudgetWithSummary[]) {
  const alerts: { key: string; severity: 'warning' | 'error' | 'info'; text: string }[] = [];
  for (const { budget, summary } of items) {
    if (!summary.period) continue;
    const rows = [
      { name: budget.name, u: summary.overall },
      ...summary.categories.map((c) => ({ name: `${budget.name} · ${c.name}`, u: c })),
    ];
    for (const { name, u } of rows) {
      const status = budgetStatus(u);
      if (!status.isAlert) continue;
      const severity = status.severity === 'critical' ? 'error' : status.severity === 'warning' ? 'warning' : 'info';
      alerts.push({
        key: `${budget.id}-${name}`,
        severity,
        text: `${name}: ${u.utilizationPercent}% used (${formatMoney(u.spentPaise, budget.currency)} of ${formatMoney(u.limitPaise, budget.currency)})`,
      });
    }
  }
  const order = { error: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function BudgetsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const startDay = user?.monthStartDay ?? 1;
  const today = todayIn(user?.timezone);

  // Viewing a month = asking for the period that contains its first day.
  const offset = Number(params.get('offset')) || 0;
  const month = financialMonth(today, startDay, offset);
  const date = offset === 0 ? today : month.from;

  const budgets = useBudgets(date);
  const categories = useCategories(true).data ?? [];
  const deleteBudget = useDeleteBudget();
  const [form, setForm] = useState<{ open: boolean; budget: Budget | null; key: number }>({
    open: false,
    budget: null,
    key: 0,
  });
  const [toDelete, setToDelete] = useState<Budget | null>(null);

  const setOffset = (next: number) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next === 0) p.delete('offset');
      else p.set('offset', String(next));
      return p;
    });

  const openForm = (budget: Budget | null) => setForm((f) => ({ open: true, budget, key: f.key + 1 }));

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteBudget.mutateAsync(toDelete.id);
      notify(`${toDelete.name} deleted`);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setToDelete(null);
    }
  };

  const items = budgets.data ?? [];
  const alerts = alertsFor(items);
  const monthLabel =
    startDay === 1
      ? formatCalendarDate(month.from, 'MMMM YYYY')
      : `${formatCalendarDate(month.from, 'D MMM')} – ${formatCalendarDate(month.to, 'D MMM YYYY')}`;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Budgets"
        subtitle="Plan your spending and see how you're tracking."
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => openForm(null)}>
            Add budget
          </Button>
        }
      />

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton aria-label="Previous month" onClick={() => setOffset(offset - 1)}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="subtitle1" sx={{ minWidth: 180, textAlign: 'center', fontWeight: 600 }} aria-live="polite">
          {monthLabel}
        </Typography>
        <IconButton aria-label="Next month" onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>
          <ChevronRight />
        </IconButton>
        {offset !== 0 && (
          <Button size="small" onClick={() => setOffset(0)}>
            This month
          </Button>
        )}
      </Stack>

      {budgets.error && <QueryError error={budgets.error} onRetry={() => budgets.refetch()} />}

      {alerts.length > 0 && (
        <Stack spacing={1} aria-label="Budget alerts" component="section">
          {alerts.map((a) => (
            <Alert key={a.key} severity={a.severity}>
              {a.text}
            </Alert>
          ))}
        </Stack>
      )}

      {budgets.isPending && (
        <Grid container spacing={2}>
          {[0, 1].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rounded" height={220} />
            </Grid>
          ))}
        </Grid>
      )}

      {budgets.data?.length === 0 && (
        <EmptyState
          icon={<PieChartOutlined color="primary" sx={{ fontSize: 40 }} />}
          title="No budgets yet"
          description="Set a monthly limit, optionally per category, and get alerted as you approach it."
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => openForm(null)}>
              Create your first budget
            </Button>
          }
        />
      )}

      {items.length > 0 && (
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid key={item.budget.id} size={{ xs: 12, md: 6 }}>
              <BudgetCard item={item} onEdit={() => openForm(item.budget)} onDelete={() => setToDelete(item.budget)} />
            </Grid>
          ))}
        </Grid>
      )}

      <BudgetFormDialog
        key={form.key}
        open={form.open}
        budget={form.budget}
        categories={categories}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete ${toDelete?.name ?? 'budget'}?`}
        description="The budget and its limits are removed. Your transactions are not affected."
        confirmLabel="Delete"
        destructive
        loading={deleteBudget.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Stack>
  );
}
