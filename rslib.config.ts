import { defineConfig } from '@rslib/core';

export default defineConfig({
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
