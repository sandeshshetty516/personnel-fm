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
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../contexts/auth';
import { useNotify } from '../../contexts/notifications';
import { ACCOUNT_TYPES, type Account, type AccountInput } from '../../types/account';
import { SUPPORTED_CURRENCIES } from '../../types/user';
import { applyServerErrors } from '../../utils/formErrors';
import { currencySymbol, paiseToRupeeString, rupeesToPaise } from '../../utils/money';
import { useCreateAccount, useUpdateAccount } from './accountsApi';
import { ACCOUNT_TYPE_META, isLiability } from './accountTypes';
import { accountFormSchema, type AccountFormValues } from './schemas';

function toFormValues(account: Account | null, defaultCurrency: AccountFormValues['currency']): AccountFormValues {
  if (!account) {
    return {
      name: '',
      accountType: 'SAVINGS',
      openingBalance: '',
      currency: defaultCurrency,
      institution: '',
      lastFourDigits: '',
    };
  }
  const shown = isLiability(account.accountType) ? -account.openingBalancePaise : account.openingBalancePaise;
  return {
    name: account.name,
    accountType: account.accountType,
    openingBalance: paiseToRupeeString(shown),
    currency: account.currency,
    institution: account.institution ?? '',
    lastFourDigits: account.lastFourDigits ?? '',
  };
}

function toInput(values: AccountFormValues): AccountInput {
  const entered = values.openingBalance === '' ? 0 : rupeesToPaise(values.openingBalance, { allowNegative: true })!;
  return {
    name: values.name,
    accountType: values.accountType,
    // An amount owed on a credit card is stored as a negative balance.
    openingBalancePaise: isLiability(values.accountType) ? -entered : entered,
    currency: values.currency,
    institution: values.institution || null,
    lastFourDigits: values.lastFourDigits || null,
  };
}

/** The parent remounts this dialog (new key) each time it opens, so the form always starts fresh. */
interface AccountFormDialogProps {
  open: boolean;
  /** The account to edit, or null to create one. */
  account: Account | null;
  onClose: () => void;
}

export function AccountFormDialog({ open, account, onClose }: AccountFormDialogProps) {
  const { user } = useAuth();
  const notify = useNotify();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const [formError, setFormError] = useState<string | null>(null);
  const defaultCurrency = user?.currency ?? 'INR';

  const { control, handleSubmit, setError, formState } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: toFormValues(account, defaultCurrency),
  });

  const accountType = useWatch({ control, name: 'accountType' });
  const currency = useWatch({ control, name: 'currency' });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const input = toInput(values);
      if (account) {
        await updateAccount.mutateAsync({ id: account.id, input });
        notify('Account updated');
      } else {
        await createAccount.mutateAsync(input);
        notify('Account created');
      }
      onClose();
    } catch (error) {
      setFormError(
        applyServerErrors(error, setError, ['name', 'accountType', 'currency', 'institution', 'lastFourDigits']),
      );
    }
  });

  return (
    <Dialog open={open} onClose={formState.isSubmitting ? undefined : onClose} fullScreen={fullScreen} fullWidth>
      <form noValidate onSubmit={onSubmit} aria-label={account ? 'Edit account' : 'Add account'}>
        <DialogTitle>{account ? 'Edit account' : 'Add account'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormTextField
              control={control}
              name="name"
              label="Account name"
              autoFocus
              placeholder="e.g. HDFC Savings"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormTextField control={control} name="accountType" label="Type" select>
                {ACCOUNT_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {ACCOUNT_TYPE_META[type].label}
                  </MenuItem>
                ))}
              </FormTextField>
              <FormTextField control={control} name="currency" label="Currency" select>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </FormTextField>
            </Stack>
            <FormTextField
              control={control}
              name="openingBalance"
              label={isLiability(accountType) ? 'Amount currently owed' : 'Opening balance'}
              placeholder="0.00"
              helperText={
                isLiability(accountType)
                  ? 'Outstanding card balance when you start tracking'
                  : 'Balance when you start tracking this account'
              }
              slotProps={{
                htmlInput: { inputMode: 'decimal' },
                input: { startAdornment: <InputAdornment position="start">{currencySymbol(currency)}</InputAdornment> },
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormTextField control={control} name="institution" label="Bank or provider (optional)" />
              <FormTextField
                control={control}
                name="lastFourDigits"
                label="Last 4 digits (optional)"
                helperText="Never enter a full account or card number"
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={formState.isSubmitting}>
            {account ? 'Save changes' : 'Add account'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
