import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as authApi from '../features/auth/authApi';
import { fetchHealth } from '../services/healthService';
import { installFakeApi } from '../test/fakeApi';
import { makeUser, renderRoutes } from '../test/renderWithProviders';
import { routes } from './routes';

jest.mock('../services/healthService');
jest.mock('../features/auth/authApi');

const mockFetchHealth = jest.mocked(fetchHealth);
const mockAuth = jest.mocked(authApi);

beforeEach(() => {
  installFakeApi({});
  mockFetchHealth.mockResolvedValue({
    status: 'ok',
    database: 'connected',
    uptimeSeconds: 10,
    timestamp: '2026-11-03T00:00:00.000Z',
  });
});

describe('route protection', () => {
  it('sends signed-out visitors to the login page', async () => {
    mockAuth.fetchCurrentUser.mockResolvedValue(null);

    const { router } = renderRoutes(routes, '/settings');

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ from: '/settings' });
  });

  it('restores the session on load and renders the dashboard (FR-004)', async () => {
    mockAuth.fetchCurrentUser.mockResolvedValue(makeUser());

    renderRoutes(routes, '/');

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('shows a loader while the session is being restored', () => {
    mockAuth.fetchCurrentUser.mockReturnValue(new Promise(() => {}));

    renderRoutes(routes, '/');

    expect(screen.getByRole('status', { name: 'Restoring your session' })).toBeInTheDocument();
  });

  it('redirects signed-in users away from the login page', async () => {
    mockAuth.fetchCurrentUser.mockResolvedValue(makeUser());

    const { router } = renderRoutes(routes, '/login');

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('renders the not-found page for unknown paths when signed in', async () => {
    mockAuth.fetchCurrentUser.mockResolvedValue(makeUser());

    renderRoutes(routes, '/no-such-page');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('logout', () => {
  it('signs out from the account menu and returns to login', async () => {
    mockAuth.fetchCurrentUser.mockResolvedValue(makeUser());
    mockAuth.logout.mockResolvedValue();
    const user = userEvent.setup();

    const { router } = renderRoutes(routes, '/');
    await user.click(await screen.findByRole('button', { name: 'Account menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(mockAuth.logout).toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/login');
  });
});
