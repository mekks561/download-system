import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// shared 包专用 ESLint 配置（纯 TS 契约层，无 DOM、无 Node API、无 React）。
// 与 api/web 对齐 type-aware 严格度；本包是双端共享代码，
// 因此禁止依赖 Node/DOM 全局，避免把运行环境假设带进契约层。
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
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
    },
  },
  {
    files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-empty': 'off',
    },
  }
);
