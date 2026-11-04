import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrap } from '../../services/apiClient';
import type { ApiSuccess } from '../../types/api';
import type {
  PageMeta,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionSort,
  TransactionSummary,
  TransferInput,
} from '../../types/transaction';
import { accountKeys } from '../accounts/accountsApi';

export interface ListParams extends TransactionFilters {
  page: number;
  pageSize: number;
  sort: TransactionSort;
}

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (params: ListParams) => [...transactionKeys.all, 'list', params] as const,
  summary: (filters: TransactionFilters) => [...transactionKeys.all, 'summary', filters] as const,
};

/** Drops empty values so they are not sent as `?q=`. */
function compact<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
}

export async function fetchTransactions(params: ListParams) {
  const res = await apiClient.get<ApiSuccess<{ transactions: Transaction[] }> & { meta: PageMeta }>('/transactions', {
    params: compact(params),
  });
  return { transactions: unwrap(res.data).transactions, meta: res.data.meta };
}

export async function fetchSummary(filters: TransactionFilters): Promise<TransactionSummary[]> {
  const res = await apiClient.get<ApiSuccess<{ summaries: TransactionSummary[] }>>('/transactions/summary', {
    params: compact(filters),
  });
  return unwrap(res.data).summaries;
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const { paymentMethod, notes, ...rest } = input;
  const body = { ...rest, ...(paymentMethod ? { paymentMethod } : {}), ...(notes ? { notes } : {}) };
  const res = await apiClient.post<ApiSuccess<{ transaction: Transaction }>>('/transactions', body);
  return unwrap(res.data).transaction;
}

export async function updateTransaction(id: string, input: Partial<TransactionInput>): Promise<Transaction> {
  const res = await apiClient.patch<ApiSuccess<{ transaction: Transaction }>>(`/transactions/${id}`, input);
  return unwrap(res.data).transaction;
}

export async function deleteTransaction(id: string): Promise<{ deletedCount: number }> {
  const res = await apiClient.delete<ApiSuccess<{ deletedCount: number }>>(`/transactions/${id}`);
  return unwrap(res.data);
}

export async function createTransfer(input: TransferInput) {
  const res = await apiClient.post<ApiSuccess<{ transfer: { transferGroupId: string } }>>(
    '/accounts/transfer',
    compact(input),
  );
  return unwrap(res.data).transfer;
}

export function useTransactions(params: ListParams) {
  // Keep the current page on screen while the next page or filter loads.
  return useQuery({
    queryKey: transactionKeys.list(params),
    queryFn: () => fetchTransactions(params),
    placeholderData: keepPreviousData,
  });
}

export function useTransactionSummary(filters: TransactionFilters) {
  return useQuery({ queryKey: transactionKeys.summary(filters), queryFn: () => fetchSummary(filters) });
}

/** Any transaction change can move balances, totals and lists, so all of them refetch. */
function useTransactionMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
        queryClient.invalidateQueries({ queryKey: accountKeys.all }),
      ]),
  });
}

export const useCreateTransaction = () => useTransactionMutation(createTransaction);
export const useUpdateTransaction = () =>
  useTransactionMutation(({ id, input }: { id: string; input: Partial<TransactionInput> }) =>
    updateTransaction(id, input),
  );
export const useDeleteTransaction = () => useTransactionMutation(deleteTransaction);
export const useCreateTransfer = () => useTransactionMutation(createTransfer);
