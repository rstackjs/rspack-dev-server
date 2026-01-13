/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import SockJS from '../modules/sockjs-client/index.js';
import { CommunicationClient } from '../type.js';
import { log } from '../utils/log.js';

export default class SockJSClient implements CommunicationClient {
  sock: WebSocket;
  constructor(url: string) {
    // SockJS requires `http` and `https` protocols
    this.sock = new SockJS(
      url.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:'),
    );
    this.sock.onerror = (error) => {
      log.error(error);
    };
  }

  onOpen(fn: (...args: unknown[]) => void) {
    this.sock.onopen = fn;
  }

  onClose(fn: (...args: unknown[]) => void) {
    this.sock.onclose = fn;
  }

  // call f with the message string as the first argument
  onMessage(fn: (...args: unknown[]) => void) {
    this.sock.onmessage = (err) => {
      fn(err.data);
    };
  }
}
