import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrap } from '../../services/apiClient';
import type { Account, AccountInput } from '../../types/account';
import type { ApiSuccess } from '../../types/api';

type AccountResponse = ApiSuccess<{ account: Account }>;

export const accountKeys = {
  all: ['accounts'] as const,
  list: (includeInactive: boolean) => [...accountKeys.all, 'list', { includeInactive }] as const,
};

export async function fetchAccounts(includeInactive = false): Promise<Account[]> {
  const res = await apiClient.get<ApiSuccess<{ accounts: Account[] }>>('/accounts', {
    params: includeInactive ? { includeInactive: 'true' } : undefined,
  });
  return unwrap(res.data).accounts;
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const { institution, lastFourDigits, ...rest } = input;
  // The create endpoint takes optional fields as absent rather than null.
  const body = {
    ...rest,
    ...(institution ? { institution } : {}),
    ...(lastFourDigits ? { lastFourDigits } : {}),
  };
  const res = await apiClient.post<AccountResponse>('/accounts', body);
  return unwrap(res.data).account;
}

export async function updateAccount(id: string, input: Partial<AccountInput> & { isActive?: boolean }) {
  const res = await apiClient.patch<AccountResponse>(`/accounts/${id}`, input);
  return unwrap(res.data).account;
}

export async function deactivateAccount(id: string): Promise<Account> {
  const res = await apiClient.delete<AccountResponse>(`/accounts/${id}`);
  return unwrap(res.data).account;
}

export function useAccounts(includeInactive = false) {
  return useQuery({ queryKey: accountKeys.list(includeInactive), queryFn: () => fetchAccounts(includeInactive) });
}

/** Wraps an account mutation so every account list refetches afterwards. */
function useAccountMutation<TArgs>(fn: (args: TArgs) => Promise<Account>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}

export const useCreateAccount = () => useAccountMutation(createAccount);
export const useUpdateAccount = () =>
  useAccountMutation(({ id, input }: { id: string; input: Parameters<typeof updateAccount>[1] }) =>
    updateAccount(id, input),
  );
export const useDeactivateAccount = () => useAccountMutation(deactivateAccount);
