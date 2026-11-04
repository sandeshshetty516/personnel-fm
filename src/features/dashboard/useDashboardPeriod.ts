import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../contexts/auth';
import { financialMonth, periodRange, todayIn, type DateRange, type Period } from '../../utils/date';

/** The dashboard's periods (FR-060); "all time" is not offered because trends are capped at 24 months. */
export const DASHBOARD_PERIODS: readonly Period[] = [
  'this-month',
  'last-month',
  'last-3-months',
  'last-6-months',
  'this-year',
  'custom',
];

const TREND_MONTHS = 6;

/**
 * Period and currency for every dashboard widget, kept in the URL. Trends always show at least
 * six financial months ending with the selected period, so a single month still has context.
 */
export function useDashboardPeriod() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const startDay = user?.monthStartDay ?? 1;
  const today = todayIn(user?.timezone);

  const raw = params.get('period') as Period | null;
  const period: Period = raw && DASHBOARD_PERIODS.includes(raw) ? raw : 'this-month';
  const currency = params.get('currency') ?? undefined;

  const range = useMemo<DateRange>(() => {
    if (period === 'custom') {
      const from = params.get('from');
      const to = params.get('to');
      if (from && to && from <= to) return { from, to };
    }
    return periodRange(period === 'custom' ? 'this-month' : period, today, startDay)!;
  }, [period, params, today, startDay]);

  const trendRange = useMemo<DateRange>(() => {
    const sixMonthStart = financialMonth(range.to, startDay, -(TREND_MONTHS - 1)).from;
    return { from: sixMonthStart < range.from ? sixMonthStart : range.from, to: range.to };
  }, [range, startDay]);

  const update = useCallback(
    (patch: Record<string, string | undefined>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const setPeriod = useCallback(
    (next: Period) =>
      update(
        next === 'custom'
          ? { period: next, from: range.from, to: range.to }
          : { period: next, from: undefined, to: undefined },
      ),
    [update, range],
  );

  return {
    period,
    range,
    trendRange,
    currency,
    startDay,
    customFrom: params.get('from') ?? range.from,
    customTo: params.get('to') ?? range.to,
    setPeriod,
    setCustomRange: (from: string, to: string) => update({ from, to }),
    setCurrency: (next: string | undefined) => update({ currency: next }),
  };
}
