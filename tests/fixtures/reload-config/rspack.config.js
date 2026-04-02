'use strict';

const HTMLGeneratorPlugin = require('../../helpers/html-generator-plugin');

module.exports = {
  mode: 'development',
  context: __dirname,
  entry: './foo.js',
  stats: 'none',
  output: {
    path: '/',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        type: 'css',
      },
    ],
  },
  infrastructureLogging: {
    level: 'info',
    stream: {
      write: () => {},
    },
  },
  plugins: [new HTMLGeneratorPlugin()],
};
