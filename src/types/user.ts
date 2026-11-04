/** Mirrors publicUserSchema in personnel-fm-be/src/modules/users/users.schemas.ts. */
export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface NotificationPreferences {
  budgetAlerts: boolean;
  emiReminders: boolean;
  recurringReminders: boolean;
  goalMilestones: boolean;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  currency: Currency;
  monthStartDay: number;
  timezone: string;
  preferences: { notifications: NotificationPreferences };
  createdAt: string;
}
