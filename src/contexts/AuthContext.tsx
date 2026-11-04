import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import * as authApi from '../features/auth/authApi';
import { onSessionExpired } from '../services/apiClient';
import type { User } from '../types/user';
import { AuthContext, currentUserQueryKey, type AuthContextValue, type AuthStatus } from './auth';

/**
 * The session itself lives in HttpOnly cookies; this context only exposes who is signed in.
 * The current user is server state, so it is cached with React Query and restored on reload via GET /auth/me (FR-004).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isPending } = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: authApi.fetchCurrentUser,
    staleTime: Infinity,
    retry: false,
  });

  const setUser = useCallback(
    (next: User | null) => queryClient.setQueryData(currentUserQueryKey, next),
    [queryClient],
  );

  // Drop every cached query on sign-out so the next user never sees the previous user's data.
  const clearSession = useCallback(() => {
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== currentUserQueryKey[0] });
    setUser(null);
  }, [queryClient, setUser]);

  useEffect(() => onSessionExpired(clearSession), [clearSession]);

  let status: AuthStatus = user ? 'authenticated' : 'unauthenticated';
  if (isPending) status = 'loading';

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      status,
      login: async (values) => {
        const loggedIn = await authApi.login(values);
        setUser(loggedIn);
        return loggedIn;
      },
      register: async (values) => {
        const created = await authApi.register(values);
        setUser(created);
        return created;
      },
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          clearSession();
        }
      },
      setUser,
    }),
    [user, status, setUser, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
