/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import type Server from '../server';
import type { ClientConnection } from '../server';

// base class that users should extend if they are making their own
// server implementation
class BaseServer {
  server: Server;
  clients: ClientConnection[];

  /**
   * @param {Server} server server
   */
  constructor(server: Server) {
    this.server = server;
    this.clients = [];
  }
}

export default BaseServer;
