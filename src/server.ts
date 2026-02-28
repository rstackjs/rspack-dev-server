/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as url from 'node:url';
import * as util from 'node:util';
import * as ipaddr from 'ipaddr.js';
import type {
  BasicApplication,
  ExpressApplication,
  HTTPServer,
  Response,
  Request,
  Host,
  Port,
  DevMiddlewareOptions,
  ConnectHistoryApiFallbackOptions,
  WatchFiles,
  Static,
  ServerType,
  ServerConfiguration,
  WebSocketServerConfiguration,
  ProxyConfigArray,
  Open,
  ClientConfiguration,
  Middleware,
  DevMiddlewareContext,
  OverlayMessageOptions,
  Compiler,
  MultiCompiler,
  FSWatcher,
  EXPECTED_ANY,
  RequestHandler,
  Socket,
  WebSocketServerImplementation,
  Stats,
  MultiStats,
  DevServer,
  StatsOptions,
  NetworkInterfaceInfo,
  WebSocketURL,
  WatchOptions,
  NormalizedStatic,
  ServerOptions,
  NormalizedOpen,
  OpenOptions,
  StatsCompilation,
  NextFunction,
  MiddlewareHandler,
  ProxyConfigArrayItem,
  ByPass,
  ServeIndexOptions,
  WebSocketServer,
  ClientConnection,
  IncomingMessage,
  MiddlewareObject,
  NextHandleFunction,
  HandleFunction,
  SimpleHandleFunction,
  OpenApp,
  AddressInfo,
  IPv6,
  Headers,
} from './types';

const { styleText } = util;

export interface Configuration<
  A extends BasicApplication = ExpressApplication,
  S extends HTTPServer = HTTPServer,
> {
  ipc?: boolean | string;
  host?: Host;
  port?: Port;
  hot?: boolean | 'only';
  liveReload?: boolean;
  devMiddleware?: DevMiddlewareOptions<Request, Response>;
  compress?: boolean;
  allowedHosts?: 'auto' | 'all' | string | string[];
  historyApiFallback?: boolean | ConnectHistoryApiFallbackOptions;
  watchFiles?: string | string[] | WatchFiles | Array<string | WatchFiles>;
  static?: boolean | string | Static | Array<string | Static>;
  server?: ServerType<A, S> | ServerConfiguration<A, S>;
  app?: () => Promise<A>;
  webSocketServer?:
    | boolean
    | 'sockjs'
    | 'ws'
    | string
    | WebSocketServerConfiguration;
  proxy?: ProxyConfigArray;
  open?: boolean | string | Open | Array<string | Open>;
  setupExitSignals?: boolean;
  client?: boolean | ClientConfiguration;
  headers?:
    | Headers
    | ((
        req: Request,
        res: Response,
        context: DevMiddlewareContext<Request, Response> | undefined,
      ) => Headers);
  onListening?: (devServer: Server<A, S>) => void;
  setupMiddlewares?: (
    middlewares: Middleware[],
    devServer: Server<A, S>,
  ) => Middleware[];
}

// Define BasicApplication and Server as ambient, or import them

if (!process.env.WEBPACK_SERVE) {
  process.env.WEBPACK_SERVE = 'true';
}

type FunctionReturning<T> = () => T;

const memoize = <T>(fn: FunctionReturning<T>): FunctionReturning<T> => {
  let cache = false;
  let result: T | undefined;
  let fnRef = fn;
  return () => {
    if (cache) {
      return result as T;
    }

    result = fnRef();
    cache = true;
    // Allow to clean up memory for fn and all dependent resources
    fnRef = undefined as unknown as FunctionReturning<T>;
    return result as T;
  };
};

const getExpress = memoize(() => require('express'));

const encodeOverlaySettings = (
  setting?: OverlayMessageOptions,
): undefined | string | boolean => {
  return typeof setting === 'function'
    ? encodeURIComponent(setting.toString())
    : setting;
};

const DEFAULT_ALLOWED_PROTOCOLS = /^(file|.+-extension):/i;

function isMultiCompiler(
  compiler: Compiler | MultiCompiler,
): compiler is MultiCompiler {
  return Array.isArray((compiler as MultiCompiler).compilers);
}

class Server<
  A extends BasicApplication = ExpressApplication,
  S extends import('http').Server = HTTPServer,
