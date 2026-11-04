import Search from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import type { Account } from '../../types/account';
import type { Category } from '../../types/category';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '../../types/transaction';
import { PERIOD_LABELS, PERIODS } from '../../utils/date';
import type { useTransactionFilters } from './useTransactionFilters';

type FiltersState = ReturnType<typeof useTransactionFilters>;

const SEARCH_DEBOUNCE_MS = 300;
const fieldSx = { minWidth: { xs: '100%', sm: 160 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } };

export function TransactionFilterBar({
  state,
  accounts,
  categories,
}: {
  state: FiltersState;
  accounts: Account[];
  categories: Category[];
}) {
  const { filters, period, setFilter, setFilters, clearFilters, hasActiveFilters, rawParams } = state;
  const urlQuery = rawParams.get('q') ?? '';
  const [search, setSearch] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);

  // Follow the URL when it changes elsewhere (e.g. "Clear filters"), without an effect.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setSearch(urlQuery);
  }

  // Only push the search into the URL once the user pauses typing.
  useEffect(() => {
    if (search.trim() === urlQuery) return;
    const timer = setTimeout(() => setFilter('q', search.trim() || undefined), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, urlQuery, setFilter]);

  // Categories narrow to the chosen type; transfers have none.
  const categoryOptions = categories.filter(
    (c) => !filters.type || (filters.type !== 'TRANSFER' && c.type === filters.type),
  );

  return (
    <Stack spacing={2}>
      <TextField
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by title"
        aria-label="Search transactions"
        size="small"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <TextField
          select
          size="small"
          label="Period"
          value={period}
          onChange={(e) => setFilter('period', e.target.value)}
          sx={fieldSx}
        >
          {PERIODS.map((p) => (
            <MenuItem key={p} value={p}>
              {PERIOD_LABELS[p]}
            </MenuItem>
          ))}
        </TextField>
        {period === 'custom' && (
          <>
            <TextField
              type="date"
              size="small"
              label="From"
              value={rawParams.get('from') ?? ''}
              onChange={(e) => setFilter('from', e.target.value || undefined)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: rawParams.get('to') ?? undefined } }}
              sx={fieldSx}
            />
            <TextField
              type="date"
              size="small"
              label="To"
              value={rawParams.get('to') ?? ''}
              onChange={(e) => setFilter('to', e.target.value || undefined)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: rawParams.get('from') ?? undefined } }}
              sx={fieldSx}
            />
          </>
        )}
        <TextField
          select
          size="small"
          label="Type"
          value={filters.type ?? ''}
          onChange={(e) => setFilters({ type: e.target.value || undefined, categoryId: undefined })}
          sx={fieldSx}
        >
          <MenuItem value="">All types</MenuItem>
          <MenuItem value="EXPENSE">Expenses</MenuItem>
          <MenuItem value="INCOME">Income</MenuItem>
          <MenuItem value="TRANSFER">Transfers</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Account"
          value={filters.accountId ?? ''}
          onChange={(e) => setFilter('accountId', e.target.value || undefined)}
          sx={fieldSx}
        >
          <MenuItem value="">All accounts</MenuItem>
          {accounts.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
              {a.isActive ? '' : ' (inactive)'}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Category"
          value={filters.categoryId ?? ''}
          onChange={(e) => setFilter('categoryId', e.target.value || undefined)}
          disabled={filters.type === 'TRANSFER'}
          sx={fieldSx}
        >
          <MenuItem value="">All categories</MenuItem>
          {categoryOptions.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
              {c.isArchived ? ' (archived)' : ''}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Payment method"
          value={filters.paymentMethod ?? ''}
          onChange={(e) => setFilter('paymentMethod', e.target.value || undefined)}
          sx={fieldSx}
        >
          <MenuItem value="">Any method</MenuItem>
          {PAYMENT_METHODS.map((m) => (
            <MenuItem key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </MenuItem>
          ))}
        </TextField>
        {hasActiveFilters && (
          <Button onClick={clearFilters} size="small">
            Clear filters
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
