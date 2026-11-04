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
import type { Debt, DebtEntryType } from '../../types/debt';
import { todayIn } from '../../utils/date';
import { applyServerErrors } from '../../utils/formErrors';
import { currencySymbol, formatMoney, paiseToRupeeString, rupeesToPaise } from '../../utils/money';
import { amountField } from '../transactions/schemas';
import { useAddEntry } from './debtsApi';

interface Copy {
  title: string;
  intro: string;
  account: string;
  submit: string;
  done: string;
}

function copyFor(debt: Debt, type: DebtEntryType): Copy {
  const owed = formatMoney(debt.outstandingPaise, debt.currency);
  const name = debt.personName;
  if (type === 'WRITE_OFF') {
    return {
      title: `Write off ${name}'s loan`,
      intro: `Use this when ${owed} will not be paid back. It is recorded as a Bad Debt expense; no account balance changes.`,
      account: 'Report the expense under',
      submit: 'Write off',
      done: 'Written off as bad debt',
    };
  }
  if (type === 'PRINCIPAL') {
    const lent = debt.direction === 'LENT';
    return {
      title: lent ? `Lend more to ${name}` : `Borrow more from ${name}`,
      intro: `Currently ${owed} outstanding.`,
      account: lent ? 'Paid from account' : 'Received into account',
      submit: lent ? 'Lend' : 'Borrow',
      done: 'Amount added',
    };
  }
  const lent = debt.direction === 'LENT';
  return {
    title: lent ? `Repayment from ${name}` : `Payment to ${name}`,
    intro: `Outstanding: ${owed}. Repayments are not counted as income or expense.`,
    account: lent ? 'Received into account' : 'Paid from account',
    submit: 'Record',
    done: 'Repayment recorded',
  };
}

/** Records a repayment, a further amount or a write-off. Remounted (new key) on open. */
export function DebtEntryDialog({
  debt,
  type,
  accounts,
  onClose,
}: {
  debt: Debt;
  type: DebtEntryType;
  accounts: Account[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const notify = useNotify();
  const addEntry = useAddEntry();
  const [formError, setFormError] = useState<string | null>(null);
  const today = todayIn(user?.timezone);
  const closing = type !== 'PRINCIPAL';
  const copy = copyFor(debt, type);

  const schema = useMemo(
    () =>
      z.object({
        amount: amountField.refine(
          (value) => !closing || (rupeesToPaise(value) ?? 0) <= debt.outstandingPaise,
          `At most ${formatMoney(debt.outstandingPaise, debt.currency)} is outstanding`,
        ),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')
          .refine((d) => d <= today, 'Date cannot be in the future')
          .refine((d) => d >= debt.startDate, 'Date cannot be before the record was started'),
        accountId: z.string(),
        notes: z.string().trim().max(500, 'Keep notes under 500 characters'),
      }),
    [closing, debt.outstandingPaise, debt.currency, debt.startDate, today],
  );
  type Values = z.infer<typeof schema>;

  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    // Repayments and write-offs usually close the whole amount.
    defaultValues: {
      amount: closing ? paiseToRupeeString(debt.outstandingPaise) : '',
      date: today,
      accountId: '',
      notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await addEntry.mutateAsync({
        debtId: debt.id,
        input: {
          type,
          amountPaise: rupeesToPaise(values.amount)!,
          date: values.date,
          ...(values.accountId ? { accountId: values.accountId } : {}),
          ...(values.notes ? { notes: values.notes } : {}),
        },
      });
      notify(copy.done);
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['amount', 'date', 'accountId', 'notes']));
    }
  });

  // A write-off moves no money, so it may be reported under a deactivated account.
  const choices = accounts.filter((a) => a.currency === debt.currency && (type === 'WRITE_OFF' || a.isActive));

  return (
    <Dialog open onClose={formState.isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <form noValidate onSubmit={onSubmit} aria-label={copy.title}>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5}>
            <DialogContentText variant="body2">{copy.intro}</DialogContentText>
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
                    startAdornment: <InputAdornment position="start">{currencySymbol(debt.currency)}</InputAdornment>,
                  },
                }}
              />
              <FormTextField
                control={control}
                name="date"
                label="Date"
                type="date"
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: debt.startDate, max: today } }}
              />
            </Stack>
            <FormTextField control={control} name="accountId" label={copy.account} select>
              <MenuItem value="">
                <em>{type === 'WRITE_OFF' ? 'Account it was lent from' : "Don't link an account"}</em>
              </MenuItem>
              {choices.map((a) => (
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
            color={type === 'WRITE_OFF' ? 'warning' : 'primary'}
            loading={formState.isSubmitting}
          >
            {copy.submit}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
