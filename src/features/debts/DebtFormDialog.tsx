import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import type { Account } from '../../types/account';
import type { Debt, DebtDirection } from '../../types/debt';
import { todayIn } from '../../utils/date';
import { applyServerErrors } from '../../utils/formErrors';
import { currencySymbol, rupeesToPaise } from '../../utils/money';
import { amountField } from '../transactions/schemas';
import { useCreateDebt, useUpdateDebt } from './debtsApi';

const COPY: Record<DebtDirection, { title: string; person: string; account: string; submit: string }> = {
  LENT: { title: 'Lend money', person: 'Lent to', account: 'Paid from account', submit: 'Record loan' },
  BORROWED: { title: 'Borrow money', person: 'Borrowed from', account: 'Received into account', submit: 'Record loan' },
};

/**
 * Creates a lend/borrow record, or edits its person, due date and notes. Amounts change through
 * entries (repayments, further amounts), never by editing the record. Remounted (new key) on open.
 */
export function DebtFormDialog({
  direction,
  debt,
  accounts,
  onClose,
}: {
  direction: DebtDirection;
  debt: Debt | null;
  accounts: Account[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const notify = useNotify();
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();
  const [formError, setFormError] = useState<string | null>(null);
  const today = todayIn(user?.timezone);
  const editing = Boolean(debt);
  const copy = COPY[direction];

  const schema = useMemo(
    () =>
      z
        .object({
          personName: z.string().trim().min(1, 'Name is required').max(80, 'Keep the name under 80 characters'),
          phone: z.string().trim().max(20, 'Keep the phone number under 20 characters'),
          // Not used when editing; the record's amount changes through entries.
          amount: editing ? z.string() : amountField,
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')
            .refine((d) => d <= today, 'Date cannot be in the future'),
          dueDate: z.string(),
          accountId: z.string(),
          notes: z.string().trim().max(500, 'Keep notes under 500 characters'),
        })
        .refine((v) => !v.dueDate || v.dueDate >= v.date, {
          message: 'Due date cannot be before the start date',
          path: ['dueDate'],
        }),
    [editing, today],
  );
  type Values = z.infer<typeof schema>;

  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      personName: debt?.personName ?? '',
      phone: debt?.phone ?? '',
      amount: '',
      date: debt?.startDate ?? today,
      dueDate: debt?.dueDate ?? '',
      accountId: '',
      notes: debt?.notes ?? '',
    },
  });
  const accountId = useWatch({ control, name: 'accountId' });
  const usable = accounts.filter((a) => a.isActive);
  const currency = usable.find((a) => a.id === accountId)?.currency ?? debt?.currency ?? user?.currency ?? 'INR';

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (debt) {
        await updateDebt.mutateAsync({
          id: debt.id,
          input: {
            personName: values.personName,
            phone: values.phone || null,
            dueDate: values.dueDate || null,
            notes: values.notes || null,
          },
        });
        notify('Record updated');
      } else {
        await createDebt.mutateAsync({
          direction,
          personName: values.personName,
          amountPaise: rupeesToPaise(values.amount)!,
          date: values.date,
          ...(values.phone ? { phone: values.phone } : {}),
          ...(values.dueDate ? { dueDate: values.dueDate } : {}),
          ...(values.accountId ? { accountId: values.accountId } : {}),
          ...(values.notes ? { notes: values.notes } : {}),
        });
        notify(`Loan ${direction === 'LENT' ? 'to' : 'from'} ${values.personName} recorded`);
      }
      onClose();
    } catch (error) {
      setFormError(
        applyServerErrors(error, setError, ['personName', 'phone', 'date', 'dueDate', 'accountId', 'notes']),
      );
    }
  });

  return (
    <Dialog open onClose={formState.isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <form noValidate onSubmit={onSubmit} aria-label={editing ? 'Edit record' : copy.title}>
        <DialogTitle>{editing ? 'Edit record' : copy.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Stack direction="row" spacing={2}>
              <FormTextField control={control} name="personName" label={copy.person} autoFocus placeholder="Name" />
              <FormTextField control={control} name="phone" label="Phone (optional)" sx={{ maxWidth: 160 }} />
            </Stack>
            {!editing && (
              <>
                <Stack direction="row" spacing={2}>
                  <FormTextField
                    control={control}
                    name="amount"
                    label="Amount"
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
                  name="accountId"
                  label={copy.account}
                  select
                  helperText="Moves the account balance. Never counted as income or expense."
                >
                  <MenuItem value="">
                    <em>Don't link an account</em>
                  </MenuItem>
                  {usable.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </FormTextField>
              </>
            )}
            <FormTextField
              control={control}
              name="dueDate"
              label="Due date (optional)"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormTextField control={control} name="notes" label="Notes (optional)" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={formState.isSubmitting}>
            {editing ? 'Save changes' : copy.submit}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
