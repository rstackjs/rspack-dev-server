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

fs.rmdirSync(path.join(__dirname, '../client/modules/'), { recursive: true });

const library = {
  library: {
    // type: "module",
    type: 'commonjs',
  },
};

const baseForModules = {
  context: __dirname,
  devtool: false,
  mode: 'development',
  // TODO enable this in future after fix bug with `eval` in webpack
  // experiments: {
  //   outputModule: true,
  // },
  output: {
    path: path.resolve(__dirname, '../client/modules'),
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
    ],
  },
};

module.exports = [
  merge(baseForModules, {
    entry: path.join(__dirname, 'modules/logger/index.js'),
    output: {
      filename: 'logger/index.js',
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
      ],
    },
    plugins: [
      new rspack.DefinePlugin({
        Symbol:
          '(typeof Symbol !== "undefined" ? Symbol : function (i) { return i; })',
      }),
      new rspack.NormalModuleReplacementPlugin(
        /^tapable$/,
        path.join(__dirname, 'modules/logger/tapable.js'),
      ),
    ],
  }),
  merge(baseForModules, {
    entry: path.join(__dirname, 'modules/sockjs-client/index.js'),
    output: {
      filename: 'sockjs-client/index.js',
      library: 'SockJS',
      libraryTarget: 'umd',
      globalObject: "(typeof self !== 'undefined' ? self : this)",
    },
  }),
];
