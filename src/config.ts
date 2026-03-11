import type { DevServerOpenOptions } from '@rspack/core';
import type {
  ClientConfiguration,
  ConnectHistoryApiFallbackOptions,
  DevServer,
  NormalizedStatic,
  ServerConfiguration,
  WatchFiles,
  WebSocketServerConfiguration,
} from './types';

export interface ResolvedDevServer extends DevServer {
  port: number | string;
  static: false | Array<NormalizedStatic>;
  devMiddleware: DevServer['devMiddleware'];
  hot: boolean | 'only';
  host?: string;
  open: DevServerOpenOptions;
  magicHtml: boolean;
  liveReload: boolean;
  webSocketServer: false | WebSocketServerConfiguration;
  proxy: Required<DevServer['proxy']>;
  client: ClientConfiguration;
  allowedHosts: 'auto' | string[] | 'all';
  compress: boolean;
  historyApiFallback: false | ConnectHistoryApiFallbackOptions;
  server: ServerConfiguration;
  ipc: string | undefined;
  setupExitSignals: boolean;
  watchFiles: WatchFiles[];
}
