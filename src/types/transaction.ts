/** Mirrors transactionSchema in personnel-fm-be/src/modules/transactions/transactions.schemas.ts. */
export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_METHODS = ['CASH', 'UPI', 'DEBIT_CARD', 'CREDIT_CARD', 'NET_BANKING', 'CHEQUE', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  DEBIT_CARD: 'Debit card',
  CREDIT_CARD: 'Credit card',
  NET_BANKING: 'Net banking',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

export interface Transaction {
  id: string;
  type: TransactionType;
  amountPaise: number;
  /** Calendar date, YYYY-MM-DD. */
  date: string;
  title: string;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  accountId: string;
  categoryId: string | null;
  transferGroupId: string | null;
  /** For transfers: the account on the other side. */
  counterpartAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const isTransfer = (tx: Pick<Transaction, 'type'>) => tx.type === 'TRANSFER_IN' || tx.type === 'TRANSFER_OUT';

export type EntryType = 'INCOME' | 'EXPENSE';

export interface TransactionInput {
  type: EntryType;
  amountPaise: number;
  date: string;
  title: string;
  accountId: string;
  categoryId: string;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountPaise: number;
  date: string;
  title?: string;
  notes?: string;
}

export type FilterType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionSort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export interface TransactionFilters {
  from?: string;
  to?: string;
  type?: FilterType;
  accountId?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  q?: string;
}

export interface TransactionSummary {
  currency: string;
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
  transactionCount: number;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
