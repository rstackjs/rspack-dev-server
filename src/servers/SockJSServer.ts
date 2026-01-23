/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import * as sockjs from 'sockjs';
import type { Server } from '../server';
import type {
  ClientConnection,
  EXPECTED_ANY,
  WebSocketServerConfiguration,
} from '../types';
import BaseServer from './BaseServer';

// Workaround for sockjs@~0.3.19
// sockjs will remove Origin header, however Origin header is required for checking host.
// See https://github.com/webpack/webpack-dev-server/issues/1604 for more information
{
  const SockjsSession = require('sockjs/lib/transport').Session;

  const { decorateConnection } = SockjsSession.prototype;

  // eslint-disable-next-line func-names
  SockjsSession.prototype.decorateConnection = function (
    req: import('http').IncomingMessage,
  ) {
    decorateConnection.call(this, req);

    const { connection } = this;

    if (
      connection.headers &&
      !('origin' in connection.headers) &&
      'origin' in req.headers
    ) {
      connection.headers.origin = req.headers.origin;
    }
  };
}

class SockJSServer extends BaseServer {
  implementation: sockjs.Server & { close?: (callback: () => void) => void };

  // options has: error (function), debug (function), server (http/s server), path (string)
  constructor(server: Server) {
    super(server);

    const webSocketServerOptions = (
      this.server.options.webSocketServer as WebSocketServerConfiguration
    ).options as NonNullable<WebSocketServerConfiguration['options']>;

    const getSockjsUrl = (
      options: NonNullable<WebSocketServerConfiguration['options']>,
    ): string => {
      if (typeof options.sockjsUrl !== 'undefined') {
        return options.sockjsUrl;
      }

      return '/__webpack_dev_server__/sockjs.bundle.js';
    };

    this.implementation = sockjs.createServer({
      // Use provided up-to-date sockjs-client
      // eslint-disable-next-line camelcase
      sockjs_url: getSockjsUrl(webSocketServerOptions),
      // Default logger is very annoy. Limit useless logs.
      log: (severity: string, line: string) => {
        if (severity === 'error') {
          this.server.logger.error(line);
        } else if (severity === 'info') {
          this.server.logger.log(line);
        } else {
          this.server.logger.debug(line);
        }
      },
    });

    const getPrefix = (
      options: sockjs.ServerOptions & { path?: string },
    ): string | undefined => {
      if (typeof options.prefix !== 'undefined') {
        return options.prefix;
      }

      return options.path;
    };

    const options = {
      ...webSocketServerOptions,
      prefix: getPrefix(webSocketServerOptions),
    };

    this.implementation.installHandlers(
      this.server.server as import('http').Server,
      options,
    );

    this.implementation.on('connection', (client: EXPECTED_ANY) => {
      // Implement the the same API as for `ws`
      client.send = client.write;
      client.terminate = client.close;

      this.clients.push(client as ClientConnection);

      client.on('close', () => {
        this.clients.splice(
          this.clients.indexOf(client as ClientConnection),
          1,
        );
      });
    });

    this.implementation.close = (callback: () => void) => {
      callback();
    };
  }
}

module.exports = SockJSServer;
