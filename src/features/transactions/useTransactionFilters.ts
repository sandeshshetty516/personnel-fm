import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../contexts/auth';
import { PAYMENT_METHODS, type FilterType, type PaymentMethod, type TransactionFilters } from '../../types/transaction';
import { periodRange, PERIODS, todayIn, type Period } from '../../utils/date';

const FILTER_TYPES: readonly FilterType[] = ['INCOME', 'EXPENSE', 'TRANSFER'];
const EDITABLE_KEYS = ['period', 'from', 'to', 'type', 'accountId', 'categoryId', 'paymentMethod', 'q'] as const;
type EditableKey = (typeof EDITABLE_KEYS)[number];

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

/**
 * Transaction filters live in the URL, so a filtered view can be bookmarked, shared or linked to
 * (e.g. an account's "View transactions"). Named periods follow the user's financial month.
 */
export function useTransactionFilters() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const period: Period = oneOf(params.get('period'), PERIODS) ?? 'this-month';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const filters = useMemo<TransactionFilters>(() => {
    const range =
      period === 'custom'
        ? { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined }
        : periodRange(period, todayIn(user?.timezone), user?.monthStartDay ?? 1);
    return {
      ...(range ?? {}),
      type: oneOf(params.get('type'), FILTER_TYPES),
      accountId: params.get('accountId') ?? undefined,
      categoryId: params.get('categoryId') ?? undefined,
      paymentMethod: oneOf<PaymentMethod>(params.get('paymentMethod'), PAYMENT_METHODS),
      q: params.get('q') ?? undefined,
    };
  }, [params, period, user?.timezone, user?.monthStartDay]);

  /**
   * Sets several filters in one URL update (empty values clear them) and returns to page 1.
   * Updates must be batched: React Router builds each setSearchParams call from the current URL,
   * so two calls in a row would overwrite each other.
   */
  const setFilters = useCallback(
    (patch: Partial<Record<EditableKey, string | undefined>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (patch.period && patch.period !== 'custom') {
            next.delete('from');
            next.delete('to');
          }
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setFilter = useCallback(
    (key: EditableKey, value: string | undefined) => setFilters({ [key]: value }),
    [setFilters],
  );

  const setPage = useCallback(
    (nextPage: number) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (nextPage > 1) next.set('page', String(nextPage));
        else next.delete('page');
        return next;
      }),
    [setParams],
  );

  const clearFilters = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  const hasActiveFilters = EDITABLE_KEYS.some((key) => key !== 'period' && params.has(key)) || period !== 'this-month';

  return { filters, period, page, setFilter, setFilters, setPage, clearFilters, hasActiveFilters, rawParams: params };
}
