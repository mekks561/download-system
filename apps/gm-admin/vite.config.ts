import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 避开主站 3000（web）/ 5001（api）/ 5002（遗产 gm 端口）
    port: 3100,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: 'hidden',
    target: 'es2020',
  },
});
