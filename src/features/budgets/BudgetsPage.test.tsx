import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '../../app/routes';
import { installFakeApi, ok } from '../../test/fakeApi';
import { renderRoutes } from '../../test/renderWithProviders';
import type { BudgetWithSummary } from '../../types/budget';
import { todayIn } from '../../utils/date';

const CATEGORIES = [
  {
    id: 'groceries',
    name: 'Groceries',
    type: 'EXPENSE',
    icon: 'groceries',
    color: '#43a047',
    isDefault: true,
    isArchived: false,
    createdAt: '',
  },
  {
    id: 'fuel',
    name: 'Fuel',
    type: 'EXPENSE',
    icon: 'fuel',
    color: '#c62828',
    isDefault: true,
    isArchived: false,
    createdAt: '',
  },
  {
    id: 'salary',
    name: 'Salary',
    type: 'INCOME',
    icon: 'salary',
    color: '#2e7d32',
    isDefault: true,
    isArchived: false,
    createdAt: '',
  },
];

const util = (limitPaise: number, spentPaise: number, reachedThreshold: number | null) => ({
  limitPaise,
  spentPaise,
  remainingPaise: limitPaise - spentPaise,
  utilizationPercent: Math.round((spentPaise * 1000) / limitPaise) / 10,
  reachedThreshold,
});

const HOUSEHOLD: BudgetWithSummary = {
  budget: {
    id: 'b1',
    name: 'Household',
    period: 'MONTHLY',
    currency: 'INR',
    amountPaise: 3_000_000,
    categoryLimits: [
      { categoryId: 'groceries', amountPaise: 1_000_000 },
      { categoryId: 'fuel', amountPaise: 200_000 },
    ],
    alertThresholds: [50, 80, 100],
    startDate: '2026-08-01',
    endDate: null,
    createdAt: '',
    updatedAt: '',
  },
  summary: {
    budgetId: 'b1',
    period: { from: '2026-11-01', to: '2026-11-30' },
    elapsedPercent: 10,
    overall: util(3_000_000, 1_500_000, 50),
    categories: [
      {
        categoryId: 'groceries',
        name: 'Groceries',
        icon: 'groceries',
        color: '#43a047',
        ...util(1_000_000, 900_000, 80),
      },
      { categoryId: 'fuel', name: 'Fuel', icon: 'fuel', color: '#c62828', ...util(200_000, 250_000, 100) },
    ],
    unbudgetedSpentPaise: 350_000,
  },
};

describe('BudgetsPage', () => {
  it('shows planned vs actual per category with alerts for crossed thresholds (FR-035 – FR-037)', async () => {
    installFakeApi({
      'GET /budgets': () => ok({ budgets: [HOUSEHOLD] }),
      'GET /categories': () => ok({ categories: CATEGORIES }),
    });
    renderRoutes(routes, '/budgets');

    const card = await screen.findByRole('region', { name: 'Household' });
    expect(within(card).getByText('₹15,000.00')).toBeInTheDocument();
    expect(within(card).getByText('₹15,000.00 left')).toBeInTheDocument();
    expect(within(card).getByText('₹500.00 over', { exact: false })).toBeInTheDocument();
    expect(within(card).getByText(/₹3,500.00 spent in categories without their own limit/)).toBeInTheDocument();

    const meters = within(card).getAllByRole('meter');
    expect(meters[0]).toHaveAttribute('aria-valuetext', expect.stringContaining('50% alert reached'));
    expect(meters[2]).toHaveAttribute('aria-valuetext', expect.stringContaining('Over budget'));

    const alerts = within(screen.getByRole('region', { name: 'Budget alerts' })).getAllByRole('alert');
    // Most severe first: Fuel over budget, then Groceries at 90%, then the overall 50% notice.
    expect(alerts.map((a) => a.textContent)).toEqual([
      expect.stringContaining('Household · Fuel: 125% used'),
      expect.stringContaining('Household · Groceries: 90% used'),
      expect.stringContaining('Household: 50% used'),
    ]);
  });

  it('asks for the period containing the viewed month', async () => {
    const { requests } = installFakeApi({ 'GET /budgets': () => ok({ budgets: [] }) });
    const user = userEvent.setup();
    renderRoutes(routes, '/budgets');

    await screen.findByText('No budgets yet');
    expect(requests.find((r) => r.url === '/budgets')?.params).toEqual({ date: todayIn() });

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await waitFor(() => expect(requests.filter((r) => r.url === '/budgets').at(-1)?.params.date).toMatch(/-01$/));
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled();
  });

  it('creates a monthly budget with category limits in paise', async () => {
    const { requests } = installFakeApi({
      'GET /budgets': () => ok({ budgets: [] }),
      'GET /categories': () => ok({ categories: CATEGORIES }),
      'POST /budgets': () => ok({ budget: HOUSEHOLD.budget }, 201),
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/budgets');

    await user.click(await screen.findByRole('button', { name: 'Add budget' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Budget name/), 'Household');
    await user.type(within(dialog).getByLabelText(/^Overall limit per month/), '30000');
    await user.click(within(dialog).getByRole('button', { name: 'Add category limit' }));
    await user.click(within(dialog).getByLabelText(/^Category/));
    const options = await screen.findAllByRole('option');
    // Only expense categories can carry limits.
    expect(options.map((o) => o.textContent)).toEqual(['Groceries', 'Fuel']);
    await user.click(options[0]!);
    await user.type(within(dialog).getByLabelText(/^Limit/), '10000.50');
    const thresholds = within(dialog).getByLabelText(/^Alert me at/);
    await user.clear(thresholds);
    await user.type(thresholds, '75, 100');
    await user.click(within(dialog).getByRole('button', { name: 'Add budget' }));

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true));
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({
      name: 'Household',
      period: 'MONTHLY',
      currency: 'INR',
      amountPaise: 3_000_000,
      categoryLimits: [{ categoryId: 'groceries', amountPaise: 1_000_050 }],
      alertThresholds: [75, 100],
      startDate: `${todayIn().slice(0, 7)}-01`,
    });
  });

  it('requires an end date for a custom budget', async () => {
    const { requests } = installFakeApi({ 'GET /budgets': () => ok({ budgets: [] }) });
    const user = userEvent.setup();
    renderRoutes(routes, '/budgets');

    await user.click(await screen.findByRole('button', { name: 'Add budget' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Custom dates' }));
    await user.type(within(dialog).getByLabelText(/^Budget name/), 'Trip');
    await user.type(within(dialog).getByLabelText(/^Overall limit/), '5000');
    await user.click(within(dialog).getByRole('button', { name: 'Add budget' }));

    expect(await within(dialog).findByText('Choose an end date')).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST')).toBe(false);
  });
});
