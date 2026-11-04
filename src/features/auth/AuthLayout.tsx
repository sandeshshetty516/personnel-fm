import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box
      component="main"
      sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 4, bgcolor: 'background.default' }}
    >
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 420 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          <AccountBalanceWalletOutlined color="primary" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            MyFinance
          </Typography>
        </Stack>
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            <Box sx={{ mt: 3 }}>{children}</Box>
          </CardContent>
        </Card>
        {footer && (
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            {footer}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
