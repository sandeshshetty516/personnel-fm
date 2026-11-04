import { z } from 'zod';
import {
  confirmPasswordField,
  emailField,
  fullNameField,
  passwordField,
  passwordsMustMatch,
} from '../../validations/auth';

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((values) => values.password === values.confirmPassword, passwordsMustMatch);

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({ password: passwordField, confirmPassword: confirmPasswordField })
  .refine((values) => values.password === values.confirmPassword, passwordsMustMatch);

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
