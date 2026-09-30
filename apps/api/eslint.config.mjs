import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// API 包专用 ESLint 配置（Node/Express 后端，无 React）。
// 与 web 包配置对齐：同样的 type-aware 严格度与 no-unused-vars 约定；
// 差异：Node globals、无 @eslint-react、允许 console（服务端标准日志）。
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      // api 为纯 TS 工程；遗留 CJS 脚本（ecosystem.config.cjs / scripts/*.cjs /
      // src/config/socket.cjs）不属于 TS project service 的范围，不纳入 lint
      '**/*.js',
      '**/*.cjs',
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-unused-vars': 'off',
      // 服务端日志：启动/运行时 console 输出是标准做法，不限制
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      'no-empty': 'off',
    },
  }
);