> {
  compiler: Compiler | MultiCompiler;
  logger: ReturnType<Compiler['getInfrastructureLogger']>;
  options: Configuration<A, S>;
  staticWatchers: FSWatcher[];
  listeners: {
    name: string | symbol;
    listener: (...args: EXPECTED_ANY[]) => void;
  }[];
  webSocketProxies: RequestHandler[];
  sockets: Socket[];
  currentHash: string | undefined;
  isTlsServer = false;
  webSocketServer: WebSocketServerImplementation | null | undefined;
  middleware:
    | import('webpack-dev-middleware').API<Request, Response>
    | undefined;
  server: S | undefined;
  app: A | undefined;
  stats: Stats | MultiStats | undefined;

  constructor(options: DevServer, compiler: Compiler | MultiCompiler) {
    this.compiler = compiler;
    this.logger = this.compiler.getInfrastructureLogger('rspack-dev-server');
    this.options = options as unknown as Configuration<A, S>;
    this.staticWatchers = [];
    this.listeners = [];
    this.webSocketProxies = [];
    this.sockets = [];

    this.currentHash = undefined;
  }

  static get DEFAULT_STATS(): StatsOptions {
    return {
      all: false,
      hash: true,
      warnings: true,
      errors: true,
      errorDetails: false,
    };
  }

  static isAbsoluteURL(URL: string): boolean {
    // Don't match Windows paths `c:\`
    if (/^[a-zA-Z]:\\/.test(URL)) {
      return false;
    }

    // Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
    // Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
    return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(URL);
  }

  static findIp(
    gatewayOrFamily: string,
    isInternal: boolean,
  ): string | undefined {
    if (gatewayOrFamily === 'v4' || gatewayOrFamily === 'v6') {
      let host: string | undefined;

      const networks = Object.values(os.networkInterfaces())
        .flatMap((networks) => networks ?? [])
        .filter((network) => {
          if (!network || !network.address) {
            return false;
          }

          if (network.family !== `IP${gatewayOrFamily}`) {
            return false;
          }

          if (
            typeof isInternal !== 'undefined' &&
            network.internal !== isInternal
          ) {
            return false;
          }

          if (gatewayOrFamily === 'v6') {
            const range = ipaddr.parse(network.address).range();

            if (
              range !== 'ipv4Mapped' &&
              range !== 'uniqueLocal' &&
              range !== 'loopback'
            ) {
              return false;
            }
          }

          return network.address;
        });

      if (networks.length > 0) {
        // Take the first network found
        host = networks[0].address;

        if (host.includes(':')) {
          host = `[${host}]`;
        }
      }

      return host;
    }

    const gatewayIp = ipaddr.parse(gatewayOrFamily);

    // Look for the matching interface in all local interfaces.
    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const { cidr } of addresses as NetworkInterfaceInfo[]) {
        const net = ipaddr.parseCIDR(cidr as string);

        if (
          net[0] &&
          net[0].kind() === gatewayIp.kind() &&
          gatewayIp.match(net)
        ) {
          return net[0].toString();
        }
      }
    }
  }

  // TODO remove me in the next major release, we have `findIp`
  static async internalIP(family: 'v4' | 'v6') {
    return Server.findIp(family, false);
  }

  // TODO remove me in the next major release, we have `findIp`
  static internalIPSync(family: 'v4' | 'v6') {
    return Server.findIp(family, false);
  }

  static async getHostname(hostname: Host) {
    if (hostname === 'local-ip') {
      return (
        Server.findIp('v4', false) || Server.findIp('v6', false) || '0.0.0.0'
      );
    }
    if (hostname === 'local-ipv4') {
      return Server.findIp('v4', false) || '0.0.0.0';
    }
    if (hostname === 'local-ipv6') {
      return Server.findIp('v6', false) || '::';
    }

    return hostname;
  }

  static async getFreePort(port: string, host: string) {
    if (typeof port !== 'undefined' && port !== null && port !== 'auto') {
      return port;
    }

    const { default: pRetry } = await import('p-retry');
    const getPort = require('./getPort');
    const basePort =
      typeof process.env.WEBPACK_DEV_SERVER_BASE_PORT !== 'undefined'
        ? Number.parseInt(process.env.WEBPACK_DEV_SERVER_BASE_PORT, 10)
        : 8080;

    // Try to find unused port and listen on it for 3 times,
    // if port is not specified in options.
    const defaultPortRetry =
      typeof process.env.WEBPACK_DEV_SERVER_PORT_RETRY !== 'undefined'
        ? Number.parseInt(process.env.WEBPACK_DEV_SERVER_PORT_RETRY, 10)
        : 3;

    return pRetry(() => getPort(basePort, host), {
      retries: defaultPortRetry,
    });
  }

  static findCacheDir(): string {
    const cwd = process.cwd();

    let dir: string | undefined = cwd;

    for (;;) {
      try {
        if (fs.statSync(path.join(dir, 'package.json')).isFile()) break;
        // eslint-disable-next-line no-empty
      } catch {}

      const parent = path.dirname(dir);

      if (dir === parent) {
        dir = undefined;
        break;
      }

      dir = parent;
    }

    if (!dir) {
      return path.resolve(cwd, '.cache/rspack-dev-server');
    }
    if (process.versions.pnp === '1') {
      return path.resolve(dir, '.pnp/.cache/rspack-dev-server');
    }
    if (process.versions.pnp === '3') {
      return path.resolve(dir, '.yarn/.cache/rspack-dev-server');
    }

    return path.resolve(dir, 'node_modules/.cache/rspack-dev-server');
  }

  static isWebTarget(compiler: Compiler): boolean {
    if (compiler.platform?.web) {
      return compiler.platform.web;
    }

    // TODO improve for the next major version and keep only `webTargets` to fallback for old versions
    if (compiler.options.externalsPresets?.web) {
      return true;
    }

    if (compiler.options.resolve?.conditionNames?.includes('browser')) {
      return true;
    }

    const webTargets: (string | undefined | null)[] = [
      'web',
      'webworker',
      'electron-preload',
      'electron-renderer',
      'nwjs',
      'node-webkit',
      undefined,
      null,
    ];

    if (Array.isArray(compiler.options.target)) {
      return compiler.options.target.some((r: string | undefined | null) =>
        webTargets.includes(r),
      );
    }

    return webTargets.includes(
      compiler.options.target as string | undefined | null,
    );
  }

  addAdditionalEntries(compiler: Compiler) {
    const additionalEntries: string[] = [];
    const isWebTarget = Server.isWebTarget(compiler);

    // TODO maybe empty client
    if (this.options.client && isWebTarget) {
      let webSocketURLStr = '';

      if (this.options.webSocketServer) {
        const webSocketURL = (this.options.client as ClientConfiguration)
          .webSocketURL as WebSocketURL;
        const webSocketServer = this.options.webSocketServer as {
          type: WebSocketServerConfiguration['type'];
          options: NonNullable<WebSocketServerConfiguration['options']>;
        };
        const searchParams = new URLSearchParams();

        let protocol: string;

        // We are proxying dev server and need to specify custom `hostname`
        if (typeof webSocketURL.protocol !== 'undefined') {
          protocol = webSocketURL.protocol;
        } else {
          protocol = this.isTlsServer ? 'wss:' : 'ws:';
        }

        searchParams.set('protocol', protocol);

        if (typeof webSocketURL.username !== 'undefined') {
          searchParams.set('username', webSocketURL.username);
        }

        if (typeof webSocketURL.password !== 'undefined') {
          searchParams.set('password', webSocketURL.password);
        }

        let hostname: string;

        // SockJS is not supported server mode, so `hostname` and `port` can't specified, let's ignore them
        const isSockJSType = webSocketServer.type === 'sockjs';
        const isWebSocketServerHostDefined =
          typeof webSocketServer.options.host !== 'undefined';
        const isWebSocketServerPortDefined =
          typeof webSocketServer.options.port !== 'undefined';

        if (
          isSockJSType &&
          (isWebSocketServerHostDefined || isWebSocketServerPortDefined)
        ) {
          this.logger.warn(
            "SockJS only supports client mode and does not support custom hostname and port options. Please consider using 'ws' if you need to customize these options.",
          );
        }

        // We are proxying dev server and need to specify custom `hostname`
        if (typeof webSocketURL.hostname !== 'undefined') {
          hostname = webSocketURL.hostname;
        }
        // Web socket server works on custom `hostname`, only for `ws` because `sock-js` is not support custom `hostname`
        else if (isWebSocketServerHostDefined && !isSockJSType) {
          hostname = webSocketServer.options.host;
        }
        // The `host` option is specified
        else if (typeof this.options.host !== 'undefined') {
          hostname = this.options.host;
        }
        // The `port` option is not specified
        else {
          hostname = '0.0.0.0';
        }

        searchParams.set('hostname', hostname);

        let port: number | string;

        // We are proxying dev server and need to specify custom `port`
        if (typeof webSocketURL.port !== 'undefined') {
          port = webSocketURL.port;
        }
        // Web socket server works on custom `port`, only for `ws` because `sock-js` is not support custom `port`
        else if (isWebSocketServerPortDefined && !isSockJSType) {
          port = webSocketServer.options.port;
        }
        // The `port` option is specified
        else if (typeof this.options.port === 'number') {
          port = this.options.port;
        }
        // The `port` option is specified using `string`
        else if (
          typeof this.options.port === 'string' &&
          this.options.port !== 'auto'
        ) {
          port = Number(this.options.port);
        }
        // The `port` option is not specified or set to `auto`
        else {
          port = '0';
        }

        searchParams.set('port', String(port));

        let pathname = '';

        // We are proxying dev server and need to specify custom `pathname`
        if (typeof webSocketURL.pathname !== 'undefined') {
          pathname = webSocketURL.pathname;
        }
        // Web socket server works on custom `path`
        else if (
          typeof webSocketServer.options.prefix !== 'undefined' ||
          typeof webSocketServer.options.path !== 'undefined'
        ) {
          pathname =
            webSocketServer.options.prefix || webSocketServer.options.path;
        }

        searchParams.set('pathname', pathname);

        const client = this.options.client as ClientConfiguration;

        if (typeof client.logging !== 'undefined') {
          searchParams.set('logging', client.logging);
        }

        if (typeof client.progress !== 'undefined') {
          searchParams.set('progress', String(client.progress));
        }

        if (typeof client.overlay !== 'undefined') {
          const overlayString =
            typeof client.overlay === 'boolean'
              ? String(client.overlay)
              : JSON.stringify({
                  ...client.overlay,
                  errors: encodeOverlaySettings(client.overlay.errors),
                  warnings: encodeOverlaySettings(client.overlay.warnings),
                  runtimeErrors: encodeOverlaySettings(
                    client.overlay.runtimeErrors,
                  ),
                });

          searchParams.set('overlay', overlayString);
        }

        if (typeof client.reconnect !== 'undefined') {
          searchParams.set(
            'reconnect',
            typeof client.reconnect === 'number'
              ? String(client.reconnect)
              : '10',
          );
        }

        if (typeof this.options.hot !== 'undefined') {
          searchParams.set('hot', String(this.options.hot));
        }

        if (typeof this.options.liveReload !== 'undefined') {
          searchParams.set('live-reload', String(this.options.liveReload));
        }

        webSocketURLStr = searchParams.toString();
      }

      additionalEntries.push(`${this.getClientEntry()}?${webSocketURLStr}`);
    }

    const clientHotEntry = this.getClientHotEntry();
    if (clientHotEntry) {
      additionalEntries.push(clientHotEntry);
    }

    // use a hook to add entries if available
    for (const additionalEntry of additionalEntries) {
      new compiler.rspack.EntryPlugin(compiler.context, additionalEntry, {
        name: undefined,
      }).apply(compiler);
    }
  }

  /**
   * @private
   * @returns {Compiler["options"]} compiler options
   */
  getCompilerOptions() {
    if (typeof (this.compiler as MultiCompiler).compilers !== 'undefined') {
      if ((this.compiler as MultiCompiler).compilers.length === 1) {
        return (this.compiler as MultiCompiler).compilers[0].options;
      }

      // Configuration with the `devServer` options
      const compilerWithDevServer = (
        this.compiler as MultiCompiler
      ).compilers.find((config) => config.options.devServer);

      if (compilerWithDevServer) {
        return compilerWithDevServer.options;
      }

      // Configuration with `web` preset
      const compilerWithWebPreset = (
        this.compiler as MultiCompiler
      ).compilers.find(
        (config) =>
          config.options.externalsPresets?.web ||
          [
            'web',
            'webworker',
            'electron-preload',
            'electron-renderer',
            'node-webkit',

            undefined,
            null,
          ].includes(config.options.target as string),
      );

      if (compilerWithWebPreset) {
        return compilerWithWebPreset.options;
      }

      // Fallback
      return (this.compiler as MultiCompiler).compilers[0].options;
    }

    return (this.compiler as Compiler).options;
  }

  shouldLogInfrastructureInfo() {
    const compilerOptions = this.getCompilerOptions();
    const { level = 'info' } = compilerOptions.infrastructureLogging || {};
    return level === 'info' || level === 'log' || level === 'verbose';
  }

  async normalizeOptions() {
    const { options } = this;
    const compilerOptions = this.getCompilerOptions();
    const compilerWatchOptions = compilerOptions.watchOptions;
    const getWatchOptions = (
      watchOptions: WatchOptions & {
        aggregateTimeout?: number;
        ignored?: WatchOptions['ignored'];
        poll?: number | boolean;
      } = {},
    ): WatchOptions => {
      const getPolling = () => {
        if (typeof watchOptions.usePolling !== 'undefined') {
          return watchOptions.usePolling;
        }

        if (typeof watchOptions.poll !== 'undefined') {
          return Boolean(watchOptions.poll);
        }

        if (typeof compilerWatchOptions.poll !== 'undefined') {
          return Boolean(compilerWatchOptions.poll);
        }

        return false;
      };
      const getInterval = () => {
        if (typeof watchOptions.interval !== 'undefined') {
          return watchOptions.interval;
        }

        if (typeof watchOptions.poll === 'number') {
          return watchOptions.poll;
        }

        if (typeof compilerWatchOptions.poll === 'number') {
          return compilerWatchOptions.poll;
        }
      };

      const usePolling = getPolling();
      const interval = getInterval();
      const { poll, ...rest } = watchOptions;

      return {
        ignoreInitial: true,
        persistent: true,
        followSymlinks: false,
        atomic: false,
        alwaysStat: true,
        ignorePermissionErrors: true,
        // Respect options from compiler watchOptions
        usePolling,
        interval,
        ignored: watchOptions.ignored,
        // TODO: we respect these options for all watch options and allow developers to pass them to chokidar, but chokidar doesn't have these options maybe we need revisit that in future
        ...rest,
      };
    };
    const getStaticItem = (
      optionsForStatic?: string | Static,
    ): NormalizedStatic => {
      const getDefaultStaticOptions = () => {
        return {
          directory: path.join(process.cwd(), 'public'),
          staticOptions: {},
          publicPath: ['/'],
          serveIndex: { icons: true },
          watch: getWatchOptions(),
        };
      };

      let item: NormalizedStatic;

      if (typeof optionsForStatic === 'undefined') {
        item = getDefaultStaticOptions();
      } else if (typeof optionsForStatic === 'string') {
        item = {
          ...getDefaultStaticOptions(),
          directory: optionsForStatic,
        };
      } else {
        const def = getDefaultStaticOptions();

        item = {
          directory:
            typeof optionsForStatic.directory !== 'undefined'
              ? optionsForStatic.directory
              : def.directory,
          staticOptions:
            typeof optionsForStatic.staticOptions !== 'undefined'
              ? { ...def.staticOptions, ...optionsForStatic.staticOptions }
              : def.staticOptions,
          publicPath:
            // eslint-disable-next-line no-nested-ternary
            typeof optionsForStatic.publicPath !== 'undefined'
              ? Array.isArray(optionsForStatic.publicPath)
                ? optionsForStatic.publicPath
                : [optionsForStatic.publicPath]
              : def.publicPath,
          serveIndex:
            // Check if 'serveIndex' property is defined in 'optionsForStatic'
            // If 'serveIndex' is a boolean and true, use default 'serveIndex'
            // If 'serveIndex' is an object, merge its properties with default 'serveIndex'
            // If 'serveIndex' is neither a boolean true nor an object, use it as-is
            // If 'serveIndex' is not defined in 'optionsForStatic', use default 'serveIndex'
            // eslint-disable-next-line no-nested-ternary
            typeof optionsForStatic.serveIndex !== 'undefined'
              ? // eslint-disable-next-line no-nested-ternary
                typeof optionsForStatic.serveIndex === 'boolean' &&
                optionsForStatic.serveIndex
                ? def.serveIndex
                : typeof optionsForStatic.serveIndex === 'object'
                  ? { ...def.serveIndex, ...optionsForStatic.serveIndex }
                  : optionsForStatic.serveIndex
              : def.serveIndex,
          watch:
            // eslint-disable-next-line no-nested-ternary
            typeof optionsForStatic.watch !== 'undefined'
              ? // eslint-disable-next-line no-nested-ternary
                typeof optionsForStatic.watch === 'boolean'
                ? optionsForStatic.watch
                  ? def.watch
                  : false
                : getWatchOptions(optionsForStatic.watch)
              : def.watch,
        };
      }

      if (Server.isAbsoluteURL(item.directory)) {
        throw new Error('Using a URL as static.directory is not supported');
      }

      return item;
    };

    if (typeof options.allowedHosts === 'undefined') {
      // AllowedHosts allows some default hosts picked from `options.host` or `webSocketURL.hostname` and `localhost`
      options.allowedHosts = 'auto';
    }
    // We store allowedHosts as array when supplied as string
    else if (
      typeof options.allowedHosts === 'string' &&
      options.allowedHosts !== 'auto' &&
      options.allowedHosts !== 'all'
    ) {
      options.allowedHosts = [options.allowedHosts];
    }
    // CLI pass options as array, we should normalize them
    else if (
      Array.isArray(options.allowedHosts) &&
      options.allowedHosts.includes('all')
    ) {
      options.allowedHosts = 'all';
    }

    if (
      typeof options.client === 'undefined' ||
      (typeof options.client === 'object' && options.client !== null)
    ) {
      if (!options.client) {
        options.client = {};
      }

      if (typeof options.client.webSocketURL === 'undefined') {
        options.client.webSocketURL = {};
      } else if (typeof options.client.webSocketURL === 'string') {
        const parsedURL = new URL(options.client.webSocketURL);

        options.client.webSocketURL = {
          protocol: parsedURL.protocol,
          hostname: parsedURL.hostname,
          port: parsedURL.port.length > 0 ? Number(parsedURL.port) : '',
          pathname: parsedURL.pathname,
          username: parsedURL.username,
          password: parsedURL.password,
        };
      } else if (typeof options.client.webSocketURL.port === 'string') {
        options.client.webSocketURL.port = Number(
          options.client.webSocketURL.port,
        );
      }

      // Enable client overlay by default
      if (typeof options.client.overlay === 'undefined') {
        options.client.overlay = true;
      } else if (typeof options.client.overlay !== 'boolean') {
        options.client.overlay = {
          errors: true,
          warnings: true,
          ...options.client.overlay,
        };
      }

      if (typeof options.client.reconnect === 'undefined') {
        options.client.reconnect = 10;
      } else if (options.client.reconnect === true) {
        options.client.reconnect = Number.POSITIVE_INFINITY;
      } else if (options.client.reconnect === false) {
        options.client.reconnect = 0;
      }

      // Respect infrastructureLogging.level
      if (typeof options.client.logging === 'undefined') {
        options.client.logging = compilerOptions.infrastructureLogging
          ? compilerOptions.infrastructureLogging.level
          : 'info';
      }
    }

    if (typeof options.compress === 'undefined') {
      options.compress = true;
    }

    if (typeof options.devMiddleware === 'undefined') {
      options.devMiddleware = {};
    }

    // No need to normalize `headers`

    if (typeof options.historyApiFallback === 'undefined') {
      options.historyApiFallback = false;
    } else if (
      typeof options.historyApiFallback === 'boolean' &&
      options.historyApiFallback
    ) {
      options.historyApiFallback = {};
    }

    // No need to normalize `host`

    options.hot =
      typeof options.hot === 'boolean' || options.hot === 'only'
        ? options.hot
        : true;

    if (
      typeof options.server === 'function' ||
      typeof options.server === 'string'
    ) {
      options.server = {
        type: options.server,
        options: {},
      };
    } else {
      const serverOptions = options.server || ({} as ServerConfiguration<A, S>);

      options.server = {
        type: serverOptions.type || 'http',
        options: { ...serverOptions.options },
      };
    }

    const serverOptions = options.server.options as ServerOptions;

    if (
      options.server.type === 'spdy' &&
      typeof serverOptions.spdy === 'undefined'
    ) {
      serverOptions.spdy = { protocols: ['h2', 'http/1.1'] };
    }

    if (
      options.server.type === 'https' ||
      options.server.type === 'http2' ||
      options.server.type === 'spdy'
    ) {
      if (typeof serverOptions.requestCert === 'undefined') {
        serverOptions.requestCert = false;
      }

      const httpsProperties = [
        'ca',
        'cert',
        'crl',
        'key',
        'pfx',
      ] as (keyof ServerOptions)[];

      for (const property of httpsProperties) {
        if (typeof serverOptions[property] === 'undefined') {
          // eslint-disable-next-line no-continue
          continue;
        }

        const value = serverOptions[property];
        const readFile = (
          item: string | Buffer | undefined,
        ): string | Buffer | undefined => {
          if (
            Buffer.isBuffer(item) ||
            (typeof item === 'object' && item !== null && !Array.isArray(item))
          ) {
            return item;
          }

          if (item) {
            let stats = null;

            try {
              stats = fs.lstatSync(fs.realpathSync(item)).isFile();
            } catch (error) {
              // Ignore error
            }

            // It is a file
            return stats ? fs.readFileSync(item) : item;
          }
        };

        serverOptions[property] = (
          Array.isArray(value)
            ? value.map((item) => readFile(item as string))
            : readFile(value as string)
        ) as EXPECTED_ANY;
      }

      let fakeCert: Buffer | undefined;

      if (!serverOptions.key || !serverOptions.cert) {
        const certificateDir = Server.findCacheDir();
        const certificatePath = path.join(certificateDir, 'server.pem');
        let certificateExists: boolean;

        try {
          const certificate = await fs.promises.stat(certificatePath);
          certificateExists = certificate.isFile();
        } catch {
          certificateExists = false;
        }

        if (certificateExists) {
          const certificateTtl = 1000 * 60 * 60 * 24;
          const certificateStat = await fs.promises.stat(certificatePath);
          const now = Number(new Date());

          // cert is more than 30 days old, kill it with fire
          if ((now - Number(certificateStat.ctime)) / certificateTtl > 30) {
            this.logger.info(
              'SSL certificate is more than 30 days old. Removing...',
            );

            await fs.promises.rm(certificatePath, { recursive: true });

            certificateExists = false;
          }
        }

        if (!certificateExists) {
          this.logger.info('Generating SSL certificate...');

          const selfsigned = require('selfsigned');
          const attributes = [{ name: 'commonName', value: 'localhost' }];
          const pems = selfsigned.generate(attributes, {
            algorithm: 'sha256',
            days: 30,
            keySize: 2048,
            extensions: [
              {
                name: 'basicConstraints',
                cA: true,
              },
              {
                name: 'keyUsage',
                keyCertSign: true,
                digitalSignature: true,
                nonRepudiation: true,
                keyEncipherment: true,
                dataEncipherment: true,
              },
              {
                name: 'extKeyUsage',
                serverAuth: true,
                clientAuth: true,
                codeSigning: true,
                timeStamping: true,
              },
              {
                name: 'subjectAltName',
                altNames: [
                  {
                    // type 2 is DNS
                    type: 2,
                    value: 'localhost',
                  },
                  {
                    type: 2,
                    value: 'localhost.localdomain',
                  },
                  {
                    type: 2,
                    value: 'lvh.me',
                  },
                  {
                    type: 2,
                    value: '*.lvh.me',
                  },
                  {
                    type: 2,
                    value: '[::1]',
                  },
                  {
                    // type 7 is IP
                    type: 7,
                    ip: '127.0.0.1',
                  },
                  {
                    type: 7,
                    ip: 'fe80::1',
                  },
                ],
              },
            ],
          });

          await fs.promises.mkdir(certificateDir, { recursive: true });

          await fs.promises.writeFile(
            certificatePath,
            pems.private + pems.cert,
            {
              encoding: 'utf8',
            },
          );
        }

        fakeCert = await fs.promises.readFile(certificatePath);

        this.logger.info(`SSL certificate: ${certificatePath}`);
      }

      serverOptions.key = serverOptions.key || fakeCert;
      serverOptions.cert = serverOptions.cert || fakeCert;
    }

    if (typeof options.ipc === 'boolean') {
      const isWindows = process.platform === 'win32';
      const pipePrefix = isWindows ? '\\\\.\\pipe\\' : os.tmpdir();
      const pipeName = 'webpack-dev-server.sock';

      options.ipc = path.join(pipePrefix, pipeName);
    }

    options.liveReload =
      typeof options.liveReload !== 'undefined' ? options.liveReload : true;

    // https://github.com/webpack/webpack-dev-server/issues/1990
    const defaultOpenOptions = { wait: false };
    const getOpenItemsFromObject = ({
      target,
      ...rest
    }: {
      target?: string | string[];
      [x: string]: EXPECTED_ANY;
    }): NormalizedOpen[] => {
      const normalizedOptions = {
        ...defaultOpenOptions,
        ...rest,
      } as EXPECTED_ANY;

      if (typeof normalizedOptions.app === 'string') {
        normalizedOptions.app = {
          name: normalizedOptions.app,
        };
      }

      const normalizedTarget = typeof target === 'undefined' ? '<url>' : target;

      if (Array.isArray(normalizedTarget)) {
        return normalizedTarget.map((singleTarget) => {
          return { target: singleTarget, options: normalizedOptions };
        });
      }

      return [{ target: normalizedTarget, options: normalizedOptions }];
    };

    if (typeof options.open === 'undefined') {
      options.open = [];
    } else if (typeof options.open === 'boolean') {
      options.open = options.open
        ? ([
            {
              target: '<url>',
              options: defaultOpenOptions as OpenOptions,
            },
          ] as NormalizedOpen[])
        : [];
    } else if (typeof options.open === 'string') {
      options.open = [
        { target: options.open, options: defaultOpenOptions },
      ] as NormalizedOpen[];
    } else if (Array.isArray(options.open)) {
      const result: NormalizedOpen[] = [];

      for (const item of options.open) {
        if (typeof item === 'string') {
          result.push({ target: item, options: defaultOpenOptions });
          // eslint-disable-next-line no-continue
          continue;
        }

        result.push(...getOpenItemsFromObject(item));
      }

      options.open = result as NormalizedOpen[];
    } else {
      options.open = [
        ...getOpenItemsFromObject(options.open),
      ] as NormalizedOpen[];
    }

    if (typeof options.port === 'string' && options.port !== 'auto') {
      options.port = Number(options.port);
    }

    /**
     * Assume a proxy configuration specified as:
     * proxy: {
     *   'context': { options }
     * }
     * OR
     * proxy: {
     *   'context': 'target'
     * }
     */
    if (typeof options.proxy !== 'undefined') {
      options.proxy = options.proxy.map((item) => {
        if (typeof item === 'function') {
          return item;
        }

        const getLogLevelForProxy = (
          level:
            | 'info'
            | 'warn'
            | 'error'
            | 'debug'
            | 'silent'
            | undefined
            | 'none'
            | 'log'
            | 'verbose',
        ): 'info' | 'warn' | 'error' | 'debug' | 'silent' | undefined => {
          if (level === 'none') {
            return 'silent';
          }

          if (level === 'log') {
            return 'info';
          }

          if (level === 'verbose') {
            return 'debug';
          }

          return level;
        };

        if (typeof item.logLevel === 'undefined') {
          item.logLevel = getLogLevelForProxy(
            compilerOptions.infrastructureLogging
              ? compilerOptions.infrastructureLogging.level
              : 'info',
          );
        }

        if (typeof item.logProvider === 'undefined') {
          item.logProvider = () => this.logger;
        }

        return item;
      });
    }

    if (typeof options.setupExitSignals === 'undefined') {
      options.setupExitSignals = true;
    }

    if (typeof options.static === 'undefined') {
      options.static = [getStaticItem()];
    } else if (typeof options.static === 'boolean') {
      options.static = options.static ? [getStaticItem()] : false;
    } else if (typeof options.static === 'string') {
      options.static = [getStaticItem(options.static)];
    } else if (Array.isArray(options.static)) {
      options.static = options.static.map((item) => getStaticItem(item));
    } else {
      options.static = [getStaticItem(options.static)];
    }

    if (typeof options.watchFiles === 'string') {
      options.watchFiles = [
        { paths: options.watchFiles, options: getWatchOptions() },
      ];
    } else if (
      typeof options.watchFiles === 'object' &&
      options.watchFiles !== null &&
      !Array.isArray(options.watchFiles)
    ) {
      options.watchFiles = [
        {
          paths: options.watchFiles.paths,
          options: getWatchOptions(options.watchFiles.options || {}),
        },
      ];
    } else if (Array.isArray(options.watchFiles)) {
      options.watchFiles = options.watchFiles.map((item) => {
        if (typeof item === 'string') {
          return { paths: item, options: getWatchOptions() };
        }

        return {
          paths: item.paths,
          options: getWatchOptions(item.options || {}),
        };
      });
    } else {
      options.watchFiles = [];
    }

    const defaultWebSocketServerType = 'ws';
    const defaultWebSocketServerOptions = { path: '/ws' };

    if (typeof options.webSocketServer === 'undefined') {
      options.webSocketServer = {
        type: defaultWebSocketServerType,
        options: defaultWebSocketServerOptions,
      };
    } else if (
      typeof options.webSocketServer === 'boolean' &&
      !options.webSocketServer
    ) {
      options.webSocketServer = false;
    } else if (
      typeof options.webSocketServer === 'string' ||
      typeof options.webSocketServer === 'function'
    ) {
      options.webSocketServer = {
        type: options.webSocketServer,
        options: defaultWebSocketServerOptions,
      };
    } else {
      options.webSocketServer = {
        type:
          (options.webSocketServer as WebSocketServerConfiguration).type ||
          defaultWebSocketServerType,
        options: {
          ...defaultWebSocketServerOptions,
          ...(options.webSocketServer as WebSocketServerConfiguration).options,
        },
      };

      const webSocketServer = options.webSocketServer as {
        type: WebSocketServerConfiguration['type'];
        options: NonNullable<WebSocketServerConfiguration['options']>;
      };

      if (typeof webSocketServer.options.port === 'string') {
        webSocketServer.options.port = Number(webSocketServer.options.port);
      }
    }
  }

  /**
   * @private
   * @returns {string} client transport
   */
  getClientTransport() {
    let clientImplementation: string | undefined;
    let clientImplementationFound = true;

    const isKnownWebSocketServerImplementation =
      this.options.webSocketServer &&
      typeof (this.options.webSocketServer as WebSocketServerConfiguration)
        .type === 'string' &&
      // @ts-expect-error
      (this.options.webSocketServer.type === 'ws' ||
        (this.options.webSocketServer as WebSocketServerConfiguration).type ===
          'sockjs');

    let clientTransport: string | undefined;

    if (this.options.client) {
      if (
        typeof (this.options.client as ClientConfiguration)
          .webSocketTransport !== 'undefined'
      ) {
        clientTransport = (this.options.client as ClientConfiguration)
          .webSocketTransport;
      } else if (isKnownWebSocketServerImplementation) {
        clientTransport = (
          this.options.webSocketServer as WebSocketServerConfiguration
        ).type as string;
      } else {
        clientTransport = 'ws';
      }
    } else {
      clientTransport = 'ws';
    }

    switch (typeof clientTransport) {
      case 'string':
        // could be 'sockjs', 'ws', or a path that should be required
        if (clientTransport === 'sockjs') {
          clientImplementation = require.resolve(
            '../client/clients/SockJSClient',
          );
        } else if (clientTransport === 'ws') {
          clientImplementation = require.resolve(
            '../client/clients/WebSocketClient',
          );
        } else {
          try {
            clientImplementation = require.resolve(clientTransport);
          } catch {
            clientImplementationFound = false;
          }
        }
        break;
      default:
        clientImplementationFound = false;
    }

    if (!clientImplementationFound) {
      throw new Error(
        `${
          !isKnownWebSocketServerImplementation
            ? 'When you use custom web socket implementation you must explicitly specify client.webSocketTransport. '
            : ''
        }client.webSocketTransport must be a string denoting a default implementation (e.g. 'sockjs', 'ws') or a full path to a JS file via require.resolve(...) which exports a class `,
      );
    }

    return clientImplementation as string;
  }

  getServerTransport() {
    let implementation:
      | typeof import('./servers/SockJSServer')
      | typeof import('./servers/WebsocketServer')
      | undefined;
    let implementationFound = true;

    switch (
      typeof (this.options.webSocketServer as WebSocketServerConfiguration).type
    ) {
      case 'string':
        // Could be 'sockjs', in the future 'ws', or a path that should be required
        if (
          (this.options.webSocketServer as WebSocketServerConfiguration)
            .type === 'sockjs'
        ) {
          implementation = require('./servers/SockJSServer');
        } else if (
          (this.options.webSocketServer as WebSocketServerConfiguration)
            .type === 'ws'
        ) {
          implementation = require('./servers/WebsocketServer');
        } else {
          try {
            implementation = require(
              (this.options.webSocketServer as WebSocketServerConfiguration)
                .type as string,
            );
          } catch {
            implementationFound = false;
          }
        }
        break;
      case 'function':
        implementation = (
          this.options.webSocketServer as WebSocketServerConfiguration
        ).type;
        break;
      default:
        implementationFound = false;
    }

    if (!implementationFound) {
      throw new Error(
        "webSocketServer (webSocketServer.type) must be a string denoting a default implementation (e.g. 'ws', 'sockjs'), a full path to " +
          'a JS file which exports a class extending BaseServer (webpack-dev-server/lib/servers/BaseServer.js) ' +
          'via require.resolve(...), or the class itself which extends BaseServer',
      );
    }

    return implementation;
  }

  getClientEntry(): string {
    return require.resolve('@rspack/dev-server/client/index');
  }

  getClientHotEntry(): string | undefined {
    if (this.options.hot === 'only') {
      return require.resolve('@rspack/core/hot/only-dev-server');
    }
    if (this.options.hot) {
      return require.resolve('@rspack/core/hot/dev-server');
    }
  }

  setupProgressPlugin(): void {
    const { ProgressPlugin } = (this.compiler as MultiCompiler).compilers
      ? (this.compiler as MultiCompiler).compilers[0].webpack
      : (this.compiler as Compiler).webpack;

    new ProgressPlugin((percent: number, msg: string) => {
      const percentValue = Math.floor(percent * 100);
      let msgValue = msg;

      if (percentValue === 100) {
        msgValue = 'Compilation completed';
      }

      const payload = {
        percent: percentValue,
        msg: msgValue,
      };

      if (this.webSocketServer) {
        this.sendMessage(
          this.webSocketServer.clients,
          'progress-update',
          payload,
        );
      }

      if (this.server) {
        this.server.emit('progress-update', payload);
      }
    }).apply(this.compiler as Compiler);
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async initialize() {
    const compilers = isMultiCompiler(this.compiler)
      ? this.compiler.compilers
      : [this.compiler];

    for (const compiler of compilers) {
      const mode = compiler.options.mode || process.env.NODE_ENV;
      if (this.options.hot) {
        if (mode === 'production') {
          this.logger.warn(
            'Hot Module Replacement (HMR) is enabled for the production build. \n' +
              'Make sure to disable HMR for production by setting `devServer.hot` to `false` in the configuration.',
          );
        }

        compiler.options.resolve.alias = {
          'ansi-html-community': require.resolve(
            '@rspack/dev-server/client/utils/ansiHTML',
          ),
          ...compiler.options.resolve.alias,
        };
      }
    }

    this.setupHooks();

    await this.setupApp();
    await this.createServer();

    if (this.options.webSocketServer) {
      const compilers =
        (this.compiler as MultiCompiler).compilers ||
        ([this.compiler] as Compiler[]);

      for (const compiler of compilers) {
        if ((compiler.options.devServer as unknown as boolean) === false) {
          continue;
        }

        this.addAdditionalEntries(compiler);

        const { ProvidePlugin, HotModuleReplacementPlugin } = compiler.rspack;

        new ProvidePlugin({
          __webpack_dev_server_client__: this.getClientTransport() as
            | string
            | string[],
        }).apply(compiler);

        if (this.options.hot) {
          const HMRPluginExists = compiler.options.plugins.find(
            (plugin) =>
              plugin && plugin.constructor === HotModuleReplacementPlugin,
          );

          if (HMRPluginExists) {
            this.logger.warn(
              '"hot: true" automatically applies HMR plugin, you don\'t have to add it manually to your webpack configuration.',
            );
          } else {
            // Apply the HMR plugin
            const plugin = new HotModuleReplacementPlugin();

            plugin.apply(compiler);
          }
        }
      }

      if (
        this.options.client &&
        (this.options.client as ClientConfiguration).progress
      ) {
        this.setupProgressPlugin();
      }
    }

    this.setupWatchFiles();
    this.setupWatchStaticFiles();
    this.setupMiddlewares();

    if (this.options.setupExitSignals) {
      const signals = ['SIGINT', 'SIGTERM'];

      let needForceShutdown = false;

      for (const signal of signals) {
        // eslint-disable-next-line no-loop-func
        const listener = () => {
          if (needForceShutdown) {
            // eslint-disable-next-line n/no-process-exit
            process.exit();
          }

          this.logger.info(
            'Gracefully shutting down. Press ^C again to force exit...',
          );

          needForceShutdown = true;

          this.stopCallback(() => {
            if (typeof this.compiler.close === 'function') {
              this.compiler.close(() => {
                // eslint-disable-next-line n/no-process-exit
                process.exit();
              });
            } else {
              // eslint-disable-next-line n/no-process-exit
              process.exit();
            }
          });
        };

        this.listeners.push({ name: signal, listener });

        process.on(signal, listener);
      }
    }

    // Proxy WebSocket without the initial http request
    // https://github.com/chimurai/http-proxy-middleware#external-websocket-upgrade
    const webSocketProxies = this.webSocketProxies as RequestHandler[];

    for (const webSocketProxy of webSocketProxies) {
      (this.server as S).on(
        'upgrade',
        (
          webSocketProxy as RequestHandler & {
            upgrade: NonNullable<RequestHandler['upgrade']>;
          }
        ).upgrade,
      );
    }
  }

  async setupApp(): Promise<void> {
    this.app = (
      typeof this.options.app === 'function'
        ? await this.options.app()
        : getExpress()()
    ) as A;
  }

  getStats(statsObj: Stats | MultiStats): StatsCompilation {
    const stats = Server.DEFAULT_STATS;
    const compilerOptions = this.getCompilerOptions();

    if (
      compilerOptions.stats &&
      (compilerOptions.stats as unknown as { warningsFilter?: string[] })
        .warningsFilter
    ) {
      (stats as unknown as { warningsFilter?: string[] }).warningsFilter = (
        compilerOptions.stats as unknown as { warningsFilter?: string[] }
      ).warningsFilter;
    }

    return statsObj.toJson(stats);
  }

  setupHooks(): void {
    this.compiler.hooks.invalid.tap('rspack-dev-server', () => {
      if (this.webSocketServer) {
        this.sendMessage(this.webSocketServer.clients, 'invalid');
      }
    });
    this.compiler.hooks.done.tap(
      'rspack-dev-server',
      (stats: Stats | MultiStats): void => {
        if (this.webSocketServer) {
          this.sendStats(this.webSocketServer.clients, this.getStats(stats));
        }
        this.stats = stats;
      },
    );
  }

  setupWatchStaticFiles(): void {
    const watchFiles = this.options.static as NormalizedStatic[];

    if (watchFiles.length > 0) {
      for (const item of watchFiles) {
        if (item.watch) {
          this.watchFiles(item.directory, item.watch as WatchOptions);
        }
      }
    }
  }

  setupWatchFiles(): void {
    const watchFiles = this.options.watchFiles as WatchFiles[];

    if (watchFiles.length > 0) {
      for (const item of watchFiles) {
        this.watchFiles(item.paths, item.options);
      }
    }
  }

  setupMiddlewares(): void {
    let middlewares: Middleware[] = [];

    // Register setup host header check for security
    middlewares.push({
      name: 'host-header-check',
      middleware: (req: Request, res: Response, next: NextFunction) => {
        const headers = req.headers as { [key: string]: string | undefined };
        const headerName = headers[':authority'] ? ':authority' : 'host';

        if (this.isValidHost(headers, headerName)) {
          next();
          return;
        }

        res.statusCode = 403;
        res.end('Invalid Host header');
      },
    });

    // Register setup cross origin request check for security
    middlewares.push({
      name: 'cross-origin-header-check',
      middleware: (req: Request, res: Response, next: NextFunction) => {
        const headers = req.headers as { [key: string]: string | undefined };
        const headerName = headers[':authority'] ? ':authority' : 'host';

        if (this.isValidHost(headers, headerName, false)) {
          next();
          return;
        }

        if (
          headers['sec-fetch-mode'] === 'no-cors' &&
          headers['sec-fetch-site'] === 'cross-site'
        ) {
          res.statusCode = 403;
          res.end('Cross-Origin request blocked');
          return;
        }

        next();
      },
    });

    const isHTTP2 =
      (this.options.server as ServerConfiguration<A, S>).type === 'http2';

    if (isHTTP2) {
      // TODO patch for https://github.com/pillarjs/finalhandler/pull/45, need remove then will be resolved
      middlewares.push({
        name: 'http2-status-message-patch',
        middleware: (_req: Request, res: Response, next: NextFunction) => {
          Object.defineProperty(res, 'statusMessage', {
            get() {
              return '';
            },
            set() {},
          });

          next();
        },
      });
    }

    // compress is placed last and uses unshift so that it will be the first middleware used
    if (this.options.compress && !isHTTP2) {
      const compression = require('compression');

      middlewares.push({ name: 'compression', middleware: compression() });
    }

    if (typeof this.options.headers !== 'undefined') {
      middlewares.push({
        name: 'set-headers',
        middleware: this.setHeaders.bind(this),
      });
    }

    middlewares.push({
      name: 'webpack-dev-middleware',
      middleware: this.middleware as MiddlewareHandler,
    });

    // Should be after `webpack-dev-middleware`, otherwise other middlewares might rewrite response
    middlewares.push({
      name: 'rspack-dev-server-sockjs-bundle',
      path: '/__rspack_dev_server__/sockjs.bundle.js',
      middleware: (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next();
          return;
        }

        const clientPath = path.join(
          __dirname,
          '../',
          'client/modules/sockjs-client/index.js',
        );

        // Express send Etag and other headers by default, so let's keep them for compatibility reasons
        if (typeof res.sendFile === 'function') {
          res.sendFile(clientPath);
          return;
        }

        let stats: fs.Stats;

        try {
          // TODO implement `inputFileSystem.createReadStream` in webpack
          stats = fs.statSync(clientPath);
        } catch {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        res.setHeader('Content-Length', stats.size);

        if (req.method === 'HEAD') {
          res.end();
          return;
        }

        fs.createReadStream(clientPath).pipe(res);
      },
    });

    middlewares.push({
      name: 'rspack-dev-server-invalidate',
      path: '/rspack-dev-server/invalidate',
      middleware: (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next();
          return;
        }

        this.invalidate();

        res.end();
      },
    });

    middlewares.push({
      name: 'rspack-dev-server-open-editor',
      path: '/rspack-dev-server/open-editor',
      middleware: (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next();
          return;
        }

        if (!req.url) {
          next();
          return;
        }

        const resolveUrl = new URL(req.url, `http://${req.headers.host}`);
        const params = new URLSearchParams(resolveUrl.search);
        const fileName = params.get('fileName');

        if (typeof fileName === 'string') {
          const launchEditor = require('launch-editor');

          launchEditor(fileName);
        }

        res.end();
      },
    });

    middlewares.push({
      name: 'rspack-dev-server-assets',
      path: '/rspack-dev-server',
      middleware: (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next();
          return;
        }

        if (!this.middleware) {
          next();
          return;
        }

        this.middleware.waitUntilValid((stats) => {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');

          // HEAD requests should not return body content
          if (req.method === 'HEAD') {
            res.end();
            return;
          }

          res.write(
            '<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>',
          );

          const statsForPrint =
            typeof (stats as unknown as MultiStats).stats !== 'undefined'
              ? ((stats as unknown as MultiStats).toJson({ assets: true })
                  .children as NonNullable<StatsCompilation['children']>)
              : ([
                  (stats as unknown as Stats).toJson({ assets: true }),
                ] as NonNullable<StatsCompilation[]>);

          res.write('<h1>Assets Report:</h1>');

          for (const [index, item] of statsForPrint?.entries() ?? []) {
            res.write('<div>');

            const name =
              typeof item.name !== 'undefined'
                ? item.name
                : (stats as unknown as MultiStats).stats
                  ? `unnamed[${index}]`
                  : 'unnamed';

            res.write(`<h2>Compilation: ${name}</h2>`);
            res.write('<ul>');

            const publicPath =
              item.publicPath === 'auto' ? '' : item.publicPath;
            const assets = item.assets as NonNullable<
              StatsCompilation['assets']
            >;

            for (const asset of assets ?? []) {
              const assetName = asset.name;
              const assetURL = `${publicPath}${assetName}`;

              res.write(
                `<li>
              <strong><a href="${assetURL}" target="_blank">${assetName}</a></strong>
            </li>`,
              );
            }

            res.write('</ul>');
            res.write('</div>');
          }

          res.end('</body></html>');
        });
      },
    });

    if (this.options.proxy) {
      const { createProxyMiddleware } = require('http-proxy-middleware');

      const getProxyMiddleware = (
        proxyConfig: ProxyConfigArrayItem,
      ): RequestHandler | undefined => {
        // It is possible to use the `bypass` method without a `target` or `router`.
        // However, the proxy middleware has no use in this case, and will fail to instantiate.
        if (proxyConfig.target) {
          const context = proxyConfig.context || proxyConfig.path;

          return createProxyMiddleware(context as string, proxyConfig);
        }

        if (proxyConfig.router) {
          return createProxyMiddleware(proxyConfig);
        }

        // TODO improve me after drop `bypass` to always generate error when configuration is bad
        if (!proxyConfig.bypass) {
          util.deprecate(
            () => {},
            `Invalid proxy configuration:\n\n${JSON.stringify(proxyConfig, null, 2)}\n\nThe use of proxy object notation as proxy routes has been removed.\nPlease use the 'router' or 'context' options. Read more at https://github.com/chimurai/http-proxy-middleware/tree/v2.0.6#http-proxy-middleware-options`,
            'DEP_WEBPACK_DEV_SERVER_PROXY_ROUTES_ARGUMENT',
          )();
        }
      };

      /**
       * @example
       * Assume a proxy configuration specified as:
       * proxy: [
       *   {
       *     context: "value",
       *     ...options,
       *   },
       *   // or:
       *   function() {
       *     return {
       *       context: "context",
       *       ...options,
       *     };
       *   }
       * ]
       */
      for (const proxyConfigOrCallback of this.options.proxy) {
        let proxyMiddleware: RequestHandler | undefined;

        let proxyConfig =
          typeof proxyConfigOrCallback === 'function'
            ? proxyConfigOrCallback()
            : proxyConfigOrCallback;

        proxyMiddleware = getProxyMiddleware(proxyConfig);

        if (proxyConfig.ws && proxyMiddleware) {
          this.webSocketProxies.push(proxyMiddleware);
        }

        const handler = async (
          req: Request,
          res: Response,
          next: NextFunction,
        ): Promise<void> => {
          if (typeof proxyConfigOrCallback === 'function') {
            const newProxyConfig = proxyConfigOrCallback(req, res, next);

            if (newProxyConfig !== proxyConfig) {
              proxyConfig = newProxyConfig;

              const socket = req.socket || req.connection;
              const server = socket ? (socket as EXPECTED_ANY).server : null;

              if (server) {
                server.removeAllListeners('close');
              }

              proxyMiddleware = getProxyMiddleware(proxyConfig);
            }
          }

          // - Check if we have a bypass function defined
          // - In case the bypass function is defined we'll retrieve the
          // bypassUrl from it otherwise bypassUrl would be null
          // TODO remove in the next major in favor `context` and `router` options
          const isByPassFuncDefined = typeof proxyConfig.bypass === 'function';
          if (isByPassFuncDefined) {
            util.deprecate(
              () => {},
              "Using the 'bypass' option is deprecated. Please use the 'router' or 'context' options. Read more at https://github.com/chimurai/http-proxy-middleware/tree/v2.0.6#http-proxy-middleware-options",
              'DEP_WEBPACK_DEV_SERVER_PROXY_BYPASS_ARGUMENT',
            )();
          }
          const bypassUrl = isByPassFuncDefined
            ? await (proxyConfig.bypass as ByPass)(req, res, proxyConfig)
            : null;

          if (typeof bypassUrl === 'boolean') {
            // skip the proxy
            res.statusCode = 404;
            req.url = '';
            next();
          } else if (typeof bypassUrl === 'string') {
            // byPass to that url
            req.url = bypassUrl;
            next();
          } else if (proxyMiddleware) {
            return proxyMiddleware(req, res, next);
          } else {
            next();
          }
        };

        middlewares.push({
          name: 'http-proxy-middleware',
          middleware: handler,
        });

        // Also forward error requests to the proxy so it can handle them.
        middlewares.push({
          name: 'http-proxy-middleware-error-handler',
          middleware: (
            error: Error,
            req: Request,
            res: Response,
            next: NextFunction,
          ) => handler(req, res, next),
        });
      }

      middlewares.push({
        name: 'webpack-dev-middleware',
        middleware: this.middleware as MiddlewareHandler,
      });
    }

    const staticOptions = this.options.static as NormalizedStatic[];

    if (staticOptions.length > 0) {
      for (const staticOption of staticOptions) {
        for (const publicPath of staticOption.publicPath) {
          middlewares.push({
            name: 'express-static',
            path: publicPath,
            middleware: getExpress().static(
              staticOption.directory,
              staticOption.staticOptions,
            ),
          });
        }
      }
    }

    if (this.options.historyApiFallback) {
      const connectHistoryApiFallback = require('connect-history-api-fallback');

      const { historyApiFallback } = this.options;

      if (
        typeof (historyApiFallback as ConnectHistoryApiFallbackOptions) ===
          'undefined' &&
        !(historyApiFallback as ConnectHistoryApiFallbackOptions).verbose
      ) {
        (historyApiFallback as EXPECTED_ANY).logger = this.logger.log.bind(
          this.logger,
          '[connect-history-api-fallback]',
        );
      }

      // Fall back to /index.html if nothing else matches.
      middlewares.push({
        name: 'connect-history-api-fallback',
        middleware: connectHistoryApiFallback(
          historyApiFallback as ConnectHistoryApiFallbackOptions,
        ),
      });

      // include our middleware to ensure
      // it is able to handle '/index.html' request after redirect
      middlewares.push({
        name: 'webpack-dev-middleware',
        middleware: this.middleware as MiddlewareHandler,
      });

      if (staticOptions.length > 0) {
        for (const staticOption of staticOptions) {
          for (const publicPath of staticOption.publicPath) {
            middlewares.push({
              name: 'express-static',
              path: publicPath,
              middleware: getExpress().static(
                staticOption.directory,
                staticOption.staticOptions,
              ),
            });
          }
        }
      }
    }

    if (staticOptions.length > 0) {
      const serveIndex = require('serve-index');

      for (const staticOption of staticOptions) {
        for (const publicPath of staticOption.publicPath) {
          if (staticOption.serveIndex) {
            middlewares.push({
              name: 'serve-index',
              path: publicPath,
              middleware: (req: Request, res: Response, next: NextFunction) => {
                // serve-index doesn't fallthrough non-get/head request to next middleware
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                  return next();
                }

                serveIndex(
                  staticOption.directory,
                  staticOption.serveIndex as ServeIndexOptions,
                )(req, res, next);
              },
            });
          }
        }
      }
    }

    // Register this middleware always as the last one so that it's only used as a
    // fallback when no other middleware responses.
    middlewares.push({
      name: 'options-middleware',
      middleware: (req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Content-Length', '0');
          res.end();
          return;
        }
        next();
      },
    });

    if (typeof this.options.setupMiddlewares === 'function') {
      middlewares = this.options.setupMiddlewares(middlewares, this);
    }

    // Lazy init webpack dev middleware
    const lazyInitDevMiddleware = () => {
      if (!this.middleware) {
        const webpackDevMiddleware = require('webpack-dev-middleware');

        // middleware for serving webpack bundle
        this.middleware = webpackDevMiddleware(
          this.compiler,
          this.options.devMiddleware,
        ) as import('webpack-dev-middleware').API<Request, Response>;
      }

      return this.middleware;
    };

    for (const i of middlewares) {
      if (i.name === 'webpack-dev-middleware') {
        const item = i as MiddlewareObject<A> | RequestHandler;

        if (typeof (item as MiddlewareObject<A>).middleware === 'undefined') {
          (item as MiddlewareObject<A>).middleware =
            lazyInitDevMiddleware() as unknown as MiddlewareHandler<A>;
        }
      }
    }

    for (const middleware of middlewares) {
      if (typeof middleware === 'function') {
        (this.app as A).use(middleware as NextHandleFunction | HandleFunction);
      } else if (typeof middleware.path !== 'undefined') {
        (this.app as A).use(
          middleware.path,
          middleware.middleware as SimpleHandleFunction | NextHandleFunction,
        );
      } else {
        (this.app as A).use(
          middleware.middleware as NextHandleFunction | HandleFunction,
        );
      }
    }
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async createServer() {
    const { type, options } = this.options.server as ServerConfiguration<A, S>;

    if (typeof type === 'function') {
      this.server = await type(options as ServerOptions, this.app as A);
    } else {
      const serverType = require(type as string);

      this.server =
        type === 'http2'
          ? serverType.createSecureServer(
              { ...options, allowHTTP1: true },
              this.app,
            )
          : serverType.createServer(options, this.app);
    }

    this.isTlsServer =
      typeof (this.server as unknown as import('tls').Server)
        .setSecureContext !== 'undefined';

    (this.server as S).on('connection', (socket: Socket) => {
      // Add socket to list
      this.sockets.push(socket);

      socket.once('close', () => {
        // Remove socket from list
        this.sockets.splice(this.sockets.indexOf(socket), 1);
      });
    });

    (this.server as S).on('error', (error: Error) => {
      throw error;
    });
  }

  createWebSocketServer() {
    this.webSocketServer = new (this.getServerTransport() as EXPECTED_ANY)(
      this,
    );

    (this.webSocketServer?.implementation as WebSocketServer).on(
      'connection',
      (client: ClientConnection, request: IncomingMessage) => {
        const headers =
          typeof request !== 'undefined'
            ? (request.headers as { [key: string]: string | undefined })
            : typeof (client as unknown as import('sockjs').Connection)
                  .headers !== 'undefined'
              ? (client as unknown as import('sockjs').Connection).headers
              : undefined;

        if (!headers) {
          this.logger.warn(
            'webSocketServer implementation must pass headers for the "connection" event',
          );
        }

        if (
          !headers ||
          !this.isValidHost(headers, 'host') ||
          !this.isValidHost(headers, 'origin') ||
          !this.isSameOrigin(headers)
        ) {
          this.sendMessage([client], 'error', 'Invalid Host/Origin header');

          // With https enabled, the sendMessage above is encrypted asynchronously so not yet sent
          // Terminate would prevent it sending, so use close to allow it to be sent
          client.close();

          return;
        }

        if (this.options.hot === true || this.options.hot === 'only') {
          this.sendMessage([client], 'hot');
        }

        if (this.options.liveReload) {
          this.sendMessage([client], 'liveReload');
        }

        if (
          this.options.client &&
          (this.options.client as ClientConfiguration).progress
        ) {
          this.sendMessage(
            [client],
            'progress',
            (this.options.client as ClientConfiguration).progress,
          );
        }

        if (
          this.options.client &&
          (this.options.client as ClientConfiguration).reconnect
        ) {
          this.sendMessage(
            [client],
            'reconnect',
            (this.options.client as ClientConfiguration).reconnect,
          );
        }

        if (
          this.options.client &&
          (this.options.client as ClientConfiguration).overlay
        ) {
          const overlayConfig = (this.options.client as ClientConfiguration)
            .overlay;

          this.sendMessage(
            [client],
            'overlay',
            typeof overlayConfig === 'object'
              ? {
                  ...overlayConfig,
                  errors:
                    overlayConfig.errors &&
                    encodeOverlaySettings(overlayConfig.errors),
                  warnings:
                    overlayConfig.warnings &&
                    encodeOverlaySettings(overlayConfig.warnings),
                  runtimeErrors:
                    overlayConfig.runtimeErrors &&
                    encodeOverlaySettings(overlayConfig.runtimeErrors),
                }
              : overlayConfig,
          );
        }

        if (!this.stats) {
          return;
        }

        this.sendStats([client], this.getStats(this.stats), true);
      },
    );
  }

  async openBrowser(defaultOpenTarget: string): Promise<void> {
    const open = (await import('open')).default;

    Promise.all(
      (this.options.open as NormalizedOpen[]).map((item) => {
        let openTarget: string;

        if (item.target === '<url>') {
          openTarget = defaultOpenTarget;
        } else {
          openTarget = Server.isAbsoluteURL(item.target)
            ? item.target
            : new URL(item.target, defaultOpenTarget).toString();
        }

        // Type assertion needed: OpenOptions is compatible at runtime but TypeScript can't verify
        // the type match between our type definition and the ES module's type in CommonJS context
        return open(openTarget, item.options as EXPECTED_ANY).catch(() => {
          const app = item.options.app as OpenApp | undefined;
          this.logger.warn(
            `Unable to open "${openTarget}" page${
              app
                ? ` in "${app.name}" app${
                    app.arguments
                      ? ` with "${app.arguments.join(' ')}" arguments`
                      : ''
                  }`
                : ''
            }. If you are running in a headless environment, please do not use the "open" option or related flags like "--open", "--open-target", and "--open-app-name".`,
          );
        });
      }),
    );
  }

  async logStatus() {
    const server = this.server as S;

    if (this.options.ipc) {
      this.logger.info(`Project is running at: "${server?.address()}"`);
    } else {
      const protocol = this.isTlsServer ? 'https' : 'http';
      const addressInfo = server?.address() as AddressInfo | null;
      if (!addressInfo) {
        return;
      }
      const { address, port } = addressInfo;
      const prettyPrintURL = (newHostname: string): string =>
        url.format({ protocol, hostname: newHostname, port, pathname: '/' });

      let localhost: string | undefined;
      let loopbackIPv4: string | undefined;
      let loopbackIPv6: string | undefined;
      let networkUrlIPv4: string | undefined;
      let networkUrlIPv6: string | undefined;

      if (this.options.host === 'localhost') {
        localhost = prettyPrintURL('localhost');
      }

      const parsedIP = ipaddr.parse(address);

      if (parsedIP.range() === 'unspecified') {
        localhost = prettyPrintURL('localhost');
        loopbackIPv6 = prettyPrintURL('::1');

        const networkIPv4 = Server.findIp('v4', false);

        if (networkIPv4) {
          networkUrlIPv4 = prettyPrintURL(networkIPv4);
        }

        const networkIPv6 = Server.findIp('v6', false);

        if (networkIPv6) {
          networkUrlIPv6 = prettyPrintURL(networkIPv6);
        }
      } else if (parsedIP.range() === 'loopback') {
        if (parsedIP.kind() === 'ipv4') {
          loopbackIPv4 = prettyPrintURL(parsedIP.toString());
        } else if (parsedIP.kind() === 'ipv6') {
          loopbackIPv6 = prettyPrintURL(parsedIP.toString());
        }
      } else {
        networkUrlIPv4 =
          parsedIP.kind() === 'ipv6' && (parsedIP as IPv6).isIPv4MappedAddress()
            ? prettyPrintURL((parsedIP as IPv6).toIPv4Address().toString())
            : prettyPrintURL(address);

        if (parsedIP.kind() === 'ipv6') {
          networkUrlIPv6 = prettyPrintURL(address);
        }
      }

      const urlLogs: string[] = [];

      const local = localhost || loopbackIPv4 || loopbackIPv6;
      if (local) {
        urlLogs.push(
          `  ${styleText('white', '➜')}  ${styleText(['white', 'dim'], 'Local:')}    ${styleText('cyan', local)}`,
        );
      }

      if (networkUrlIPv4) {
        urlLogs.push(
          `  ${styleText('white', '➜')}  ${styleText(['white', 'dim'], 'Network:')}  ${styleText('cyan', networkUrlIPv4)}`,
        );
      } else if (networkUrlIPv6) {
        urlLogs.push(
          `  ${styleText('white', '➜')}  ${styleText(['white', 'dim'], 'Network:')}  ${styleText('cyan', networkUrlIPv6)}`,
        );
      }

      if (urlLogs.length && this.shouldLogInfrastructureInfo()) {
        console.log(`${urlLogs.join('\n')}\n`);
      }

      if ((this.options.open as NormalizedOpen[])?.length > 0) {
        const openTarget = prettyPrintURL(
          !this.options.host ||
            this.options.host === '0.0.0.0' ||
            this.options.host === '::'
            ? 'localhost'
            : this.options.host,
        );

        await this.openBrowser(openTarget);
      }
    }
  }

  setHeaders(req: Request, res: Response, next: NextFunction) {
    let { headers } = this.options;

    if (headers) {
      if (typeof headers === 'function') {
        headers = headers(
          req,
          res,

          this.middleware ? this.middleware.context : undefined,
        );
      }

      const allHeaders: { key: string; value: string }[] = [];

      if (!Array.isArray(headers)) {
        for (const name in headers) {
          allHeaders.push({
            key: name,
            value: headers[name] as string,
          });
        }

        headers = allHeaders;
      }

      for (const { key, value } of headers) {
        res.setHeader(key, value);
      }
    }

    next();
  }

  isHostAllowed(value: string): boolean {
    const { allowedHosts } = this.options;

    // allow user to opt out of this security check, at their own risk
    // by explicitly enabling allowedHosts
    if (allowedHosts === 'all') {
      return true;
    }

    // always allow localhost host, for convenience
    // allow if value is in allowedHosts
    if (Array.isArray(allowedHosts) && allowedHosts.length > 0) {
      for (const allowedHost of allowedHosts) {
        if (allowedHost === value) {
          return true;
        }

        // support "." as a subdomain wildcard
        // e.g. ".example.com" will allow "example.com", "www.example.com", "subdomain.example.com", etc
        if (
          allowedHost.startsWith('.') && // "example.com"  (value === allowedHost.substring(1))
          // "*.example.com"  (value.endsWith(allowedHost))
          (value === allowedHost.slice(1) || value.endsWith(allowedHost))
        ) {
          return true;
        }
      }
    }

    // Also allow if `client.webSocketURL.hostname` provided
    if (
      this.options.client &&
      typeof (this.options.client as ClientConfiguration).webSocketURL !==
        'undefined'
    ) {
      return (
        ((this.options.client as ClientConfiguration).webSocketURL as
          | WebSocketURL['hostname']
          | undefined) === value
      );
    }

    return false;
  }

  isValidHost(
    headers: Record<string, string | undefined>,
    headerToCheck: string,
    validateHost = true,
  ): boolean {
    if (this.options.allowedHosts === 'all') {
      return true;
    }

    // get the Host header and extract hostname
    // we don't care about port not matching
    const header = headers[headerToCheck];

    if (!header) {
      return false;
    }

    if (DEFAULT_ALLOWED_PROTOCOLS.test(header)) {
      return true;
    }

    // use the node url-parser to retrieve the hostname from the host-header.
    // TODO resolve me in the next major release
    // eslint-disable-next-line n/no-deprecated-api
    const { hostname } = url.parse(
      // if header doesn't have scheme, add // for parsing.
      /^(.+:)?\/\//.test(header) ? header : `//${header}`,
      false,
      true,
    );

    if (hostname === null) {
      return false;
    }

    if (this.isHostAllowed(hostname)) {
      return true;
    }

    // always allow requests with explicit IPv4 or IPv6-address.
    // A note on IPv6 addresses:
    // header will always contain the brackets denoting
    // an IPv6-address in URLs,
    // these are removed from the hostname in url.parse(),
    // so we have the pure IPv6-address in hostname.
    // For convenience, always allow localhost (hostname === 'localhost')
    // and its subdomains (hostname.endsWith(".localhost")).
    // allow hostname of listening address  (hostname === this.options.host)
    const isValidHostname = validateHost
      ? ipaddr.IPv4.isValid(hostname) ||
        ipaddr.IPv6.isValid(hostname) ||
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname === this.options.host
      : false;

    return isValidHostname;
  }

  isSameOrigin(headers: Record<string, string | undefined>): boolean {
    if (this.options.allowedHosts === 'all') {
      return true;
    }

    const originHeader = headers.origin;

    if (!originHeader) {
      return this.options.allowedHosts === 'all';
    }

    if (DEFAULT_ALLOWED_PROTOCOLS.test(originHeader)) {
      return true;
    }

    // TODO resolve me in the next major release
    // eslint-disable-next-line n/no-deprecated-api
    const origin = url.parse(originHeader, false, true).hostname;

    if (origin === null) {
      return false;
    }

    if (this.isHostAllowed(origin)) {
      return true;
    }

    const hostHeader = headers.host;

    if (!hostHeader) {
      return this.options.allowedHosts === 'all';
    }

    if (DEFAULT_ALLOWED_PROTOCOLS.test(hostHeader)) {
      return true;
    }

    // eslint-disable-next-line n/no-deprecated-api
    const host = url.parse(
      // if hostHeader doesn't have scheme, add // for parsing.
      /^(.+:)?\/\//.test(hostHeader) ? hostHeader : `//${hostHeader}`,
      false,
      true,
    ).hostname;

    if (host === null) {
      return false;
    }

    if (this.isHostAllowed(host)) {
      return true;
    }

    return origin === host;
  }

  sendMessage(
    clients: ClientConnection[],
    type: string,
    data?: EXPECTED_ANY,
    params?: EXPECTED_ANY,
  ) {
    for (const client of clients) {
      // `sockjs` uses `1` to indicate client is ready to accept data
      // `ws` uses `WebSocket.OPEN`, but it is mean `1` too
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type, data, params }));
      }
    }
  }

  // Send stats to a socket or multiple sockets
  sendStats(
    clients: ClientConnection[],
    stats: StatsCompilation,
    force?: boolean,
  ) {
    if (!stats) {
      return;
    }

    const shouldEmit =
      !force &&
      stats &&
      (!stats.errors || stats.errors.length === 0) &&
      (!stats.warnings || stats.warnings.length === 0) &&
      this.currentHash === stats.hash;

    if (shouldEmit) {
      this.sendMessage(clients, 'still-ok');

      return;
    }

    this.currentHash = stats.hash;
    this.sendMessage(clients, 'hash', stats.hash);

    if (
      (stats.errors as NonNullable<StatsCompilation['errors']>)?.length > 0 ||
      (stats.warnings as NonNullable<StatsCompilation['warnings']>)?.length > 0
    ) {
      const hasErrors =
        (stats.errors as NonNullable<StatsCompilation['errors']>)?.length > 0;

      if (
        (stats.warnings as NonNullable<StatsCompilation['warnings']>)?.length >
        0
      ) {
        let params: { preventReloading?: boolean } | undefined;

        if (hasErrors) {
          params = { preventReloading: true };
        }

        this.sendMessage(clients, 'warnings', stats.warnings, params);
      }

      if (
        (stats.errors as NonNullable<StatsCompilation['errors']>)?.length > 0
      ) {
        this.sendMessage(
          clients,
          'errors',
          stats.errors as NonNullable<StatsCompilation['errors']>,
        );
      }
    } else {
      this.sendMessage(clients, 'ok');
    }
  }

  watchFiles(watchPath: string | string[], watchOptions?: WatchOptions) {
    const chokidar = require('chokidar');

    const watcher = chokidar.watch(watchPath, watchOptions);

    // disabling refreshing on changing the content
    if (this.options.liveReload) {
      watcher.on('change', (item: string) => {
        if (this.webSocketServer) {
          this.sendMessage(
            this.webSocketServer.clients,
            'static-changed',
            item,
          );
        }
      });
    }

    this.staticWatchers.push(watcher);
  }

  invalidate(callback: import('webpack-dev-middleware').Callback = () => {}) {
    if (this.middleware) {
      this.middleware.invalidate(callback);
    }
  }

  async start(): Promise<void> {
    await this.normalizeOptions();

    if (this.options.ipc) {
      await new Promise<void>((resolve, reject) => {
        const net = require('node:net');

        const socket = new net.Socket();

        socket.on('error', (error: Error & { code?: string }) => {
          if (error.code === 'ECONNREFUSED') {
            // No other server listening on this socket, so it can be safely removed
            fs.unlinkSync(this.options.ipc as string);

            resolve();

            return;
          }
          if (error.code === 'ENOENT') {
            resolve();

            return;
          }

          reject(error);
        });

        socket.connect({ path: this.options.ipc as string }, () => {
          throw new Error(`IPC "${this.options.ipc}" is already used`);
        });
      });
    } else {
      this.options.host = await Server.getHostname(this.options.host as Host);
      this.options.port = await Server.getFreePort(
        this.options.port as string,
        this.options.host as Host,
      );
    }

    await this.initialize();

    const listenOptions = this.options.ipc
      ? { path: this.options.ipc }
      : { host: this.options.host, port: this.options.port };

    await new Promise<void>((resolve) => {
      (this.server as S).listen(listenOptions, () => {
        resolve();
      });
    });

    if (this.options.ipc) {
      // chmod 666 (rw rw rw)
      const READ_WRITE = 438;

      await fs.promises.chmod(this.options.ipc as string, READ_WRITE);
    }

    if (this.options.webSocketServer) {
      this.createWebSocketServer();
    }

    await this.logStatus();

    if (typeof this.options.onListening === 'function') {
      this.options.onListening(this);
    }
  }

  startCallback(callback: (err?: Error) => void = () => {}) {
    this.start()
      .then(() => callback(), callback)
      .catch(callback);
  }

  async stop(): Promise<void> {
    this.webSocketProxies = [];

    await Promise.all(this.staticWatchers.map((watcher) => watcher.close()));

    this.staticWatchers = [];

    if (this.webSocketServer) {
      await new Promise<void>((resolve) => {
        (
          this.webSocketServer as WebSocketServerImplementation
        ).implementation.close(() => {
          this.webSocketServer = null;

          resolve();
        });

        for (const client of (
          this.webSocketServer as WebSocketServerImplementation
        ).clients) {
          client.terminate();
        }

        (this.webSocketServer as WebSocketServerImplementation).clients = [];
      });
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        (this.server as S).close(() => {
          this.server = undefined;
          resolve();
        });

        for (const socket of this.sockets) {
          socket.destroy();
        }

        this.sockets = [];
      });

      if (this.middleware) {
        await new Promise<void>((resolve, reject) => {
          (
            this.middleware as import('webpack-dev-middleware').API<
              Request,
              Response
            >
          ).close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });

        this.middleware = undefined;
      }
    }

    // We add listeners to signals when creating a new Server instance
    // So ensure they are removed to prevent EventEmitter memory leak warnings
    for (const item of this.listeners) {
      process.removeListener(item.name, item.listener);
    }
  }

  stopCallback(callback: (err?: Error) => void = () => {}) {
    this.stop()
      .then(() => callback(), callback)
      .catch(callback);
  }
}

export { Server };
