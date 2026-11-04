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
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import type { SavingsGoal } from '../../types/savings';
import { SUPPORTED_CURRENCIES } from '../../types/user';
import { todayIn } from '../../utils/date';
import { applyServerErrors } from '../../utils/formErrors';
import { currencySymbol, paiseToRupeeString, rupeesToPaise } from '../../utils/money';
import { amountField } from '../transactions/schemas';
import { useCreateGoal, useUpdateGoal } from './savingsApi';

const schema = z.object({
  name: z.string().trim().min(1, 'Goal name is required').max(60, 'Keep the name under 60 characters'),
  target: amountField,
  targetDate: z.string(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters'),
});
type Values = z.infer<typeof schema>;

/** The parent remounts this dialog (new key) each time it opens. */
export function GoalFormDialog({
  open,
  goal,
  onClose,
}: {
  open: boolean;
  goal: SavingsGoal | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const notify = useNotify();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const [formError, setFormError] = useState<string | null>(null);
  const today = todayIn(user?.timezone);

  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: goal?.name ?? '',
      target: goal ? paiseToRupeeString(goal.targetAmountPaise) : '',
      targetDate: goal?.targetDate ?? '',
      currency: (goal?.currency as Values['currency']) ?? user?.currency ?? 'INR',
      notes: goal?.notes ?? '',
    },
  });
  const currency = useWatch({ control, name: 'currency' });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const input = {
      name: values.name,
      targetAmountPaise: rupeesToPaise(values.target)!,
      targetDate: values.targetDate || null,
      notes: values.notes || null,
    };
    try {
      if (goal) {
        await updateGoal.mutateAsync({ id: goal.id, input });
        notify('Goal updated');
      } else {
        await createGoal.mutateAsync({ ...input, currency: values.currency });
        notify('Goal created');
      }
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['name', 'targetDate', 'notes']));
    }
  });

  return (
    <Dialog open={open} onClose={formState.isSubmitting ? undefined : onClose} fullWidth maxWidth="xs">
      <form noValidate onSubmit={onSubmit} aria-label={goal ? 'Edit goal' : 'New savings goal'}>
        <DialogTitle>{goal ? 'Edit goal' : 'New savings goal'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormTextField
              control={control}
              name="name"
              label="Goal name"
              autoFocus
              placeholder="e.g. Emergency fund"
            />
            <Stack direction="row" spacing={2}>
              <FormTextField
                control={control}
                name="target"
                label="Target amount"
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
                name="currency"
                label="Currency"
                select
                disabled={Boolean(goal)}
                sx={{ maxWidth: 120 }}
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </FormTextField>
            </Stack>
            <FormTextField
              control={control}
              name="targetDate"
              label="Target date (optional)"
              type="date"
              helperText="We'll work out how much to set aside each month"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
            />
            <FormTextField control={control} name="notes" label="Notes (optional)" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={formState.isSubmitting}>
            {goal ? 'Save changes' : 'Create goal'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
