import { zodResolver } from '@hookform/resolvers/zod';
import Add from '@mui/icons-material/Add';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import type { Budget, BudgetInput } from '../../types/budget';
import type { Category } from '../../types/category';
import { SUPPORTED_CURRENCIES } from '../../types/user';
import { todayIn } from '../../utils/date';
import { applyServerErrors } from '../../utils/formErrors';
import { currencySymbol, paiseToRupeeString, rupeesToPaise } from '../../utils/money';
import { amountField } from '../transactions/schemas';
import { useCreateBudget, useUpdateBudget } from './budgetsApi';

const MONTH = /^\d{4}-\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const schema = z
  .object({
    name: z.string().trim().min(1, 'Budget name is required').max(60, 'Keep the name under 60 characters'),
    period: z.enum(['MONTHLY', 'CUSTOM']),
    currency: z.enum(SUPPORTED_CURRENCIES),
    amount: amountField,
    startMonth: z.string(),
    endMonth: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    limits: z.array(z.object({ categoryId: z.string().min(1, 'Choose a category'), amount: amountField })),
    thresholds: z
      .string()
      .refine((value) => parseThresholds(value) !== null, 'Use numbers from 1 to 200, e.g. 50, 80, 100'),
  })
  .superRefine((v, ctx) => {
    if (v.period === 'MONTHLY') {
      if (!MONTH.test(v.startMonth))
        ctx.addIssue({ code: 'custom', message: 'Choose a start month', path: ['startMonth'] });
      if (v.endMonth && v.endMonth < v.startMonth) {
        ctx.addIssue({ code: 'custom', message: 'End month must not be before the start', path: ['endMonth'] });
      }
    } else {
      if (!DATE.test(v.startDate))
        ctx.addIssue({ code: 'custom', message: 'Choose a start date', path: ['startDate'] });
      if (!DATE.test(v.endDate)) ctx.addIssue({ code: 'custom', message: 'Choose an end date', path: ['endDate'] });
      else if (v.endDate < v.startDate) {
        ctx.addIssue({ code: 'custom', message: 'End date must be on or after the start', path: ['endDate'] });
      }
    }
    const ids = v.limits.map((l) => l.categoryId).filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'Each category can only have one limit', path: ['limits'] });
    }
  });

type Values = z.infer<typeof schema>;

function parseThresholds(value: string): number[] | null {
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const numbers = parts.map(Number);
  if (numbers.length > 5 || numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 200)) return null;
  return numbers;
}

