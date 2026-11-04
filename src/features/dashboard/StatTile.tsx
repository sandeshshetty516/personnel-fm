import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value?: string | null;
  /** Secondary line under the value, e.g. what it is measured against. */
  caption?: ReactNode;
  loading?: boolean;
}

/** A headline number (dataviz stat tile): sentence-case label, value in text ink, optional caption. */
export function StatTile({ label, value, caption, loading }: StatTileProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width="70%" sx={{ fontSize: '2rem' }} />
        ) : (
          <Typography
            variant="h5"
            component="p"
            sx={{ fontWeight: 600, mt: 0.5, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}
            noWrap
          >
            {value ?? '—'}
          </Typography>
        )}
        {caption && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            {caption}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
