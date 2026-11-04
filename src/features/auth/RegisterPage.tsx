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
import { registerSchema, type RegisterValues } from './schemas';

export function RegisterPage() {
  const { register } = useAuth();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await register(values);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['fullName', 'email', 'password']));
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking income, expenses and budgets."
      footer={
        <>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" state={location.state}>
            Log in
          </Link>
        </>
      }
    >
      <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Create account">
        {formError && <Alert severity="error">{formError}</Alert>}
        <FormTextField control={control} name="fullName" label="Full name" autoComplete="name" autoFocus />
        <FormTextField control={control} name="email" label="Email" type="email" autoComplete="email" />
        <FormPasswordField
          control={control}
          name="password"
          label="Password"
          autoComplete="new-password"
          helperText="At least 8 characters, with a letter and a number"
        />
        <FormPasswordField
          control={control}
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
        />
        <Button type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
          Create account
        </Button>
      </Stack>
    </AuthLayout>
  );
}
