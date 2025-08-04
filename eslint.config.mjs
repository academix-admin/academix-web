// eslint.config.mjs
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect', // ✅ fixes React version warning
      },
    },
    plugins: {
      js,
      '@typescript-eslint': tseslint.plugin,
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      next: nextPlugin,
    },
    rules: {
      // Base JS
      ...js.configs.recommended.rules,

      // TypeScript rules
      ...tseslint.configs.recommended[0].rules,

      // React rules
      ...pluginReact.configs.flat.recommended.rules,

      // Hooks
      ...pluginReactHooks.configs.recommended.rules,

      // Next.js rules
      ...nextPlugin.configs.recommended.rules,

      // Custom fixes
      'react/react-in-jsx-scope': 'off', // React 17+
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react/prop-types': 'off', // TypeScript handles props
    },
  },
]);
