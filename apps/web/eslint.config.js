import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintReact from '@eslint-react/eslint-plugin';

export default tseslint.config(
  {
    ignores: [
      'build/**',
      'node_modules/**',
      'coverage/**',
      'backend/**',
      'extension/**',
      'gm-admin/frontend/dist/**',
      'gm-admin/frontend/vite.config.ts',
      'eslint.config.js',
      'test-download.js',
      'test-download-page.html',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      '@eslint-react': eslintReact,
    },
    rules: {
      ...eslintReact.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-unused-vars': 'off',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['**/*.tsx'],
    rules: {
      '@eslint-react/jsx-uses-react': 'off',
      '@eslint-react/react-in-jsx-scope': 'off',
      '@eslint-react/no-nested-component-definitions': 'off',
      '@eslint-react/static-components': 'off',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
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