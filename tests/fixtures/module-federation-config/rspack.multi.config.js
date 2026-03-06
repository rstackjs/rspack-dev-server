'use strict';

module.exports = [
  {
    mode: 'development',
    target: 'node',
    context: __dirname,
    stats: 'none',
    entry: ['./entry1.js', './entry2.js'],
    output: {
      path: '/',
      library: { type: 'umd' },
    },
    infrastructureLogging: {
      level: 'warn',
    },
  },
];
