import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { useState } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

type FormTextFieldProps<T extends FieldValues> = Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'error'> & {
  name: FieldPath<T>;
  control: Control<T>;
};

/** MUI TextField bound to React Hook Form, with field-level error text and aria wiring. */
export function FormTextField<T extends FieldValues>({ name, control, helperText, ...props }: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          {...field}
          value={field.value ?? ''}
          inputRef={field.ref}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth
        />
      )}
    />
  );
}

/** Password input with a show/hide toggle. */
export function FormPasswordField<T extends FieldValues>(props: FormTextFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  return (
    <FormTextField
      {...props}
      type={visible ? 'text' : 'password'}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible((v) => !v)}
                edge="end"
              >
                {visible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
