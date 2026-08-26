import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend', // Serve from frontend/
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: './frontend/index.html'
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./frontend/style.css";`
      }
    }
  }
});
