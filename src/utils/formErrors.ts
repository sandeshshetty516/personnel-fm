import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../services/apiClient';

/**
 * Shows server validation errors next to the matching form fields.
 * Returns the message to display at form level (for errors not tied to a known field).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';

  let unmatched = false;
  if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    for (const detail of error.details as { path?: string; message?: string }[]) {
      const field = knownFields.find((f) => f === detail.path);
      if (field && detail.message) setError(field, { type: 'server', message: detail.message });
      else unmatched = true;
    }
    return unmatched ? error.message : null;
  }
  return error.message;
}
