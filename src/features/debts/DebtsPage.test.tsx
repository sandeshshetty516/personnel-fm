import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '../../app/routes';
import { installFakeApi, ok, type FakeRequest } from '../../test/fakeApi';
import { renderRoutes } from '../../test/renderWithProviders';
import type { Account } from '../../types/account';
import type { Debt, DebtSummary } from '../../types/debt';
import { todayIn } from '../../utils/date';

const debt = (overrides: Partial<Debt> = {}): Debt => ({
  id: 'd1',
  direction: 'LENT',
  personName: 'Ravi',
  phone: null,
  currency: 'INR',
  startDate: '2026-10-01',
  dueDate: '2026-10-31',
  notes: null,
  principalPaise: 500_000,
  repaidPaise: 200_000,
  writtenOffPaise: 0,
  outstandingPaise: 300_000,
  progressPercent: 40,
  status: 'OPEN',
  isOverdue: true,
  closedAt: null,
  createdAt: '',
  ...overrides,
});

const SUMMARY: DebtSummary = {
  currency: 'INR',
  receivablePaise: 300_000,
  payablePaise: 150_000,
  openLentCount: 1,
  openBorrowedCount: 2,
  overdueCount: 1,
  people: [{ personName: 'Ravi', receivablePaise: 300_000, payablePaise: 0, netPaise: 300_000 }],
};

const ACCOUNT: Account = {
  id: 'hdfc',
  name: 'HDFC Savings',
  accountType: 'SAVINGS',
  currency: 'INR',
  openingBalancePaise: 0,
  currentBalancePaise: 5_000_000,
  institution: null,
  lastFourDigits: null,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

function setup(extra: Record<string, (req: FakeRequest) => ReturnType<typeof ok>> = {}) {
  return installFakeApi({
    'GET /accounts': () => ok({ accounts: [ACCOUNT] }),
    'GET /debts': (req) => ok({ debts: req.params.direction === 'LENT' ? [debt()] : [] }),
    'GET /debts/summary': () => ok({ summaries: [SUMMARY] }),
    ...extra,
  });
}

const posted = (requests: FakeRequest[]) => requests.find((r) => r.method === 'POST');

describe('DebtsPage', () => {
  it('shows what you will receive and owe, and each loan with its progress (FR-081)', async () => {
    setup();
    renderRoutes(routes, '/lend-borrow');

    const card = await screen.findByRole('region', { name: 'Ravi' });
    expect(within(card).getByText('₹3,000.00')).toBeInTheDocument();
    expect(within(card).getByText('owed to you')).toBeInTheDocument();
    expect(within(card).getByText('Overdue')).toBeInTheDocument();
    expect(within(card).getByRole('meter')).toHaveAttribute('aria-valuenow', '40');
    expect(within(card).getByText('₹2,000.00 received back of ₹5,000.00')).toBeInTheDocument();

    expect(screen.getByText("You'll receive").parentElement).toHaveTextContent('₹3,000.00');
    expect(screen.getByText('You owe').parentElement).toHaveTextContent('₹1,500.00');
    expect(screen.getByText('1 record overdue')).toBeInTheDocument();
  });

  it('loads borrowed records on the Borrowed tab', async () => {
    const { requests } = setup();
    const user = userEvent.setup();
    renderRoutes(routes, '/lend-borrow');

    await user.click(await screen.findByRole('tab', { name: 'Borrowed' }));
    expect(await screen.findByText('Nothing borrowed')).toBeInTheDocument();
    expect(requests.some((r) => r.url === '/debts' && r.params.direction === 'BORROWED')).toBe(true);
  });

  it('records money lent from an account, in paise (FR-075, FR-077)', async () => {
    const { requests } = setup({ 'POST /debts': () => ok({ debt: debt(), entry: {} }, 201) });
    const user = userEvent.setup();
    renderRoutes(routes, '/lend-borrow');

    await user.click(await screen.findByRole('button', { name: 'Lend money' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Lent to/), 'Meena');
    await user.type(within(dialog).getByLabelText(/^Amount/), '2,500.50');
    await user.click(within(dialog).getByLabelText(/^Paid from account/));
    await user.click(await screen.findByRole('option', { name: 'HDFC Savings' }));
    await user.click(within(dialog).getByRole('button', { name: 'Record loan' }));

    await waitFor(() => expect(posted(requests)).toBeDefined());
    expect(posted(requests)).toMatchObject({
      url: '/debts',
      body: { direction: 'LENT', personName: 'Meena', amountPaise: 250_050, date: todayIn(), accountId: 'hdfc' },
    });
  });

  it('pre-fills a repayment with the outstanding amount and refuses more (FR-080)', async () => {
    const { requests } = setup({ 'POST /debts/:id/entries': () => ok({ debt: debt(), entry: {} }, 201) });
    const user = userEvent.setup();
    renderRoutes(routes, '/lend-borrow');

    await user.click(await screen.findByRole('button', { name: 'Record repayment' }));
    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByLabelText(/^Amount/);
    expect(amount).toHaveValue('3000.00');

    await user.clear(amount);
    await user.type(amount, '3000.01');
    await user.click(within(dialog).getByRole('button', { name: 'Record' }));
    expect(await within(dialog).findByText('At most ₹3,000.00 is outstanding')).toBeInTheDocument();
    expect(posted(requests)).toBeUndefined();

    await user.clear(amount);
    await user.type(amount, '1000');
    await user.click(within(dialog).getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(posted(requests)).toBeDefined());
    expect(posted(requests)).toMatchObject({
      url: '/debts/d1/entries',
      body: { type: 'REPAYMENT', amountPaise: 100_000, date: todayIn() },
    });
  });

  it('writes off a lent amount as a bad-debt expense (FR-079)', async () => {
    const { requests } = setup({ 'POST /debts/:id/entries': () => ok({ debt: debt(), entry: {} }, 201) });
    const user = userEvent.setup();
    renderRoutes(routes, '/lend-borrow');

    await user.click(await screen.findByRole('button', { name: 'More actions for Ravi' }));
    await user.click(screen.getByRole('menuitem', { name: 'Write off' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('recorded as a Bad Debt expense; no account balance changes');
    await user.click(within(dialog).getByRole('button', { name: 'Write off' }));

    await waitFor(() => expect(posted(requests)).toBeDefined());
    expect(posted(requests)?.body).toMatchObject({ type: 'WRITE_OFF', amountPaise: 300_000 });
  });

  it('does not offer a write-off for money borrowed', async () => {
    setup({ 'GET /debts': () => ok({ debts: [debt({ direction: 'BORROWED' })] }) });
    const user = userEvent.setup();
    renderRoutes(routes, '/lend-borrow');

    await user.click(await screen.findByRole('button', { name: 'More actions for Ravi' }));
    expect(screen.getByRole('menuitem', { name: 'Borrow more' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Write off' })).not.toBeInTheDocument();
  });

  it('confirms before deleting a record', async () => {
    const { requests } = setup({ 'DELETE /debts/:id': () => ok({ deletedTransactionCount: 2 }) });
    const user = userEvent.setup();
    renderRoutes(routes, '/lend-borrow');

    await user.click(await screen.findByRole('button', { name: 'More actions for Ravi' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete the record for Ravi?' });
    expect(confirm).toHaveTextContent('account balances they moved are restored');
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.url === '/debts/d1')).toBe(true));
  });
});
