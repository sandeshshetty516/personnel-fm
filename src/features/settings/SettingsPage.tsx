import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { ApiStatusCard } from '../../components/ApiStatusCard';
import { useAuth } from '../../contexts/auth';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ProfileForm } from './ProfileForm';

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  if (!user) return null; // ProtectedRoute guarantees a user; this only narrows the type.

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Typography variant="h4" component="h1">
        Settings
      </Typography>
      <Section title="Profile and preferences" description="Your name, currency, financial month and notifications.">
        <ProfileForm user={user} />
      </Section>
      <Section title="Password" description="Changing your password signs you out on other devices.">
        <ChangePasswordForm />
      </Section>
      <ApiStatusCard />
    </Stack>
  );
}
