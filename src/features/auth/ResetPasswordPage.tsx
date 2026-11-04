import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { FormPasswordField } from '../../components/form/FormTextField';
import { currentUserQueryKey } from '../../contexts/auth';
import { applyServerErrors } from '../../utils/formErrors';
import { resetPassword } from './authApi';
import { AuthLayout } from './AuthLayout';
import { resetPasswordSchema, type ResetPasswordValues } from './schemas';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const queryClient = useQueryClient();
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return;
    setFormError(null);
    try {
      setDoneMessage(await resetPassword(token, values));
      // The API signed out every session, including this browser's.
      queryClient.setQueryData(currentUserQueryKey, null);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['password']));
    }
  });

  const backToLogin = (
    <Link component={RouterLink} to="/login">
      Back to log in
    </Link>
  );

  if (!token) {
    return (
      <AuthLayout title="Reset link invalid" footer={backToLogin}>
        <Alert severity="error">This reset link is missing its token. Request a new one from the login page.</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" footer={backToLogin}>
      {doneMessage ? (
        <Stack spacing={2}>
          <Alert severity="success">{doneMessage}</Alert>
          <Button component={RouterLink} to="/login" variant="contained">
            Log in
          </Button>
        </Stack>
      ) : (
        <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Reset password">
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormPasswordField
            control={control}
            name="password"
            label="New password"
            autoComplete="new-password"
            helperText="At least 8 characters, with a letter and a number"
            autoFocus
          />
          <FormPasswordField
            control={control}
            name="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
          />
          <Button type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
            Reset password
          </Button>
        </Stack>
      )}
    </AuthLayout>
  );
}
