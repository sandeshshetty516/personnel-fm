/** Mirrors personnel-fm-be/src/modules/savings/savings.schemas.ts. */
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type ContributionType = 'CONTRIBUTION' | 'WITHDRAWAL';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmountPaise: number;
  targetDate: string | null;
  currency: string;
  status: GoalStatus;
  notes: string | null;
  savedPaise: number;
  remainingPaise: number;
  progressPercent: number;
  isTargetReached: boolean;
  monthlyNeededPaise: number | null;
  completedAt: string | null;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  type: ContributionType;
  amountPaise: number;
  date: string;
  accountId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface GoalInput {
  name: string;
  targetAmountPaise: number;
  targetDate: string | null;
  notes: string | null;
  currency?: string;
}

export interface ContributionInput {
  type: ContributionType;
  amountPaise: number;
  date: string;
  accountId?: string;
  notes?: string;
}
