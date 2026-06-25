import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// During local dev, requests to /api are proxied to the backend so the SPA and
// API share an origin (which keeps the auth cookie first-party).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
