import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Must match CORS_ORIGINS in personnel-fm-be/.env.
  server: { port: 5173, strictPort: true },
});
