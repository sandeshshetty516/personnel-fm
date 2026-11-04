import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrap } from '../../services/apiClient';
import type { ApiSuccess } from '../../types/api';
import type { Category, CategoryInput } from '../../types/category';

type CategoryResponse = ApiSuccess<{ category: Category }>;

export const categoryKeys = {
  all: ['categories'] as const,
  list: (includeArchived: boolean) => [...categoryKeys.all, 'list', { includeArchived }] as const,
};

export async function fetchCategories(includeArchived = false): Promise<Category[]> {
  const res = await apiClient.get<ApiSuccess<{ categories: Category[] }>>('/categories', {
    params: includeArchived ? { includeArchived: 'true' } : undefined,
  });
  return unwrap(res.data).categories;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const res = await apiClient.post<CategoryResponse>('/categories', input);
  return unwrap(res.data).category;
}

export async function updateCategory(
  id: string,
  input: Partial<Omit<CategoryInput, 'type'>> & { isArchived?: boolean },
): Promise<Category> {
  const res = await apiClient.patch<CategoryResponse>(`/categories/${id}`, input);
  return unwrap(res.data).category;
}

export async function deleteCategory(id: string, reassignTo?: string) {
  const res = await apiClient.delete<ApiSuccess<{ deleted: true; reassignedTransactions: number }>>(
    `/categories/${id}`,
    { params: reassignTo ? { reassignTo } : undefined },
  );
  return unwrap(res.data);
}

/** The 409 detail the API returns when a category still has transactions. */
export interface CategoryInUseDetails {
  reason: 'CATEGORY_IN_USE';
  transactionCount: number;
}

export function isCategoryInUse(details: unknown): details is CategoryInUseDetails {
  return (details as CategoryInUseDetails | undefined)?.reason === 'CATEGORY_IN_USE';
}

export function useCategories(includeArchived = false) {
  return useQuery({ queryKey: categoryKeys.list(includeArchived), queryFn: () => fetchCategories(includeArchived) });
}

function useCategoryMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export const useCreateCategory = () => useCategoryMutation(createCategory);
export const useUpdateCategory = () =>
  useCategoryMutation(({ id, input }: { id: string; input: Parameters<typeof updateCategory>[1] }) =>
    updateCategory(id, input),
  );
export const useDeleteCategory = () =>
  useCategoryMutation(({ id, reassignTo }: { id: string; reassignTo?: string }) => deleteCategory(id, reassignTo));
