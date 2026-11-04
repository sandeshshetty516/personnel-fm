import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrap } from '../../services/apiClient';
import type { ApiSuccess } from '../../types/api';
import type {
  Debt,
  DebtDirection,
  DebtEntry,
  DebtEntryInput,
  DebtInput,
  DebtSummary,
  DebtUpdate,
} from '../../types/debt';
import { accountKeys } from '../accounts/accountsApi';
import { categoryKeys } from '../categories/categoriesApi';
import { transactionKeys } from '../transactions/transactionsApi';

export const debtKeys = {
  all: ['debts'] as const,
  list: (direction: DebtDirection) => [...debtKeys.all, 'list', direction] as const,
  summary: () => [...debtKeys.all, 'summary'] as const,
  entries: (debtId: string) => [...debtKeys.all, 'entries', debtId] as const,
};

type DebtResponse = ApiSuccess<{ debt: Debt }>;
type DebtWithEntry = ApiSuccess<{ debt: Debt; entry: DebtEntry }>;

export async function fetchDebts(direction: DebtDirection): Promise<Debt[]> {
  const res = await apiClient.get<ApiSuccess<{ debts: Debt[] }>>('/debts', { params: { direction } });
  return unwrap(res.data).debts;
}

export async function fetchDebtSummary(): Promise<DebtSummary[]> {
  const res = await apiClient.get<ApiSuccess<{ summaries: DebtSummary[] }>>('/debts/summary');
  return unwrap(res.data).summaries;
}

export async function fetchEntries(debtId: string): Promise<DebtEntry[]> {
  const res = await apiClient.get<ApiSuccess<{ entries: DebtEntry[] }>>(`/debts/${debtId}/entries`);
  return unwrap(res.data).entries;
}

export async function createDebt(input: DebtInput) {
  const res = await apiClient.post<DebtWithEntry>('/debts', input);
  return unwrap(res.data);
}

export async function updateDebt(id: string, input: DebtUpdate) {
  const res = await apiClient.patch<DebtResponse>(`/debts/${id}`, input);
  return unwrap(res.data).debt;
}

export async function deleteDebt(id: string) {
  const res = await apiClient.delete<ApiSuccess<{ deletedTransactionCount: number }>>(`/debts/${id}`);
  return unwrap(res.data);
}

export async function addEntry(debtId: string, input: DebtEntryInput) {
  const res = await apiClient.post<DebtWithEntry>(`/debts/${debtId}/entries`, input);
  return unwrap(res.data);
}

export async function deleteEntry(debtId: string, entryId: string) {
  const res = await apiClient.delete<DebtResponse>(`/debts/${debtId}/entries/${entryId}`);
  return unwrap(res.data).debt;
}

export const useDebts = (direction: DebtDirection) =>
  useQuery({ queryKey: debtKeys.list(direction), queryFn: () => fetchDebts(direction) });

export const useDebtSummary = () => useQuery({ queryKey: debtKeys.summary(), queryFn: fetchDebtSummary });

export const useDebtEntries = (debtId: string) =>
  useQuery({ queryKey: debtKeys.entries(debtId), queryFn: () => fetchEntries(debtId) });

/**
 * Entries can create or remove transactions, move balances and (on a write-off) create the
 * Bad Debt category, so all of those refetch along with the debts themselves.
 */
function useDebtMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all(
        [debtKeys.all, transactionKeys.all, accountKeys.all, categoryKeys.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

export const useCreateDebt = () => useDebtMutation(createDebt);
export const useUpdateDebt = () =>
  useDebtMutation(({ id, input }: { id: string; input: DebtUpdate }) => updateDebt(id, input));
export const useDeleteDebt = () => useDebtMutation(deleteDebt);
export const useAddEntry = () =>
  useDebtMutation(({ debtId, input }: { debtId: string; input: DebtEntryInput }) => addEntry(debtId, input));
export const useDeleteEntry = () =>
  useDebtMutation(({ debtId, entryId }: { debtId: string; entryId: string }) => deleteEntry(debtId, entryId));
