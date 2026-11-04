import { z } from 'zod';
import { ACCOUNT_TYPES } from '../../types/account';
import { SUPPORTED_CURRENCIES } from '../../types/user';
import { rupeesToPaise } from '../../utils/money';

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(60, 'Keep the name under 60 characters'),
  accountType: z.enum(ACCOUNT_TYPES),
  // Kept as text while editing; converted to paise on submit so no float maths touches the amount.
  openingBalance: z
    .string()
    .trim()
    .refine((value) => value === '' || rupeesToPaise(value, { allowNegative: true }) !== null, {
      message: 'Enter an amount like 12500 or 12500.50',
    }),
  currency: z.enum(SUPPORTED_CURRENCIES),
  institution: z.string().trim().max(80, 'Keep this under 80 characters'),
  lastFourDigits: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{4}$/.test(value), 'Enter exactly 4 digits'),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;
