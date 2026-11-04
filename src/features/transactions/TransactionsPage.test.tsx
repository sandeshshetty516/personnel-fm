import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '../../app/routes';
import { installFakeApi, ok, type FakeRequest } from '../../test/fakeApi';
import { renderRoutes } from '../../test/renderWithProviders';
import type { Account } from '../../types/account';
import type { Category } from '../../types/category';
import type { Transaction } from '../../types/transaction';
import { financialMonth, todayIn } from '../../utils/date';

const account = (overrides: Partial<Account>): Account => ({
  id: 'savings',
  name: 'Savings',
  accountType: 'SAVINGS',
  currency: 'INR',
  openingBalancePaise: 0,
  currentBalancePaise: 5_000_000,
  institution: null,
  lastFourDigits: null,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const category = (overrides: Partial<Category>): Category => ({
  id: 'groceries',
  name: 'Groceries',
  type: 'EXPENSE',
  icon: 'groceries',
  color: '#43a047',
  isDefault: true,
  isArchived: false,
  createdAt: '',
  ...overrides,
});

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 't1',
  type: 'EXPENSE',
  amountPaise: 250_050,
  date: '2026-11-02',
  title: 'Big Basket',
  notes: null,
  paymentMethod: 'UPI',
  accountId: 'savings',
  categoryId: 'groceries',
  transferGroupId: null,
  counterpartAccountId: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const ACCOUNTS = [
  account({}),
  account({ id: 'cash', name: 'Cash', accountType: 'CASH' }),
  account({ id: 'usd', name: 'US Dollar', currency: 'USD' }),
];
const CATEGORIES = [
  category({}),
  category({ id: 'salary', name: 'Salary', type: 'INCOME', icon: 'salary' }),
  category({ id: 'old', name: 'Old', isArchived: true }),
];
const TRANSACTIONS = [
  tx({}),
  tx({
    id: 't2',
    type: 'INCOME',
    amountPaise: 8_000_000,
    title: 'Salary',
    categoryId: 'salary',
    date: '2026-11-01',
    paymentMethod: null,
  }),
  tx({
    id: 't3',
    type: 'TRANSFER_OUT',
    amountPaise: 100_000,
    title: 'ATM',
    categoryId: null,
    paymentMethod: null,
    date: '2026-11-01',
    transferGroupId: 'g1',
    counterpartAccountId: 'cash',
  }),
];

function setup(extra: Record<string, (req: FakeRequest) => ReturnType<typeof ok>> = {}) {
  return installFakeApi({
    'GET /accounts': () => ok({ accounts: ACCOUNTS }),
    'GET /categories': () => ok({ categories: CATEGORIES }),
    'GET /transactions': () =>
      ok({ transactions: TRANSACTIONS }, 200, { page: 1, pageSize: 20, total: 3, totalPages: 1 }),
    'GET /transactions/summary': () =>
      ok({
        summaries: [
          { currency: 'INR', incomePaise: 8_000_000, expensePaise: 250_050, netPaise: 7_749_950, transactionCount: 2 },
        ],
      }),
    ...extra,
  });
}

const lastListRequest = (requests: FakeRequest[]) => requests.filter((r) => r.url === '/transactions').at(-1)!;

describe('TransactionsPage', () => {
  it('defaults to the current financial month and shows totals and grouped transactions', async () => {
    const { requests } = setup();
    renderRoutes(routes, '/transactions');

    const list = await screen.findByRole('list', { name: 'Transactions' });
    expect(within(list).getByText('Big Basket')).toBeInTheDocument();
    expect(within(list).getByText('−₹2,500.50')).toBeInTheDocument();
    expect(within(list).getByText('Groceries · Savings · UPI')).toBeInTheDocument();
    expect(within(list).getByText('+₹80,000.00')).toBeInTheDocument();
    expect(within(list).getByText('Transfer · Savings → Cash')).toBeInTheDocument();
    expect(within(list).getByText('Mon, 02 Nov 2026')).toBeInTheDocument();

    expect(screen.getByText('₹77,499.50')).toBeInTheDocument();

    const { from, to } = financialMonth(todayIn(), 1);
    expect(lastListRequest(requests).params).toMatchObject({ from, to, page: 1, pageSize: 20, sort: 'date_desc' });
  });

  it('applies filters from the URL, e.g. an account’s full history', async () => {
    const { requests } = setup();
    renderRoutes(routes, '/transactions?accountId=cash&period=all');

    await screen.findByRole('list', { name: 'Transactions' });
    const params = lastListRequest(requests).params;
    expect(params).toMatchObject({ accountId: 'cash' });
    expect(params).not.toHaveProperty('from');
  });

  it('sends the chosen type filter and keeps it in the URL', async () => {
    const { requests } = setup();
    const user = userEvent.setup();
    const { router } = renderRoutes(routes, '/transactions');

    await screen.findByRole('list', { name: 'Transactions' });
    await user.click(screen.getByLabelText('Type'));
    await user.click(await screen.findByRole('option', { name: 'Income' }));

    await waitFor(() => expect(lastListRequest(requests).params).toMatchObject({ type: 'INCOME' }));
    expect(router.state.location.search).toContain('type=INCOME');
  });

  it('records an expense in paise, defaulting the date to today and offering only expense categories', async () => {
    const { requests } = setup({ 'POST /transactions': () => ok({ transaction: tx({}) }, 201) });
    const user = userEvent.setup();
    renderRoutes(routes, '/transactions');

    await user.click(await screen.findByRole('button', { name: 'Add expense' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/^Date/)).toHaveValue(todayIn());

    await user.type(within(dialog).getByLabelText(/^Amount/), '1,499.99');
    await user.type(within(dialog).getByLabelText(/^Title/), 'Vegetables');
    await user.click(within(dialog).getByLabelText(/^Category/));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Groceries']);
    await user.click(options[0]!);
    await user.click(within(dialog).getByLabelText(/^Account/));
    await user.click(await screen.findByRole('option', { name: 'Savings' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }));

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true));
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({
      type: 'EXPENSE',
      amountPaise: 149_999,
      date: todayIn(),
      title: 'Vegetables',
      accountId: 'savings',
      categoryId: 'groceries',
    });
  });

  it('rejects a future date before calling the API', async () => {
    const { requests } = setup();
    const user = userEvent.setup();
    renderRoutes(routes, '/transactions');

    await user.click(await screen.findByRole('button', { name: 'Add income' }));
    const dialog = await screen.findByRole('dialog');
    const date = within(dialog).getByLabelText(/^Date/);
    await user.clear(date);
    await user.type(date, '2999-01-01');
    await user.click(within(dialog).getByRole('button', { name: 'Add income' }));

    expect(await within(dialog).findByText('Date cannot be in the future')).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST')).toBe(false);
  });

  it('transfers only to other accounts in the same currency', async () => {
    const { requests } = setup({ 'POST /accounts/transfer': () => ok({ transfer: { transferGroupId: 'g2' } }, 201) });
    const user = userEvent.setup();
    renderRoutes(routes, '/transactions');

    await user.click(await screen.findByRole('button', { name: 'Transfer' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText(/^From/));
    await user.click(await screen.findByRole('option', { name: 'Savings' }));
    await user.click(within(dialog).getByLabelText(/^To/));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Cash']);
    await user.click(options[0]!);
    await user.type(within(dialog).getByLabelText(/^Amount/), '500');
    await user.click(within(dialog).getByRole('button', { name: 'Transfer' }));

    await waitFor(() => expect(requests.some((r) => r.url === '/accounts/transfer')).toBe(true));
    expect(requests.find((r) => r.url === '/accounts/transfer')?.body).toEqual({
      fromAccountId: 'savings',
      toAccountId: 'cash',
      amountPaise: 50_000,
      date: todayIn(),
    });
  });

  it('warns that deleting a transfer removes both sides', async () => {
    const { requests } = setup({ 'DELETE /transactions/:id': () => ok({ deletedCount: 2 }) });
    const user = userEvent.setup();
    renderRoutes(routes, '/transactions');

    await user.click(await screen.findByRole('button', { name: 'Actions for ATM' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete this transfer?' });
    expect(confirm).toHaveTextContent('Both sides of the transfer will be removed');

    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.url === '/transactions/t3')).toBe(true));
  });
});
