import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { ApiError, toApiError } from './apiClient';

function axiosErrorWith(status: number, data: unknown) {
  const response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', response.config, null, response);
}

describe('toApiError', () => {
  it('maps the backend error envelope', () => {
    const err = toApiError(
      axiosErrorWith(409, { success: false, error: { code: 'CONFLICT', message: 'Email already registered' } }),
    );

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'CONFLICT', message: 'Email already registered' });
  });

  it('reports network failures distinctly', () => {
    const err = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));

    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('falls back for non-envelope HTTP errors', () => {
    expect(toApiError(axiosErrorWith(502, '<html>Bad gateway</html>'))).toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
    });
  });
});
