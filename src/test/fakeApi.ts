import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { apiClient, resetApiClientState } from '../services/apiClient';
import { makeUser } from './renderWithProviders';

export interface FakeRequest {
  method: string;
  url: string;
  params: Record<string, string>;
  body: unknown;
}

type Reply = { status: number; body: unknown };
type Handler = (req: FakeRequest) => Reply | Promise<Reply>;

export const ok = (data: unknown, status = 200, meta?: unknown): Reply => ({
  status,
  body: { success: true, data, ...(meta ? { meta } : {}) },
});
export const fail = (status: number, code: string, message: string, details?: unknown): Reply => ({
  status,
  body: { success: false, error: { code, message, details } },
});

/**
 * Replaces the HTTP layer of the real API client, so tests exercise the actual React Query hooks,
 * request building and error mapping. Routes are matched on "METHOD /path"; a signed-in user is
 * provided for /auth/me and CSRF is answered automatically.
 */
export function installFakeApi(routes: Record<string, Handler>) {
  const requests: FakeRequest[] = [];
  resetApiClientState();

  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toUpperCase();
    const url = config.url ?? '';
    const req: FakeRequest = {
      method,
      url,
      params: (config.params as Record<string, string>) ?? {},
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    };
    requests.push(req);

    const defaults: Record<string, Handler> = {
      'GET /auth/csrf': () => ok({ csrfToken: 'test-csrf' }),
      'GET /auth/me': () => ok({ user: makeUser() }),
      'GET /health': () => ok({ status: 'ok', database: 'connected', uptimeSeconds: 1, timestamp: '' }),
      // An empty, signed-in user, so pages that load these lists render without per-test setup.
      'GET /accounts': () => ok({ accounts: [] }),
      'GET /categories': () => ok({ categories: [] }),
      'GET /dashboard/summary': () => ok(EMPTY_SUMMARY),
      'GET /dashboard/cash-flow': () => ok({ buckets: [] }),
      'GET /dashboard/savings-trend': () => ok({ buckets: [] }),
      'GET /dashboard/category-breakdown': () => ok({ totalPaise: 0, categories: [] }),
      'GET /dashboard/recent-transactions': () => ok({ transactions: [] }),
      'GET /budgets': () => ok({ budgets: [] }),
      'GET /savings-goals': () => ok({ goals: [] }),
    };
    const key = `${method} ${url}`;
    const handler =
      routes[key] ??
      defaults[key] ??
      Object.entries(routes).find(([pattern]) => matches(pattern, key))?.[1] ??
      (() => fail(404, 'NOT_FOUND', `No fake route for ${key}`));

    const { status, body } = await handler(req);
    const response: AxiosResponse = { status, data: body, statusText: '', headers: {}, config };
    if (status >= 400) throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
    return response;
  };

  return { requests };
}

const EMPTY_SUMMARY = {
  period: { from: '', to: '', currency: 'INR' },
  availableCurrencies: [],
  incomePaise: 0,
  expensePaise: 0,
  netPaise: 0,
  savingsRatePercent: null,
  totalBalancePaise: 0,
  activeAccountCount: 0,
  transactionCount: 0,
};

/** "PATCH /accounts/:id" matches "PATCH /accounts/abc". */
function matches(pattern: string, key: string) {
  const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, '[^/]+')}$`);
  return regex.test(key);
}
