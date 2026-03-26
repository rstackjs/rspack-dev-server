import { defineConfig, ts } from '@rslint/core';

export default defineConfig([
  ts.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
