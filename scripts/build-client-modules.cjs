/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

'use strict';

const path = require('node:path');
const rspack = require('@rspack/core');
const { merge } = require('webpack-merge');
const fs = require('graceful-fs');

const modulesDir = path.resolve(__dirname, '../client/modules');
if (fs.existsSync(modulesDir)) {
  fs.rmdirSync(modulesDir, { recursive: true });
}

const library = {
  library: {
    // type: "module",
    type: 'commonjs',
  },
};

const baseForModules = {
  context: path.resolve(__dirname, '../client-src'),
  devtool: false,
  mode: 'development',
  // TODO enable this in future after fix bug with `eval` in webpack
  // experiments: {
  //   outputModule: true,
  // },
  resolve: {
    extensions: ['.js', '.ts'],
    tsConfig: path.resolve(__dirname, '../tsconfig.client.json'),
  },
  output: {
    path: modulesDir,
    ...library,
  },
  target: ['web', 'es5'],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'builtin:swc-loader',
          },
        ],
      },
      {
        test: /\.ts$/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
            },
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
};

const configs = [
  merge(baseForModules, {
    entry: path.resolve(__dirname, '../client-src/modules/logger/index.ts'),
    output: {
      filename: 'logger/index.js',
    },
    resolve: {
      extensions: ['.js', '.ts'],
      tsConfig: path.resolve(__dirname, '../tsconfig.client.json'),
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: [
            {
              loader: 'builtin:swc-loader',
            },
          ],
        },
        {
          test: /\.ts$/,
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
              },
            },
          },
          type: 'javascript/auto',
        },
      ],
    },
    plugins: [
      new rspack.DefinePlugin({
        Symbol:
          '(typeof Symbol !== "undefined" ? Symbol : function (i) { return i; })',
      }),
      new rspack.NormalModuleReplacementPlugin(
        /^tapable$/,
        path.resolve(__dirname, '../client-src/modules/logger/tapable.js'),
      ),
    ],
  }),
  merge(baseForModules, {
    entry: path.resolve(
      __dirname,
      '../client-src/modules/sockjs-client/index.ts',
    ),
    output: {
      filename: 'sockjs-client/index.js',
      library: 'SockJS',
      libraryTarget: 'umd',
      globalObject: "(typeof self !== 'undefined' ? self : this)",
    },
  }),
];

const compiler = rspack(configs);
compiler.run((err, stats) => {
  if (err) {
    console.error('Build fatal:');
    console.error(err);
    process.exit(1);
  }
  const errors = stats.toJson().errors;
  if (errors.length > 0) {
    console.error('Build errors:');
    errors.forEach((error) => {
      console.error(error.message);
    });
    process.exit(1);
  }
  console.log('Build completed');
  process.exit(0);
});
