import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormPasswordField } from '../../components/form/FormTextField';
import { applyServerErrors } from '../../utils/formErrors';
import { changePasswordSchema, type ChangePasswordValues } from './schemas';
import { changePassword } from './settingsApi';

const EMPTY: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm() {
  const [status, setStatus] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const { control, handleSubmit, setError, reset, formState } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus(null);
    try {
      const message = await changePassword(values);
      reset(EMPTY);
      setStatus({ severity: 'success', message });
    } catch (error) {
      const message = applyServerErrors(error, setError, ['currentPassword', 'newPassword']);
      if (message) setStatus({ severity: 'error', message });
    }
  });

  return (
    <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Change password">
      {status && <Alert severity={status.severity}>{status.message}</Alert>}
      <FormPasswordField
        control={control}
        name="currentPassword"
        label="Current password"
        autoComplete="current-password"
      />
      <FormPasswordField
        control={control}
        name="newPassword"
        label="New password"
        autoComplete="new-password"
        helperText="At least 8 characters, with a letter and a number"
      />
      <FormPasswordField
        control={control}
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
      />
      <Button type="submit" variant="contained" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-start' }}>
        Change password
      </Button>
    </Stack>
  );
}
