import { ApiError, apiClient, unwrap } from '../../services/apiClient';
import type { ApiSuccess } from '../../types/api';
import type { User } from '../../types/user';
import type { ForgotPasswordValues, LoginValues, RegisterValues, ResetPasswordValues } from './schemas';

type UserResponse = ApiSuccess<{ user: User }>;
type MessageResponse = ApiSuccess<{ message: string }>;

/** Returns the signed-in user, or null when there is no valid session (used to restore sessions on reload). */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await apiClient.get<UserResponse>('/auth/me');
    return unwrap(res.data).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function login(values: LoginValues): Promise<User> {
  const res = await apiClient.post<UserResponse>('/auth/login', values);
  return unwrap(res.data).user;
}

export async function register({ fullName, email, password }: RegisterValues): Promise<User> {
  const res = await apiClient.post<UserResponse>('/auth/register', { fullName, email, password });
  return unwrap(res.data).user;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function requestPasswordReset(values: ForgotPasswordValues): Promise<string> {
  const res = await apiClient.post<MessageResponse>('/auth/forgot-password', values);
  return unwrap(res.data).message;
}

export async function resetPassword(token: string, { password }: ResetPasswordValues): Promise<string> {
  const res = await apiClient.post<MessageResponse>('/auth/reset-password', { token, password });
  return unwrap(res.data).message;
}
