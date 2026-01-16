/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import {
  LogType,
  type Args,
  type EXPECTED_ANY,
  type LogTypeEnum,
  type TimersMap,
} from '../types';

const LOG_SYMBOL = Symbol('webpack logger raw log method');
const TIMERS_SYMBOL = Symbol('webpack logger times');
const TIMERS_AGGREGATES_SYMBOL = Symbol('webpack logger aggregated times');

class WebpackLogger {
  private [LOG_SYMBOL]: (type: LogTypeEnum, args?: Args) => void;
  private [TIMERS_SYMBOL]: TimersMap = new Map();
  private [TIMERS_AGGREGATES_SYMBOL]: TimersMap = new Map();
  // @ts-ignore
  private getChildLogger: (name: string | (() => string)) => WebpackLogger;

  constructor(
    log: (type: LogTypeEnum, args?: Args) => void,
    getChildLogger: (name: string | (() => string)) => WebpackLogger,
  ) {
    this[LOG_SYMBOL] = log;
    this.getChildLogger = getChildLogger;
  }

  error(...args: Args) {
    this[LOG_SYMBOL](LogType.error, args);
  }

  warn(...args: Args) {
    this[LOG_SYMBOL](LogType.warn, args);
  }

  info(...args: Args) {
    this[LOG_SYMBOL](LogType.info, args);
  }

  log(...args: Args) {
    this[LOG_SYMBOL](LogType.log, args);
  }

  debug(...args: Args) {
    this[LOG_SYMBOL](LogType.debug, args);
  }

  assert(assertion: EXPECTED_ANY, ...args: Args) {
    if (!assertion) {
      this[LOG_SYMBOL](LogType.error, args);
    }
  }

  trace() {
    this[LOG_SYMBOL](LogType.trace, ['Trace']);
  }

  clear() {
    this[LOG_SYMBOL](LogType.clear);
  }

  status(...args: Args) {
    this[LOG_SYMBOL](LogType.status, args);
  }

  group(...args: Args) {
    this[LOG_SYMBOL](LogType.group, args);
  }

  groupCollapsed(...args: Args) {
    this[LOG_SYMBOL](LogType.groupCollapsed, args);
  }

  groupEnd() {
    this[LOG_SYMBOL](LogType.groupEnd);
  }

  profile(label?: string) {
    this[LOG_SYMBOL](LogType.profile, [label]);
  }

  profileEnd(label?: string) {
    this[LOG_SYMBOL](LogType.profileEnd, [label]);
  }

  time(label: string) {
    this[TIMERS_SYMBOL] = this[TIMERS_SYMBOL] || new Map();
    this[TIMERS_SYMBOL].set(label, process.hrtime());
  }

  timeLog(label?: string) {
    const prev = this[TIMERS_SYMBOL] && this[TIMERS_SYMBOL].get(label);
    if (!prev) {
      throw new Error(`No such label '${label}' for WebpackLogger.timeLog()`);
    }
    const time = process.hrtime(prev);
    this[LOG_SYMBOL](LogType.time, [label, ...time]);
  }

  timeEnd(label?: string) {
    const prev = this[TIMERS_SYMBOL] && this[TIMERS_SYMBOL].get(label);
    if (!prev) {
      throw new Error(`No such label '${label}' for WebpackLogger.timeEnd()`);
    }
    const time = process.hrtime(prev);
    /** @type {TimersMap} */
    this[TIMERS_SYMBOL].delete(label);
    this[LOG_SYMBOL](LogType.time, [label, ...time]);
  }

  timeAggregate(label?: string) {
    const prev = this[TIMERS_SYMBOL] && this[TIMERS_SYMBOL].get(label);
    if (!prev) {
      throw new Error(
        `No such label '${label}' for WebpackLogger.timeAggregate()`,
      );
    }
    const time = process.hrtime(prev);
    this[TIMERS_SYMBOL].delete(label);
    this[TIMERS_AGGREGATES_SYMBOL] =
      this[TIMERS_AGGREGATES_SYMBOL] || new Map();
    const current = this[TIMERS_AGGREGATES_SYMBOL].get(label);
    if (current !== undefined) {
      if (time[1] + current[1] > 1e9) {
        time[0] += current[0] + 1;
        time[1] = time[1] - 1e9 + current[1];
      } else {
        time[0] += current[0];
        time[1] += current[1];
      }
    }
    this[TIMERS_AGGREGATES_SYMBOL].set(label, time);
  }

  timeAggregateEnd(label?: string) {
    if (this[TIMERS_AGGREGATES_SYMBOL] === undefined) return;
    const time = this[TIMERS_AGGREGATES_SYMBOL].get(label);
    if (time === undefined) return;
    this[TIMERS_AGGREGATES_SYMBOL].delete(label);
    this[LOG_SYMBOL](LogType.time, [label, ...time]);
  }
}

export { WebpackLogger as Logger };
