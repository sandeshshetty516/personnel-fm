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
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import type { Account } from '../../types/account';
import type { Transaction } from '../../types/transaction';
import { todayIn } from '../../utils/date';
import { applyServerErrors } from '../../utils/formErrors';
import { currencySymbol, formatMoney, paiseToRupeeString, rupeesToPaise } from '../../utils/money';
import { transferFormSchema, type TransferFormValues } from './schemas';
import { useCreateTransfer, useUpdateTransaction } from './transactionsApi';

interface TransferDialogProps {
  open: boolean;
  /** A transfer leg to edit, or null to create a transfer. */
  transfer: Transaction | null;
  defaultFromAccountId?: string;
  accounts: Account[];
  onClose: () => void;
}

/**
 * Create or edit a transfer between the user's own accounts. When editing, the accounts are fixed:
 * the API only allows amount, date, title and notes to change on an existing transfer.
 */
export function TransferDialog({ open, transfer, defaultFromAccountId, accounts, onClose }: TransferDialogProps) {
  const { user } = useAuth();
  const notify = useNotify();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const today = todayIn(user?.timezone);
  const schema = useMemo(() => transferFormSchema(today), [today]);
  const createTransfer = useCreateTransfer();
  const updateTransaction = useUpdateTransaction();
  const [formError, setFormError] = useState<string | null>(null);

  // A TRANSFER_IN leg's counterpart is the source account.
  const editingFrom = transfer?.type === 'TRANSFER_OUT' ? transfer.accountId : transfer?.counterpartAccountId;
  const editingTo = transfer?.type === 'TRANSFER_OUT' ? transfer.counterpartAccountId : transfer?.accountId;

  const { control, handleSubmit, setError, formState } = useForm<TransferFormValues>({
    resolver: zodResolver(schema),
    defaultValues: transfer
      ? {
          fromAccountId: editingFrom ?? '',
          toAccountId: editingTo ?? '',
          amount: paiseToRupeeString(transfer.amountPaise),
          date: transfer.date,
          title: transfer.title,
          notes: transfer.notes ?? '',
        }
      : { fromAccountId: defaultFromAccountId ?? '', toAccountId: '', amount: '', date: today, title: '', notes: '' },
  });

  const fromAccountId = useWatch({ control, name: 'fromAccountId' });
  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const active = accounts.filter((a) => a.isActive || Boolean(transfer));
  // Same currency only: the API has no exchange-rate policy.
  const destinations = active.filter(
    (a) => a.id !== fromAccountId && (!fromAccount || a.currency === fromAccount.currency),
  );
  const currency = fromAccount?.currency ?? user?.currency ?? 'INR';

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const amountPaise = rupeesToPaise(values.amount)!;
    try {
      if (transfer) {
        await updateTransaction.mutateAsync({
          id: transfer.id,
          input: { amountPaise, date: values.date, title: values.title || transfer.title, notes: values.notes || null },
        });
        notify('Transfer updated');
      } else {
        await createTransfer.mutateAsync({
          fromAccountId: values.fromAccountId,
          toAccountId: values.toAccountId,
          amountPaise,
          date: values.date,
          title: values.title || undefined,
          notes: values.notes || undefined,
        });
        notify('Transfer recorded');
      }
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['fromAccountId', 'toAccountId', 'date', 'title', 'notes']));
    }
  });

  return (
    <Dialog open={open} onClose={formState.isSubmitting ? undefined : onClose} fullScreen={fullScreen} fullWidth>
      <form noValidate onSubmit={onSubmit} aria-label={transfer ? 'Edit transfer' : 'Transfer money'}>
        <DialogTitle>{transfer ? 'Edit transfer' : 'Transfer between accounts'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <DialogContentText variant="body2">
              Transfers move money between your own accounts. They don't count as income or expenses.
            </DialogContentText>
            {formError && <Alert severity="error">{formError}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormTextField
                control={control}
                name="fromAccountId"
                label="From"
                select
                disabled={Boolean(transfer)}
                helperText={
                  fromAccount ? `Balance ${formatMoney(fromAccount.currentBalancePaise, fromAccount.currency)}` : ' '
                }
              >
                {active.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </FormTextField>
              <FormTextField
                control={control}
                name="toAccountId"
                label="To"
                select
                disabled={Boolean(transfer) || !fromAccountId}
                helperText={!transfer && fromAccount ? `Only ${fromAccount.currency} accounts` : ' '}
              >
                {(transfer ? active : destinations).map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </FormTextField>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
            <FormTextField control={control} name="title" label="Title (optional)" placeholder="e.g. ATM withdrawal" />
            <FormTextField control={control} name="notes" label="Notes (optional)" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={formState.isSubmitting}>
            {transfer ? 'Save changes' : 'Transfer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
