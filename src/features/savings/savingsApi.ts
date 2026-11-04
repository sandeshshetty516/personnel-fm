import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrap } from '../../services/apiClient';
import type { ApiSuccess } from '../../types/api';
import type { ContributionInput, GoalContribution, GoalInput, GoalStatus, SavingsGoal } from '../../types/savings';

export const savingsKeys = {
  all: ['savings-goals'] as const,
  list: (status: GoalStatus) => [...savingsKeys.all, 'list', status] as const,
  history: (goalId: string) => [...savingsKeys.all, 'history', goalId] as const,
};

type GoalResponse = ApiSuccess<{ goal: SavingsGoal }>;

export async function fetchGoals(status: GoalStatus): Promise<SavingsGoal[]> {
  const res = await apiClient.get<ApiSuccess<{ goals: SavingsGoal[] }>>('/savings-goals', { params: { status } });
  return unwrap(res.data).goals;
}

export async function createGoal(input: GoalInput): Promise<SavingsGoal> {
  const { targetDate, notes, ...rest } = input;
  const body = { ...rest, ...(targetDate ? { targetDate } : {}), ...(notes ? { notes } : {}) };
  const res = await apiClient.post<GoalResponse>('/savings-goals', body);
  return unwrap(res.data).goal;
}

export async function updateGoal(id: string, input: Partial<GoalInput> & { status?: GoalStatus }) {
  const { currency: _currency, ...editable } = input;
  const res = await apiClient.patch<GoalResponse>(`/savings-goals/${id}`, editable);
  return unwrap(res.data).goal;
}

export async function addContribution(goalId: string, input: ContributionInput) {
  const res = await apiClient.post<ApiSuccess<{ goal: SavingsGoal; contribution: GoalContribution }>>(
    `/savings-goals/${goalId}/contributions`,
    input,
  );
  return unwrap(res.data);
}

export async function deleteContribution(goalId: string, contributionId: string) {
  const res = await apiClient.delete<GoalResponse>(`/savings-goals/${goalId}/contributions/${contributionId}`);
  return unwrap(res.data).goal;
}

export async function fetchHistory(goalId: string): Promise<GoalContribution[]> {
  const res = await apiClient.get<ApiSuccess<{ contributions: GoalContribution[] }>>(
    `/savings-goals/${goalId}/history`,
  );
  return unwrap(res.data).contributions;
}

export const useGoals = (status: GoalStatus) =>
  useQuery({ queryKey: savingsKeys.list(status), queryFn: () => fetchGoals(status) });

export const useGoalHistory = (goalId: string) =>
  useQuery({ queryKey: savingsKeys.history(goalId), queryFn: () => fetchHistory(goalId) });

function useSavingsMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: savingsKeys.all }) });
}

export const useCreateGoal = () => useSavingsMutation(createGoal);
export const useUpdateGoal = () =>
  useSavingsMutation(({ id, input }: { id: string; input: Parameters<typeof updateGoal>[1] }) => updateGoal(id, input));
export const useAddContribution = () =>
  useSavingsMutation(({ goalId, input }: { goalId: string; input: ContributionInput }) =>
    addContribution(goalId, input),
  );
export const useDeleteContribution = () =>
  useSavingsMutation(({ goalId, contributionId }: { goalId: string; contributionId: string }) =>
    deleteContribution(goalId, contributionId),
  );
