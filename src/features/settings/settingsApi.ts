import { apiClient, unwrap } from '../../services/apiClient';
import type { ApiSuccess } from '../../types/api';
import type { User } from '../../types/user';
import type { ChangePasswordValues, ProfileValues } from './schemas';

export async function updateProfile(values: ProfileValues): Promise<User> {
  const res = await apiClient.patch<ApiSuccess<{ user: User }>>('/users/me', values);
  return unwrap(res.data).user;
}

export async function changePassword({ currentPassword, newPassword }: ChangePasswordValues): Promise<string> {
  const res = await apiClient.post<ApiSuccess<{ message: string }>>('/users/me/change-password', {
    currentPassword,
    newPassword,
  });
  return unwrap(res.data).message;
}
