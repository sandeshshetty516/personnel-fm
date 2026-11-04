import { z } from 'zod';
import { PAYMENT_METHODS } from '../../types/transaction';
import { rupeesToPaise } from '../../utils/money';

/** A required, positive amount typed in rupees; converted to paise on submit. */
export const amountField = z
  .string()
  .trim()
  .min(1, 'Amount is required')
  .refine((value) => {
    const paise = rupeesToPaise(value);
    return paise !== null && paise > 0;
  }, 'Enter an amount greater than zero, like 250 or 250.50');

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date');

/** `today` caps the date: the API rejects future-dated transactions. */
export function transactionFormSchema(today: string) {
  return z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: amountField,
    date: dateField.refine((value) => value <= today, 'Date cannot be in the future'),
    title: z.string().trim().min(1, 'Title is required').max(120, 'Keep the title under 120 characters'),
    accountId: z.string().min(1, 'Choose an account'),
    categoryId: z.string().min(1, 'Choose a category'),
    paymentMethod: z.union([z.enum(PAYMENT_METHODS), z.literal('')]),
    notes: z.string().trim().max(1000, 'Keep notes under 1000 characters'),
  });
}

export function transferFormSchema(today: string) {
  return z
    .object({
      fromAccountId: z.string().min(1, 'Choose the account money leaves'),
      toAccountId: z.string().min(1, 'Choose the account money goes to'),
      amount: amountField,
      date: dateField.refine((value) => value <= today, 'Date cannot be in the future'),
      title: z.string().trim().max(120, 'Keep the title under 120 characters'),
      notes: z.string().trim().max(1000, 'Keep notes under 1000 characters'),
    })
    .refine((v) => !v.fromAccountId || v.fromAccountId !== v.toAccountId, {
      message: 'Choose two different accounts',
      path: ['toAccountId'],
    });
}

export type TransactionFormValues = z.infer<ReturnType<typeof transactionFormSchema>>;
export type TransferFormValues = z.infer<ReturnType<typeof transferFormSchema>>;
