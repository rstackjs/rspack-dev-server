// eslint-disable-next-line import/no-extraneous-dependencies
const tcpPortUsed = require('tcp-port-used');
const { webpackVersion } = require('@rspack/core/package.json');
const ports = require('./ports-map');

// eslint-disable-next-line no-console
console.log(`\n Running tests for webpack @${webpackVersion} \n`);
