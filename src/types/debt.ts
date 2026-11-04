/** Mirrors personnel-fm-be/src/modules/debts/debts.schemas.ts. */
export type DebtDirection = 'LENT' | 'BORROWED';
export type DebtStatus = 'OPEN' | 'SETTLED' | 'WRITTEN_OFF';
export type DebtEntryType = 'PRINCIPAL' | 'REPAYMENT' | 'WRITE_OFF';

export interface Debt {
  id: string;
  direction: DebtDirection;
  personName: string;
  phone: string | null;
  currency: string;
  /** Calendar date, YYYY-MM-DD. */
  startDate: string;
  dueDate: string | null;
  notes: string | null;
  principalPaise: number;
  repaidPaise: number;
  writtenOffPaise: number;
  outstandingPaise: number;
  progressPercent: number;
  status: DebtStatus;
  isOverdue: boolean;
  closedAt: string | null;
  createdAt: string;
}

export interface DebtEntry {
  id: string;
  debtId: string;
  type: DebtEntryType;
  amountPaise: number;
  date: string;
  accountId: string | null;
  transactionId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DebtSummary {
  currency: string;
  receivablePaise: number;
  payablePaise: number;
  openLentCount: number;
  openBorrowedCount: number;
  overdueCount: number;
  people: { personName: string; receivablePaise: number; payablePaise: number; netPaise: number }[];
}

export interface DebtInput {
  direction: DebtDirection;
  personName: string;
  phone?: string;
  amountPaise: number;
  date: string;
  dueDate?: string;
  accountId?: string;
  notes?: string;
}

export interface DebtUpdate {
  personName?: string;
  phone?: string | null;
  dueDate?: string | null;
  notes?: string | null;
}

export interface DebtEntryInput {
  type: DebtEntryType;
  amountPaise: number;
  date: string;
  accountId?: string;
  notes?: string;
}

/** Labels for each entry type, from the user's side of the debt. */
export function entryLabel(direction: DebtDirection, type: DebtEntryType): string {
  if (type === 'WRITE_OFF') return 'Written off';
  if (direction === 'LENT') return type === 'PRINCIPAL' ? 'Lent' : 'Received back';
  return type === 'PRINCIPAL' ? 'Borrowed' : 'Paid back';
}
