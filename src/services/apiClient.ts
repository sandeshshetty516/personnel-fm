import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import type { ApiErrorBody, ApiSuccess } from '../types/api';

/** Normalised error thrown by every API call, so UI code never inspects Axios internals. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    if (!error.response) return new ApiError('Unable to reach the server. Check your connection.', 0, 'NETWORK_ERROR');
    const body = error.response.data as ApiErrorBody | undefined;
    if (body?.success === false) {
      return new ApiError(body.error.message, error.response.status, body.error.code, body.error.details);
    }
    return new ApiError(error.message, error.response.status, 'HTTP_ERROR');
  }
  return new ApiError('Something went wrong', 0, 'UNKNOWN_ERROR');
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  // Auth uses HttpOnly cookies, which the browser only sends cross-origin with credentials.
  withCredentials: true,
  timeout: 15_000,
});

// ---- CSRF (double-submit) ----
// The token lives in memory only; the API returns it from GET /auth/csrf and checks it on every mutation.

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

function fetchCsrfToken(): Promise<string> {
  csrfRequest ??= apiClient
    .get<ApiSuccess<{ csrfToken: string }>>('/auth/csrf')
    .then((res) => {
      csrfToken = res.data.data.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

apiClient.interceptors.request.use(async (config) => {
  if (UNSAFE_METHODS.has((config.method ?? 'get').toLowerCase())) {
    config.headers.set('X-CSRF-Token', csrfToken ?? (await fetchCsrfToken()));
  }
  return config;
});

// ---- Session refresh ----
// Access tokens are short-lived. On a 401, refresh once (shared by concurrent requests) and replay the request.

type RetryableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean; _authRetried?: boolean };

// Endpoints where a 401 is the real answer (bad credentials, or the refresh itself failing).
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/reset-password'];

let refreshRequest: Promise<void> | null = null;
const sessionExpiredListeners = new Set<() => void>();

/** Notified when the session cannot be refreshed, so the app can return to the login screen. */
export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function refreshSession(): Promise<void> {
  refreshRequest ??= apiClient
    .post('/auth/refresh', undefined, { _authRetried: true } as RetryableConfig)
    .then(() => undefined)
    .finally(() => {
      refreshRequest = null;
    });
  return refreshRequest;
}

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  const apiError = toApiError(error);
  const config = (error instanceof AxiosError ? error.config : undefined) as RetryableConfig | undefined;
  if (!config) throw apiError;

  // The CSRF cookie may have been rotated or cleared (e.g. after logout); fetch a fresh token once.
  if (apiError.status === 403 && apiError.code === 'CSRF_INVALID' && !config._csrfRetried) {
    csrfToken = null;
    config._csrfRetried = true;
    return apiClient(config);
  }

  const path = config.url ?? '';
  if (apiError.status === 401 && !config._authRetried && !NO_REFRESH_PATHS.some((p) => path.endsWith(p))) {
    config._authRetried = true;
    try {
      await refreshSession();
    } catch {
      sessionExpiredListeners.forEach((listener) => listener());
      throw apiError;
    }
    return apiClient(config);
  }

  throw apiError;
});

/** Test helper: forget cached CSRF state between tests. */
export function resetApiClientState() {
  csrfToken = null;
  csrfRequest = null;
  refreshRequest = null;
}

/** Unwraps the backend's `{ success, data }` envelope. */
export function unwrap<T>(body: ApiSuccess<T>): T {
  return body.data;
}
