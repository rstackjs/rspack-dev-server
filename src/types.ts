import type {
  Server as HTTPServer,
  IncomingMessage,
  ServerResponse,
} from 'node:http';
export type { HTTPServer, IncomingMessage };
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
import type { FSWatcher, WatchOptions } from 'chokidar';
export type { FSWatcher, WatchOptions };
import type { Options as ConnectHistoryApiFallbackOptions } from 'connect-history-api-fallback';
export type { ConnectHistoryApiFallbackOptions };
import type {
  Application as ExpressApplication,
  ErrorRequestHandler as ExpressErrorRequestHandler,
  Request as ExpressRequest,
  RequestHandler as ExpressRequestHandler,
  Response as ExpressResponse,
} from 'express';

export type { ExpressApplication };
import type {
  Options as HttpProxyMiddlewareOptions,
  Filter as HttpProxyMiddlewareOptionsFilter,
  RequestHandler,
} from 'http-proxy-middleware';
export type { RequestHandler };
export type { IPv6 } from 'ipaddr.js';
import type { Options as ServeIndexOptions } from 'serve-index';
export type { ServeIndexOptions };
import type { ServeStaticOptions } from 'serve-static';

// biome-ignore lint/suspicious/noExplicitAny: expected any
export type EXPECTED_ANY = any;

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

export type ServerOptions = import('https').ServerOptions & {
  spdy?: {
    plain?: boolean;
    ssl?: boolean;
    'x-forwarded-for'?: string;
    protocol?: string;
    protocols?: string[];
  };
};

// type-level helpers, inferred as util types
export type Request<T extends BasicApplication = ExpressApplication> =
  T extends ExpressApplication ? ExpressRequest : IncomingMessage;
export type Response<T extends BasicApplication = ExpressApplication> =
  T extends ExpressApplication ? ExpressResponse : ServerResponse;

export type DevMiddlewareOptions<
  T extends Request,
  U extends Response,
> = import('webpack-dev-middleware').Options<T, U>;
export type DevMiddlewareContext<
  T extends Request,
  U extends Response,
> = import('webpack-dev-middleware').Context<T, U>;

export type Host = 'local-ip' | 'local-ipv4' | 'local-ipv6' | string;
export type Port = number | string | 'auto';

export interface WatchFiles {
  paths: string | string[];
  options?: WatchOptions & {
    aggregateTimeout?: number;
    ignored?: WatchOptions['ignored'];
    poll?: number | boolean;
  };
}

export interface Static {
  directory?: string;
  publicPath?: string | string[];
  serveIndex?: boolean | ServeIndexOptions;
  staticOptions?: ServeStaticOptions;
  watch?:
    | boolean
    | (WatchOptions & {
        aggregateTimeout?: number;
        ignored?: WatchOptions['ignored'];
        poll?: number | boolean;
      });
}

export interface NormalizedStatic {
  directory: string;
  publicPath: string[];
  serveIndex: false | ServeIndexOptions;
  staticOptions: ServeStaticOptions;
  watch: false | WatchOptions;
}

export type ServerType<
  A extends BasicApplication = ExpressApplication,
  S extends import('http').Server = import('http').Server,
> =
  | 'http'
  | 'https'
  | 'spdy'
  | 'http2'
  | string
  | ((serverOptions: ServerOptions, application: A) => S);

export interface ServerConfiguration<
  A extends BasicApplication = ExpressApplication,
  S extends import('http').Server = import('http').Server,
> {
  type?: ServerType<A, S>;
  options?: ServerOptions;
}

export interface WebSocketServerConfiguration {
  type?: 'sockjs' | 'ws' | string | (() => WebSocketServerConfiguration);
  options?: Record<string, EXPECTED_ANY>;
}

export type ClientConnection = (
  | import('ws').WebSocket
  | (import('sockjs').Connection & {
      send: import('ws').WebSocket['send'];
      terminate: import('ws').WebSocket['terminate'];
      ping: import('ws').WebSocket['ping'];
    })
) & { isAlive?: boolean };

export type WebSocketServer =
  | import('ws').WebSocketServer
  | (import('sockjs').Server & {
      close: import('ws').WebSocketServer['close'];
    });

export interface WebSocketServerImplementation {
  implementation: WebSocketServer;
  clients: ClientConnection[];
}

export type ByPass<
  Req = Request,
  Res = Response,
  ProxyConfig = ProxyConfigArrayItem,
> = (req: Req, res: Res, proxyConfig: ProxyConfig) => void;

export type ProxyConfigArrayItem = {
  path?: HttpProxyMiddlewareOptionsFilter;
  context?: HttpProxyMiddlewareOptionsFilter;
  bypass?: ByPass;
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
  options: OpenOptions;
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
  webSocketTransport?: 'ws' | 'sockjs' | string;
  webSocketURL?: string | WebSocketURL;
}

export type Headers =
  | Array<{ key: string; value: string }>
  | Record<string, string | string[]>;

export type MiddlewareHandler<T extends BasicApplication = ExpressApplication> =
  T extends ExpressApplication
    ? ExpressRequestHandler | ExpressErrorRequestHandler
    : HandleFunction;

export interface MiddlewareObject<
  T extends BasicApplication = ExpressApplication,
> {
  name?: string;
  path?: string;
  middleware: MiddlewareHandler<T>;
}

export type Middleware<T extends BasicApplication = ExpressApplication> =
  | MiddlewareObject<T>
  | MiddlewareHandler<T>;

export type BasicServer = import('net').Server | import('tls').Server;

export type OverlayMessageOptions = boolean | ((error: Error) => void);

// TypeScript overloads for express-like use
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

// Type definition matching open package's Options type
// (Cannot import directly from ES module in CommonJS context)
export type OpenOptions = {
  readonly wait?: boolean;
  readonly background?: boolean;
  readonly newInstance?: boolean;
  readonly app?: OpenApp | readonly OpenApp[];
  readonly allowNonzeroExitCode?: boolean;
};
