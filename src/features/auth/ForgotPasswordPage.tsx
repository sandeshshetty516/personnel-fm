import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router';
import { FormTextField } from '../../components/form/FormTextField';
import { applyServerErrors } from '../../utils/formErrors';
import { requestPasswordReset } from './authApi';
import { AuthLayout } from './AuthLayout';
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas';

export function ForgotPasswordPage() {
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      setSentMessage(await requestPasswordReset(values));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email']));
    }
  });

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a reset link."
      footer={
        <Link component={RouterLink} to="/login">
          Back to log in
        </Link>
      }
    >
      {sentMessage ? (
        <Alert severity="success">{sentMessage}</Alert>
      ) : (
        <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Request password reset">
          {formError && <Alert severity="error">{formError}</Alert>}
          <FormTextField control={control} name="email" label="Email" type="email" autoComplete="email" autoFocus />
          <Button type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
            Send reset link
          </Button>
        </Stack>
      )}
    </AuthLayout>
  );
}
