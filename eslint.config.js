const globals = require('globals');
const pluginTypescript = require('@typescript-eslint/eslint-plugin');
const parserTypescript = require('@typescript-eslint/parser');

module.exports = [
  {
    ignores: ['**/*.config.{js,mjs}', '**/__tests__/**', '**/*.test.{ts,tsx}'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: parserTypescript,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': pluginTypescript,
    },
    rules: {
      ...pluginTypescript.configs.recommended.rules,
      ...pluginTypescript.configs['recommended-requiring-type-checking'].rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
];