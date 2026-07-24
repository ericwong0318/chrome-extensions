import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier/flat';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      'e2e/',
      '.vit/',
      'coverage/',
      'test-results/',
      'playwright-report/',
      'blob-report/',
      '.eslintcache',
      '*.config.{js,ts,mjs}',
      'manifest.json',
      'options.html',
    ],
  },
  // JavaScript recommended
  js.configs.recommended,
  // TypeScript recommended (strict)
  ...tseslint.configs.strict,
  // React plugin
  {
    plugins: {
      react,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.dom,
        ...globals.es2020,
      },
    },
    rules: {
      // Use React 17+ JSX transform (no need to import React)
      'react/react-in-jsx-scope': 'off',
      // Use React 19 (no need for prop-types)
      'react/prop-types': 'off',
    },
  },
  // TypeScript-specific rule overrides
  {
    rules: {
      // Downgrade strict TypeScript rules to warnings so they don't break your workflow
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // React hooks
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  // React Refresh (HMR)
  {
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // TypeScript-specific overrides for test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
  },
  // Disable formatting rules that conflict with Prettier
  prettierConfig,
);
