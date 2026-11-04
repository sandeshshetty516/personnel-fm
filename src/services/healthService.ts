import type { ApiSuccess, HealthStatus } from '../types/api';
import { apiClient, unwrap } from './apiClient';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await apiClient.get<ApiSuccess<HealthStatus>>('/health', {
    // The API answers 503 with a valid body when the database is down; show that instead of throwing.
    validateStatus: (status) => status === 200 || status === 503,
  });
  return unwrap(res.data);
}
