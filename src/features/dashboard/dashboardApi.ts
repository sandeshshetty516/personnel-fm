import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient, unwrap } from '../../services/apiClient';
import type { ApiSuccess } from '../../types/api';
import type { CategoryIcon } from '../../types/category';
import type { Transaction } from '../../types/transaction';
import { transactionKeys } from '../transactions/transactionsApi';

export interface PeriodParams {
  from: string;
  to: string;
  currency?: string;
}

export interface DashboardSummary {
  period: { from: string; to: string; currency: string };
  availableCurrencies: string[];
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
  savingsRatePercent: number | null;
  totalBalancePaise: number;
  activeAccountCount: number;
  transactionCount: number;
}

export interface CashFlowBucket {
  from: string;
  to: string;
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
}

export interface SavingsBucket {
  from: string;
  to: string;
  netPaise: number;
  cumulativeNetPaise: number;
  savingsRatePercent: number | null;
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  icon: CategoryIcon;
  color: string;
  amountPaise: number;
  sharePercent: number;
  transactionCount: number;
}

// Dashboard data is derived from transactions, so it lives under the transactions key and is
// refetched whenever a transaction changes.
const dashboardKey = (widget: string, params: object) => [...transactionKeys.all, 'dashboard', widget, params] as const;

async function get<T>(path: string, params: object): Promise<T> {
  const res = await apiClient.get<ApiSuccess<T>>(`/dashboard/${path}`, { params });
  return unwrap(res.data);
}

// Every widget keeps its previous data while a new period loads ("refetch keeps the frame").
const options = { placeholderData: keepPreviousData } as const;

export const useDashboardSummary = (params: PeriodParams) =>
  useQuery({
    queryKey: dashboardKey('summary', params),
    queryFn: () => get<DashboardSummary>('summary', params),
    ...options,
  });

export const useCashFlow = (params: PeriodParams) =>
  useQuery({
    queryKey: dashboardKey('cash-flow', params),
    queryFn: () => get<{ buckets: CashFlowBucket[] }>('cash-flow', params),
    ...options,
  });

export const useSavingsTrend = (params: PeriodParams) =>
  useQuery({
    queryKey: dashboardKey('savings-trend', params),
    queryFn: () => get<{ buckets: SavingsBucket[] }>('savings-trend', params),
    ...options,
  });

export const useCategoryBreakdown = (params: PeriodParams & { type: 'EXPENSE' | 'INCOME' }) =>
  useQuery({
    queryKey: dashboardKey('category-breakdown', params),
    queryFn: () => get<{ totalPaise: number; categories: CategorySlice[] }>('category-breakdown', params),
    ...options,
  });

export const useRecentTransactions = (params: PeriodParams & { limit: number }) =>
  useQuery({
    queryKey: dashboardKey('recent', params),
    queryFn: () => get<{ transactions: Transaction[] }>('recent-transactions', params),
    ...options,
  });
