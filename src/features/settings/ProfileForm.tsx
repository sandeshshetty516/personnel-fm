import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../contexts/auth';
import { SUPPORTED_CURRENCIES, type NotificationPreferences, type User } from '../../types/user';
import { applyServerErrors } from '../../utils/formErrors';
import { profileSchema, type ProfileValues } from './schemas';
import { updateProfile } from './settingsApi';

const NOTIFICATION_LABELS: Record<keyof NotificationPreferences, string> = {
  budgetAlerts: 'Budget threshold alerts',
  emiReminders: 'EMI reminders',
  recurringReminders: 'Recurring payment reminders',
  goalMilestones: 'Savings goal milestones',
};

const MONTH_START_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

function listTimezones(current: string): string[] {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return zones.includes(current) ? zones : [current, ...zones];
}

function toFormValues(user: User): ProfileValues {
  return {
    fullName: user.fullName,
    currency: user.currency,
    monthStartDay: user.monthStartDay,
    timezone: user.timezone,
    preferences: { notifications: { ...user.preferences.notifications } },
  };
}

export function ProfileForm({ user }: { user: User }) {
  const { setUser } = useAuth();
  const [status, setStatus] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const timezones = useMemo(() => listTimezones(user.timezone), [user.timezone]);
  const { control, handleSubmit, setError, reset, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(user),
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus(null);
    try {
      const updated = await updateProfile(values);
      setUser(updated);
      reset(toFormValues(updated));
      setStatus({ severity: 'success', message: 'Profile saved.' });
    } catch (error) {
      const message = applyServerErrors(error, setError, ['fullName', 'currency', 'monthStartDay', 'timezone']);
      if (message) setStatus({ severity: 'error', message });
    }
  });

  return (
    <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Profile">
      {status && <Alert severity={status.severity}>{status.message}</Alert>}
      <FormTextField control={control} name="fullName" label="Full name" autoComplete="name" />
      <TextField label="Email" value={user.email} disabled fullWidth helperText="Email cannot be changed" />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormTextField control={control} name="currency" label="Currency" select>
          {SUPPORTED_CURRENCIES.map((code) => (
            <MenuItem key={code} value={code}>
              {code}
            </MenuItem>
          ))}
        </FormTextField>
        <Controller
          name="monthStartDay"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              onChange={(event) => field.onChange(Number(event.target.value))}
              select
              fullWidth
              label="Financial month starts on day"
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? 'Used for monthly budgets and reports'}
            >
              {MONTH_START_DAYS.map((day) => (
                <MenuItem key={day} value={day}>
                  {day}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Stack>

      <Controller
        name="timezone"
        control={control}
        render={({ field, fieldState }) => (
          <Autocomplete
            options={timezones}
            value={field.value}
            onChange={(_event, value) => field.onChange(value ?? '')}
            disableClearable
            renderInput={(params) => (
              <TextField
                {...params}
                label="Time zone"
                inputRef={field.ref}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? 'Decides which day a transaction falls on'}
              />
            )}
          />
        )}
      />

      <FormGroup>
        <FormLabel component="legend" sx={{ mb: 1 }}>
          In-app notifications
        </FormLabel>
        {(Object.keys(NOTIFICATION_LABELS) as (keyof NotificationPreferences)[]).map((key) => (
          <Controller
            key={key}
            name={`preferences.notifications.${key}`}
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label={NOTIFICATION_LABELS[key]}
              />
            )}
          />
        ))}
      </FormGroup>

      <Button
        type="submit"
        variant="contained"
        loading={formState.isSubmitting}
        disabled={!formState.isDirty}
        sx={{ alignSelf: 'flex-start' }}
      >
        Save changes
      </Button>
    </Stack>
  );
}