function lastDayOfMonth(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function toFormValues(budget: Budget | null, currency: Values['currency'], today: string): Values {
  if (!budget) {
    return {
      name: '',
      period: 'MONTHLY',
      currency,
      amount: '',
      startMonth: today.slice(0, 7),
      endMonth: '',
      startDate: today,
      endDate: '',
      limits: [],
      thresholds: '50, 80, 100',
    };
  }
  return {
    name: budget.name,
    period: budget.period,
    currency: budget.currency as Values['currency'],
    amount: paiseToRupeeString(budget.amountPaise),
    startMonth: budget.startDate.slice(0, 7),
    endMonth: budget.endDate?.slice(0, 7) ?? '',
    startDate: budget.startDate,
    endDate: budget.endDate ?? '',
    limits: budget.categoryLimits.map((l) => ({ categoryId: l.categoryId, amount: paiseToRupeeString(l.amountPaise) })),
    thresholds: budget.alertThresholds.join(', '),
  };
}

function toInput(values: Values): BudgetInput {
  const monthly = values.period === 'MONTHLY';
  return {
    name: values.name,
    period: values.period,
    currency: values.currency,
    amountPaise: rupeesToPaise(values.amount)!,
    categoryLimits: values.limits.map((l) => ({ categoryId: l.categoryId, amountPaise: rupeesToPaise(l.amount)! })),
    alertThresholds: parseThresholds(values.thresholds)!,
    startDate: monthly ? `${values.startMonth}-01` : values.startDate,
    endDate: monthly ? (values.endMonth ? lastDayOfMonth(values.endMonth) : null) : values.endDate,
  };
}

/** The parent remounts this dialog (new key) each time it opens, so the form always starts fresh. */
export function BudgetFormDialog({
  open,
  budget,
  categories,
  onClose,
}: {
  open: boolean;
  budget: Budget | null;
  categories: Category[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const notify = useNotify();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(budget, user?.currency ?? 'INR', todayIn(user?.timezone)),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'limits' });
  const [period, currency, limits] = useWatch({ control, name: ['period', 'currency', 'limits'] });

  // Limits need active expense categories; keep a category this budget already uses even if archived.
  const expenseCategories = categories.filter(
    (c) => c.type === 'EXPENSE' && (!c.isArchived || budget?.categoryLimits.some((l) => l.categoryId === c.id)),
  );
  const adornment = {
    input: { startAdornment: <InputAdornment position="start">{currencySymbol(currency)}</InputAdornment> },
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const input = toInput(values);
      if (budget) {
        await updateBudget.mutateAsync({ id: budget.id, input });
        notify('Budget updated');
      } else {
        await createBudget.mutateAsync(input);
        notify('Budget created');
      }
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['name', 'period', 'currency', 'startDate', 'endDate']));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={formState.isSubmitting ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
    >
      <form noValidate onSubmit={onSubmit} aria-label={budget ? 'Edit budget' : 'Add budget'}>
        <DialogTitle>{budget ? 'Edit budget' : 'Add budget'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormTextField
              control={control}
              name="name"
              label="Budget name"
              autoFocus
              placeholder="e.g. Monthly spending"
            />

            <Controller
              name="period"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={field.value}
                  onChange={(_e, value: Values['period'] | null) => value && field.onChange(value)}
                  aria-label="Budget period"
                >
                  <ToggleButton value="MONTHLY">Every month</ToggleButton>
                  <ToggleButton value="CUSTOM">Custom dates</ToggleButton>
                </ToggleButtonGroup>
              )}
            />

            {period === 'MONTHLY' ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormTextField
                  control={control}
                  name="startMonth"
                  label="From month"
                  type="month"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <FormTextField
                  control={control}
                  name="endMonth"
                  label="Until month (optional)"
                  type="month"
                  helperText="Leave empty to repeat every month"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormTextField
                  control={control}
                  name="startDate"
                  label="Start date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <FormTextField
                  control={control}
                  name="endDate"
                  label="End date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormTextField
                control={control}
                name="amount"
                label={period === 'MONTHLY' ? 'Overall limit per month' : 'Overall limit'}
                placeholder="0.00"
                slotProps={{ htmlInput: { inputMode: 'decimal' }, ...adornment }}
              />
              <FormTextField control={control} name="currency" label="Currency" select sx={{ maxWidth: { sm: 140 } }}>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </FormTextField>
            </Stack>

            <div>
              <FormLabel>Category limits (optional)</FormLabel>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Track individual categories within the overall limit.
              </Typography>
              <Stack spacing={1.5}>
                {fields.map((field, index) => (
                  <Stack key={field.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <FormTextField
                      control={control}
                      name={`limits.${index}.categoryId`}
                      label="Category"
                      select
                      size="small"
                    >
                      {expenseCategories.map((c) => (
                        <MenuItem
                          key={c.id}
                          value={c.id}
                          disabled={limits.some((l, i) => i !== index && l.categoryId === c.id)}
                        >
                          {c.name}
                        </MenuItem>
                      ))}
                    </FormTextField>
                    <FormTextField
                      control={control}
                      name={`limits.${index}.amount`}
                      label="Limit"
                      size="small"
                      slotProps={{ htmlInput: { inputMode: 'decimal' }, ...adornment }}
                    />
                    <IconButton aria-label={`Remove limit ${index + 1}`} onClick={() => remove(index)} sx={{ mt: 0.5 }}>
                      <DeleteOutlined />
                    </IconButton>
                  </Stack>
                ))}
                {formState.errors.limits?.root?.message || formState.errors.limits?.message ? (
                  <Typography variant="caption" color="error">
                    {formState.errors.limits?.root?.message ?? formState.errors.limits?.message}
                  </Typography>
                ) : null}
                <Button
                  startIcon={<Add />}
                  onClick={() => append({ categoryId: '', amount: '' })}
                  disabled={fields.length >= expenseCategories.length}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Add category limit
                </Button>
              </Stack>
            </div>

            <FormTextField
              control={control}
              name="thresholds"
              label="Alert me at (% used)"
              helperText="Comma-separated, up to 5. Suggested: 50, 80, 100"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={formState.isSubmitting}>
            {budget ? 'Save changes' : 'Add budget'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
