import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      id: 'server',
      syntax: 'es2023',
      dts: true,
      output: {
        externals: {
          express: 'commonjs express',
          'launch-editor': 'commonjs launch-editor',
          'connect-history-api-fallback':
            'commonjs connect-history-api-fallback',
          'webpack-dev-middleware': 'commonjs webpack-dev-middleware',
          'http-proxy-middleware': 'commonjs http-proxy-middleware',
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
        },
      },
      output: {
        distPath: './client',
      },
    },
  ],
});
