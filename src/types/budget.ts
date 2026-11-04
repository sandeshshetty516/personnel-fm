import type { CategoryIcon } from './category';

/** Mirrors personnel-fm-be/src/modules/budgets/budgets.schemas.ts. */
export type BudgetPeriod = 'MONTHLY' | 'CUSTOM';

export interface Budget {
  id: string;
  name: string;
  period: BudgetPeriod;
  currency: string;
  amountPaise: number;
  categoryLimits: { categoryId: string; amountPaise: number }[];
  alertThresholds: number[];
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Utilisation {
  limitPaise: number;
  spentPaise: number;
  remainingPaise: number;
  utilizationPercent: number;
  reachedThreshold: number | null;
}

export interface BudgetSummary {
  budgetId: string;
  period: { from: string; to: string } | null;
  elapsedPercent: number;
  overall: Utilisation;
  categories: (Utilisation & { categoryId: string; name: string; icon: CategoryIcon; color: string })[];
  unbudgetedSpentPaise: number;
}

export interface BudgetWithSummary {
  budget: Budget;
  summary: BudgetSummary;
}

export interface BudgetInput {
  name: string;
  period: BudgetPeriod;
  currency: string;
  amountPaise: number;
  categoryLimits: { categoryId: string; amountPaise: number }[];
  alertThresholds: number[];
  startDate: string;
  endDate: string | null;
}
