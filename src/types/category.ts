/** Mirrors categorySchema in personnel-fm-be/src/modules/categories/categories.schemas.ts. */
export const CATEGORY_TYPES = ['EXPENSE', 'INCOME'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const CATEGORY_ICONS = [
  'salary',
  'freelance',
  'business',
  'interest',
  'investment',
  'gift',
  'refund',
  'home',
  'groceries',
  'dining',
  'fuel',
  'transport',
  'utilities',
  'phone',
  'shopping',
  'health',
  'education',
  'entertainment',
  'travel',
  'insurance',
  'loan',
  'personal-care',
  'pets',
  'kids',
  'subscriptions',
  'tax',
  'charity',
  'other',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: CategoryIcon;
  color: string;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
}

export interface CategoryInput {
  name: string;
  type: CategoryType;
  icon: CategoryIcon;
  color: string;
}
