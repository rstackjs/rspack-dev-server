// Custom transports are loaded through require(path), so the fixture must stay CJS.
const Ws = require('ws');

class CustomWebSocketServer {
  static heartbeatInterval = 1000;

  constructor(server) {
    this.server = server;
    this.clients = [];

    const options = {
      ...(this.server.options.webSocketServer.options || {}),
      clientTracking: false,
    };
    const isNoServerMode =
      typeof options.port === 'undefined' &&
      typeof options.server === 'undefined';

    if (isNoServerMode) {
      options.noServer = true;
    }

    this.implementation = new Ws.WebSocketServer(options);

    this.server.server.on('upgrade', (req, sock, head) => {
      if (!this.implementation.shouldHandle(req)) {
        return;
      }

      this.implementation.handleUpgrade(req, sock, head, (connection) => {
        this.implementation.emit('connection', connection, req);
      });
    });

    this.implementation.on('error', (error) => {
      this.server.logger.error(error.message);
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
    }, CustomWebSocketServer.heartbeatInterval);

    this.implementation.on('connection', (client) => {
      this.clients.push(client);

      client.isAlive = true;

      client.on('pong', () => {
        client.isAlive = true;
      });

      client.on('close', () => {
        this.clients.splice(this.clients.indexOf(client), 1);
      });

      client.on('error', (error) => {
        this.server.logger.error(error.message);
      });
    });

    this.implementation.on('close', () => {
      clearInterval(interval);
    });
  }
}

module.exports = CustomWebSocketServer;
