# personnel-fm

The MyFinance web app: a frontend for personal monthly finance management, built with React 19, TypeScript, Vite and Material UI.

It talks to the [personnel-fm-be](../personnel-fm-be) API.

## Getting started

```bash
cp .env.example .env   # VITE_API_BASE_URL points at the API (default http://localhost:4000/api/v1)
npm install
npm run dev            # http://localhost:5173
```

The API must be running and its `CORS_ORIGINS` must include `http://localhost:5173`.

## Scripts

| Script                                    | Purpose                                               |
| ----------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                             | Start the Vite dev server                             |
| `npm run build` / `npm run preview`       | Type-check and build to `dist/`, then serve the build |
| `npm test`                                | Run the Jest + React Testing Library suite            |
| `npm run test:coverage`                   | Run the tests with a coverage report                  |
| `npm run lint` / `npm run typecheck`      | Run ESLint / the TypeScript checks (app and tests)    |
| `npm run format` / `npm run format:check` | Format with Prettier / check formatting               |

## Structure

```
src/
  app/          bootstrap: providers, theme, query client, routes
  components/   shared UI (layout, error and not-found pages)
  features/     one folder per feature (auth, dashboard, accounts, ...)
  hooks/        shared React Query hooks
  services/     Axios API client and per-resource API functions
  contexts/     React Context for global client state (e.g. auth)
  types/        shared TypeScript types, mirroring the API envelopes
  utils/        money (paise) and date helpers
  test/         test render helpers and mocks
```

## Conventions

- **Data fetching:** server state comes from TanStack React Query. Context is used only for client state such as the auth session.
- **Auth:** auth is cookie-based (HttpOnly). The Axios client sends `withCredentials`, and tokens are never stored in `localStorage`.
- **Money:** amounts arrive as integer **paise**. Use `utils/money.ts` to parse input and format output, never ad-hoc float maths.
- **Environment:** `import.meta.env` is read only in `config/env.ts`, which Jest swaps for a stub.
