import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import type { Account } from '../../types/account';
import type { ContributionType, SavingsGoal } from '../../types/savings';
import { todayIn } from '../../utils/date';
import { applyServerErrors } from '../../utils/formErrors';
import { currencySymbol, formatMoney, rupeesToPaise } from '../../utils/money';
import { amountField } from '../transactions/schemas';
import { useAddContribution } from './savingsApi';

/**
 * Add money to, or withdraw it from, a goal. This earmarks money only: no transaction is created,
 * so it never shows up as an expense and account balances do not change.
 */
export function ContributionDialog({
  goal,
  type,
  accounts,
  onClose,
}: {
  goal: SavingsGoal;
  type: ContributionType;
  accounts: Account[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const notify = useNotify();
  const addContribution = useAddContribution();
  const [formError, setFormError] = useState<string | null>(null);
  const today = todayIn(user?.timezone);
  const withdrawing = type === 'WITHDRAWAL';

  const schema = useMemo(
    () =>
      z.object({
        amount: amountField.refine(
          (value) => !withdrawing || (rupeesToPaise(value) ?? 0) <= goal.savedPaise,
          `You can withdraw at most ${formatMoney(goal.savedPaise, goal.currency)}`,
        ),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')
          .refine((d) => d <= today, 'Date cannot be in the future'),
        accountId: z.string(),
        notes: z.string().trim().max(500, 'Keep notes under 500 characters'),
      }),
    [withdrawing, goal.savedPaise, goal.currency, today],
  );
  type Values = z.infer<typeof schema>;

  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', date: today, accountId: '', notes: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await addContribution.mutateAsync({
        goalId: goal.id,
        input: {
          type,
          amountPaise: rupeesToPaise(values.amount)!,
          date: values.date,
          ...(values.accountId ? { accountId: values.accountId } : {}),
          ...(values.notes ? { notes: values.notes } : {}),
        },
      });
      notify(withdrawing ? 'Withdrawal recorded' : 'Money added to goal');
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['date', 'accountId', 'notes']));
    }
  });

  const sameCurrencyAccounts = accounts.filter((a) => a.isActive && a.currency === goal.currency);

  return (
    <Dialog open onClose={formState.isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <form noValidate onSubmit={onSubmit} aria-label={withdrawing ? 'Withdraw from goal' : 'Add money to goal'}>
        <DialogTitle>
          {withdrawing ? 'Withdraw from' : 'Add money to'} {goal.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5}>
            <DialogContentText variant="body2">
              {withdrawing
                ? `Saved so far: ${formatMoney(goal.savedPaise, goal.currency)}.`
                : 'This sets money aside for the goal. It is not recorded as an expense.'}
            </DialogContentText>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Stack direction="row" spacing={2}>
              <FormTextField
                control={control}
                name="amount"
                label="Amount"
                autoFocus
                placeholder="0.00"
                slotProps={{
                  htmlInput: { inputMode: 'decimal' },
                  input: {
                    startAdornment: <InputAdornment position="start">{currencySymbol(goal.currency)}</InputAdornment>,
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
            <FormTextField control={control} name="accountId" label="Held in account (optional)" select>
              <MenuItem value="">
                <em>Not specified</em>
              </MenuItem>
              {sameCurrencyAccounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </FormTextField>
            <FormTextField control={control} name="notes" label="Notes (optional)" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={formState.isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={withdrawing ? 'warning' : 'primary'}
            loading={formState.isSubmitting}
          >
            {withdrawing ? 'Withdraw' : 'Add money'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
