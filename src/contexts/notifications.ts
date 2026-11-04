import { createContext, useContext } from 'react';

export type NotificationSeverity = 'success' | 'error' | 'info' | 'warning';

export interface NotificationsContextValue {
  notify: (message: string, severity?: NotificationSeverity) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/** Shows a short-lived toast, e.g. after a successful save. */
export function useNotify() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotify must be used inside <NotificationsProvider>');
  return context.notify;
}
