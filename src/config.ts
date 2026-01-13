import type { DevServer } from '@rspack/core';
import type { Service as BonjourOptions } from 'bonjour-service';
import type { Options as ConnectHistoryApiFallbackOptions } from 'connect-history-api-fallback';
import type {
  ClientConfiguration,
  NormalizedStatic,
  Open,
  ServerConfiguration,
  WatchFiles,
  WebSocketServerConfiguration,
} from './server';

export type { DevServer };

export interface ResolvedDevServer extends DevServer {
  port: number | string;
  static: false | Array<NormalizedStatic>;
  devMiddleware: DevServer['devMiddleware'];
  hot: boolean | 'only';
  host?: string;
  open: Open[];
  magicHtml: boolean;
  liveReload: boolean;
  webSocketServer: false | WebSocketServerConfiguration;
  proxy: Required<DevServer['proxy']>;
  client: ClientConfiguration;
  allowedHosts: 'auto' | string[] | 'all';
  bonjour: false | Record<string, never> | BonjourOptions;
  compress: boolean;
  historyApiFallback: false | ConnectHistoryApiFallbackOptions;
  server: ServerConfiguration;
  ipc: string | undefined;
  setupExitSignals: boolean;
  watchFiles: WatchFiles[];
}
