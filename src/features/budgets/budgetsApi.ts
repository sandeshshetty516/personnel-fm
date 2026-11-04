import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrap } from '../../services/apiClient';
import type { ApiSuccess } from '../../types/api';
import type { Budget, BudgetInput, BudgetWithSummary } from '../../types/budget';
import { transactionKeys } from '../transactions/transactionsApi';

// Budget utilisation is derived from transactions, so it sits under the transactions key and
// refreshes whenever a transaction changes.
export const budgetKeys = {
  all: [...transactionKeys.all, 'budgets'] as const,
  list: (date: string) => [...budgetKeys.all, { date }] as const,
};

export async function fetchBudgets(date: string): Promise<BudgetWithSummary[]> {
  const res = await apiClient.get<ApiSuccess<{ budgets: BudgetWithSummary[] }>>('/budgets', { params: { date } });
  return unwrap(res.data).budgets;
}

export async function createBudget(input: BudgetInput): Promise<Budget> {
  const { endDate, ...rest } = input;
  const res = await apiClient.post<ApiSuccess<{ budget: Budget }>>('/budgets', {
    ...rest,
    ...(endDate ? { endDate } : {}),
  });
  return unwrap(res.data).budget;
}

export async function updateBudget(id: string, input: Partial<BudgetInput>): Promise<Budget> {
  const res = await apiClient.patch<ApiSuccess<{ budget: Budget }>>(`/budgets/${id}`, input);
  return unwrap(res.data).budget;
}

export async function deleteBudget(id: string) {
  await apiClient.delete(`/budgets/${id}`);
}

export function useBudgets(date: string) {
  return useQuery({
    queryKey: budgetKeys.list(date),
    queryFn: () => fetchBudgets(date),
    placeholderData: keepPreviousData,
  });
}

function useBudgetMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all }) });
}

export const useCreateBudget = () => useBudgetMutation(createBudget);
export const useUpdateBudget = () =>
  useBudgetMutation(({ id, input }: { id: string; input: Partial<BudgetInput> }) => updateBudget(id, input));
export const useDeleteBudget = () => useBudgetMutation(deleteBudget);
