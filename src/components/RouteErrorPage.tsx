import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useRouteError } from 'react-router';

/** Catches render/loader errors anywhere in the route tree. */
export function RouteErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

  return (
    <Stack spacing={2} sx={{ maxWidth: 480, mx: 'auto', py: 8 }}>
      <Alert severity="error">{message}</Alert>
      <Button variant="outlined" onClick={() => window.location.assign('/')}>
        Reload the app
      </Button>
    </Stack>
  );
}
