import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '../../app/routes';
import { fail, installFakeApi, ok } from '../../test/fakeApi';
import { renderRoutes } from '../../test/renderWithProviders';
import type { Account } from '../../types/account';

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'HDFC Savings',
    accountType: 'SAVINGS',
    currency: 'INR',
    openingBalancePaise: 5_000_000,
    currentBalancePaise: 5_000_000,
    institution: 'HDFC Bank',
    lastFourDigits: '4321',
    isActive: true,
    createdAt: '2026-11-03T00:00:00.000Z',
    updatedAt: '2026-11-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('AccountsPage', () => {
  it('lists accounts with balances and a per-currency net total', async () => {
    installFakeApi({
      'GET /accounts': () =>
        ok({
          accounts: [
            makeAccount(),
            makeAccount({
              id: 'a2',
              name: 'Visa',
              accountType: 'CREDIT_CARD',
              institution: null,
              lastFourDigits: null,
              currentBalancePaise: -1_250_050,
            }),
          ],
        }),
    });

    renderRoutes(routes, '/accounts');

    const savings = await screen.findByLabelText('HDFC Savings');
    expect(within(savings).getByText('₹50,000.00')).toBeInTheDocument();
    expect(within(savings).getByText('HDFC Bank · •••• 4321')).toBeInTheDocument();

    const card = screen.getByLabelText('Visa');
    expect(within(card).getByText('Outstanding')).toBeInTheDocument();
    expect(within(card).getByText('₹12,500.50')).toBeInTheDocument();

    // 50,000.00 − 12,500.50, summed in integer paise.
    expect(screen.getByText('₹37,499.50')).toBeInTheDocument();
  });

  it('shows an empty state with a call to action', async () => {
    installFakeApi({ 'GET /accounts': () => ok({ accounts: [] }) });
    renderRoutes(routes, '/accounts');
    expect(await screen.findByText('No accounts yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first account' })).toBeInTheDocument();
  });

  it('creates an account, sending the amount as integer paise', async () => {
    const accounts: Account[] = [];
    const { requests } = installFakeApi({
      'GET /accounts': () => ok({ accounts }),
      'POST /accounts': (req) => {
        accounts.push(makeAccount({ name: (req.body as { name: string }).name }));
        return ok({ account: accounts[0] }, 201);
      },
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/accounts');

    await user.click(await screen.findByRole('button', { name: 'Add account' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Account name/), 'Wallet cash');
    await user.type(within(dialog).getByLabelText(/^Opening balance/), '1,250.10');
    await user.click(within(dialog).getByRole('button', { name: 'Add account' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const post = requests.find((r) => r.method === 'POST' && r.url === '/accounts');
    expect(post?.body).toEqual({
      name: 'Wallet cash',
      accountType: 'SAVINGS',
      openingBalancePaise: 125_010,
      currency: 'INR',
    });
    expect(await screen.findByText('Account created')).toBeInTheDocument();
  });

  it('stores a credit card amount owed as a negative opening balance', async () => {
    const { requests } = installFakeApi({
      'GET /accounts': () => ok({ accounts: [] }),
      'POST /accounts': () => ok({ account: makeAccount() }, 201),
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/accounts');

    await user.click(await screen.findByRole('button', { name: 'Add account' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Account name/), 'Visa');
    await user.click(within(dialog).getByLabelText(/^Type/));
    await user.click(await screen.findByRole('option', { name: 'Credit card' }));
    await user.type(within(dialog).getByLabelText(/^Amount currently owed/), '12000');
    await user.click(within(dialog).getByRole('button', { name: 'Add account' }));

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true));
    expect(requests.find((r) => r.method === 'POST')?.body).toMatchObject({
      accountType: 'CREDIT_CARD',
      openingBalancePaise: -1_200_000,
    });
  });

  it('validates the form before calling the API', async () => {
    const { requests } = installFakeApi({ 'GET /accounts': () => ok({ accounts: [] }) });
    const user = userEvent.setup();
    renderRoutes(routes, '/accounts');

    await user.click(await screen.findByRole('button', { name: 'Add account' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Opening balance/), '12.345');
    await user.type(within(dialog).getByLabelText(/^Last 4 digits/), '12');
    await user.click(within(dialog).getByRole('button', { name: 'Add account' }));

    expect(await within(dialog).findByText('Account name is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter an amount like 12500 or 12500.50')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter exactly 4 digits')).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST')).toBe(false);
  });

  it('shows a duplicate-name error from the server on the name field', async () => {
    installFakeApi({
      'GET /accounts': () => ok({ accounts: [] }),
      'POST /accounts': () => fail(409, 'CONFLICT', 'You already have an account with this name'),
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/accounts');

    await user.click(await screen.findByRole('button', { name: 'Add account' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Account name/), 'HDFC Savings');
    await user.click(within(dialog).getByRole('button', { name: 'Add account' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('You already have an account with this name');
  });

  it('asks for confirmation before deactivating', async () => {
    const { requests } = installFakeApi({
      'GET /accounts': () => ok({ accounts: [makeAccount()] }),
      'DELETE /accounts/:id': () => ok({ account: makeAccount({ isActive: false }) }),
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/accounts');

    await user.click(await screen.findByRole('button', { name: 'Actions for HDFC Savings' }));
    await user.click(screen.getByRole('menuitem', { name: 'Deactivate' }));
    const confirm = await screen.findByRole('dialog', { name: 'Deactivate HDFC Savings?' });
    expect(requests.some((r) => r.method === 'DELETE')).toBe(false);

    await user.click(within(confirm).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.url === '/accounts/a1')).toBe(true));
  });
});
