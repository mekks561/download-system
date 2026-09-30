import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    globalSetup: ['./src/__tests__/helpers/global-setup.ts'],
  },
});
