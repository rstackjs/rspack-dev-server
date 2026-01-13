/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import type { LoggerOptions } from '../modules/logger/createConsoleLogger';
import logger from '../modules/logger/index';
import { LogLevel } from '../type';

const name = 'webpack-dev-server';
// default level is set on the client side, so it does not need
// to be set by the CLI or API
const defaultLevel = 'info';

// options new options, merge with old options
function setLogLevel(level: LogLevel) {
  logger.configureDefaultLogger({ level } as LoggerOptions);
}

setLogLevel(defaultLevel);

const log = logger.getLogger(name);

export { log, setLogLevel };
