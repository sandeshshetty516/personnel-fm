import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import type { Account } from '../../types/account';
import type { Category } from '../../types/category';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type EntryType, type Transaction } from '../../types/transaction';
import { todayIn } from '../../utils/date';
import { applyServerErrors } from '../../utils/formErrors';
import { currencySymbol, paiseToRupeeString, rupeesToPaise } from '../../utils/money';
import { CategoryAvatar } from '../categories/CategoryAvatar';
import { transactionFormSchema, type TransactionFormValues } from './schemas';
import { useCreateTransaction, useUpdateTransaction } from './transactionsApi';

interface TransactionFormDialogProps {
  open: boolean;
  /** Transaction to edit, or null to create one. */
  transaction: Transaction | null;
  /** Preselected type when creating. */
  defaultType: EntryType;
  /** Preselected account when creating (e.g. the account the list is filtered to). */
  defaultAccountId?: string;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
}

/** Add or edit income/expense. The parent remounts it (new key) on every open, so the form starts fresh. */
export function TransactionFormDialog({
  open,
  transaction,
  defaultType,
  defaultAccountId,
  accounts,
  categories,
  onClose,
}: TransactionFormDialogProps) {
  const { user } = useAuth();
  const notify = useNotify();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const today = todayIn(user?.timezone);
  const schema = useMemo(() => transactionFormSchema(today), [today]);
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const [formError, setFormError] = useState<string | null>(null);

  const activeAccounts = accounts.filter((a) => a.isActive || a.id === transaction?.accountId);

  const { control, handleSubmit, setError, setValue, formState } = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: transaction
      ? {
          type: transaction.type as EntryType,
          amount: paiseToRupeeString(transaction.amountPaise),
          date: transaction.date,
          title: transaction.title,
          accountId: transaction.accountId,
          categoryId: transaction.categoryId ?? '',
          paymentMethod: transaction.paymentMethod ?? '',
          notes: transaction.notes ?? '',
        }
      : {
          type: defaultType,
          amount: '',
          date: today,
          title: '',
          accountId: defaultAccountId ?? (activeAccounts.length === 1 ? activeAccounts[0]!.id : ''),
          categoryId: '',
          paymentMethod: '',
          notes: '',
        },
  });

  const [type, accountId] = useWatch({ control, name: ['type', 'accountId'] });
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? user?.currency ?? 'INR';
  // Only categories of the chosen type; an archived one stays visible if this transaction already uses it.
  const typeCategories = categories.filter(
    (c) => c.type === type && (!c.isArchived || c.id === transaction?.categoryId),
  );

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const input = {
      type: values.type,
      amountPaise: rupeesToPaise(values.amount)!,
      date: values.date,
      title: values.title,
      accountId: values.accountId,
      categoryId: values.categoryId,
      paymentMethod: values.paymentMethod || null,
      notes: values.notes || null,
    };
    try {
      if (transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, input });
        notify('Transaction updated');
      } else {
        await createTransaction.mutateAsync(input);
        notify(values.type === 'INCOME' ? 'Income added' : 'Expense added');
      }
      onClose();
    } catch (error) {
      setFormError(
        applyServerErrors(error, setError, [
          'type',
          'date',
          'title',
          'accountId',
          'categoryId',
          'paymentMethod',
          'notes',
        ]),
      );
    }
  });

  const noun = type === 'INCOME' ? 'income' : 'expense';

  return (
    <Dialog open={open} onClose={formState.isSubmitting ? undefined : onClose} fullScreen={fullScreen} fullWidth>
      <form noValidate onSubmit={onSubmit} aria-label={transaction ? 'Edit transaction' : `Add ${noun}`}>
        <DialogTitle>{transaction ? 'Edit transaction' : `Add ${noun}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={field.value}
                  aria-label="Transaction type"
                  onChange={(_e, value: EntryType | null) => {
                    if (!value || value === field.value) return;
                    field.onChange(value);
                    // A category of the other type would be invalid.
                    setValue('categoryId', '');
                  }}
                >
                  <ToggleButton value="EXPENSE" color="error">
                    Expense
                  </ToggleButton>
                  <ToggleButton value="INCOME" color="success">
                    Income
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormTextField
                control={control}
                name="amount"
                label="Amount"
                autoFocus
                placeholder="0.00"
                slotProps={{
                  htmlInput: { inputMode: 'decimal' },
                  input: {
                    startAdornment: <InputAdornment position="start">{currencySymbol(currency)}</InputAdornment>,
                  },
                }}
              />
              <FormTextField
                control={control}
                name="date"
                label="Date"
                type="date"
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
              />
            </Stack>

            <FormTextField
              control={control}
              name="title"
              label="Title"
              placeholder={type === 'INCOME' ? 'e.g. November salary' : 'e.g. Weekly groceries'}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormTextField control={control} name="categoryId" label="Category" select>
                {typeCategories.length === 0 && (
                  <MenuItem value="" disabled>
                    No {noun} categories — add one on the Categories page
                  </MenuItem>
                )}
                {typeCategories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CategoryAvatar icon={c.icon} color={c.color} size={22} />
                      {c.name}
                    </Box>
                  </MenuItem>
                ))}
              </FormTextField>
              <FormTextField control={control} name="accountId" label="Account" select>
                {activeAccounts.length === 0 && (
                  <MenuItem value="" disabled>
                    No active accounts — add one on the Accounts page
                  </MenuItem>
                )}
                {activeAccounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </FormTextField>
            </Stack>

            <FormTextField control={control} name="paymentMethod" label="Payment method (optional)" select>
              <MenuItem value="">
                <em>Not specified</em>
              </MenuItem>
              {PAYMENT_METHODS.map((method) => (
                <MenuItem key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </MenuItem>
              ))}
            </FormTextField>

            <FormTextField control={control} name="notes" label="Notes (optional)" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={formState.isSubmitting}>
            {transaction ? 'Save changes' : `Add ${noun}`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
