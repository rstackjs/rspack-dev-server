import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      id: 'server',
      syntax: 'es2023',
      dts: true,
      output: {
        externals: {
          connect: 'commonjs connect',
          'connect-history-api-fallback':
            'commonjs connect-history-api-fallback',
          'webpack-dev-middleware': 'commonjs webpack-dev-middleware',
          'http-proxy-middleware': 'commonjs http-proxy-middleware',
          'serve-static': 'commonjs serve-static',
          'serve-index': 'commonjs serve-index',
          selfsigned: 'commonjs selfsigned',
          compression: 'commonjs compression',
          chokidar: 'commonjs chokidar',
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
