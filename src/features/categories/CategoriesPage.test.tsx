import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '../../app/routes';
import { fail, installFakeApi, ok } from '../../test/fakeApi';
import { renderRoutes } from '../../test/renderWithProviders';
import type { Category } from '../../types/category';

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: 'c1',
    name: 'Fuel',
    type: 'EXPENSE',
    icon: 'fuel',
    color: '#c62828',
    isDefault: true,
    isArchived: false,
    createdAt: '2026-11-03T00:00:00.000Z',
    ...overrides,
  };
}

const CATEGORIES = [
  makeCategory({ id: 'fuel', name: 'Fuel' }),
  makeCategory({ id: 'transport', name: 'Transport', icon: 'transport' }),
  makeCategory({ id: 'old', name: 'Old stuff', isArchived: true, isDefault: false }),
  makeCategory({ id: 'salary', name: 'Salary', type: 'INCOME', icon: 'salary' }),
];

describe('CategoriesPage', () => {
  it('separates expense and income categories and hides archived ones by default', async () => {
    installFakeApi({ 'GET /categories': () => ok({ categories: CATEGORIES }) });
    const user = userEvent.setup();
    renderRoutes(routes, '/categories');

    const list = await screen.findByRole('list', { name: 'Expense categories' });
    expect(within(list).getByText('Fuel')).toBeInTheDocument();
    expect(within(list).queryByText('Salary')).not.toBeInTheDocument();
    expect(within(list).queryByText('Old stuff')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Show archived'));
    expect(within(list).getByText('Old stuff')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Income' }));
    expect(
      within(await screen.findByRole('list', { name: 'Income categories' })).getByText('Salary'),
    ).toBeInTheDocument();
  });

  it('creates a custom category of the selected tab type', async () => {
    const { requests } = installFakeApi({
      'GET /categories': () => ok({ categories: CATEGORIES }),
      'POST /categories': () => ok({ category: makeCategory({ id: 'pets', name: 'Pets' }) }, 201),
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/categories');

    await user.click(await screen.findByRole('button', { name: 'Add category' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Name/), 'Pets');
    await user.click(within(dialog).getByRole('radio', { name: 'pets' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }));

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true));
    expect(requests.find((r) => r.method === 'POST')?.body).toMatchObject({
      name: 'Pets',
      type: 'EXPENSE',
      icon: 'pets',
    });
  });

  it('offers to reassign transactions when deleting a category that is in use', async () => {
    const { requests } = installFakeApi({
      'GET /categories': () => ok({ categories: CATEGORIES }),
      'DELETE /categories/:id': (req) =>
        req.params.reassignTo
          ? ok({ deleted: true, reassignedTransactions: 3 })
          : fail(409, 'CONFLICT', 'In use', { reason: 'CATEGORY_IN_USE', transactionCount: 3 }),
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/categories');

    await user.click(await screen.findByRole('button', { name: 'Delete Fuel' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Fuel?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByText(/3 transactions use this category/)).toBeInTheDocument();
    const moveButton = within(dialog).getByRole('button', { name: 'Move and delete' });
    expect(moveButton).toBeDisabled();

    // Only active categories of the same type are offered.
    await user.click(within(dialog).getByLabelText(/^Move transactions to/));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Transport']);
    await user.click(options[0]!);
    await user.click(moveButton);

    await waitFor(() =>
      expect(requests.some((r) => r.method === 'DELETE' && r.params.reassignTo === 'transport')).toBe(true),
    );
    expect(await screen.findByText('Fuel deleted; 3 transactions moved')).toBeInTheDocument();
  });

  it('can archive instead of deleting', async () => {
    const { requests } = installFakeApi({
      'GET /categories': () => ok({ categories: CATEGORIES }),
      'DELETE /categories/:id': () =>
        fail(409, 'CONFLICT', 'In use', { reason: 'CATEGORY_IN_USE', transactionCount: 1 }),
      'PATCH /categories/:id': () => ok({ category: makeCategory({ isArchived: true }) }),
    });
    const user = userEvent.setup();
    renderRoutes(routes, '/categories');

    await user.click(await screen.findByRole('button', { name: 'Delete Fuel' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Fuel?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Archive instead' }));

    await waitFor(() =>
      expect(requests.find((r) => r.method === 'PATCH' && r.url === '/categories/fuel')?.body).toEqual({
        isArchived: true,
      }),
    );
  });
});
