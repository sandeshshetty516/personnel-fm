import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../contexts/auth';
import { FullPageLoader } from './FullPageLoader';

export interface RedirectState {
  from?: string;
}

/** Renders child routes only for signed-in users; others go to /login and come back afterwards. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader label="Restoring your session" />;
  if (status === 'unauthenticated') {
    const state: RedirectState = { from: `${location.pathname}${location.search}` };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}

/** Login/register pages: signed-in users are sent to where they were going (or the dashboard). */
export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader label="Restoring your session" />;
  if (status === 'authenticated') {
    const from = (location.state as RedirectState | null)?.from;
    return <Navigate to={from?.startsWith('/') && !from.startsWith('//') ? from : '/'} replace />;
  }
  return <Outlet />;
}
