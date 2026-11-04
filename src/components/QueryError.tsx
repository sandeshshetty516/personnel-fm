import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

/** Error state for a failed query, with a retry action. */
export function QueryError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      {error.message}
    </Alert>
  );
}
