/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import { SyncBailHook } from './tapable';
import { Logger } from './Logger';
import createConsoleLogger from './createConsoleLogger';
import type { LoggerOptions } from '../types';

const currentDefaultLoggerOptions = {
  level: 'info',
  debug: false,
  console,
} as LoggerOptions;

let currentDefaultLogger = createConsoleLogger(currentDefaultLoggerOptions);

const configureDefaultLogger = (options: LoggerOptions): void => {
  Object.assign(currentDefaultLoggerOptions, options);
  currentDefaultLogger = createConsoleLogger(currentDefaultLoggerOptions);
};

const getLogger = (name: string): Logger =>
  new Logger(
    (type, args) => {
      if (hooks.log.call(name, type, args) === undefined) {
        currentDefaultLogger(name, type, args);
      }
    },
    (childName) => getLogger(`${name}/${childName}`),
  );

const hooks = {
  // @ts-ignore
  log: new SyncBailHook(['origin', 'type', 'args']),
};

export { getLogger, configureDefaultLogger, hooks };

export default {
  getLogger,
  configureDefaultLogger,
  hooks,
};
