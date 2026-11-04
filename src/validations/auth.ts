import { z } from 'zod';

// Mirrors the API's rules (personnel-fm-be users.schemas.ts) for instant feedback; the server stays authoritative.
export const emailField = z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email address'));

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password is too long')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Password must contain a letter and a number');

export const fullNameField = z
  .string()
  .trim()
  .min(2, 'Full name must be at least 2 characters')
  .max(100, 'Full name is too long');

export const confirmPasswordField = z.string().min(1, 'Confirm your password');

/** Refinement options for a confirmPassword field that must match the password. */
export const passwordsMustMatch = { message: 'Passwords do not match', path: ['confirmPassword'] };
