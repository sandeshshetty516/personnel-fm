import type { RouteObject } from 'react-router';
import { AppLayout } from '../components/AppLayout';
import { NotFoundPage } from '../components/NotFoundPage';
import { RouteErrorPage } from '../components/RouteErrorPage';
import { ProtectedRoute, PublicOnlyRoute } from '../components/RouteGuards';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { BudgetsPage } from '../features/budgets/BudgetsPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { SavingsGoalsPage } from '../features/savings/SavingsGoalsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      // Reachable whether or not someone is signed in: the link comes from an email.
      { path: 'reset-password', element: <ResetPasswordPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'transactions', element: <TransactionsPage /> },
              { path: 'budgets', element: <BudgetsPage /> },
              { path: 'savings', element: <SavingsGoalsPage /> },
              { path: 'accounts', element: <AccountsPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
];
