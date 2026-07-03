import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [
      'src/pages/__tests__/*.e2e.test.tsx',
      'src/pages/__tests__/Downloads.test.tsx',
      'src/pages/__tests__/Uploads.e2e.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/coverage/**',
        '**/build/**',
      ],
    },
  },
});