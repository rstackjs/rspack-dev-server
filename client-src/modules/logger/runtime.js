/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

// @ts-nocheck

'use strict';

const { SyncBailHook } = require('tapable');
const { Logger } = require('./Logger');
const createConsoleLogger = require('./createConsoleLogger');

/** @type {createConsoleLogger.LoggerOptions} */
const currentDefaultLoggerOptions = {
  level: 'info',
  debug: false,
  console,
};
let currentDefaultLogger = createConsoleLogger(currentDefaultLoggerOptions);

/**
 * @param {createConsoleLogger.LoggerOptions} options new options, merge with old options
 * @returns {void}
 */
module.exports.configureDefaultLogger = (options) => {
  Object.assign(currentDefaultLoggerOptions, options);
  currentDefaultLogger = createConsoleLogger(currentDefaultLoggerOptions);
};

/**
 * @param {string} name name of the logger
 * @returns {Logger} a logger
 */
module.exports.getLogger = (name) =>
  new Logger(
    (type, args) => {
      if (module.exports.hooks.log.call(name, type, args) === undefined) {
        currentDefaultLogger(name, type, args);
      }
    },
    (childName) => module.exports.getLogger(`${name}/${childName}`),
  );

module.exports.hooks = {
  log: new SyncBailHook(['origin', 'type', 'args']),
};
