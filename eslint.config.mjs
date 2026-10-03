import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const runtimeGlobals = { ...globals.browser, ...globals.node }

export default [
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', '*.tsbuildinfo'],
  },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs}'],
    languageOptions: { ...js.configs.recommended.languageOptions, globals: runtimeGlobals },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: { ...config.languageOptions, globals: runtimeGlobals },
  })),
  {
    files: ['**/*.{ts,tsx,mts}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 5 }],
    },
  },
]
