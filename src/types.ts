import type {
  Server as HTTPServer,
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import type { ServerOptions } from 'node:https';
import type { FSWatcher, ChokidarOptions as WatchOptions } from 'chokidar';
import type { Options as ConnectHistoryApiFallbackOptions } from 'connect-history-api-fallback';
import type {
  Server as ConnectApplication,
  IncomingMessage as ConnectIncomingMessage,
} from 'connect-next';
import type {
  Options as HttpProxyMiddlewareOptions,
  Filter as HttpProxyMiddlewareOptionsFilter,
  RequestHandler,
} from 'http-proxy-middleware';
import type { ServeStaticOptions } from 'serve-static';
import type { DevServerOpenOptions } from '@rspack/core';

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

export type NextFunction = (err?: EXPECTED_ANY) => void;
export type SimpleHandleFunction = (
  req: IncomingMessage,
  res: ServerResponse,
) => void;
export type NextHandleFunction = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
) => void;
export type ErrorHandleFunction = (
  err: EXPECTED_ANY,
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
) => void;
export type HandleFunction =
  | SimpleHandleFunction
  | NextHandleFunction
  | ErrorHandleFunction;

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

export type Host = LiteralUnion<
  'local-ip' | 'local-ipv4' | 'local-ipv6',
  string
>;
export type Port = number | LiteralUnion<'auto', string>;

export interface WatchFiles {
  paths: string | string[];
  options?: WatchOptions & {
    aggregateTimeout?: number;
    poll?: number | boolean;
  };
}

export interface Static {
  directory?: string;
  publicPath?: string | string[];
  staticOptions?: ServeStaticOptions;
  watch?: boolean | NonNullable<WatchFiles['options']>;
}

export interface NormalizedStatic {
  directory: string;
  publicPath: string[];
  staticOptions: ServeStaticOptions;
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

export type ProxyConfigArrayItem = {
  /**
   * Alias for `pathFilter` in `http-proxy-middleware` options.
   * When both `context` and `pathFilter` are provided, `pathFilter` takes precedence.
   */
  context?: HttpProxyMiddlewareOptionsFilter;
} & HttpProxyMiddlewareOptions;

export type ProxyConfigArray = Array<
  | ProxyConfigArrayItem
  | ((
      req?: Request | undefined,
      res?: Response | undefined,
      next?: NextFunction | undefined,
    ) => ProxyConfigArrayItem)
>;

export interface OpenApp {
  name?: string;
  arguments?: string[];
}

export interface Open {
  app?: string | string[] | OpenApp;
  target?: string | string[];
}

export interface NormalizedOpen {
  target: string;
  options: DevServerOpenOptions;
}

export interface WebSocketURL {
  hostname?: string;
  password?: string;
  pathname?: string;
  port?: number | string;
  protocol?: string;
  username?: string;
}

export interface ClientConfiguration {
  logging?: 'log' | 'info' | 'warn' | 'error' | 'none' | 'verbose';
  overlay?:
    | boolean
    | {
        warnings?: OverlayMessageOptions;
        errors?: OverlayMessageOptions;
        runtimeErrors?: OverlayMessageOptions;
      };
  progress?: boolean;
  reconnect?: boolean | number;
  webSocketTransport?: LiteralUnion<'ws', string>;
  webSocketURL?: string | WebSocketURL;
}

export type Headers =
  | Array<{ key: string; value: string }>
  | Record<string, string | string[]>;

export type MiddlewareHandler = (...args: EXPECTED_ANY[]) => EXPECTED_ANY;

export interface MiddlewareObject {
  name?: string;
  path?: string;
  middleware: MiddlewareHandler;
}

export type Middleware = MiddlewareObject | MiddlewareHandler;

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
