import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation } from 'react-router';
import { FormPasswordField, FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../contexts/auth';
import { applyServerErrors } from '../../utils/formErrors';
import { AuthLayout } from './AuthLayout';
import { loginSchema, type LoginValues } from './schemas';

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // PublicOnlyRoute performs the redirect once the user is set.
  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email', 'password']));
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your finances."
      footer={
        <>
          New to MyFinance?{' '}
          <Link component={RouterLink} to="/register" state={location.state}>
            Create an account
          </Link>
        </>
      }
    >
      <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Log in">
        {formError && <Alert severity="error">{formError}</Alert>}
        <FormTextField control={control} name="email" label="Email" type="email" autoComplete="email" autoFocus />
        <FormPasswordField control={control} name="password" label="Password" autoComplete="current-password" />
        <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ alignSelf: 'flex-end' }}>
          Forgot password?
        </Link>
        <Button type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
          Log in
        </Button>
      </Stack>
    </AuthLayout>
  );
}
