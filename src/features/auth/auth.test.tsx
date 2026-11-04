import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '../../app/routes';
import { ApiError } from '../../services/apiClient';
import { fetchHealth } from '../../services/healthService';
import { installFakeApi } from '../../test/fakeApi';
import { makeUser, renderRoutes } from '../../test/renderWithProviders';
import * as authApi from './authApi';

jest.mock('./authApi');
jest.mock('../../services/healthService');

const mockAuth = jest.mocked(authApi);

beforeEach(() => {
  installFakeApi({});
  mockAuth.fetchCurrentUser.mockResolvedValue(null);
  jest.mocked(fetchHealth).mockReturnValue(new Promise(() => {}));
});

describe('LoginPage', () => {
  it('shows field-level validation without calling the API', async () => {
    const user = userEvent.setup();
    renderRoutes(routes, '/login');

    await user.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it('logs in and returns to the page the user originally requested', async () => {
    mockAuth.login.mockResolvedValue(makeUser());
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, '/settings');

    await user.type(await screen.findByLabelText(/^Email/), 'asha@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'Secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(mockAuth.login).toHaveBeenCalledWith({ email: 'asha@example.com', password: 'Secret123' });
    expect(router.state.location.pathname).toBe('/settings');
  });

  it('shows the server error for bad credentials', async () => {
    mockAuth.login.mockRejectedValue(new ApiError('Invalid email or password', 401, 'UNAUTHORIZED'));
    const user = userEvent.setup();
    renderRoutes(routes, '/login');

    await user.type(await screen.findByLabelText(/^Email/), 'asha@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'Wrong1234');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

describe('RegisterPage', () => {
  async function fillForm(overrides: Partial<Record<'name' | 'email' | 'password' | 'confirm', string>> = {}) {
    const user = userEvent.setup();
    const values = {
      name: 'Asha Rao',
      email: 'asha@example.com',
      password: 'Secret123',
      confirm: 'Secret123',
      ...overrides,
    };
    await user.type(await screen.findByLabelText(/^Full name/), values.name);
    await user.type(screen.getByLabelText(/^Email/), values.email);
    await user.type(screen.getByLabelText(/^Password/), values.password);
    await user.type(screen.getByLabelText(/^Confirm password/), values.confirm);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
  }

  it('enforces the password policy and confirmation', async () => {
    renderRoutes(routes, '/register');
    await fillForm({ password: 'lettersonly', confirm: 'different1' });

    expect(await screen.findByText('Password must contain a letter and a number')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(mockAuth.register).not.toHaveBeenCalled();
  });

  it('shows a duplicate-email error from the server', async () => {
    mockAuth.register.mockRejectedValue(new ApiError('An account with this email already exists', 409, 'CONFLICT'));
    renderRoutes(routes, '/register');
    await fillForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists');
  });

  it('registers and lands on the dashboard', async () => {
    mockAuth.register.mockResolvedValue(makeUser());
    const { router } = renderRoutes(routes, '/register');
    await fillForm();

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });
});

describe('password reset', () => {
  it('confirms the request without revealing whether the email exists', async () => {
    mockAuth.requestPasswordReset.mockResolvedValue(
      'If an account exists for that email, a password reset link has been sent.',
    );
    const user = userEvent.setup();
    renderRoutes(routes, '/forgot-password');

    await user.type(await screen.findByLabelText(/^Email/), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText(/If an account exists/)).toBeInTheDocument();
  });

  it('sets a new password using the token from the link', async () => {
    mockAuth.resetPassword.mockResolvedValue('Your password has been reset. Please log in.');
    const user = userEvent.setup();
    renderRoutes(routes, '/reset-password?token=abc123token');

    await user.type(await screen.findByLabelText(/^New password/), 'NewSecret456');
    await user.type(screen.getByLabelText(/^Confirm new password/), 'NewSecret456');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText(/Your password has been reset/)).toBeInTheDocument();
    expect(mockAuth.resetPassword).toHaveBeenCalledWith('abc123token', {
      password: 'NewSecret456',
      confirmPassword: 'NewSecret456',
    });
  });

  it('explains when the link has no token', async () => {
    renderRoutes(routes, '/reset-password');
    expect(await screen.findByRole('heading', { name: 'Reset link invalid' })).toBeInTheDocument();
  });
});
