/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import WebSocket from 'ws';
import type Server from '../server';
import type { ClientConnection, WebSocketServerConfiguration } from '../types';
import BaseServer from './BaseServer';

class WebsocketServer extends BaseServer {
  static heartbeatInterval = 1000;

  implementation: WebSocket.Server;

  constructor(server: Server) {
    super(server);

    const options: WebSocket.ServerOptions = {
      ...(this.server.options.webSocketServer as WebSocketServerConfiguration)
        .options,
      clientTracking: false,
    };
    const isNoServerMode =
      typeof options.port === 'undefined' &&
      typeof options.server === 'undefined';

    if (isNoServerMode) {
      options.noServer = true;
    }

    this.implementation = new WebSocket.Server(options);

    (this.server.server as import('http').Server).on(
      'upgrade',
      (
        req: import('http').IncomingMessage,
        sock: import('stream').Duplex,
        head: Buffer,
      ) => {
        if (!this.implementation.shouldHandle(req)) {
          return;
        }

        this.implementation.handleUpgrade(req, sock, head, (connection) => {
          this.implementation.emit('connection', connection, req);
        });
      },
    );

    this.implementation.on('error', (err: Error) => {
      this.server.logger.error(err.message);
    });

    const interval = setInterval(() => {
      for (const client of this.clients) {
        if (client.isAlive === false) {
          client.terminate();

          continue;
        }

        client.isAlive = false;
        client.ping(() => {});
      }
    }, WebsocketServer.heartbeatInterval);

    this.implementation.on('connection', (client: ClientConnection) => {
      this.clients.push(client);

      client.isAlive = true;

      client.on('pong', () => {
        client.isAlive = true;
      });

      client.on('close', () => {
        this.clients.splice(this.clients.indexOf(client), 1);
      });

      // TODO: add a test case for this - https://github.com/webpack/webpack-dev-server/issues/5018
      client.on('error', (err: Error) => {
        this.server.logger.error(err.message);
      });
    });

    this.implementation.on('close', () => {
      clearInterval(interval);
    });
  }
}

module.exports = WebsocketServer;
