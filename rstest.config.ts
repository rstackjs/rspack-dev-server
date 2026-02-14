import path from 'node:path';
import { defineConfig } from '@rstest/core';
import { version as rspackVersion } from '@rspack/core';

const [webpackVersion] = rspackVersion;
const snapshotExtension = `.snap.webpack${webpackVersion}`;

export default defineConfig({
  globals: true,
  include: ['tests/*.test.ts', 'tests/e2e/*.test.js'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
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
  testTimeout: process.env.CI ? 120000 : 30000,
  setupFiles: ['./tests/helpers/setup-test.js'],
  globalSetup: ['./tests/helpers/global-setup-test.js'],
  reporters: ['default'],
  resolveSnapshotPath: (testPath) =>
    path.join(
      path.dirname(testPath),
      '__snapshots__',
      `${path.basename(testPath)}${snapshotExtension}`,
    ),
});
