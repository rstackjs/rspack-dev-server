import { defineConfig } from '@rstest/core';

export default defineConfig({
  globals: true,
  include: ['tests/*.test.ts', 'tests/e2e/*.test.js'],
  exclude: [
    // TODO: check why this test timeout
    '<rootDir>/tests/e2e/host.test.js',
    // TODO: check why this test throw error when run with other tests
    '<rootDir>/tests/e2e/watch-files.test.js',
    // TODO: check why this test timeout
    '<rootDir>/tests/e2e/web-socket-server-url.test.js',
  ],
  pool: {
    maxWorkers: '80%',
  },
  env: {
    FORCE_COLOR: 'true',
  },
  testTimeout: process.env.CI ? 120000 : 60000,
  hookTimeout: 60000,
  setupFiles: ['./tests/helpers/setup-test.js'],
  reporters: ['default'],
});
