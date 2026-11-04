import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { theme } from '../app/theme';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationsProvider } from '../contexts/NotificationsProvider';
import type { User } from '../types/user';

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Renders a route tree at the given URL with the same providers as the app (fresh query cache, no retries). */
export function renderRoutes(routes: RouteObject[], initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const utils = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationsProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </NotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router };
}

export function renderWithProviders(ui: ReactElement) {
  return renderRoutes([{ path: '*', element: ui }]);
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    fullName: 'Asha Rao',
    email: 'asha@example.com',
    currency: 'INR',
    monthStartDay: 1,
    timezone: 'Asia/Kolkata',
    preferences: {
      notifications: { budgetAlerts: true, emiReminders: true, recurringReminders: true, goalMilestones: true },
    },
    createdAt: '2026-11-03T00:00:00.000Z',
    ...overrides,
  };
}
