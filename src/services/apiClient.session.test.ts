import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { apiClient, onSessionExpired, resetApiClientState } from './apiClient';

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data: unknown };

/** Replaces the HTTP layer with a scripted fake and records every request. */
function fakeServer(handler: Handler) {
  const calls: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    const { status, data } = handler(config);
    const response: AxiosResponse = { status, data, statusText: '', headers: {}, config };
    if (status >= 400) throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
    return response;
  };
  apiClient.defaults.adapter = adapter;
  return calls;
}

const ok = (data: unknown) => ({ status: 200, data: { success: true, data } });
const fail = (status: number, code: string) => ({ status, data: { success: false, error: { code, message: code } } });

beforeEach(() => resetApiClientState());

describe('CSRF handling', () => {
  it('fetches a CSRF token once and sends it on mutations only', async () => {
    const calls = fakeServer((config) => (config.url === '/auth/csrf' ? ok({ csrfToken: 'tok-1' }) : ok({})));

    await apiClient.get('/accounts');
    await apiClient.post('/accounts', {});
    await apiClient.patch('/accounts/1', {});

    const urls = calls.map((c) => `${c.method} ${c.url}`);
    expect(urls).toEqual(['get /accounts', 'get /auth/csrf', 'post /accounts', 'patch /accounts/1']);
    expect(new AxiosHeaders(calls[0]!.headers).get('X-CSRF-Token')).toBeUndefined();
    expect(new AxiosHeaders(calls[2]!.headers).get('X-CSRF-Token')).toBe('tok-1');
    expect(new AxiosHeaders(calls[3]!.headers).get('X-CSRF-Token')).toBe('tok-1');
  });

  it('refetches the token and retries once when the server rejects it', async () => {
    let issued = 0;
    const calls = fakeServer((config) => {
      if (config.url === '/auth/csrf') return ok({ csrfToken: `tok-${++issued}` });
      return new AxiosHeaders(config.headers).get('X-CSRF-Token') === 'tok-2' ? ok({}) : fail(403, 'CSRF_INVALID');
    });

    await apiClient.post('/accounts', {});

    expect(calls.filter((c) => c.url === '/auth/csrf')).toHaveLength(2);
  });
});

describe('session refresh', () => {
  it('refreshes once on 401 and replays the original request', async () => {
    let refreshed = false;
    const calls = fakeServer((config) => {
      if (config.url === '/auth/csrf') return ok({ csrfToken: 't' });
      if (config.url === '/auth/refresh') {
        refreshed = true;
        return ok({});
      }
      return refreshed ? ok({ items: [] }) : fail(401, 'UNAUTHORIZED');
    });

    const res = await apiClient.get('/accounts');

    expect(res.data.data).toEqual({ items: [] });
    expect(calls.map((c) => c.url)).toEqual(['/accounts', '/auth/csrf', '/auth/refresh', '/accounts']);
  });

  it('shares one refresh between concurrent 401s', async () => {
    let refreshed = false;
    const calls = fakeServer((config) => {
      if (config.url === '/auth/csrf') return ok({ csrfToken: 't' });
      if (config.url === '/auth/refresh') {
        refreshed = true;
        return ok({});
      }
      return refreshed ? ok({}) : fail(401, 'UNAUTHORIZED');
    });

    await Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')]);

    expect(calls.filter((c) => c.url === '/auth/refresh')).toHaveLength(1);
  });

  it('notifies listeners when the session cannot be refreshed', async () => {
    fakeServer((config) => (config.url === '/auth/csrf' ? ok({ csrfToken: 't' }) : fail(401, 'UNAUTHORIZED')));
    const listener = jest.fn();
    const unsubscribe = onSessionExpired(listener);

    await expect(apiClient.get('/accounts')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('does not try to refresh after a failed login', async () => {
    const calls = fakeServer((config) =>
      config.url === '/auth/csrf' ? ok({ csrfToken: 't' }) : fail(401, 'UNAUTHORIZED'),
    );

    await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({ status: 401 });
    expect(calls.some((c) => c.url === '/auth/refresh')).toBe(false);
  });
});
