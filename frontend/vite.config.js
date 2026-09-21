// frontend/vite.config.js
//
// Vite configuration for the React frontend.
//
// The /api proxy is REQUIRED in development: every authenticated fetch in
// the app (authManager, the /admin guard, and the admin panel's adminApi)
// uses relative paths like "/api/auth/profile" so the same code works when
// Express serves the built app in production. Without this proxy the Vite
// dev server would answer those requests with index.html (SPA fallback),
// the JSON parse would fail, and the admin guard would kick the user back
// to /login even with a perfectly valid token.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = process.env.VITE_API_URL || "http://localhost:5001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
