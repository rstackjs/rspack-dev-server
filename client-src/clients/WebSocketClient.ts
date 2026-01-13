/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import { CommunicationClient } from '../type.js';
import { log } from '../utils/log.js';

export default class WebSocketClient implements CommunicationClient {
  private client: WebSocket;

  constructor(url: string) {
    this.client = new WebSocket(url);
    this.client.onerror = (error: Event) => {
      log.error(error);
    };
  }

  onOpen(fn: (...args: unknown[]) => void): void {
    this.client.onopen = fn;
  }

  onClose(fn: (...args: unknown[]) => void): void {
    this.client.onclose = fn;
  }

  // call fn with the message string as the first argument
  onMessage(fn: (...args: unknown[]) => void): void {
    this.client.onmessage = (event: MessageEvent<string>) => {
      fn(event.data);
    };
  }
}
