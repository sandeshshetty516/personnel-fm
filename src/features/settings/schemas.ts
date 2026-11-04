import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../types/user';
import { confirmPasswordField, fullNameField, passwordField, passwordsMustMatch } from '../../validations/auth';

export const profileSchema = z.object({
  fullName: fullNameField,
  currency: z.enum(SUPPORTED_CURRENCIES),
  monthStartDay: z.number().int().min(1).max(28, 'Choose a day between 1 and 28'),
  timezone: z.string().min(1, 'Time zone is required'),
  preferences: z.object({
    notifications: z.object({
      budgetAlerts: z.boolean(),
      emiReminders: z.boolean(),
      recurringReminders: z.boolean(),
      goalMilestones: z.boolean(),
    }),
  }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((values) => values.newPassword === values.confirmPassword, passwordsMustMatch)
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export type ProfileValues = z.infer<typeof profileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
