import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '../../app/routes';
import { installFakeApi, ok, type FakeRequest } from '../../test/fakeApi';
import { renderRoutes } from '../../test/renderWithProviders';
import { financialMonth, todayIn } from '../../utils/date';

const ACCOUNT = {
  id: 'a1',
  name: 'Savings',
  accountType: 'SAVINGS',
  currency: 'INR',
  openingBalancePaise: 0,
  currentBalancePaise: 11_850_000,
  institution: null,
  lastFourDigits: null,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const SUMMARY = {
  period: { from: '2026-11-01', to: '2026-11-30', currency: 'INR' },
  availableCurrencies: ['INR'],
  incomePaise: 9_000_000,
  expensePaise: 3_200_000,
  netPaise: 5_800_000,
  savingsRatePercent: 64.4,
  totalBalancePaise: 11_850_000,
  activeAccountCount: 2,
  transactionCount: 6,
};

const slice = (name: string, amountPaise: number, sharePercent: number) => ({
  categoryId: name.toLowerCase(),
  name,
  icon: 'other',
  color: '#78909c',
  amountPaise,
  sharePercent,
  transactionCount: 1,
});

function setup(overrides: Record<string, () => ReturnType<typeof ok>> = {}) {
  return installFakeApi({
    'GET /accounts': () => ok({ accounts: [ACCOUNT] }),
    'GET /dashboard/summary': () => ok(SUMMARY),
    'GET /dashboard/cash-flow': () =>
      ok({
        buckets: [
          {
            from: '2026-10-01',
            to: '2026-10-31',
            incomePaise: 8_000_000,
            expensePaise: 2_000_000,
            netPaise: 6_000_000,
          },
          {
            from: '2026-11-01',
            to: '2026-11-30',
            incomePaise: 9_000_000,
            expensePaise: 3_200_000,
            netPaise: 5_800_000,
          },
        ],
      }),
    'GET /dashboard/category-breakdown': () =>
      ok({
        totalPaise: 3_200_000,
        categories: [
          slice('Rent', 2_000_000, 62.5),
          slice('Groceries', 500_000, 15.6),
          slice('Fuel', 300_000, 9.4),
          slice('Dining', 200_000, 6.3),
          slice('Travel', 100_000, 3.1),
          slice('Gifts', 60_000, 1.9),
          slice('Books', 40_000, 1.2),
        ],
      }),
    ...overrides,
  });
}

const lastRequest = (requests: FakeRequest[], url: string) => requests.filter((r) => r.url === url).at(-1)!;

describe('DashboardPage', () => {
  it('shows the KPI row for the period (FR-055, FR-056)', async () => {
    setup();
    renderRoutes(routes, '/');

    expect(await screen.findByText('₹90,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹32,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹58,000.00')).toBeInTheDocument();
    expect(screen.getByText('64.4%')).toBeInTheDocument();
    expect(screen.getByText('₹1,18,500.00')).toBeInTheDocument();
    expect(screen.getByText('Across 2 active accounts, today')).toBeInTheDocument();
  });

  it('explains a missing savings rate when there is no income', async () => {
    setup({
      'GET /dashboard/summary': () =>
        ok({ ...SUMMARY, incomePaise: 0, netPaise: -3_200_000, savingsRatePercent: null }),
    });
    renderRoutes(routes, '/');
    expect(await screen.findByText('No income in this period')).toBeInTheDocument();
  });

  it('defaults to the current financial month and widens trends to six months', async () => {
    const { requests } = setup();
    renderRoutes(routes, '/');
    await screen.findByText('₹90,000.00');

    const month = financialMonth(todayIn(), 1);
    expect(lastRequest(requests, '/dashboard/summary').params).toEqual({ ...month, currency: 'INR' });
    expect(lastRequest(requests, '/dashboard/cash-flow').params).toEqual({
      from: financialMonth(todayIn(), 1, -5).from,
      to: month.to,
      currency: 'INR',
    });
  });

  it('re-scopes every widget when the period changes (FR-060)', async () => {
    const { requests } = setup();
    const user = userEvent.setup();
    renderRoutes(routes, '/');
    await screen.findByText('₹90,000.00');

    await user.click(screen.getByLabelText('Period'));
    await user.click(await screen.findByRole('option', { name: 'Last month' }));

    const lastMonth = financialMonth(todayIn(), 1, -1);
    await waitFor(() => expect(lastRequest(requests, '/dashboard/summary').params).toMatchObject(lastMonth));
    expect(lastRequest(requests, '/dashboard/category-breakdown').params).toMatchObject(lastMonth);
    expect(lastRequest(requests, '/dashboard/recent-transactions').params).toMatchObject(lastMonth);
  });

  it('ranks spending categories and folds the tail into Other (FR-057)', async () => {
    setup();
    renderRoutes(routes, '/');

    const list = await screen.findByRole('list', { name: 'Spending by category' });
    const names = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(names).toHaveLength(6);
    expect(names[0]).toContain('Rent');
    expect(names[5]).toContain('Other (2)');
    expect(names[5]).toContain('₹1,000.00');
  });

  it('offers every chart as a table (accessibility)', async () => {
    setup();
    const user = userEvent.setup();
    renderRoutes(routes, '/');

    const card = await screen.findByRole('region', { name: 'Income vs expenses' });
    await user.click(within(card).getByRole('button', { name: 'Table view' }));

    const table = within(card).getByRole('table', { name: 'Income vs expenses data' });
    const rows = within(table)
      .getAllByRole('row')
      .map((r) => r.textContent);
    expect(rows[1]).toBe('1 Oct – 31 Oct 2026₹80,000.00₹20,000.00₹60,000.00');
    expect(rows[2]).toBe('1 Nov – 30 Nov 2026₹90,000.00₹32,000.00₹58,000.00');
  });

  it('welcomes a new user with no accounts', async () => {
    installFakeApi({});
    renderRoutes(routes, '/');
    expect(await screen.findByText('Welcome to MyFinance')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add an account' })).toHaveAttribute('href', '/accounts');
  });
});
