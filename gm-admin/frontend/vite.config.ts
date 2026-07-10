import { defineConfig } from 'vite';
import react from 'vite-plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/gm-api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
    },
  },
});
