// Configuration guide: https://rstack.rs/config
import { define } from 'rstack';

define.lib({
  lib: [
    {
      id: 'server',
      syntax: 'es2023',
      dts: {
        bundle: {
          bundledPackages: [
            'chokidar',
            'readdirp',
            'connect-next',
            'ws',
            '@types/ws',
          ],
        },
      },
      source: {
        define: {
          // `ws` internal env vars
          'process.env.WS_NO_BUFFER_UTIL': true,
          'process.env.WS_NO_UTF_8_VALIDATE': true,
        },
      },
      output: {
        externals: {
          selfsigned: 'commonjs selfsigned',
        },
      },
    },
    {
      id: 'client',
      syntax: 'es2015',
      bundle: false,
      source: {
        entry: {
          index: './client-src/**',
        },
        define: {
          // use define to avoid compile time evaluation of __webpack_hash__
          BUILD_HASH: '__webpack_hash__',
          RESOURCE_QUERY: '__resourceQuery',
        },
        tsconfigPath: './tsconfig.client.json',
      },
      dts: true,
      output: {
        distPath: './client',
      },
    },
  ],
});

define.test({
  extends: {},
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

define.fmt({
  singleQuote: true,
});

define.staged({
  '*.{js,jsx,ts,tsx,mjs,cjs}': ['rs lint --fix', 'rs fmt'],
  '*.{json,json5,md,yaml,yml}': 'rs fmt',
});

define.lint(({ js, ts }) => [
  js.configs.recommended,
  ts.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['tests/**/*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
]);
