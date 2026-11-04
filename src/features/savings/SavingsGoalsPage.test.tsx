import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '../../app/routes';
import { installFakeApi, ok } from '../../test/fakeApi';
import { renderRoutes } from '../../test/renderWithProviders';
import type { SavingsGoal } from '../../types/savings';
import { todayIn } from '../../utils/date';

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 'g1',
  name: 'Emergency fund',
  targetAmountPaise: 10_000_000,
  targetDate: '2027-06-30',
  currency: 'INR',
  status: 'ACTIVE',
  notes: null,
  savedPaise: 2_500_000,
  remainingPaise: 7_500_000,
  progressPercent: 25,
  isTargetReached: false,
  monthlyNeededPaise: 1_000_000,
  completedAt: null,
  createdAt: '',
  ...overrides,
});

describe('SavingsGoalsPage', () => {
  it('shows saved, target, progress and the monthly amount needed (FR-040)', async () => {
    installFakeApi({ 'GET /savings-goals': () => ok({ goals: [goal()] }) });
    renderRoutes(routes, '/savings');

    const card = await screen.findByRole('region', { name: 'Emergency fund' });
    expect(within(card).getByText('₹25,000.00')).toBeInTheDocument();
    expect(within(card).getByText('of ₹1,00,000.00')).toBeInTheDocument();
    expect(within(card).getByRole('meter')).toHaveAttribute('aria-valuenow', '25');
    expect(within(card).getByText(/₹75,000.00 to go · ₹10,000.00\/month to hit the date/)).toBeInTheDocument();
  });

  it('adds money in paise (FR-039)', async () => {
    const { requests } = installFakeApi({
      'GET /savings-goals': () => ok({ goals: [goal()] }),
      'POST /savings-goals/:id/contributions': () => ok({ goal: goal(), contribution: {} }, 201),
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/savings');

    await user.click(await screen.findByRole('button', { name: 'Add money' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('It is not recorded as an expense');
    await user.type(within(dialog).getByLabelText(/^Amount/), '5,000');
    await user.type(within(dialog).getByLabelText(/^Notes/), 'Bonus');
    await user.click(within(dialog).getByRole('button', { name: 'Add money' }));

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true));
    expect(requests.find((r) => r.method === 'POST')).toMatchObject({
      url: '/savings-goals/g1/contributions',
      body: { type: 'CONTRIBUTION', amountPaise: 500_000, date: todayIn(), notes: 'Bonus' },
    });
  });

  it('will not withdraw more than has been saved', async () => {
    const { requests } = installFakeApi({ 'GET /savings-goals': () => ok({ goals: [goal()] }) });
    const user = userEvent.setup();
    renderRoutes(routes, '/savings');

    await user.click(await screen.findByRole('button', { name: 'Withdraw' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Amount/), '30000');
    await user.click(within(dialog).getByRole('button', { name: 'Withdraw' }));

    expect(await within(dialog).findByText('You can withdraw at most ₹25,000.00')).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST')).toBe(false);
  });

  it('marks a goal completed (FR-041)', async () => {
    const { requests } = installFakeApi({
      'GET /savings-goals': () => ok({ goals: [goal()] }),
      'PATCH /savings-goals/:id': () => ok({ goal: goal({ status: 'COMPLETED' }) }),
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/savings');

    await user.click(await screen.findByRole('button', { name: 'More actions for Emergency fund' }));
    await user.click(screen.getByRole('menuitem', { name: 'Mark as completed' }));

    await waitFor(() =>
      expect(requests.find((r) => r.method === 'PATCH')).toMatchObject({
        url: '/savings-goals/g1',
        body: { status: 'COMPLETED' },
      }),
    );
  });
});
