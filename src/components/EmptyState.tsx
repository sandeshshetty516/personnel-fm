import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      spacing={1.5}
      sx={{
        alignItems: 'center',
        textAlign: 'center',
        py: 6,
        px: 2,
        border: 1,
        borderStyle: 'dashed',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {icon}
      <Typography variant="h6" component="p">
        {title}
      </Typography>
      {description && <Typography color="text.secondary">{description}</Typography>}
      {action}
    </Stack>
  );
}
