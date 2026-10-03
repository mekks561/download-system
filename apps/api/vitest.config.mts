import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    globalSetup: ['./src/__tests__/helpers/global-setup.ts'],
    // 集成测试共用同一个本地 MySQL 开发库；setup 并发回归需要清空 users 表，
    // 文件级并行会与 auth/domains 等套件互相破坏（删行/空表断言互相干扰），
    // 故关闭文件并行，用串行换取共享库下的确定性。
    fileParallelism: false,
  },
});
