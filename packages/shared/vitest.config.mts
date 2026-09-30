import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // 只跑源码测试：build 会把 src/ 整体编译进 dist/，
    // 若不显式收窄 include，dist/__tests__/*.js 会被当成第二份测试重复执行。
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
