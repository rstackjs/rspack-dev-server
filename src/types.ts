import type {
  Server as HTTPServer,
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import type { ServerOptions } from 'node:https';
import type {
  DevServerMiddlewareHandler,
  DevServerOpenOptions,
  DevServerStaticItem,
} from '@rspack/core';
import type { FSWatcher, ChokidarOptions as WatchOptions } from 'chokidar';
import type { Options as ConnectHistoryApiFallbackOptions } from 'connect-history-api-fallback';
import type {
  Server as ConnectApplication,
  IncomingMessage as ConnectIncomingMessage,
  ErrorHandleFunction,
  HandleFunction,
  NextHandleFunction,
} from 'connect-next';
import type { RequestHandler } from 'http-proxy-middleware';

export type {
  FSWatcher,
  WatchOptions,
  RequestHandler,
  BasicServer,
  HTTPServer,
  ServerOptions,
  IncomingMessage,
  ConnectApplication,
  ConnectHistoryApiFallbackOptions,
};
export type { IPv6 } from 'ipaddr.js';
export type { Socket } from 'node:net';
export type { AddressInfo } from 'node:net';
export type { NetworkInterfaceInfo } from 'node:os';
export type {
  Compiler,
  DevServer,
  MultiCompiler,
  MultiStats,
  Stats,
  StatsCompilation,
  StatsOptions,
} from '@rspack/core';

// biome-ignore lint/suspicious/noExplicitAny: expected any
export type EXPECTED_ANY = any;

type BasicServer = import('node:net').Server | import('node:tls').Server;

/** https://github.com/microsoft/TypeScript/issues/29729 */
export type LiteralUnion<T extends U, U> = T | (U & Record<never, never>);

// type-level helpers, inferred as util types
export type Request<T extends BasicApplication = ConnectApplication> =
  T extends ConnectApplication ? ConnectIncomingMessage : IncomingMessage;
export type Response = ServerResponse;

export type DevMiddlewareOptions<
  T extends Request,
  U extends Response,
> = import('webpack-dev-middleware').Options<T, U>;
export type DevMiddlewareContext<
  T extends Request,
  U extends Response,
> = import('webpack-dev-middleware').Context<T, U>;

export type Port = number | LiteralUnion<'auto', string>;

export interface WatchFiles {
  paths: string | string[];
  options?: WatchOptions & {
    aggregateTimeout?: number;
    poll?: number | boolean;
  };
}

export interface NormalizedStatic {
  directory: string;
  publicPath: string[];
  staticOptions: DevServerStaticItem['staticOptions'];
  watch: false | WatchOptions;
}

export type ServerType<A extends BasicApplication, S extends BasicServer> =
  | LiteralUnion<'http' | 'https' | 'http2', string>
  | ((serverOptions: ServerOptions, application: A) => S);

export interface ServerConfiguration<
  A extends BasicApplication = ConnectApplication,
  S extends BasicServer = HTTPServer,
> {
  type?: ServerType<A, S>;
  options?: ServerOptions;
}

export interface WebSocketServerConfiguration {
  type?: LiteralUnion<'ws', string> | (() => WebSocketServerConfiguration);
  options?: Record<string, EXPECTED_ANY>;
}

export type ClientConnection = import('ws').WebSocket & { isAlive?: boolean };

export type WebSocketServer = import('ws').WebSocketServer;

export interface WebSocketServerImplementation {
  implementation: WebSocketServer;
  clients: ClientConnection[];
}

export type Open = DevServerOpenOptions & {
  target?: string | string[];
};

export interface NormalizedOpen {
  target: string;
  options: DevServerOpenOptions;
}

export interface MiddlewareObject {
  name?: string;
  path?: string;
  middleware: DevServerMiddlewareHandler | ErrorHandleFunction;
}

export type Middleware =
  | MiddlewareObject
  | DevServerMiddlewareHandler
  | ErrorHandleFunction;

export type OverlayMessageOptions = boolean | ((error: Error) => void);

// TypeScript overloads for connect-like use
function useFn(fn: NextHandleFunction): BasicApplication;
function useFn(fn: HandleFunction): BasicApplication;
function useFn(route: string, fn: NextHandleFunction): BasicApplication;
function useFn(route: string, fn: HandleFunction): BasicApplication;
function useFn(
  routeOrFn: string | NextHandleFunction | HandleFunction,
  fn?: NextHandleFunction | HandleFunction,
): BasicApplication {
  return {} as BasicApplication;
}

export type BasicApplication = {
  use: typeof useFn;
};
