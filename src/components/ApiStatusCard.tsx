import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useApiHealth } from '../hooks/useApiHealth';

export function ApiStatusCard() {
  const { data, error, isPending } = useApiHealth();

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          System status
        </Typography>
        {isPending && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Checking API…</Typography>
          </Stack>
        )}
        {error && <Alert severity="error">{error.message}</Alert>}
        {data && (
          <Stack direction="row" spacing={1}>
            <Chip label={`API: ${data.status}`} color={data.status === 'ok' ? 'success' : 'warning'} size="small" />
            <Chip
              label={`Database: ${data.database}`}
              color={data.database === 'connected' ? 'success' : 'error'}
              size="small"
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
