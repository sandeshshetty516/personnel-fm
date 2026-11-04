// The only module that reads import.meta.env, so Jest can replace it (see jest.config.cjs).
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
};
