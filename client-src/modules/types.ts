import type { FilterTypes } from '@rspack/core';

// biome-ignore lint/suspicious/noExplicitAny: expected any
export type EXPECTED_ANY = any;

export type FilterFunction = (item: string) => boolean;
export type LoggingFunction = (
  value: string,
  type: LogTypeEnum,
  args?: Args,
) => void;

export type LoggerConsole = {
  clear: () => void;
  trace: () => void;
  info: (...args: Args) => void;
  log: (...args: Args) => void;
  warn: (...args: Args) => void;
  error: (...args: Args) => void;
  debug?: (...args: Args) => void;
  group?: (...args: Args) => void;
  groupCollapsed?: (...args: Args) => void;
  groupEnd?: (...args: Args) => void;
  status?: (...args: Args) => void;
  profile?: (...args: Args) => void;
  profileEnd?: (...args: Args) => void;
  logTime?: (...args: Args) => void;
};

export type LoggerOptions = {
  level: false | true | 'none' | 'error' | 'warn' | 'info' | 'log' | 'verbose';
  debug: FilterTypes | boolean;
  console: LoggerConsole;
};

export const LogType = Object.freeze({
  error: 'error', // message, c style arguments
  warn: 'warn', // message, c style arguments
  info: 'info', // message, c style arguments
  log: 'log', // message, c style arguments
  debug: 'debug', // message, c style arguments

  trace: 'trace', // no arguments

  group: 'group', // [label]
  groupCollapsed: 'groupCollapsed', // [label]
  groupEnd: 'groupEnd', // [label]

  profile: 'profile', // [profileName]
  profileEnd: 'profileEnd', // [profileName]

  time: 'time', // name, time as [seconds, nanoseconds]

  clear: 'clear', // no arguments
  status: 'status', // message, arguments
});

export type LogTypeEnum = (typeof LogType)[keyof typeof LogType];
export type TimersMap = Map<string | undefined, [number, number]>;

export type Args = EXPECTED_ANY[];

export type { FilterItemTypes } from '@rspack/core';
