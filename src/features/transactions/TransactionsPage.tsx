import Add from '@mui/icons-material/Add';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { QueryError } from '../../components/QueryError';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import { isTransfer, type EntryType, type Transaction, type TransactionSort } from '../../types/transaction';
import { useAccounts } from '../accounts/accountsApi';
import { useCategories } from '../categories/categoriesApi';
import { TransactionFilterBar } from './TransactionFilterBar';
import { TransactionFormDialog } from './TransactionFormDialog';
import { TransactionList } from './TransactionList';
import { TransactionSummaryCards } from './TransactionSummaryCards';
import { useDeleteTransaction, useTransactions, useTransactionSummary } from './transactionsApi';
import { TransferDialog } from './TransferDialog';
import { useTransactionFilters } from './useTransactionFilters';

const PAGE_SIZE = 20;
const SORT_LABELS: Record<TransactionSort, string> = {
  date_desc: 'Newest first',
  date_asc: 'Oldest first',
  amount_desc: 'Highest amount',
  amount_asc: 'Lowest amount',
};

type DialogState =
  | { kind: 'entry'; type: EntryType; transaction: Transaction | null }
  | { kind: 'transfer'; transaction: Transaction | null }
  | null;

export function TransactionsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const filterState = useTransactionFilters();
  const { filters, page, setPage } = filterState;
  const [sort, setSort] = useState<TransactionSort>('date_desc');

  const list = useTransactions({ ...filters, page, pageSize: PAGE_SIZE, sort });
  const summary = useTransactionSummary(filters);
  // Inactive accounts and archived categories are still needed to label older transactions.
  const accounts = useAccounts(true).data ?? [];
  const categories = useCategories(true).data ?? [];
  const deleteTransaction = useDeleteTransaction();

  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);

  const open = (next: NonNullable<DialogState>) => {
    setDialogKey((k) => k + 1);
    setDialog(next);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteTransaction.mutateAsync(toDelete.id);
      notify(isTransfer(toDelete) ? 'Transfer deleted' : 'Transaction deleted');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setToDelete(null);
    }
  };

  const hasAccounts = accounts.some((a) => a.isActive);
  const transactions = list.data?.transactions;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Transactions"
        subtitle="Income, expenses and transfers across your accounts."
        action={
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => open({ kind: 'entry', type: 'EXPENSE', transaction: null })}
              disabled={!hasAccounts}
            >
              Add expense
            </Button>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => open({ kind: 'entry', type: 'INCOME', transaction: null })}
              disabled={!hasAccounts}
            >
              Add income
            </Button>
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={() => open({ kind: 'transfer', transaction: null })}
              disabled={accounts.filter((a) => a.isActive).length < 2}
            >
              Transfer
            </Button>
          </Stack>
        }
      />

      <TransactionFilterBar state={filterState} accounts={accounts} categories={categories} />

      <TransactionSummaryCards
        summaries={summary.data}
        loading={summary.isPending}
        fallbackCurrency={user?.currency ?? 'INR'}
      />

      {list.error && <QueryError error={list.error} onRetry={() => list.refetch()} />}

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {list.data ? `${list.data.meta.total} transaction${list.data.meta.total === 1 ? '' : 's'}` : ' '}
        </Typography>
        <TextField
          select
          size="small"
          label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as TransactionSort)}
          sx={{ minWidth: 170 }}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {list.isFetching && !list.isPending && <LinearProgress aria-label="Updating transactions" />}

      {list.isPending && (
        <Stack spacing={1}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      )}

      {transactions?.length === 0 && (
        <EmptyState
          icon={<ReceiptLongOutlined color="primary" sx={{ fontSize: 40 }} />}
          title={filterState.hasActiveFilters ? 'No transactions match these filters' : 'No transactions yet'}
          description={
            hasAccounts
              ? filterState.hasActiveFilters
                ? 'Try a different period or clear the filters.'
                : 'Record your first income or expense to see it here.'
              : 'Add an account first, then record income and expenses against it.'
          }
          action={
            filterState.hasActiveFilters ? <Button onClick={filterState.clearFilters}>Clear filters</Button> : undefined
          }
        />
      )}

      {transactions && transactions.length > 0 && (
        <TransactionList
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          onEdit={(tx) =>
            open(
              isTransfer(tx)
                ? { kind: 'transfer', transaction: tx }
                : { kind: 'entry', type: tx.type as EntryType, transaction: tx },
            )
          }
          onDelete={setToDelete}
        />
      )}

      {list.data && list.data.meta.totalPages > 1 && (
        <Pagination
          count={list.data.meta.totalPages}
          page={page}
          onChange={(_e, next) => setPage(next)}
          sx={{ alignSelf: 'center' }}
        />
      )}

      {dialog?.kind === 'entry' && (
        <TransactionFormDialog
          key={dialogKey}
          open
          transaction={dialog.transaction}
          defaultType={dialog.type}
          defaultAccountId={filters.accountId}
          accounts={accounts}
          categories={categories}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'transfer' && (
        <TransferDialog
          key={dialogKey}
          open
          transfer={dialog.transaction}
          defaultFromAccountId={filters.accountId}
          accounts={accounts}
          onClose={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete && isTransfer(toDelete) ? 'Delete this transfer?' : 'Delete this transaction?'}
        description={
          toDelete && isTransfer(toDelete)
            ? 'Both sides of the transfer will be removed and both account balances restored.'
            : `“${toDelete?.title ?? ''}” will be permanently removed and your balances and totals updated.`
        }
        confirmLabel="Delete"
        destructive
        loading={deleteTransaction.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Stack>
  );
}
