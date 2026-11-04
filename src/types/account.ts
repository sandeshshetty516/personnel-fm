import type { Currency } from './user';

/** Mirrors accountSchema in personnel-fm-be/src/modules/accounts/accounts.schemas.ts. */
export const ACCOUNT_TYPES = ['SAVINGS', 'CURRENT', 'CASH', 'CREDIT_CARD', 'WALLET'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  currency: Currency;
  openingBalancePaise: number;
  currentBalancePaise: number;
  institution: string | null;
  lastFourDigits: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountInput {
  name: string;
  accountType: AccountType;
  openingBalancePaise: number;
  currency: Currency;
  institution: string | null;
  lastFourDigits: string | null;
}
