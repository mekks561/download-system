import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(async () => {
  const { visualizer } = await import('rollup-plugin-visualizer');

  return {
    plugins: [
      react({
        babel: {
          plugins: [
            [
              'babel-plugin-react-compiler',
              {
                sourceMaps: 'inline',
              },
            ],
          ],
        },
      }),
      tailwindcss(),
      visualizer({
        filename: 'build/stats.html',
        title: 'Bundle Visualizer',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'build',
      sourcemap: 'hidden',
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              if (id.includes('lucide')) {
                return 'vendor-lucide';
              }
              if (id.includes('axios')) {
                return 'vendor-axios';
              }
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'vendor-i18n';
              }
              if (id.includes('zustand')) {
                return 'vendor-zustand';
              }
              if (id.includes('react-router')) {
                return 'vendor-router';
              }
              if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
                return 'vendor-form';
              }
              if (id.includes('react-window')) {
                return 'vendor-window';
              }
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
