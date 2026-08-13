import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the Quirofísicos Rocha React frontend.
// In dev, /api requests are proxied to the Express backend on port 3001
// (see ../server.js). In production the built assets are served by the
// same Express server, so requests to /api are same-origin and need no proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
