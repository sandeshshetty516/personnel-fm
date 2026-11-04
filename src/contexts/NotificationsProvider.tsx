import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { NotificationsContext, type NotificationSeverity } from './notifications';

interface Toast {
  id: number;
  message: string;
  severity: NotificationSeverity;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback((message: string, severity: NotificationSeverity = 'success') => {
    setToast({ id: Date.now(), message, severity });
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.id}
        open={open}
        autoHideDuration={4000}
        onClose={(_event, reason) => reason !== 'clickaway' && setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity ?? 'success'} variant="filled" onClose={() => setOpen(false)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </NotificationsContext.Provider>
  );
}
