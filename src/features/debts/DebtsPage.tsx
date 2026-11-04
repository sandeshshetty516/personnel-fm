import Add from '@mui/icons-material/Add';
import HandshakeOutlined from '@mui/icons-material/HandshakeOutlined';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import type { Debt, DebtDirection, DebtEntryType } from '../../types/debt';
import { formatMoney } from '../../utils/money';
import { useAccounts } from '../accounts/accountsApi';
import { StatTile } from '../dashboard/StatTile';
import { DebtCard, type DebtAction } from './DebtCard';
import { DebtEntryDialog } from './DebtEntryDialog';
import { DebtFormDialog } from './DebtFormDialog';
import { DebtHistoryDialog } from './DebtHistoryDialog';
import { useDebts, useDebtSummary, useDeleteDebt } from './debtsApi';

const ENTRY_TYPES: Record<'repay' | 'more' | 'writeOff', DebtEntryType> = {
  repay: 'REPAYMENT',
  more: 'PRINCIPAL',
  writeOff: 'WRITE_OFF',
};

type Dialog =
  | { kind: 'form'; debt: Debt | null }
  | { kind: 'entry'; debt: Debt; type: DebtEntryType }
  | { kind: 'history' | 'delete'; debt: Debt }
  | null;

/** Money lent to and borrowed from people (FR-075 – FR-081). */
export function DebtsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const [direction, setDirection] = useState<DebtDirection>('LENT');
  const debts = useDebts(direction);
  const summaries = useDebtSummary();
  const accounts = useAccounts(true).data ?? [];
  const deleteDebt = useDeleteDebt();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogKey, setDialogKey] = useState(0);

  const currency = user?.currency ?? 'INR';
  const summary = summaries.data?.find((s) => s.currency === currency);
  const lent = direction === 'LENT';

  const open = (next: NonNullable<Dialog>) => {
    setDialogKey((k) => k + 1);
    setDialog(next);
  };

  const handle = (debt: Debt, action: DebtAction) => {
    if (action === 'edit') return open({ kind: 'form', debt });
    if (action === 'history' || action === 'delete') return open({ kind: action, debt });
    open({ kind: 'entry', debt, type: ENTRY_TYPES[action] });
  };

  const confirmDelete = async (debt: Debt) => {
    try {
      await deleteDebt.mutateAsync(debt.id);
      notify(`Record for ${debt.personName} deleted`);
      setDialog(null);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  const newButton = (
    <Button variant="contained" startIcon={<Add />} onClick={() => open({ kind: 'form', debt: null })}>
      {lent ? 'Lend money' : 'Borrow money'}
    </Button>
  );

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Lend & borrow"
        subtitle="Track money between you and other people. It is never counted as income or expense."
        action={newButton}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          <StatTile
            label="You'll receive"
            value={summaries.data && formatMoney(summary?.receivablePaise ?? 0, currency)}
            caption={summaries.data && plural(summary?.openLentCount ?? 0, 'open loan')}
            loading={summaries.isPending}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <StatTile
            label="You owe"
            value={summaries.data && formatMoney(summary?.payablePaise ?? 0, currency)}
            caption={
              summaries.data &&
              (summary?.overdueCount
                ? `${plural(summary.overdueCount, 'record')} overdue`
                : plural(summary?.openBorrowedCount ?? 0, 'open loan'))
            }
            loading={summaries.isPending}
          />
        </Grid>
      </Grid>

      <Tabs value={direction} onChange={(_e, value: DebtDirection) => setDirection(value)} aria-label="Direction">
        <Tab label="Lent" value="LENT" />
        <Tab label="Borrowed" value="BORROWED" />
      </Tabs>

      {debts.error && <QueryError error={debts.error} onRetry={() => debts.refetch()} />}

      {debts.isPending && (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      )}

      {debts.data?.length === 0 && (
        <EmptyState
          icon={<HandshakeOutlined color="primary" sx={{ fontSize: 40 }} />}
          title={lent ? 'Nothing lent' : 'Nothing borrowed'}
          description={
            lent
              ? 'Record money you lend to a friend or family member, then log repayments as they come in.'
              : 'Record money you borrow from someone, then log what you pay back.'
          }
          action={newButton}
        />
      )}

      {debts.data && debts.data.length > 0 && (
        <Grid container spacing={2}>
          {debts.data.map((debt) => (
            <Grid key={debt.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <DebtCard debt={debt} onAction={(action) => handle(debt, action)} />
            </Grid>
          ))}
        </Grid>
      )}

      {dialog?.kind === 'form' && (
        <DebtFormDialog
          key={dialogKey}
          direction={dialog.debt?.direction ?? direction}
          debt={dialog.debt}
          accounts={accounts}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'entry' && (
        <DebtEntryDialog
          key={dialogKey}
          debt={dialog.debt}
          type={dialog.type}
          accounts={accounts}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'history' && (
        <DebtHistoryDialog key={dialogKey} debt={dialog.debt} accounts={accounts} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          open
          title={`Delete the record for ${dialog.debt.personName}?`}
          description="All of its entries are removed too, and any account balances they moved are restored."
          confirmLabel="Delete"
          destructive
          loading={deleteDebt.isPending}
          onConfirm={() => confirmDelete(dialog.debt)}
          onClose={() => setDialog(null)}
        />
      )}
    </Stack>
  );
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
